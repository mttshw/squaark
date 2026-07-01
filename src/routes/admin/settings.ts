import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '../../types';
import { render } from '../../admin/render';
import { getAllSettings, setSetting, getSetting } from '../../db/queries/admin';
import { getAdminById } from '../../admin/auth';
import { saveStoreMedia, type StoreMediaSlot } from '../../admin/store-media';

export async function settingsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/settings', settingsPage);
  fastify.post('/settings', settingsSave);
  fastify.post('/settings/media/:slot', uploadMedia);
  fastify.post('/settings/media/:slot/remove', removeMedia);
}

async function settingsPage(req: FastifyRequest, reply: FastifyReply) {
  const admin = getAdminById(req.session.adminId!)!;
  return reply.type('text/html').send(
    render('settings', {
      admin,
      settings: getAllSettings(),
      pageTitle: 'Settings',
      pageSection: 'settings',
      saved: 'saved' in (req.query as Record<string, string>),
    }),
  );
}

async function settingsSave(
  req: FastifyRequest<{ Body: Record<string, string> }>,
  reply: FastifyReply,
) {
  const allowed = ['store_name', 'store_currency', 'store_url', 'store_email', 'store_timezone'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) setSetting(key, req.body[key]);
  }
  return reply.redirect('/admin/settings?saved=1');
}

async function uploadMedia(
  req: FastifyRequest<{ Params: { slot: string } }>,
  reply: FastifyReply,
) {
  const slot = req.params.slot as StoreMediaSlot;
  if (slot !== 'logo' && slot !== 'icon') return reply.code(400).send('Invalid slot');

  const data = await req.file();
  if (!data) return reply.redirect('/admin/settings?error=no_file');

  try {
    const buf = await data.toBuffer();
    const existing = getSetting(`store_${slot}`) ?? '';
    const url = await saveStoreMedia(slot, buf, data.mimetype, existing);
    setSetting(`store_${slot}`, url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    return reply.redirect(`/admin/settings?error=${encodeURIComponent(msg)}`);
  }

  return reply.redirect('/admin/settings?saved=1');
}

async function removeMedia(
  req: FastifyRequest<{ Params: { slot: string } }>,
  reply: FastifyReply,
) {
  const slot = req.params.slot as StoreMediaSlot;
  if (slot !== 'logo' && slot !== 'icon') return reply.code(400).send('Invalid slot');
  setSetting(`store_${slot}`, '');
  return reply.redirect('/admin/settings?saved=1');
}
