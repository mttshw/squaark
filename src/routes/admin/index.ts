import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '../../types';
import { verifyLogin, getAdminById, adminExists } from '../../admin/auth';
import { render } from '../../admin/render';
import { authRoutes } from './auth';
import { productRoutes } from './products';
import { collectionRoutes } from './collections';
import { orderRoutes } from './orders';
import { settingsRoutes } from './settings';
import { themeRoutes } from './themes';
import { emailRoutes } from './emails';
import { importRoutes } from './import';
import { countOrders } from '../../db/queries/orders';
import { getAllSettings } from '../../db/queries/admin';

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  // Auth routes don't need the guard
  await fastify.register(authRoutes, { prefix: '/admin' });

  // Guard: every /admin/* route below requires a session
  fastify.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.url.startsWith('/admin')) return;
    if (req.url.startsWith('/admin/login') || req.url.startsWith('/admin/setup')) return;

    const adminId = req.session.adminId;
    if (!adminId || !getAdminById(adminId)) {
      return reply.redirect('/admin/login');
    }
  });

  await fastify.register(
    async (app) => {
      app.get('/', dashboardHandler);
      await app.register(productRoutes);
      await app.register(collectionRoutes);
      await app.register(orderRoutes);
      await app.register(settingsRoutes);
      await app.register(themeRoutes);
      await app.register(emailRoutes);
      await app.register(importRoutes);
    },
    { prefix: '/admin' },
  );
}

async function dashboardHandler(req: FastifyRequest, reply: FastifyReply) {
  const adminId = req.session.adminId!;
  const admin = getAdminById(adminId)!;
  const settings = getAllSettings();
  const orderCount = countOrders();

  return reply.type('text/html').send(
    render('dashboard', {
      admin,
      settings,
      stats: { orderCount },
      pageTitle: 'Dashboard',
    }),
  );
}
