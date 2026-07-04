**Theme Engine**

**Technical Specification**

Lightweight Edition -- v1.0

May 2026 -- Target audience: Claude Code / Engineering

*Philosophy: Handlebars everywhere. No SPA. Ship fast.*

**1. Guiding Principles**

This spec describes a deliberately lightweight ecommerce platform. Every
decision optimises for shipping speed, simplicity, and a small
dependency footprint. Where the previous spec reached for a dedicated
tool, this version asks: can SQLite, Handlebars, or a few lines of
vanilla JS do the job?

**One template engine.** Handlebars renders the storefront and the
admin. No React, no SPA, no separate frontend build for the admin panel.

**Progressive enhancement with htmx.** The admin and storefront use htmx
for dynamic interactions (add to cart, update config, inline editing).
Pages work without JavaScript; htmx enhances them.

**SQLite does more than you think.** Full-text search, JSON storage
for config, advisory locks for queue-like jobs. No Redis, no
Meilisearch, no separate search service at v1.

**Fewer services = easier self-hosting.** The entire platform is one
Node.js process and one SQLite database. That's it. 

**REST only.** No GraphQL. A clean, well-documented REST API. If
headless users need GraphQL, that's a v2 conversation.

**Images are resized on upload, not on demand.** Three preset sizes
(thumbnail, medium, large) plus the original. No URL-based transform
service.

**2. Tech Stack**

  ------------------- ---------------------------------------------------
  **Component**       **Technology**

  Runtime             Node.js 20+ (Fastify)

  Language            TypeScript (strict)

  Database            SQLite (the only external dependency)

  Templates           Handlebars v4 (storefront + admin)

  Interactivity       htmx 2.x + Alpine.js (minimal, optional)

  CSS                 Tailwind CSS (built at dev/build time via CLI)

  JS Bundling         esbuild (theme assets only -- admin has no build
                      step)

  Image Processing    sharp (resize on upload to preset sizes)

  Email               Nodemailer (SMTP) -- Handlebars templates

  Search              SQLite tsvector full-text search

  Sessions            SQLite-backed sessions (better-sqlite3-session-store)

  Background Jobs     better-queue (SQLite-based job queue)
  ------------------- ---------------------------------------------------

Total external dependencies to run the platform: Node.js and SQLite.
That's it.

**3. Project Structure**

> project-root/
>
> ├── src/
>
> │ ├── server.ts \# Fastify setup, plugin registration
>
> │ ├── config.ts \# Env vars, defaults
>
> │ ├── db/
>
> │ │ ├── connection.ts \# SQLite pool (pg or sqlite.js)
>
> │ │ ├── migrations/ \# SQL migration files
>
> │ │ └── queries/ \# Named SQL queries (no ORM)
>
> │ ├── routes/
>
> │ │ ├── storefront/ \# Public routes: product, collection, cart, etc.
>
> │ │ ├── admin/ \# Admin routes: dashboard, products, orders, themes
>
> │ │ └── api/ \# REST API (JSON): cart ops, webhooks, public API
>
> │ ├── theme/
>
> │ │ ├── engine.ts \# Handlebars compile, render, cache
>
> │ │ ├── helpers.ts \# Built-in Handlebars helpers
>
> │ │ ├── context.ts \# Context builders for each page type
>
> │ │ └── assets.ts \# Asset hashing, serving
>
> │ ├── commerce/
>
> │ │ ├── products.ts \# Product CRUD, variant logic
>
> │ │ ├── collections.ts \# Collection queries, filtering
>
> │ │ ├── cart.ts \# Cart operations
>
> │ │ ├── orders.ts \# Order creation, status management
>
> │ │ ├── customers.ts \# Auth, accounts
>
> │ │ ├── discounts.ts \# Discount engine
>
> │ │ └── payments.ts \# Stripe integration
>
> │ ├── images/
>
> │ │ └── processor.ts \# Upload handling, sharp resize
>
> │ └── jobs/
>
> │ └── index.ts \# pg-boss workers: email, image, webhooks
>
> ├── admin/ \# Admin templates (Handlebars)
>
> │ ├── layouts/
>
> │ │ └── admin.hbs \# Admin shell (nav, sidebar)
>
> │ ├── partials/
>
> │ │ ├── product-form.hbs
>
> │ │ ├── order-row.hbs
>
> │ │ └── \...
>
> │ ├── dashboard.hbs
>
> │ ├── products.hbs
>
> │ ├── product-edit.hbs
>
> │ ├── orders.hbs
>
> │ ├── order-detail.hbs
>
> │ ├── themes.hbs
>
> │ ├── theme-config.hbs
>
> │ └── settings.hbs
>
> ├── themes/
>
> │ └── casper/ \# Default theme (see Section 4)
>
> ├── public/ \# Static files served directly
>
> │ ├── admin.css \# Admin styles (Tailwind, built once)
>
> │ ├── htmx.min.js
>
> │ └── alpine.min.js
>
> ├── cli/
>
> │ └── index.ts \# CLI entry point
>
> ├── package.json
>
> ├── tsconfig.json
>
> └── Dockerfile

