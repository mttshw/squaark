import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '../../types';
import { render } from '../../admin/render';
import { getAdminById } from '../../admin/auth';
import { getAllSettings } from '../../db/queries/admin';
import { execute, query, queryOne } from '../../db/connection';

interface PageRow {
  id: string; title: string; slug: string; content: string; excerpt: string;
  status: string; created_at: string; updated_at: string;
}

export async function pageRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/pages', listPages);
  fastify.get('/pages/new', newPagePage);
  fastify.post('/pages/new', createPage);
  fastify.get('/pages/:id', editPagePage);
  fastify.post('/pages/:id', updatePage);
  fastify.post('/pages/:id/delete', deletePage);
}

function adminCtx(req: FastifyRequest) {
  return {
    admin: getAdminById(req.session.adminId!)!,
    settings: getAllSettings(),
  };
}

async function listPages(req: FastifyRequest, reply: FastifyReply) {
  const pages = query<PageRow>('SELECT * FROM pages ORDER BY title');
  return reply.type('text/html').send(
    render('pages/list', { ...adminCtx(req), pages, pageTitle: 'Pages', pageSection: 'pages' }),
  );
}

async function newPagePage(req: FastifyRequest, reply: FastifyReply) {
  return reply.type('text/html').send(
    render('pages/form', { ...adminCtx(req), page: null, pageTitle: 'New page', pageSection: 'pages' }),
  );
}

async function editPagePage(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const page = queryOne<PageRow>('SELECT * FROM pages WHERE id = ?', [req.params.id]);
  if (!page) return reply.code(404).type('text/html').send(render('404', { pageTitle: 'Not found' }));

  return reply.type('text/html').send(
    render('pages/form', { ...adminCtx(req), page, pageTitle: page.title, pageSection: 'pages' }),
  );
}

async function createPage(
  req: FastifyRequest<{ Body: Record<string, string> }>,
  reply: FastifyReply,
) {
  const { title, slug, content, excerpt, status } = req.body;
  if (!title || !slug) {
    return reply.type('text/html').send(
      render('pages/form', { ...adminCtx(req), page: req.body,
        error: 'Title and slug are required', pageTitle: 'New page', pageSection: 'pages' }),
    );
  }
  const id = crypto.randomUUID();
  execute(
    'INSERT INTO pages (id, title, slug, content, excerpt, status) VALUES (?,?,?,?,?,?)',
    [id, title.trim(), slug.trim(), content || '', excerpt || '', status === 'published' ? 'published' : 'draft'],
  );
  return reply.redirect(`/admin/pages/${id}?created=1`);
}

async function updatePage(
  req: FastifyRequest<{ Params: { id: string }; Body: Record<string, string> }>,
  reply: FastifyReply,
) {
  const { title, slug, content, excerpt, status } = req.body;
  execute(
    `UPDATE pages SET title=?, slug=?, content=?, excerpt=?, status=?, updated_at=datetime('now') WHERE id=?`,
    [title, slug, content || '', excerpt || '', status === 'published' ? 'published' : 'draft', req.params.id],
  );
  return reply.redirect(`/admin/pages/${req.params.id}?saved=1`);
}

async function deletePage(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  execute('DELETE FROM pages WHERE id = ?', [req.params.id]);
  return reply.redirect('/admin/pages?deleted=1');
}
