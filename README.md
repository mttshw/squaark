# Squaark

A lightweight, self-hosted ecommerce platform. One Node.js process, one SQLite
database - no Redis, no separate search service, no SPA build step.

## Requirements

- Node.js 20 or 22 (LTS). Stick to an LTS line - `better-sqlite3` and `sharp`
  ship prebuilt binaries for supported Node versions, and a very new/current
  release (e.g. Node 26) may have no prebuilt binary yet, forcing a from-source
  compile that can fail on compiler version mismatches.
- npm

`better-sqlite3` and `sharp` compile native bindings on install if no
prebuilt binary matches your platform/Node version, so on Linux you'll need a
C++ toolchain available (`build-essential` on Debian/Ubuntu, `apk add python3
make g++` on Alpine - see the `Dockerfile` if you'd rather skip this
entirely).

## Quick start

```bash
git clone <this repo>
cd squaark
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin). With no admin
account yet, you'll land on a one-time setup page - create your name, email,
and password there.

That's the whole install. The database schema is created automatically on
first boot (and on every boot after that, it's a no-op if there's nothing new
to apply) - there's no separate migration step to remember.

## After logging in

A fresh store is functional but empty. Worth doing next, in this order:

1. **Settings → Store** - set your store name, currency, and contact email.
2. **Settings → Email** - configure how order/account emails get sent.
   Defaults to logging emails to the server console (fine for local dev).
   For anything real, pick a provider:
   - **Resend** - paste an API key, done.
   - **Custom SMTP** - works with any provider (Gmail, SES, Mailgun, Postmark, etc.).

   Use the "Send test email" button on that page to confirm it's working.
3. **Emails** - the transactional email templates (order confirmation, order
   shipped, admin new-order notice, password reset) live here. Each is
   editable Handlebars, with a live preview against sample data.
4. **Themes** - the bundled `linen` theme is active by default. Upload and
   activate a different theme, or customise colours/fonts/layout from its
   config page, including homepage featured sections (pick a collection and
   how many products to show, per section).
5. **Pages** - build pages from a section builder (text, image, image + text,
   call to action, columns), or import existing pages from a WordPress export
   via **Import**.
6. **Navigation** - edit the main and footer nav links shown by the active
   theme.
7. **Products / Collections** - run `npm run db:seed` for sample catalogue
   data to explore with, or start adding your own.

## Scripts

| Command            | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Start the server with hot reload (tsx watch)          |
| `npm start`         | Start the built server (`npm run build` first)        |
| `npm run build`     | Compile TypeScript to `dist/` and copy migration SQL files alongside it |
| `npm run db:migrate`| Apply any pending database migrations manually        |
| `npm run db:seed`   | Seed the database with sample products/collections    |
| `npm run css:build` | Rebuild the default theme's Tailwind CSS (minified)   |
| `npm run css:watch` | Rebuild the default theme's CSS on change             |

You only need the `css:*` scripts if you're editing the bundled theme's
styles - the shipped `themes/linen/assets/style.css` is already built.

## Configuration

All runtime config is via environment variables - copy `.env.example` to
`.env` and adjust as needed:

| Variable          | Default              | Notes                                   |
| ----------------- | --------------------- | ---------------------------------------- |
| `PORT`            | `3000`                |                                          |
| `HOST`            | `0.0.0.0`             |                                          |
| `NODE_ENV`        | `development`         | Set to `production` when deploying      |
| `THEME_DIR`       | `themes/linen`        | Active theme's directory                |
| `UPLOADS_DIR`     | `uploads`             | Product image uploads                   |
| `SESSION_SECRET`  | (dev default - change this) | Must be a strong random value in production |
| `DATABASE_PATH`   | `data/store.db`       | SQLite file location                    |

Store-level settings (name, currency, logo, email provider, etc.) are
configured from the admin UI, not environment variables, so they can be
changed without a redeploy.

## Running with Docker

```bash
docker compose up
```

This builds the app image (multi-stage - compiles in a build stage, ships only
the compiled output and production `node_modules` in the final image) and
starts a single container with a persistent volume for the SQLite database.
Not required - `npm run build && node dist/server.js` works anywhere Node 20
or 22 runs - but it saves you from compiling native modules yourself and
matches the one-command self-host story above.

Note: `docker-compose.yml` only mounts a volume for `/data` (the database).
Uploaded product/theme images live under `/app/uploads` inside the container
and aren't persisted across container recreation unless you add a volume for
that path too.

## Project structure

See [theme_engine_spec.md](theme_engine_spec.md) for the full technical
specification (rendering pipeline, theme file format, Handlebars helpers,
htmx conventions). In short:

- `src/routes/` - Fastify routes: `storefront/`, `admin/`, `api/`
- `src/commerce/` - products, collections, cart, orders
- `src/theme/` - Handlebars engine, helpers, context builders
- `src/email/` - transactional email transports, templates, sending
- `src/db/migrations/` - SQL migration files, applied automatically on boot
- `themes/linen/` - the bundled default theme
- `admin/` - admin panel Handlebars templates
