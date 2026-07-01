import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '../../types';
import { render } from '../../admin/render';
import { findOrders, countOrders, findOrderById, findOrderItems } from '../../db/queries/orders';
import { getAdminById } from '../../admin/auth';
import { getAllSettings } from '../../db/queries/admin';

export async function orderRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/orders', listOrders);
  fastify.get('/orders/:id', viewOrder);
}

async function listOrders(req: FastifyRequest<{ Querystring: { page?: string } }>, reply: FastifyReply) {
  const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
  const limit = 25;
  const offset = (page - 1) * limit;
  const orders = findOrders(limit, offset);
  const total = countOrders();
  const admin = getAdminById(req.session.adminId!)!;

  return reply.type('text/html').send(
    render('orders/list', {
      admin, orders, total,
      page, totalPages: Math.ceil(total / limit),
      settings: getAllSettings(),
      pageTitle: 'Orders',
    }),
  );
}

async function viewOrder(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const order = findOrderById(req.params.id);
  if (!order) return reply.code(404).type('text/html').send(render('404', { pageTitle: 'Not found' }));
  const items = findOrderItems(order.id);
  const admin = getAdminById(req.session.adminId!)!;

  return reply.type('text/html').send(
    render('orders/view', {
      admin, order, items,
      settings: getAllSettings(),
      pageTitle: `Order #${order.order_number}`,
    }),
  );
}
