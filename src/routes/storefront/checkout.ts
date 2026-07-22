import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import type { ThemeRegistry } from '../../theme/registry';
import { buildGlobalContext } from '../../theme/context';
import { getCartPage, getCartSummary } from '../../commerce/cart';
import { clearCart } from '../../db/queries/cart';
import { getAllSettings } from '../../db/queries/admin';
import { createOrder, markOrderPaid, findOrderById, findOrderByPaymentReference, findOrderItems, type Address } from '../../db/queries/orders';
import { sendTemplatedEmail } from '../../email/send';
import config from '../../config';
import { writeLog } from '../../db/queries/system-log';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getStripe(): Stripe | null {
  const key = getAllSettings().stripe_sk || config.stripeSecretKey;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2026-06-24.dahlia' });
}

function getPaypalBase(mode: string): string {
  return mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function getPaypalToken(clientId: string, secret: string, mode: string): Promise<string> {
  const res = await fetch(`${getPaypalBase(mode)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

function parseAddress(body: Record<string, string>): Address {
  return {
    firstName: body.firstName?.trim() ?? '',
    lastName: body.lastName?.trim() ?? '',
    line1: body.line1?.trim() ?? '',
    line2: body.line2?.trim() || undefined,
    city: body.city?.trim() ?? '',
    county: body.county?.trim() || undefined,
    postcode: body.postcode?.trim() ?? '',
    country: body.country?.trim() ?? '',
    phone: body.phone?.trim() || undefined,
  };
}

async function base(req: FastifyRequest, reply: FastifyReply, registry: ThemeRegistry) {
  const cartSummary = await getCartSummary(req.cartId);
  const global = buildGlobalContext('/checkout', registry.currentThemeConfig);
  return { ...global, cart: cartSummary, csrfToken: reply.generateCsrf(), cssVars: registry.currentCssVars };
}

async function render(registry: ThemeRegistry, reply: FastifyReply, template: string, ctx: Record<string, unknown>) {
  const html = await registry.currentEngine.render(template, ctx);
  reply.type('text/html').send(html);
}

// ── Routes ─────────────────────────────────────────────────────────────────────

export async function checkoutRoutes(fastify: FastifyInstance, registry: ThemeRegistry): Promise<void> {

  // GET /checkout — show address + payment form
  fastify.get('/checkout', async (req, reply) => {
    const cart = await getCartPage(req.cartId);
    if (cart.empty) return reply.redirect(`/${getAllSettings().cart_slug || 'cart'}`);

    const settings = getAllSettings();
    const ctx = await base(req, reply, registry);
    const stripeEnabled = !!(settings.stripe_sk || config.stripeSecretKey);
    const paypalEnabled = !!(settings.paypal_client_id || config.paypalClientId);
    const stripePk = settings.stripe_pk || config.stripePublishableKey;
    const paypalClientId = settings.paypal_client_id || config.paypalClientId;
    const paypalMode = settings.paypal_mode || config.paypalMode;

    await render(registry, reply, 'checkout', {
      ...ctx, cart, pageTitle: 'Checkout',
      stripeEnabled, paypalEnabled, stripePk, paypalClientId, paypalMode,
    });
  });

  // POST /checkout — create Stripe session and redirect
  fastify.post('/checkout', async (req, reply) => {
    const body = req.body as Record<string, string>;
    const cart = await getCartPage(req.cartId);
    if (cart.empty) return reply.redirect(`/${getAllSettings().cart_slug || 'cart'}`);

    const settings = getAllSettings();
    const stripe = getStripe();
    if (!stripe) return reply.code(400).send('Stripe is not configured');

    const address = parseAddress(body);
    const storeUrl = settings.store_url?.replace(/\/$/, '') || 'http://localhost:3000';
    const currency = (settings.store_currency || 'GBP').toLowerCase();

    // Create a pending order first so we have an ID for metadata
    const order = createOrder({
      email: body.email?.trim() ?? '',
      subtotal: cart.subtotal.amount,
      discountAmount: cart.discountAmount?.amount ?? 0,
      shipping: 0,
      total: cart.total.amount,
      currency: settings.store_currency || 'GBP',
      discountCode: cart.discountCode,
      notes: body.notes?.trim() || null,
      shippingAddress: address,
      paymentProvider: 'stripe',
      paymentReference: null,
      items: cart.items.map(i => ({
        variantId: i.variantId,
        productTitle: i.productTitle,
        variantTitle: i.variantTitle,
        sku: null,
        price: i.price.amount,
        quantity: i.quantity,
      })),
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: body.email?.trim(),
      line_items: cart.items.map(item => ({
        price_data: {
          currency,
          product_data: {
            name: item.productTitle,
            ...(item.variantTitle !== 'Default' ? { description: item.variantTitle } : {}),
          },
          unit_amount: item.price.amount,
        },
        quantity: item.quantity,
      })),
      metadata: { orderId: order.id },
      success_url: `${storeUrl}/checkout/stripe/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${storeUrl}/checkout`,
    });

    writeLog('payment', 'info', 'Stripe session created', {
      orderId: order.id, orderNumber: order.order_number, email: order.email, total: order.total,
    });

    req.session.pendingOrderId = order.id;
    return reply.redirect(session.url!);
  });

  // GET /checkout/stripe/return — Stripe redirects here after payment
  fastify.get('/checkout/stripe/return', async (req, reply) => {
    const { session_id } = req.query as { session_id?: string };
    if (!session_id) return reply.redirect('/checkout');

    const stripe = getStripe();
    if (!stripe) return reply.redirect('/checkout');

    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.payment_status !== 'paid') return reply.redirect('/checkout');

      // Idempotent: if already fulfilled (webhook beat us), just redirect to success
      const existingByRef = findOrderByPaymentReference(session_id);
      if (existingByRef) {
        req.cartId && clearCart(req.cartId);
        return reply.redirect(`/checkout/success/${existingByRef.id}`);
      }

      const orderId = (session.metadata?.orderId as string) || req.session.pendingOrderId;
      if (!orderId) return reply.redirect('/checkout');

      markOrderPaid(orderId, session_id);
      clearCart(req.cartId);
      delete req.session.pendingOrderId;

      const order = findOrderById(orderId);
      writeLog('payment', 'info', 'Stripe payment confirmed', {
        orderId, orderNumber: order?.order_number, email: order?.email,
        total: order?.total, sessionId: session_id,
      });

      if (order) {
        sendTemplatedEmail('order_confirmation', order.email, {
          order: { ...order, items: findOrderItems(orderId) },
          store: { name: getAllSettings().store_name },
        }).catch(() => {});
      }

      return reply.redirect(`/checkout/success/${orderId}`);
    } catch (err) {
      writeLog('error', 'error', 'Stripe return handler failed', {
        message: err instanceof Error ? err.message : String(err),
      });
      return reply.redirect('/checkout');
    }
  });

  // POST /webhooks/stripe — backup fulfilment via webhook
  fastify.post('/webhooks/stripe', { config: { rawBody: true } }, async (req, reply) => {
    const settings = getAllSettings();
    const webhookSecret = settings.stripe_webhook_secret || config.stripeWebhookSecret;
    const stripe = getStripe();
    if (!stripe || !webhookSecret) return reply.code(200).send({ received: true });

    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        (req as unknown as { rawBody: Buffer }).rawBody,
        sig,
        webhookSecret,
      );
    } catch (err) {
      writeLog('error', 'error', 'Stripe webhook signature invalid', {
        message: err instanceof Error ? err.message : String(err),
      });
      return reply.code(400).send('Webhook signature invalid');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === 'paid') {
        const existing = findOrderByPaymentReference(session.id);
        if (!existing) {
          const orderId = session.metadata?.orderId as string;
          if (orderId) {
            markOrderPaid(orderId, session.id);
            const order = findOrderById(orderId);
            writeLog('payment', 'info', 'Stripe payment confirmed via webhook', {
              orderId, orderNumber: order?.order_number, email: order?.email,
              total: order?.total, sessionId: session.id,
            });
            if (order) {
              sendTemplatedEmail('order_confirmation', order.email, {
                order: { ...order, items: findOrderItems(orderId) },
                store: { name: settings.store_name },
              }).catch(() => {});
            }
          }
        }
      }
    }

    return reply.code(200).send({ received: true });
  });

  // POST /checkout/paypal/create — PayPal JS SDK calls this
  fastify.post('/checkout/paypal/create', async (req, reply) => {
    const body = req.body as Record<string, string>;
    const settings = getAllSettings();
    const clientId = settings.paypal_client_id || config.paypalClientId;
    const clientSecret = settings.paypal_client_secret || config.paypalClientSecret;
    const mode = settings.paypal_mode || config.paypalMode;

    if (!clientId || !clientSecret) return reply.code(400).send({ error: 'PayPal not configured' });

    const cart = await getCartPage(req.cartId);
    if (cart.empty) return reply.code(400).send({ error: 'Cart is empty' });

    const currency = (settings.store_currency || 'GBP').toUpperCase();

    try {
      const token = await getPaypalToken(clientId, clientSecret, mode);
      const res = await fetch(`${getPaypalBase(mode)}/v2/checkout/orders`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: currency,
              value: (cart.total.amount / 100).toFixed(2),
              breakdown: {
                item_total: { currency_code: currency, value: (cart.subtotal.amount / 100).toFixed(2) },
                discount: { currency_code: currency, value: ((cart.discountAmount?.amount ?? 0) / 100).toFixed(2) },
              },
            },
            items: cart.items.map(item => ({
              name: item.productTitle + (item.variantTitle !== 'Default' ? ` — ${item.variantTitle}` : ''),
              unit_amount: { currency_code: currency, value: (item.price.amount / 100).toFixed(2) },
              quantity: String(item.quantity),
              category: 'PHYSICAL_GOODS',
            })),
          }],
          application_context: { shipping_preference: 'NO_SHIPPING' },
        }),
      });
      const data = await res.json() as { id: string };

      // Stash address in session for capture step
      req.session.pendingCheckoutAddress = JSON.stringify(parseAddress(body));
      req.session.pendingCheckoutEmail = body.email?.trim() ?? '';

      return reply.send({ id: data.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PayPal error';
      writeLog('error', 'error', 'PayPal order creation failed', { message: msg });
      return reply.code(500).send({ error: msg });
    }
  });

  // POST /checkout/paypal/capture — called after PayPal approval
  fastify.post('/checkout/paypal/capture', async (req, reply) => {
    const body = req.body as { paypalOrderId: string };
    const settings = getAllSettings();
    const clientId = settings.paypal_client_id || config.paypalClientId;
    const clientSecret = settings.paypal_client_secret || config.paypalClientSecret;
    const mode = settings.paypal_mode || config.paypalMode;

    if (!clientId || !clientSecret) return reply.code(400).send({ error: 'PayPal not configured' });

    const cart = await getCartPage(req.cartId);

    try {
      const token = await getPaypalToken(clientId, clientSecret, mode);
      const res = await fetch(`${getPaypalBase(mode)}/v2/checkout/orders/${body.paypalOrderId}/capture`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json() as { status: string; id: string };

      if (data.status !== 'COMPLETED') {
        writeLog('payment', 'error', 'PayPal capture not completed', {
          paypalOrderId: body.paypalOrderId, status: data.status,
        });
        return reply.code(400).send({ error: `PayPal capture status: ${data.status}` });
      }

      const addressRaw = req.session.pendingCheckoutAddress;
      const email = req.session.pendingCheckoutEmail ?? '';
      const address: Address = addressRaw ? JSON.parse(addressRaw) : {
        firstName: '', lastName: '', line1: '', city: '', postcode: '', country: '',
      };

      const order = createOrder({
        email,
        subtotal: cart.subtotal.amount,
        discountAmount: cart.discountAmount?.amount ?? 0,
        shipping: 0,
        total: cart.total.amount,
        currency: settings.store_currency || 'GBP',
        discountCode: cart.discountCode,
        notes: null,
        shippingAddress: address,
        paymentProvider: 'paypal',
        paymentReference: data.id,
        items: cart.items.map(i => ({
          variantId: i.variantId,
          productTitle: i.productTitle,
          variantTitle: i.variantTitle,
          sku: null,
          price: i.price.amount,
          quantity: i.quantity,
        })),
      });

      markOrderPaid(order.id, data.id);
      clearCart(req.cartId);
      delete req.session.pendingCheckoutAddress;
      delete req.session.pendingCheckoutEmail;

      writeLog('payment', 'info', 'PayPal payment confirmed', {
        orderId: order.id, orderNumber: order.order_number, email, total: order.total,
        paypalOrderId: data.id,
      });

      sendTemplatedEmail('order_confirmation', email, {
        order: { ...order, items: findOrderItems(order.id) },
        store: { name: settings.store_name },
      }).catch(() => {});

      return reply.send({ orderId: order.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Capture failed';
      writeLog('error', 'error', 'PayPal capture failed', { message: msg });
      return reply.code(500).send({ error: msg });
    }
  });

  // GET /checkout/success/:orderId — confirmation page
  fastify.get('/checkout/success/:orderId', async (req, reply) => {
    const { orderId } = req.params as { orderId: string };
    const order = findOrderById(orderId);
    if (!order) return reply.redirect('/');

    const items = findOrderItems(orderId);
    const settings = getAllSettings();
    const ctx = await base(req, reply, registry);
    const shippingAddress: Address = (() => {
      try { return JSON.parse(order.shipping_address); } catch { return {}; }
    })();

    await render(registry, reply, 'checkout-success', {
      ...ctx,
      pageTitle: `Order #${order.order_number} confirmed`,
      order: { ...order, items, shippingAddress },
      store: { ...ctx.store, name: settings.store_name },
    });
  });
}