**4. Theme File Structure**

Themes are simple directories. No build step is required for a basic
theme --- just Handlebars and CSS. Themes that want Tailwind or
TypeScript can use the optional build pipeline.

> casper/
>
> ├── theme.json \* \# Manifest + config schema
>
> ├── index.hbs \* \# Homepage
>
> ├── product.hbs \* \# Product page
>
> ├── collection.hbs \* \# Collection / category listing
>
> ├── cart.hbs \* \# Cart page
>
> ├── page.hbs \# Generic content page
>
> ├── search.hbs \# Search results
>
> ├── 404.hbs \# Not found
>
> ├── partials/
>
> │ ├── header.hbs
>
> │ ├── footer.hbs
>
> │ ├── product-card.hbs
>
> │ └── pagination.hbs
>
> ├── assets/
>
> │ ├── style.css \# Plain CSS (or Tailwind source)
>
> │ ├── main.js \# Vanilla JS (optional)
>
> │ └── images/
>
> ├── locales/
>
> │ └── en.json \# Translations
>
> └── README.md

4.1 theme.json (Simplified)

The manifest is deliberately minimal. Config options are flat groups of
typed fields. No nested section schemas at v1 --- the homepage renders a
fixed layout controlled by config toggles.

> {
>
> \"name\": \"casper\",
>
> \"version\": \"1.0.0\",
>
> \"engine\": \"\>=1.0.0\",
>
> \"description\": \"Clean, minimal ecommerce theme\",
>
> \"author\": \"Core Team\",
>
> \"config\": {
>
> \"colors\": {
>
> \"primary\": { \"type\": \"color\", \"default\": \"#1A1A2E\",
> \"label\": \"Primary\" },
>
> \"accent\": { \"type\": \"color\", \"default\": \"#E94560\",
> \"label\": \"Accent\" },
>
> \"background\": { \"type\": \"color\", \"default\": \"#FFFFFF\",
> \"label\": \"Background\" }
>
> },
>
> \"typography\": {
>
> \"headingFont\": {
>
> \"type\": \"select\",
>
> \"default\": \"Inter\",
>
> \"options\": \[\"Inter\", \"Playfair Display\", \"Space Grotesk\"\],
>
> \"label\": \"Heading font\"
>
> }
>
> },
>
> \"layout\": {
>
> \"productsPerRow\": { \"type\": \"select\", \"default\": \"3\",
>
> \"options\": \[\"2\", \"3\", \"4\"\], \"label\": \"Products per row\"
> },
>
> \"showHero\": { \"type\": \"boolean\", \"default\": true, \"label\":
> \"Show homepage hero\" },
>
> \"heroHeading\": { \"type\": \"text\", \"default\": \"Welcome\",
> \"label\": \"Hero heading\" },
>
> \"heroImage\": { \"type\": \"image\", \"default\": \"\", \"label\":
> \"Hero image\" },
>
> \"featuredCollection\": { \"type\": \"text\", \"default\": \"\",
>
> \"label\": \"Featured collection slug\" }
>
> }
>
> }
>
> }

**5. Template Data Contract**

Every template receives a context object. These TypeScript interfaces
are the contract between the platform and theme developers. They should
be published as a standalone \@types package.

5.1 Global Context

