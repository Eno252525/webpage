# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

IT Store (itstore.al) — a custom Node.js / Express 5 / SQLite storefront for a refurbished-computer shop in Tirana, Albania. It replaced a WooCommerce/WordPress site. There is **no checkout**: customers inquire per product via WhatsApp. UI language is Albanian (`sq`).

## Commands

- `npm install` — install dependencies (`better-sqlite3` is a native module, rebuilt per platform; never copy `node_modules` between OSes). A project `.npmrc` sets `omit=dev`, so this skips devDependencies (`puppeteer`, `xlsx`); run `npm install --include=dev` to get them for local screenshot/data tooling.
- `node setup.js` — generate `JWT_SECRET` + `ADMIN_PASSWORD_HASH` into `.env`; required before the first start
- `node server.js` — start the server (defaults to `http://localhost:3000`; `PORT` from `.env`)
- `node screenshot.mjs http://localhost:3000 [label]` — Puppeteer screenshot → `temporary screenshots/screenshot-N[-label].png` (auto-incremented)
- `node scripts/optimize-images.mjs` — convert `uploads/` images to WebP and repoint the DB (idempotent; backs the DB up first)

No test suite or linter is configured. The server **fails fast on startup** if `JWT_SECRET` or `ADMIN_PASSWORD_HASH` is missing — `.env` must exist and be populated.

## Architecture

### Request pipeline (`server.js`) — order is load-bearing
1. Security headers (CSP, HSTS, etc.) + `compression`
2. `legacyRedirects` (`redirects.js`) — 301s from the old WordPress/WooCommerce URL scheme
3. SEO routes — `/`, `/shop.html`, `/product/:slug`, `/rreth-nesh.html`, `/na-kontaktoni.html`, `/sitemap.xml` are served by `seo.js`, **not** as static files
4. `express.static` for `webroot/` (site assets + HTML templates) and `/uploads`
5. `/api/*` routes and `/admin*` pages
6. 404 handler

A page route **must** be registered before `express.static`, or the raw HTML file is served without SEO injection.

### SEO / SSR strategy (`seo.js`)
Pages render their content client-side with JS, so non-JS crawlers would see an empty page. `seo.js` intercepts every HTML page request and injects into the static HTML: `<title>`, meta description, Open Graph, Twitter Card, and Schema.org JSON-LD (Store/LocalBusiness, WebSite, Product+Offer, BreadcrumbList). For product pages it also injects a server-rendered content block (`productSsr`) that the page's own JS overwrites on load — real users never see it, crawlers do. `sitemap.xml` is generated dynamically from the product DB. When changing page markup, keep the injection anchors intact (`</head>`, `<title>`, `<div class="product-page" id="product-page">`).

### Data layer (`database.js`)
SQLite via `better-sqlite3` (`products.db`, WAL mode). Two tables: `categories` (self-referencing `parent_id` gives subcategories) and `products` (`images` and `attributes` are JSON-encoded TEXT columns; `parseProduct` decodes them). Schema is created and migrated on import. All DB access goes through the exported query helpers — don't query the DB directly elsewhere. Categories are data, not code: they live in the DB (seeded once, then extended via idempotent migrations at the top of `database.js`), so resolve a category by slug at runtime rather than hard-coding an id.

### Bulk product data (`scripts/*.mjs`)
Catalog changes (adding products, setting prices/specs, fixing images) are done with single-purpose Node scripts in `scripts/`, **not** through the admin UI, and there are dozens of them. The house pattern (see `add-network-products.mjs`, `add-network-switches.mjs`, `set-hp-smart-array-raid.mjs`): open `products.db` directly with `better-sqlite3`, **copy the DB to `products.db.bak-<timestamp>` first**, wrap writes in a transaction, and make the script **idempotent** — keyed by `slug` (insert-or-update) or by a known `id`/`sku`, so a re-run re-asserts rather than duplicating. Naming: `add-*` create, `set-*`/`update-*` mutate, `export-*` dump to `.xlsx` (needs the `xlsx` devDep). Because `products.db` and `uploads/` are git-ignored, these scripts **must also be run on the server** after a deploy; write them to be safe to re-run there. New product images: source the file, convert to WebP with `sharp` (already a dep) into `uploads/`, and reference `/uploads/<name>.webp` in the product's `images` JSON.

