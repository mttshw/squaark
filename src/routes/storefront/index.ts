import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ThemeRegistry } from '../../theme/registry';
import { buildGlobalContext } from '../../theme/context';
import { getProduct } from '../../commerce/products';
import { getCollectionPage, listFeaturedProducts } from '../../commerce/collections';
import { getCartSummary, getCartPage, addToCart, updateCartItem, removeFromCart } from '../../commerce/cart';
import { findPageBySlug } from '../../db/queries/pages';
import { getAllSettings } from '../../db/queries/admin';

async function base(
  req: FastifyRequest,
  reply: FastifyReply,
  currentPath: string,
  registry: ThemeRegistry,
): Promise<ReturnType<typeof buildGlobalContext> & { csrfToken: string; cssVars: string }> {
  const cartSummary = await getCartSummary(req.cartId);
  const global = buildGlobalContext(currentPath, registry.currentThemeConfig);
  return {
    ...global,
    cart: cartSummary,
    csrfToken: reply.generateCsrf(),
    cssVars: registry.currentCssVars,
  };
}

async function render(
  registry: ThemeRegistry,
  reply: FastifyReply,
  template: string,
  ctx: Record<string, unknown>,
): Promise<void> {
  const html = await registry.currentEngine.render(template, ctx);
  reply.type('text/html').send(html);
}

async function cartFragment(
  registry: ThemeRegistry,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const cart = await getCartPage(req.cartId);
  const html = await registry.currentEngine.render('partials/cart-contents', {
    cart,
    csrfToken: reply.generateCsrf(),
    cssVars: registry.currentCssVars,
  });
  reply.type('text/html').send(html);
}

export async function storefrontRoutes(fastify: FastifyInstance, registry: ThemeRegistry): Promise<void> {
  // Read once at startup — changing cart_slug requires a server restart
  const cartSlug = getAllSettings().cart_slug || 'cart';

  fastify.get('/', async (req, reply) => {
    const ctx = await base(req, reply, '/', registry);
    const layout = ctx.theme.config.layout ?? {};
    const sectionsConfig = Array.isArray(layout.featuredSections)
      ? layout.featuredSections as Array<{ title?: string; collection?: string; count?: string }>
      : [];
    const featuredSections = await Promise.all(sectionsConfig.map(async (section) => {
      const collectionSlug = (section.collection ?? '').trim();
      const count = parseInt(section.count ?? '', 10) || 8;
      return {
        title: section.title?.trim() || 'Featured Products',
        collectionSlug,
        products: await listFeaturedProducts(collectionSlug, count),
      };
    }));
    await render(registry, reply, 'index', {
      ...ctx,
      pageTitle: ctx.store.name,
      featuredSections,
      showHero: layout.showHero ?? true,
      heroEyebrow: layout.heroEyebrow ?? 'New Collection',
      heroHeading: layout.heroHeading ?? 'Welcome to our store',
      heroSubheading: layout.heroSubheading ?? 'Curated goods for considered living.',
    });
  });

  fastify.get('/products/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const [ctx, product] = await Promise.all([
      base(req, reply, `/products/${slug}`, registry),
      getProduct(slug),
    ]);
    if (!product) {
      return reply.code(404).type('text/html').send(
        await registry.currentEngine.render('404', { ...ctx, pageTitle: 'Page Not Found' }),
      );
    }
    await render(registry, reply, 'product', { ...ctx, pageTitle: product.title, product });
  });

  fastify.get('/collections/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const sort = (req.query as { sort?: string }).sort ?? 'featured';
    const [ctx, collection] = await Promise.all([
      base(req, reply, `/collections/${slug}`, registry),
      getCollectionPage(slug, sort),
    ]);
    if (!collection) {
      return reply.code(404).type('text/html').send(
        await registry.currentEngine.render('404', { ...ctx, pageTitle: 'Page Not Found' }),
      );
    }
    await render(registry, reply, 'collection', { ...ctx, pageTitle: collection.title, collection });
  });

  fastify.get(`/${cartSlug}`, async (req, reply) => {
    const [ctx, cart] = await Promise.all([
      base(req, reply, `/${cartSlug}`, registry),
      getCartPage(req.cartId),
    ]);
    await render(registry, reply, 'cart', { ...ctx, pageTitle: `Your ${ctx.store.cartLabel}`, cart });
  });

  fastify.get('/search', async (req, reply) => {
    const { q = '' } = req.query as { q?: string };
    const ctx = await base(req, reply, '/search', registry);
    await render(registry, reply, 'search', { ...ctx, pageTitle: 'Search', query: q, products: [] });
  });

  // Catch-all page lookup — registered last so all specific routes take priority
  fastify.get('/*', async (req, reply) => {
    const slug = (req.params as { '*': string })['*'];
    const ctx = await base(req, reply, `/${slug}`, registry);
    const page = findPageBySlug(slug);
    if (!page) {
      return reply.code(404).type('text/html').send(
        await registry.currentEngine.render('404', { ...ctx, pageTitle: 'Page Not Found' }),
      );
    }
    let sections: unknown[] = [];
    try { sections = JSON.parse((page as unknown as { sections: string }).sections || '[]'); } catch { /* fallback */ }
    await render(registry, reply, 'page', {
      ...ctx, pageTitle: page.title,
      page: { ...page, sections },
    });
  });

  // ── Cart operations ────────────────────────────────────────────────────────

  fastify.post(`/${cartSlug}/add`, async (req, reply) => {
    const { variantId, quantity } = req.body as { variantId: string; quantity?: string };
    try {
      await addToCart(req.cartId, variantId, parseInt(quantity ?? '1', 10));
    } catch {
      // stock/variant errors — Phase 5 adds proper error display
    }

    if (req.headers['hx-request']) {
      const { itemCount } = await getCartSummary(req.cartId);
      const badge = itemCount > 0
        ? `<span id="cart-count" class="cart-count absolute -top-2 -right-2 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none" style="background:var(--color-accent)">${itemCount}</span>`
        : `<span id="cart-count" class="cart-count" style="display:none"></span>`;
      return reply.type('text/html').send(badge);
    }
    return reply.redirect(`/${cartSlug}`);
  });

  fastify.post(`/${cartSlug}/update`, async (req, reply) => {
    const { itemId, quantity } = req.body as { itemId: string; quantity: string };
    await updateCartItem(req.cartId, itemId, parseInt(quantity, 10));
    if (req.headers['hx-request']) return cartFragment(registry, req, reply);
    return reply.redirect(`/${cartSlug}`);
  });

  fastify.delete(`/${cartSlug}/remove/:itemId`, async (req, reply) => {
    const { itemId } = req.params as { itemId: string };
    await removeFromCart(req.cartId, itemId);
    if (req.headers['hx-request']) return cartFragment(registry, req, reply);
    return reply.redirect(`/${cartSlug}`);
  });

  fastify.setNotFoundHandler(async (req, reply) => {
    const ctx = await base(req, reply, req.url, registry);
    const html = await registry.currentEngine.render('404', { ...ctx, pageTitle: 'Page Not Found' });
    return reply.code(404).type('text/html').send(html);
  });
}