> interface GlobalContext {
>
> store: {
>
> name: string;
>
> url: string;
>
> logo: string \| null;
>
> currency: { code: string; symbol: string; position: \'before\' \|
> \'after\' };
>
> };
>
> theme: {
>
> config: Record\<string, Record\<string, any\>\>;
>
> };
>
> cart: {
>
> itemCount: number;
>
> subtotal: Money;
>
> };
>
> customer: { loggedIn: boolean; firstName: string \| null } \| null;
>
> navigation: { main: NavItem\[\]; footer: NavItem\[\] };
>
> currentPath: string;
>
> t: (key: string, params?: Record\<string, string\>) =\> string;
>
> }
>
> interface Money {
>
> amount: number; // Minor units (cents/pence)
>
> formatted: string; // Pre-formatted: \'\$29.99\'
>
> currency: string; // ISO: \'USD\'
>
> }
>
> interface NavItem {
>
> label: string;
>
> url: string;
>
> active: boolean;
>
> children: NavItem\[\];
>
> }

5.2 Product Context

> interface ProductContext extends GlobalContext {
>
> product: {
>
> id: string;
>
> title: string;
>
> slug: string;
>
> description: string; // HTML
>
> price: Money;
>
> compareAtPrice: Money \| null;
>
> onSale: boolean;
>
> images: Image\[\]; // { url, alt, thumbnail, medium, large }
>
> variants: Variant\[\];
>
> options: { name: string; values: string\[\] }\[\];
>
> available: boolean;
>
> vendor: string \| null;
>
> tags: string\[\];
>
> relatedProducts: ProductSummary\[\];
>
> };
>
> }
>
> interface Image {
>
> original: string;
>
> thumbnail: string; // 200px wide
>
> medium: string; // 600px wide
>
> large: string; // 1200px wide
>
> alt: string;
>
> }
>
> interface Variant {
>
> id: string;
>
> title: string; // \'Large / Red\'
>
> price: Money;
>
> compareAtPrice: Money \| null;
>
> sku: string \| null;
>
> available: boolean;
>
> options: Record\<string, string\>;
>
> image: Image \| null;
>
> }

5.3 Collection Context

> interface CollectionContext extends GlobalContext {
>
> collection: {
>
> id: string;
>
> title: string;
>
> slug: string;
>
> description: string \| null;
>
> image: Image \| null;
>
> products: ProductSummary\[\];
>
> pagination: {
>
> currentPage: number;
>
> totalPages: number;
>
> hasNext: boolean;
>
> hasPrev: boolean;
>
> nextUrl: string \| null;
>
> prevUrl: string \| null;
>
> };
>
> sort: {
>
> current: string;
>
> options: { value: string; label: string }\[\];
>
> };
>
> };
>
> }

5.4 Cart Context

> interface CartPageContext extends GlobalContext {
>
> cart: {
>
> items: CartItem\[\];
>
> itemCount: number;
>
> subtotal: Money;
>
> discountCode: string \| null;
>
> discountAmount: Money \| null;
>
> total: Money;
>
> empty: boolean;
>
> checkoutUrl: string;
>
> };
>
> }
>
> interface CartItem {
>
> id: string;
>
> productTitle: string;
>
> variantTitle: string;
>
> quantity: number;
>
> price: Money;
>
> lineTotal: Money;
>
> image: Image;
>
> productSlug: string;
>
> variantId: string;
>
> }

**6. Built-in Handlebars Helpers**

A small, focused set. Themes can do most things with standard Handlebars
({{#each}}, {{#if}}, {{#with}}) plus these:

6.1 Commerce

> {{money price}} // \'\$29.99\'
>
> {{#if product.onSale}}
>
> \<span class=\"sale\"\>{{money product.price}}\</span\>
>
> \<s\>{{money product.compareAtPrice}}\</s\>
>
> {{/if}}
>
> {{stock_badge variant}} // \'In Stock\' \| \'Low Stock\' \| \'Sold
> Out\'

6.2 Assets & URLs

> {{asset \"style.css\"}} // Versioned URL:
> /theme/assets/style.abc123.css
>
> {{url \"product\" product.slug}} // /products/cool-shirt
>
> {{url \"collection\" \"all\"}} // /collections/all
>
> {{url \"cart\"}} // /cart
>
> {{pagination collection.pagination}} // Renders prev/next

6.3 Utility

> {{#is currentPath \"/\"}}active{{/is}}
>
> {{#if_eq variant.options.size \"L\"}}selected{{/if_eq}}
>
> {{pluralize count \"item\" \"items\"}}
>
> {{truncate description 150}}
>
> {{t \"cart.empty\"}} // i18n
>
> {{json product}} // Debug output
>
> {{csrf_field}} // \<input type=\"hidden\" name=\"\_csrf\"
> value=\"\...\"\>
>
> {{timestamp order.createdAt \"DD MMM YYYY\"}}

6.4 SEO

> {{meta_title}}
>
> {{meta_description}}
>
> {{canonical_url}}
>
> {{structured_data}} // JSON-LD \<script\> tag

**7. htmx Interaction Patterns**

htmx is the primary mechanism for dynamic behaviour on both the
storefront and admin. The server returns HTML fragments; htmx swaps them
into the page. No client-side state management, no JSON parsing, no API
response formatting for the frontend.

7.1 Storefront: Add to Cart

> \<!\-- product.hbs \--\>
>
> \<form hx-post=\"/cart/add\"
>
> hx-target=\"#cart-count\"
>
> hx-swap=\"outerHTML\"
>
> hx-indicator=\"#add-spinner\"\>
>
> {{csrf_field}}
>
> \<input type=\"hidden\" name=\"variantId\"
> value=\"{{product.variants.0.id}}\"\>
>
> \<input type=\"number\" name=\"quantity\" value=\"1\" min=\"1\"\>
>
> \<button type=\"submit\"\>Add to Cart\</button\>
>
> \<span id=\"add-spinner\"
> class=\"htmx-indicator\"\>Adding\...\</span\>
>
> \</form\>
>
> \<!\-- Server returns an HTML fragment: \--\>
>
> \<span id=\"cart-count\" class=\"badge\"\>3\</span\>

7.2 Storefront: Cart Updates

> \<!\-- cart.hbs \--\>
>
> \<div id=\"cart-contents\"\>
>
> {{#each cart.items}}
>
> \<div class=\"cart-item\"\>
>
> \<img src=\"{{this.image.thumbnail}}\" alt=\"{{this.productTitle}}\"\>
>
> \<span\>{{this.productTitle}} -- {{this.variantTitle}}\</span\>
>
> \<input type=\"number\" value=\"{{this.quantity}}\"
>
> hx-post=\"/cart/update\"
>
> hx-target=\"#cart-contents\"
>
> hx-swap=\"outerHTML\"
>
> hx-vals=\'{\"itemId\": \"{{this.id}}\"}\'
>
> hx-trigger=\"change\"
>
> name=\"quantity\"\>
>
> \<button hx-delete=\"/cart/remove/{{this.id}}\"
>
> hx-target=\"#cart-contents\"
>
> hx-swap=\"outerHTML\"\>×\</button\>
>
> \<span\>{{money this.lineTotal}}\</span\>
>
> \</div\>
>
> {{/each}}
>
> \</div\>

7.3 Admin: Product Edit (Inline Save)

> \<!\-- admin/product-edit.hbs \--\>
>
> \<form hx-put=\"/admin/products/{{product.id}}\"
>
> hx-target=\"#save-status\"
>
> hx-swap=\"innerHTML\"\>
>
> {{csrf_field}}
>
> \<input name=\"title\" value=\"{{product.title}}\"\>
>
> \<textarea name=\"description\"\>{{product.description}}\</textarea\>
>
> \<input name=\"price\" type=\"number\" step=\"0.01\"
> value=\"{{product.priceDecimal}}\"\>
>
> \<button type=\"submit\"\>Save\</button\>
>
> \<span id=\"save-status\"\>\</span\>
>
> \</form\>
>
> \<!\-- Server returns: \--\>
>
> \<span class=\"text-green-600\"\>✓ Saved\</span\>

7.4 Admin: Theme Config (Live Preview)

> \<!\-- admin/theme-config.hbs \--\>
>
> \<div class=\"grid grid-cols-2\"\>
>
> \<!\-- Left: config form \--\>
>
> \<form hx-put=\"/admin/themes/{{theme.id}}/config\"
>
> hx-target=\"#preview-frame\"
>
> hx-swap=\"outerHTML\"
>
> hx-trigger=\"change delay:300ms\"\>
>
> {{csrf_field}}
>
> {{#each configFields}}
>
> {{\> (lookup this \"type\") this}} \<!\-- Renders color/select/boolean
> partial \--\>
>
> {{/each}}
>
> \<button type=\"submit\"\>Save\</button\>
>
> \</form\>
>
> \<!\-- Right: live preview iframe \--\>
>
> \<iframe id=\"preview-frame\" src=\"/?preview=true\"\>\</iframe\>
>
> \</div\>
>
> \<!\-- On form change, htmx saves config and returns an updated iframe
> tag.
>
> The iframe reloads with the new config applied. Simple. \--\>

7.5 Server-Side Pattern for htmx Routes

Every route that htmx hits returns a full page for normal requests and
an HTML fragment for htmx requests. Fastify checks the HX-Request
header:

> // Pattern used across all routes
>
> app.post(\'/cart/add\', async (req, reply) =\> {
>
> const { variantId, quantity } = req.body;
>
> const cart = await cartService.addItem(req.session.cartId, variantId,
> quantity);
>
> if (req.headers\[\'hx-request\'\]) {
>
> // htmx request: return just the fragment
>
> return reply.html(renderPartial(\'cart-count\', { cart }));
>
> }
>
> // Normal request (no JS): redirect to cart page
>
> return reply.redirect(\'/cart\');
>
> });

**8. Rendering Pipeline**

8.1 Request Lifecycle

1.  Fastify receives request. Middleware runs: session, CSRF, locale
    detection.

2.  Router matches URL to a route type and handler.

3.  Handler queries SQLite (single query or small batch via
    Promise.all).

4.  Context builder merges global context + page data + resolved theme
    config.

5.  Theme engine compiles template (cached LRU) and renders to HTML
    string.

6.  If htmx request: return fragment. Otherwise: wrap in layout, inject
    asset tags, return full page.

7.  Target: under 100ms for cached data, under 300ms cold.

8.2 Template Engine Implementation

> import Handlebars from \'handlebars\';
>
> import { LRUCache } from \'lru-cache\';
>
> import fs from \'fs/promises\';
>
> import path from \'path\';
>
> export class ThemeEngine {
>
> private cache = new LRUCache\<string, HandlebarsTemplateDelegate\>({
> max: 100 });
>
> private themePath: string;
>
> private hbs: typeof Handlebars;
>
> constructor(themePath: string) {
>
> this.themePath = themePath;
>
> this.hbs = Handlebars.create(); // Isolated instance
>
> this.registerHelpers();
>
> }
>
> async init() {
>
> await this.registerPartials();
>
> }
>
> async render(templateName: string, context: GlobalContext):
> Promise\<string\> {
>
> const key = \`\${this.themePath}:\${templateName}\`;
>
> let compiled = this.cache.get(key);
>
> if (!compiled) {
>
> const src = await fs.readFile(
>
> path.join(this.themePath, \`\${templateName}.hbs\`), \'utf-8\'
>
> );
>
> compiled = this.hbs.compile(src, { preventIndent: true });
>
> this.cache.set(key, compiled);
>
> }
>
> return compiled(context);
>
> }
>
> invalidateAll() {
>
> this.cache.clear();
>
> }
>
> private async registerPartials() {
>
> const partialsDir = path.join(this.themePath, \'partials\');
>
> const files = await fs.readdir(partialsDir, { recursive: true });
>
> for (const file of files) {
>
> if (!file.endsWith(\'.hbs\')) continue;
>
> const name = file.replace(/\\.hbs\$/, \'\').replace(/\[\\\\/\]/g,
> \'/\');
>
> const src = await fs.readFile(path.join(partialsDir, file),
> \'utf-8\');
>
> this.hbs.registerPartial(name, src);
>
> }
>
> }
>
> private registerHelpers() {
>
> // See Section 6 for full list
>
> this.hbs.registerHelper(\'money\', (m: Money) =\> m.formatted);
>
> this.hbs.registerHelper(\'asset\', (p: string) =\> this.assetUrl(p));
>
> // \... etc
>
> }
>
> }

8.3 Caching (SQLite-only, no Redis)

At v1, caching is simple and doesn't require Redis:

-   Template compilation: in-memory LRU cache (100 entries). Invalidated
    on theme file change or theme switch.

-   Data queries: SQLite query result caching via a thin in-memory TTL
    cache (Map + setTimeout). 60-second TTL. Invalidated on writes.

-   Full page caching: not at v1. The rendering pipeline is fast enough
    without it. Add CDN-level caching for Cloud tier later.

-   Asset files: served with Cache-Control: immutable, max-age=31536000
    because filenames include content hashes.

**9. Image Handling**

Images are processed once on upload, not on demand. This is simpler to
implement, simpler to cache, and avoids the complexity of a URL-based
transform service.

9.1 Upload Processing

> import sharp from \'sharp\';
>
> const SIZES = {
>
> thumbnail: { width: 200, suffix: \'-thumb\' },
>
> medium: { width: 600, suffix: \'-med\' },
>
> large: { width: 1200, suffix: \'-lg\' },
>
> } as const;
>
> async function processImage(inputBuffer: Buffer, filename: string):
> Promise\<ImageSet\> {
>
> const ext = path.extname(filename);
>
> const base = path.basename(filename, ext);
>
> const hash = contentHash(inputBuffer).slice(0, 8);
>
> const results: Partial\<ImageSet\> = {};
>
> // Save original
>
> const originalName = \`\${base}-\${hash}\${ext}\`;
>
> await fs.writeFile(path.join(uploadDir, originalName), inputBuffer);
>
> results.original = \`/uploads/\${originalName}\`;
>
> // Generate sizes
>
> for (const \[key, config\] of Object.entries(SIZES)) {
>
> const resized = await sharp(inputBuffer)
>
> .resize(config.width, null, { withoutEnlargement: true })
>
> .webp({ quality: 80 })
>
> .toBuffer();
>
> const name = \`\${base}-\${hash}\${config.suffix}.webp\`;
>
> await fs.writeFile(path.join(uploadDir, name), resized);
>
> results\[key\] = \`/uploads/\${name}\`;
>
> }
>
> return results as ImageSet;
>
> }

9.2 Template Usage

> \<!\-- Simple: use the medium size \--\>
>
> \<img src=\"{{product.images.0.medium}}\"
> alt=\"{{product.images.0.alt}}\"\>
>
> \<!\-- Responsive: use srcset with the preset sizes \--\>
>
> \<img src=\"{{product.images.0.medium}}\"
>
> srcset=\"{{product.images.0.thumbnail}} 200w,
>
> {{product.images.0.medium}} 600w,
>
> {{product.images.0.large}} 1200w\"
>
> sizes=\"(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw\"
>
> alt=\"{{product.images.0.alt}}\"
>
> loading=\"lazy\"\>

**10. Admin Panel Architecture**

The admin is server-rendered Handlebars with htmx for interactivity. It
shares the same Fastify server and template engine as the storefront. No
separate build step, no npm run dev for the frontend, no API consumption
layer.

10.1 Admin Layout

> \<!\-- admin/layouts/admin.hbs \--\>
>
> \<!DOCTYPE html\>
>
> \<html\>
>
> \<head\>
>
> \<title\>{{pageTitle}} -- Admin\</title\>
>
> \<link rel=\"stylesheet\" href=\"/public/admin.css\"\>
>
> \<script src=\"/public/htmx.min.js\"\>\</script\>
>
> \<script src=\"/public/alpine.min.js\" defer\>\</script\>
>
> \</head\>
>
> \<body class=\"bg-gray-50\"\>
>
> \<nav class=\"sidebar\"\>
>
> \<a href=\"/admin\"\>Dashboard\</a\>
>
> \<a href=\"/admin/products\"\>Products\</a\>
>
> \<a href=\"/admin/orders\"\>Orders\</a\>
>
> \<a href=\"/admin/customers\"\>Customers\</a\>
>
> \<a href=\"/admin/themes\"\>Themes\</a\>
>
> \<a href=\"/admin/settings\"\>Settings\</a\>
>
> \</nav\>
>
> \<main class=\"content\"\>
>
> {{{body}}}
>
> \</main\>
>
> \</body\>
>
> \</html\>

10.2 Admin Route Pattern

> // All admin routes follow this pattern:
>
> app.get(\'/admin/products\', { preHandler: requireAdmin }, async (req,
> reply) =\> {
>
> const products = await productService.list({
>
> page: req.query.page \|\| 1,
>
> search: req.query.q,
>
> });
>
> return reply.view(\'admin/products\', {
>
> pageTitle: \'Products\',
>
> products,
>
> layout: \'admin/layouts/admin\',
>
> });
>
> });

Alpine.js is included for the few cases where htmx alone is awkward:
dropdown menus, modal dialogs, multi-image upload previews, variant
option builder. It's loaded as a single script tag with no build step.

**11. Theme Management API**

  ------------ ---------------------------- ----------------------------------
  **Method**   **Endpoint**                 **Description**

  GET          /admin/themes                List installed themes (HTML page)

  POST         /admin/themes/upload         Upload and install theme (zip)

  PUT          /admin/themes/:id/activate   Set as active theme

  GET          /admin/themes/:id/config     Theme config editor page

  PUT          /admin/themes/:id/config     Save config overrides (htmx)

  DELETE       /admin/themes/:id            Delete theme

  GET          /api/themes                  JSON API: list themes (for CLI /
                                            external use)

  POST         /api/themes/upload           JSON API: upload theme (for CLI)
  ------------ ---------------------------- ----------------------------------

Note the two sets of routes: /admin/\* routes return HTML (used by the
browser admin). /api/\* routes return JSON (used by the CLI and any
future integrations). The underlying service layer is shared.

**12. Database Schema**

Minimal schema for theme-related data. The full commerce schema
(products, orders, customers) is a separate document.

> CREATE TABLE themes (
>
> id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
>
> name VARCHAR(100) NOT NULL,
>
> slug VARCHAR(100) NOT NULL UNIQUE,
>
> version VARCHAR(20) NOT NULL,
>
> manifest JSONB NOT NULL,
>
> config_overrides JSONB DEFAULT \'{}\',
>
> active BOOLEAN DEFAULT false,
>
> file_path VARCHAR(500) NOT NULL,
>
> asset_manifest JSONB DEFAULT \'{}\',
>
> created_at TIMESTAMPTZ DEFAULT NOW(),
>
> updated_at TIMESTAMPTZ DEFAULT NOW()
>
> );
>
> \-- Only one active theme at a time
>
> CREATE UNIQUE INDEX idx_active_theme ON themes (active) WHERE active =
> true;
>
> \-- Full-text search index for products (not theme-specific, but
> relevant)
>
> ALTER TABLE products ADD COLUMN search_vector tsvector
>
> GENERATED ALWAYS AS (
>
> setweight(to_tsvector(\'english\', coalesce(title, \'\')), \'A\') \|\|
>
> setweight(to_tsvector(\'english\', coalesce(description_plain, \'\')),
> \'B\') \|\|
>
> setweight(to_tsvector(\'english\', coalesce(vendor, \'\')), \'C\')
> \|\|
>
> setweight(to_tsvector(\'english\', coalesce(tags_text, \'\')), \'C\')
>
> ) STORED;
>
> CREATE INDEX idx_products_search ON products USING GIN
> (search_vector);
>
> \-- Search query:
>
> \-- SELECT \* FROM products
>
> \-- WHERE search_vector @@ plainto_tsquery(\'english\', \$1)
>
> \-- ORDER BY ts_rank(search_vector, plainto_tsquery(\'english\', \$1))
> DESC;

**13. Search (SQLite Full-Text)**

No external search service. SQLite tsvector handles product search
with relevance ranking, typo tolerance (via prefix matching), and
weighting (title matches rank higher than description matches). This
comfortably handles catalogues up to \~50,000 products.

> // Search service
>
> async function searchProducts(query: string, options: {
>
> page?: number;
>
> perPage?: number;
>
> collectionId?: string;
>
> } = {}): Promise\<{ products: ProductSummary\[\]; total: number }\> {
>
> const { page = 1, perPage = 24, collectionId } = options;
>
> const offset = (page - 1) \* perPage;
>
> // Prefix matching for partial words: \'blue sne\' matches \'blue
> sneakers\'
>
> const tsQuery = query.split(/\\s+/)
>
> .map(word =\> \`\${word}:\*\`)
>
> .join(\' & \');
>
> const result = await db.query(\`
>
> SELECT p.\*, ts_rank(search_vector, to_tsquery(\'english\', \$1)) AS
> rank
>
> FROM products p
>
> \${collectionId ? \'JOIN collection_products cp ON cp.product_id =
> p.id\' : \'\'}
>
> WHERE search_vector @@ to_tsquery(\'english\', \$1)
>
> AND p.published = true
>
> \${collectionId ? \'AND cp.collection_id = \$4\' : \'\'}
>
> ORDER BY rank DESC
>
> LIMIT \$2 OFFSET \$3
>
> \`, \[tsQuery, perPage, offset, collectionId\].filter(Boolean));
>
> return { products: result.rows, total: result.rowCount };
>
> }

**14. Asset Pipeline**

Theme assets are processed at theme activation/build time. For basic
themes (plain CSS and JS), no processing is needed --- files are served
directly with a content hash in the URL.

> // Asset serving and hashing
>
> import { createHash } from \'crypto\';
>
> function contentHash(content: Buffer \| string): string {
>
> return createHash(\'sha256\')
>
> .update(content)
>
> .digest(\'hex\')
>
> .slice(0, 8);
>
> }
>
> async function buildAssetManifest(themePath: string):
> Promise\<Record\<string, string\>\> {
>
> const assetsDir = path.join(themePath, \'assets\');
>
> const manifest: Record\<string, string\> = {};
>
> for (const file of await glob(assetsDir)) {
>
> const content = await fs.readFile(file);
>
> const hash = contentHash(content);
>
> const ext = path.extname(file);
>
> const base = path.basename(file, ext);
>
> const hashed = \`\${base}.\${hash}\${ext}\`;
>
> manifest\[path.relative(assetsDir, file)\] = hashed;
>
> }
>
> return manifest;
>
> // Saved to themes.asset_manifest in the database
>
> }
>
> // The {{asset}} helper resolves: \'style.css\' -\>
> \'/theme/assets/style.a1b2c3d4.css\'
>
> // Fastify serves /theme/assets/\* from the active theme\'s assets/
> directory
>
> // with Cache-Control: public, max-age=31536000, immutable

For themes using Tailwind or TypeScript, the optional build step runs
esbuild and Tailwind CLI. This runs on cartforge theme:build or
automatically on upload. The built files replace the source files in the
asset manifest.

**15. Developer Tooling**

15.1 CLI Commands

  ------------------------- ---------------------------------------------
  **Command**               **Description**

  cartforge start           Start the server (storefront + admin)

  cartforge dev             Start with hot reload (watches theme + src)

  cartforge theme:create    Scaffold a new theme from starter template
  \<name\>                  

  cartforge theme:dev       Watch theme files, hot reload storefront

  cartforge theme:build     Build theme assets (Tailwind, esbuild)

  cartforge theme:validate  Validate theme structure and templates

  cartforge theme:zip       Package for upload or distribution

  cartforge db:migrate      Run pending database migrations

  cartforge db:seed         Seed database with sample products

  cartforge export          Export all data (JSON + images)

  cartforge import          Import data (JSON, CSV, WooCommerce)
  ------------------------- ---------------------------------------------

15.2 Hot Reload

> // Dev mode: file watcher + WebSocket
>
> import chokidar from \'chokidar\';
>
> import { WebSocketServer } from \'ws\';
>
> function startDevMode(themePath: string, port: number) {
>
> const wss = new WebSocketServer({ port: port + 1 }); // e.g. 3001
>
> const watcher = chokidar.watch(themePath, {
>
> ignored: /node_modules/,
>
> persistent: true,
>
> });
>
> watcher.on(\'change\', async (filePath) =\> {
>
> const ext = path.extname(filePath);
>
> if (ext === \'.hbs\') {
>
> themeEngine.invalidateAll();
>
> broadcast(wss, { type: \'reload\' });
>
> } else if (ext === \'.css\' \|\| ext === \'.pcss\') {
>
> await rebuildCSS(themePath);
>
> broadcast(wss, { type: \'css-reload\' }); // Inject without full
> reload
>
> } else if (ext === \'.js\' \|\| ext === \'.ts\') {
>
> await rebuildJS(themePath);
>
> broadcast(wss, { type: \'reload\' });
>
> }
>
> console.log(\`\\u21BB \${path.relative(themePath, filePath)}
> changed\`);
>
> });
>
> // Inject reload script into pages in dev mode
>
> // \<script\>new WebSocket(\'ws://localhost:3001\').onmessage = (e)
> =\> {
>
> // const msg = JSON.parse(e.data);
>
> // if (msg.type === \'reload\') location.reload();
>
> // if (msg.type === \'css-reload\') {
>
> // document.querySelector(\'link\[rel=stylesheet\]\').href += \'?\' +
> Date.now();
>
> // }
>
> // };\</script\>
>
> }

**16. Security**

-   Handlebars auto-escapes all output by default. Triple-stache
    {{{raw}}} is available but should be used only for pre-sanitised
    HTML (product descriptions).

-   CSRF tokens on all POST/PUT/DELETE routes, via the {{csrf_field}}
    helper and a Fastify plugin.

-   Admin routes behind session-based auth with requireAdmin middleware.

-   Template rendering has a 5-second timeout. If a template takes
    longer, the request fails with a 500.

-   Theme uploads are validated: zip integrity, no symlinks, no path
    traversal, manifest schema check, template syntax check.

-   Uploaded theme JS is served as static files (not executed
    server-side). Themes cannot run arbitrary Node.js code.

-   Content Security Policy header on all storefront pages: no inline
    scripts, no eval, same-origin default.

-   Passwords hashed with argon2id. Sessions stored in SQLite with
    secure cookie flags (httpOnly, sameSite, secure in production).

**17. Implementation Plan**

Six phases, each producing a testable working increment. Estimated 6--8
weeks for a solo developer with Claude Code.

Phase 1: Skeleton (Week 1)

Goal: Fastify serves a Handlebars page with mock data.

-   Fastify + TypeScript project setup

-   Handlebars engine with partial registration

-   Starter theme: index.hbs, product.hbs, collection.hbs, cart.hbs with
    minimal HTML/Tailwind

-   Asset serving with content hashing

-   GlobalContext builder with hardcoded data

-   {{money}}, {{asset}}, {{url}}, {{csrf_field}} helpers

-   Deliverable: visit localhost:3000 and see a rendered homepage with
    product cards

Phase 2: Data Layer (Week 2)

Goal: real products from SQLite, working cart.

-   SQLite schema: products, variants, collections, cart, cart_items

-   SQL migrations via cartforge db:migrate

-   Seed command with sample data (cartforge db:seed)

-   Product, collection, and cart route handlers with real queries

-   Cart operations via htmx: add, update quantity, remove

-   CSRF protection

-   Deliverable: browse products, add to cart, view cart --- all with
    real data

Phase 3: Admin Panel (Week 3--4)

Goal: manage products and orders from the browser.

-   Admin layout template with sidebar navigation

-   Session-based auth: login, logout, requireAdmin middleware

-   Dashboard page: recent orders, basic stats (SQL aggregates)

-   Product CRUD: list, create, edit, delete (htmx forms)

-   Image upload with sharp processing (thumbnail, medium, large, WebP)

-   Order list and detail views

-   Customer list

-   Deliverable: full admin panel for managing products and viewing
    orders

Phase 4: Theme System (Week 5)

Goal: themes can be uploaded, activated, and configured.

-   theme.json parser and validator (JSON Schema)

-   Config resolver: theme defaults merged with merchant overrides

-   CSS custom properties generated from config colours

-   Theme upload endpoint with validation (zip, manifest, templates,
    security)

-   Theme activation and switching

-   Config editor page with live preview iframe

-   Themes table in SQLite

-   Deliverable: upload a zip, activate it, customise colours and fonts
    in the admin

Phase 5: Checkout & Payments (Week 6)

Goal: a customer can buy something.

-   Checkout flow: customer info → shipping → payment → confirmation

-   Stripe integration (Payment Intents API)

-   Order creation on successful payment

-   Confirmation page and email (Handlebars email templates, Nodemailer)

-   Discount codes (percentage, fixed amount)

-   pg-boss for background jobs: send email, fire webhooks

-   Deliverable: end-to-end purchase flow with Stripe test mode

Phase 6: Polish & Ship (Week 7--8)

Goal: production-ready for self-hosters.

-   SQLite full-text search (tsvector) + search results page

-   Customer accounts: register, login, order history

-   SEO: meta tags, JSON-LD, canonical URLs, sitemap.xml

-   i18n: locale files, {{t}} helper

-   CLI: theme:create, theme:dev (hot reload), theme:build,
    theme:validate, theme:zip

-   Dockerfile + docker-compose.yml (app + SQLite)

-   README, getting started guide, theme development guide

-   Deliverable: clone, docker compose up, start selling

**18. Explicitly Out of Scope (v1)**

Saying no is as important as saying yes. These are all good features
that belong in v2+, not v1:

-   GraphQL API

-   React or SPA admin

-   Redis (SQLite does sessions, queues, and caching at v1 scale)

-   Meilisearch or Algolia (SQLite full-text search is sufficient)

-   Drag-and-drop homepage section editor

-   Multi-currency

-   Multi-language storefronts (i18n for theme strings is in, full
    multi-language content is out)

-   Plugin/extension system (themes are the only extensibility mechanism
    at v1)

-   Theme marketplace

-   On-demand image transforms (URL-based resizing service)

-   Subscriptions / recurring billing

-   B2B features

-   Managed cloud hosting (ship self-hosted first, cloud comes after
    validation)

**19. Testing**

  -------------- --------------------- -----------------------------------
  **Type**       **Tool**              **Covers**

  Unit           Vitest                Helpers, config resolver, cart
                                       logic, discount engine, search
                                       query builder

  Integration    Vitest + Supertest    Route handlers, template rendering,
                                       htmx fragment responses, auth flow

  E2E            Playwright            Browse → add to cart → checkout.
                                       Admin: create product, upload
                                       theme.
  -------------- --------------------- -----------------------------------

Node + SQLite + Handlebars + htmx. Ship it.
