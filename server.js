import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import productsRouter from './routes/products.js';
import categoriesRouter from './routes/categories.js';
import searchRouter from './routes/search.js';
import adminRouter from './routes/admin.js';
import { renderPage, buildSitemapXml, addScriptNonce } from './seo.js';
import { legacyRedirects } from './redirects.js';
import { rateLimit } from './middleware/rateLimit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webrootDir = path.join(__dirname, 'webroot');
const app = express();
const PORT = process.env.PORT || 3000;

// Read an HTML template and stamp the request's CSP nonce onto its inline
// <script> tags before sending, so no-JS crawlers and browsers both get pages
// whose scripts satisfy the nonce-based CSP (no 'unsafe-inline' needed).
function sendHtmlFile(res, filePath, status = 200) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).send('404 - Not Found');
    res.status(status).type('html').send(addScriptNonce(data, res.locals.cspNonce));
  });
}

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
// A fresh nonce per request authorises our first-party inline <script> blocks
// so we can drop 'unsafe-inline' from script-src (an XSS injected into the page
// can no longer run inline JS). Inline style="" attributes are pervasive and
// far lower risk, so style-src keeps 'unsafe-inline'.
function buildCsp(nonce) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
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
}

app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;
  res.setHeader('Content-Security-Policy', buildCsp(nonce));
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
      const { status, html } = renderPage(pageKey, {
        query: req.query, slug: req.params.slug, nonce: res.locals.cspNonce,
      });
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

// HTML templates not handled by seoRoute above (guides, FAQ, product.html, the
// admin shells reached directly) must still get their inline scripts nonced, so
// intercept .html GETs here — before express.static — and stamp the nonce in.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (!/\.html?$/i.test(req.path)) return next();
  let rel;
  try { rel = decodeURIComponent(req.path); } catch { return next(); }
  const filePath = path.normalize(path.join(webrootDir, rel));
  if (filePath !== webrootDir && !filePath.startsWith(webrootDir + path.sep)) return next();
  fs.access(filePath, fs.constants.R_OK, err => {
    if (err) return next();
    sendHtmlFile(res, filePath);
  });
});

// Static files — cached; HTML pages are served above by seoRoute, not here,
// so stale-HTML caching is not a risk. Upload filenames are content-stable.
// `index`/`redirect` are disabled so directory requests (e.g. /admin) fall
// through to the nonce-injecting routes below instead of being served raw.
app.use(express.static(path.join(__dirname, 'webroot'), { maxAge: '1d', index: false, redirect: false }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '30d', immutable: true }));

// Favicon
app.get('/favicon.ico', (req, res) => res.redirect('/favicon.png'));

// Public config (exposes only what frontend needs)
app.get('/api/config', (req, res) => {
  res.json({ whatsappNumber: process.env.WHATSAPP_NUMBER || '' });
});

// Coarse per-IP limiter for the public read API — generous enough for normal
// browsing, but caps scraping / cheap request floods. Login has its own,
// stricter limiter inside routes/admin.js.
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300, message: 'Shumë kërkesa. Provoni sërish më vonë.' });

// API routes
app.use('/api/products', apiLimiter, productsRouter);
app.use('/api/categories', apiLimiter, categoriesRouter);
app.use('/api/search', apiLimiter, searchRouter);
app.use('/api/admin', adminRouter);

// Admin routes
const serveAdmin = file => (req, res) => sendHtmlFile(res, path.join(webrootDir, 'admin', file));
app.get('/admin', serveAdmin('index.html'));
app.get('/admin/', serveAdmin('index.html'));
app.get('/admin/login', serveAdmin('login.html'));
app.get('/admin/product', serveAdmin('product.html'));

// 404
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Route not found' });
  sendHtmlFile(res, path.join(webrootDir, '404.html'), 404);
});

// ── Central error handler — log details, return a generic message ────────────
app.use((err, req, res, next) => {
  console.error('[error]', req.method, req.path, '—', err.message);
  if (res.headersSent) return next(err);
  const status = err.name === 'MulterError' ? 400 : (err.status || 500);
  res.status(status).json({ error: 'Ndodhi një gabim. Provoni sërish.' });
});

app.listen(PORT, () => console.log(`IT Store running at http://localhost:${PORT}`));
