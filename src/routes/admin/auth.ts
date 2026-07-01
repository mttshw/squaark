import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '../../types';
import { verifyLogin, createFirstAdmin, adminExists } from '../../admin/auth';
import { render } from '../../admin/render';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/login', loginPage);
  fastify.post('/login', loginSubmit);
  fastify.post('/logout', logout);
  fastify.get('/setup', setupPage);
  fastify.post('/setup', setupSubmit);
}

async function loginPage(req: FastifyRequest, reply: FastifyReply) {
  if (!adminExists()) return reply.redirect('/admin/setup');
  return reply.type('text/html').send(render('login', { pageTitle: 'Sign in' }));
}

async function loginSubmit(
  req: FastifyRequest<{ Body: { email: string; password: string } }>,
  reply: FastifyReply,
) {
  const { email, password } = req.body;
  const admin = await verifyLogin(email, password);
  if (!admin) {
    return reply.type('text/html').send(
      render('login', { pageTitle: 'Sign in', error: 'Invalid email or password' }),
    );
  }
  req.session.set('adminId', admin.id);
  return reply.redirect('/admin');
}

async function logout(req: FastifyRequest, reply: FastifyReply) {
  await req.session.destroy();
  return reply.redirect('/admin/login');
}

async function setupPage(req: FastifyRequest, reply: FastifyReply) {
  if (adminExists()) return reply.redirect('/admin/login');
  return reply.type('text/html').send(render('setup', { pageTitle: 'Create admin account' }));
}

async function setupSubmit(
  req: FastifyRequest<{ Body: { email: string; password: string; name: string } }>,
  reply: FastifyReply,
) {
  if (adminExists()) return reply.redirect('/admin/login');
  const { email, password, name } = req.body;

  if (!email || !password || password.length < 8) {
    return reply.type('text/html').send(
      render('setup', {
        pageTitle: 'Create admin account',
        error: 'Email and password (min 8 chars) are required',
        values: { email, name },
      }),
    );
  }

  await createFirstAdmin(email, password, name || email.split('@')[0]);
  return reply.redirect('/admin/login?setup=1');
}
