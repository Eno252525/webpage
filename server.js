import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import productsRouter from './routes/products.js';
import categoriesRouter from './routes/categories.js';
import searchRouter from './routes/search.js';
import adminRouter from './routes/admin.js';
import { renderPage, buildSitemapXml } from './seo.js';
import { legacyRedirects } from './redirects.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ── Fail fast on weak/missing secrets ────────────────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET is missing or too short (need 32+ chars). Run `node setup.js`.');
  process.exit(1);
}
if (!process.env.ADMIN_PASSWORD_HASH) {
  console.error('FATAL: ADMIN_PASSWORD_HASH is not set. Run `node setup.js`.');
  process.exit(1);
}

// Trust one reverse-proxy hop so req.ip / req.secure reflect the real client.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ── Security headers ─────────────────────────────────────────────────────────
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://placehold.co https://images.unsplash.com",
  "connect-src 'self'",
  "frame-src https://www.google.com https://maps.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// ── Response compression (gzip/brotli) ───────────────────────────────────────
app.use(compression());

// ── Body parsing (with explicit size limits) ─────────────────────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// ── Legacy WordPress URL redirects (301) ─────────────────────────────────────
// Maps the old WooCommerce URL scheme to the new site so search ranking and
// inbound links survive the migration. Must precede the SEO/product routes.
app.use(legacyRedirects);

// ── SEO: server-rendered pages (must precede express.static) ─────────────────
// Injects meta tags, Open Graph, JSON-LD structured data and — for product
// pages — server-rendered content, so search engines and AI crawlers that
// don't run JavaScript can index real content.
function seoRoute(pageKey) {
  return (req, res, next) => {
    try {
      const { status, html } = renderPage(pageKey, { query: req.query, slug: req.params.slug });
      res.status(status).type('html').send(html);
    } catch (err) {
      next(err);
    }
  };
}

app.get('/', seoRoute('home'));
app.get('/index.html', (req, res) => res.redirect(301, '/'));
app.get('/shop.html', seoRoute('shop'));
app.get('/rreth-nesh.html', seoRoute('about'));
app.get('/na-kontaktoni.html', seoRoute('contact'));
app.get('/product/:slug', seoRoute('product'));

app.get('/sitemap.xml', (req, res, next) => {
  try {
    res.type('application/xml').send(buildSitemapXml());
  } catch (err) {
    next(err);
  }
});

// Static files — cached; HTML pages are served above by seoRoute, not here,
// so stale-HTML caching is not a risk. Upload filenames are content-stable.
app.use(express.static(path.join(__dirname, 'webroot'), { maxAge: '1d' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '30d', immutable: true }));

// Favicon
app.get('/favicon.ico', (req, res) => res.redirect('/favicon.png'));

// Public config (exposes only what frontend needs)
app.get('/api/config', (req, res) => {
  res.json({ whatsappNumber: process.env.WHATSAPP_NUMBER || '' });
});

// API routes
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/search', searchRouter);
app.use('/api/admin', adminRouter);

// Admin routes
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'webroot', 'admin', 'index.html')));
app.get('/admin/login', (req, res) => res.sendFile(path.join(__dirname, 'webroot', 'admin', 'login.html')));
app.get('/admin/product', (req, res) => res.sendFile(path.join(__dirname, 'webroot', 'admin', 'product.html')));

// 404
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Route not found' });
  res.status(404).sendFile(path.join(__dirname, 'webroot', '404.html'), err => {
    if (err) res.status(404).send('404 - Not Found');
  });
});

// ── Central error handler — log details, return a generic message ────────────
app.use((err, req, res, next) => {
  console.error('[error]', req.method, req.path, '—', err.message);
  if (res.headersSent) return next(err);
  const status = err.name === 'MulterError' ? 400 : (err.status || 500);
  res.status(status).json({ error: 'Ndodhi një gabim. Provoni sërish.' });
});

app.listen(PORT, () => console.log(`IT Store running at http://localhost:${PORT}`));
