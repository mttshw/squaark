import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '../../types';
import path from 'path';
import { render } from '../../admin/render';
import { getAdminById } from '../../admin/auth';
import { getAllSettings } from '../../db/queries/admin';
import {
  findAllThemes, findThemeById, activateTheme, saveConfigOverrides,
} from '../../db/queries/themes';
import { loadManifest, resolveConfig } from '../../theme/config';
import { themeRegistry } from '../../theme/registry';
import { installThemeFromZip } from '../../admin/themes';

export async function themeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/themes', listThemes);
  fastify.post<{ Params: { id: string } }>('/themes/:id/activate', (req, reply) => activateHandler(fastify, req, reply));
  fastify.get('/themes/:id/config', configPage);
  fastify.post<{ Params: { id: string }; Body: Record<string, string> }>('/themes/:id/config', (req, reply) => configSave(fastify, req, reply));
  fastify.post('/themes/upload', uploadTheme);
}

function adminCtx(req: FastifyRequest) {
  return {
    admin: getAdminById(req.session.adminId!)!,
    settings: getAllSettings(),
  };
}

async function listThemes(req: FastifyRequest, reply: FastifyReply) {
  const themes = findAllThemes();
  return reply.type('text/html').send(
    render('themes/list', { ...adminCtx(req), themes, pageTitle: 'Themes', pageSection: 'themes' }),
  );
}

async function activateHandler(
  fastify: FastifyInstance,
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const theme = findThemeById(req.params.id);
  if (!theme) return reply.code(404).send('Not found');
  activateTheme(theme.id);
  await themeRegistry.reload(fastify);
  return reply.redirect('/admin/themes?activated=1');
}

async function configPage(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const theme = findThemeById(req.params.id);
  if (!theme) return reply.code(404).type('text/html').send(render('404', { pageTitle: 'Not found' }));

  const themeDir = path.resolve(process.cwd(), theme.directory);
  const manifest = loadManifest(themeDir);
  const overrides = JSON.parse(theme.config_overrides || '{}') as Record<string, unknown>;
  const resolved = resolveConfig(manifest, overrides);

  const sections = Object.entries(manifest.config ?? {}).map(([sectionName, fields]) => ({
    name: sectionName,
    fields: Object.entries(fields).map(([key, field]) => ({
      ...field,
      key,
      flatKey: `${sectionName}.${key}`,
      value: resolved[`${sectionName}.${key}`] ?? field.default,
    })),
  }));

  return reply.type('text/html').send(
    render('themes/config', {
      ...adminCtx(req),
      theme, manifest, resolved, sections,
      pageTitle: `${theme.name} — Customise`,
      pageSection: 'themes',
    }),
  );
}

async function configSave(
  fastify: FastifyInstance,
  req: FastifyRequest<{ Params: { id: string }; Body: Record<string, string> }>,
  reply: FastifyReply,
) {
  const theme = findThemeById(req.params.id);
  if (!theme) return reply.code(404).send('Not found');

  const themeDir = path.resolve(process.cwd(), theme.directory);
  const manifest = loadManifest(themeDir);

  const overrides: Record<string, unknown> = {};
  for (const [section, fields] of Object.entries(manifest.config ?? {})) {
    for (const [key, field] of Object.entries(fields)) {
      const flat = `${section}.${key}`;
      const val = req.body[flat];
      if (val !== undefined) {
        overrides[flat] = field.type === 'boolean' ? val === 'true' : val;
      } else if (field.type === 'boolean') {
        overrides[flat] = false;
      }
    }
  }

  saveConfigOverrides(theme.id, overrides);

  // If this is the active theme, refresh vars immediately
  if (theme.active === 1) await themeRegistry.reload(fastify);

  return reply.redirect(`/admin/themes/${theme.id}/config?saved=1`);
}

async function uploadTheme(req: FastifyRequest, reply: FastifyReply) {
  const data = await req.file();
  if (!data) return reply.redirect('/admin/themes?error=no_file');

  try {
    const buf = await data.toBuffer();
    const result = await installThemeFromZip(buf);
    return reply.redirect(`/admin/themes?installed=${result.name}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    return reply.redirect(`/admin/themes?error=${encodeURIComponent(msg)}`);
  }
}
