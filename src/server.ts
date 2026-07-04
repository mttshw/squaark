import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import fastifyCookie from '@fastify/cookie';
import fastifyCsrf from '@fastify/csrf-protection';
import fastifySession from '@fastify/session';
import fastifyMultipart from '@fastify/multipart';
import path from 'path';
import fs from 'fs';
import config from './config';
import { runMigrations } from './db/migrate';
import { themeRegistry } from './theme/registry';
import { storefrontRoutes } from './routes/storefront/index';
import { adminRoutes } from './routes/admin/index';
import { ensureCart } from './commerce/cart';

import './types';

async function build() {
  const fastify = Fastify({ logger: true });

  // ── Plugins ────────────────────────────────────────────────────────────────
  await fastify.register(fastifyFormbody);
  await fastify.register(fastifyMultipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await fastify.register(fastifyCookie, { secret: config.sessionSecret });
  await fastify.register(fastifySession, {
    secret: config.sessionSecret,
    cookie: { secure: config.nodeEnv === 'production', httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 },
    saveUninitialized: false,
  });
  await fastify.register(fastifyCsrf, { sessionPlugin: '@fastify/cookie' });

  await fastify.register(fastifyStatic, {
    root: path.resolve(process.cwd(), 'public'),
    prefix: '/public/',
    decorateReply: false,
  });

  // Serve uploaded product images
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  await fastify.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // ── Database ───────────────────────────────────────────────────────────────
  runMigrations();

  // ── Theme registry ─────────────────────────────────────────────────────────
  await themeRegistry.init(fastify);

  // ── Cart cookie hook ───────────────────────────────────────────────────────
  // Runs before every storefront handler; ensures req.cartId is always set.
  fastify.decorateRequest('cartId', '');
  fastify.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    const existing = req.cookies.squaark_cart;
    const cartId = await ensureCart(existing);
    if (cartId !== existing) {
      reply.setCookie('squaark_cart', cartId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
      });
    }
    req.cartId = cartId;
  });

  // ── Routes ─────────────────────────────────────────────────────────────────
  await adminRoutes(fastify);
  await storefrontRoutes(fastify, themeRegistry);

  return fastify;
}

async function start() {
  const fastify = await build();
  try {
    await fastify.listen({ port: config.port, host: config.host });
    console.log(`\n  Squaark storefront → http://localhost:${config.port}\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