### Product data conventions
- **Price `0` means "price on request"** — the frontend shows *"Çmim sipas kërkesës"* and hides the price when `price` and `sale_price` are both `≤ 0` (`webroot/js/ui.js`, `webroot/index.html`). Use `0`, not null, for unpriced items.
- **Filterable specs are keyed by exact `attributes` names.** The shop sidebar filters read specific keys, so products only filter correctly if they use them: switches → `Ports` / `SFP` / `Uplink` / `Layer` / `PoE`; PC/Desktop/AIO → `CPU`; and `Form Factor` drives the form-factor facet. The matching SQL (with the accepted value shapes) is in `database.js` — mirror an existing product in the same category when in doubt.
- **`sku`** has no uniqueness constraint and follows a per-category, zero-padded sequence (e.g. `SW####` switches, `NW####`/`RU####` networking/routers). Check the current max for that prefix before assigning, and avoid colliding with an existing product's SKU.

### API & admin
`routes/products.js`, `categories.js`, `search.js` are public read-only JSON endpoints under `/api/`. `routes/admin.js` is the CMS: `/api/admin/login` bcrypt-compares against `ADMIN_PASSWORD_HASH` and issues a 7-day JWT in an httpOnly `adminToken` cookie; it also handles product/category CRUD and multer image uploads (extension + MIME whitelisted) into `uploads/`. `requireAuth` (`middleware/auth.js`) gates every admin write; `rateLimit` (`middleware/rateLimit.js`, in-memory per-IP) guards login. Admin UI lives in `webroot/admin/`.

### Frontend
`webroot/*.html` pages styled by `webroot/css/shared.css` plus per-page inline `<style>`; shared client JS in `webroot/js/` (`api.js`, `basket.js`, `ui.js`, `i18n.js`, `config.js`). The "basket" collects products into a WhatsApp message instead of a checkout; the WhatsApp number reaches the client via `/api/config`. Styling is **hand-written CSS — no Tailwind or CSS framework**. (A dead Tailwind CDN `<script>` was removed; do not re-add it.)

## Deployment

Hosted on a cPanel server (itstore.al) and run under **Phusion Passenger** via cPanel's Application Manager. Passenger's entry point is `app.js`, which just imports `server.js`; locally you still run `node server.js` directly.

Passenger treats `<app-root>/public/` as a static document root served by Apache *outside* Node. To keep the SEO/SSR pipeline authoritative, `public/` is intentionally **empty** (only a `.gitkeep`) so every request falls through to Node. The real site assets and HTML page templates live in **`webroot/`** — served by `express.static` and read by `seo.js`. Do not put files in `public/`.

The project root is a git repo (remote: GitHub); deploy by pulling on the server, then restarting the app in Application Manager. `.gitignore` excludes `.env`, `products.db*`, `uploads/`, and `node_modules/`, so a deploy never overwrites live data — the database and uploads are managed on the server and transferred manually only on the first deploy. Any `package.json` change requires `npm install` on the server. The WebP conversion lives in `products.db` + `uploads/` (both git-ignored), so run `scripts/optimize-images.mjs` on the server rather than expecting it through git.

## Frontend design workflow (UI work only)

- Invoke the `frontend-design` skill before writing frontend code.
- Always serve on localhost (`node server.js`) and screenshot from there — never a `file://` URL. After screenshotting, read the PNG and compare; iterate at least twice, being specific about pixel/color differences.
- With a reference image: match layout, spacing, typography, and color exactly (placeholder content via `https://placehold.co/`); do not "improve" or add to it. Without one: design from scratch with high craft.
- Use real assets from `brand_assets/` if that folder is present rather than placeholders.
- Anti-generic guardrails: custom brand colors (never the default Tailwind palette), layered/tinted shadows, a distinct display+body font pairing, animate only `transform`/`opacity` (never `transition-all`), and hover/focus-visible/active states on every interactive element.
