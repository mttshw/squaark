import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '../../types';
import { render } from '../../admin/render';
import { getAllSettings, setSetting } from '../../db/queries/admin';
import { getAdminById } from '../../admin/auth';

export async function settingsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/settings', settingsPage);
  fastify.post('/settings', settingsSave);
}

async function settingsPage(req: FastifyRequest, reply: FastifyReply) {
  const admin = getAdminById(req.session.adminId!)!;
  return reply.type('text/html').send(
    render('settings', {
      admin,
      settings: getAllSettings(),
      pageTitle: 'Settings',
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
