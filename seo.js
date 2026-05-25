// ─────────────────────────────────────────────────────────────────────────────
// seo.js — Server-side SEO + AI-search optimisation
//
// Most search/AI crawlers (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, …)
// do NOT execute JavaScript. The product/shop pages render their content with
// JS, so without server-side rendering those crawlers see an empty page.
//
// This module injects, on every HTML page request:
//   • a keyword-rich <title> + meta description
//   • canonical URL, Open Graph + Twitter Card tags
//   • Schema.org JSON-LD structured data (Store, WebSite, Product, Breadcrumb…)
//   • for product pages, a server-rendered HTML content block crawlers can read
// It also builds a dynamic sitemap.xml from the product database.
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getProductBySlug, getCategories, getProductsForSitemap } from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// HTML page templates live in webroot/; Node reads them and injects SEO tags.
// (Renamed from public/ so the Passenger docroot can stay empty — see CLAUDE.md.)
const WEBROOT_DIR = path.join(__dirname, 'webroot');

// ── Site constants ───────────────────────────────────────────────────────────
export const SITE_URL = (process.env.SITE_URL || 'https://itstore.al').replace(/\/+$/, '');
const SITE_NAME  = 'IT Store';
const LOCALE     = 'sq_AL';
const PHONE      = '+355693181062';
const EMAIL      = 'info@itstore.al';
const WHATSAPP   = process.env.WHATSAPP_NUMBER || '355693181062';
const LOGO       = `${SITE_URL}/IT%20Store%20LOGO.png`;
const DEFAULT_IMAGE = LOGO;
const STREET     = 'Rr. Ibrahim Pashë Bushatlliu';
const CITY       = 'Tiranë';
const COUNTRY    = 'AL';
const MAP_URL    = 'https://maps.app.goo.gl/fKkAVGhZ26QBwA2s9';
const INSTAGRAM  = 'https://www.instagram.com/itstore_computers/';

// ── Small helpers ────────────────────────────────────────────────────────────
const HTML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => HTML_ESC[c]); }

const XML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
function xmlEsc(s) { return String(s ?? '').replace(/[&<>"']/g, c => XML_ESC[c]); }

function stripTags(s) {
  return String(s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(s, n = 160) {
  s = stripTags(s);
  return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s;
}

function fmtPrice(n) {
  return Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function effectivePrice(p) {
  return (p.sale_price && p.sale_price > 0) ? p.sale_price : p.price;
}

function absImg(src) {
  if (!src) return '';
  if (/^https?:/i.test(src)) return src;
  return SITE_URL + encodeURI(src);
}

// ── HTML template cache (read once per process) ──────────────────────────────
const htmlCache = new Map();
function readPage(file) {
  if (!htmlCache.has(file)) {
    htmlCache.set(file, fs.readFileSync(path.join(WEBROOT_DIR, file), 'utf8'));
  }
  return htmlCache.get(file);
}

// ── JSON-LD structured data ──────────────────────────────────────────────────
function graphScript(nodes) {
  const doc = { '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) };
  // Escape "<" so a stray "</script>" inside data can't break out of the tag.
  return `  <script type="application/ld+json">${JSON.stringify(doc).replace(/</g, '\\u003c')}</script>`;
}

function organizationLd() {
  return {
    '@type': ['Store', 'LocalBusiness'],
    '@id': `${SITE_URL}/#store`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    image: LOGO,
    logo: LOGO,
    telephone: PHONE,
    email: EMAIL,
    priceRange: '$$',
    currenciesAccepted: 'ALL',
    paymentAccepted: 'Cash, Bank Transfer',
    address: {
      '@type': 'PostalAddress',
      streetAddress: STREET,
      addressLocality: CITY,
      addressRegion: 'Tiranë',
      addressCountry: COUNTRY,
    },
    hasMap: MAP_URL,
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '17:30',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '09:00',
        closes: '13:00',
      },
    ],
    areaServed: { '@type': 'Country', name: 'Shqipëri' },
    sameAs: [INSTAGRAM],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: PHONE,
      contactType: 'customer service',
      availableLanguage: ['sq', 'en'],
    },
  };
}

function websiteLd() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    inLanguage: 'sq',
    publisher: { '@id': `${SITE_URL}/#store` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/shop.html?search={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

function breadcrumbLd(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.url ? { item: it.url } : {}),
    })),
  };
}

function productLd(p) {
  const url = `${SITE_URL}/product/${p.slug}`;
  const images = (p.images || []).map(absImg).filter(Boolean);
  const node = {
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.name,
    description: clip(p.description || p.short_description || p.name, 500),
    sku: String(p.id),
    mpn: p.slug,
    itemCondition: 'https://schema.org/RefurbishedCondition',
    category: p.category_name || undefined,
    url,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'ALL',
      price: effectivePrice(p),
      // Google flags Offers with no priceValidUntil; roll it 1 year ahead.
      priceValidUntil: new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10),
      availability: p.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/RefurbishedCondition',
      seller: { '@id': `${SITE_URL}/#store` },
    },
  };
  if (images.length) node.image = images;
  if (p.brand) node.brand = { '@type': 'Brand', name: p.brand };
  // Surface key specs to AI/search as additionalProperty. Skip the `options`
  // and `prices` buckets — their values are arrays / lookup tables, not a
  // single property value.
  const attrs = Object.entries(p.attributes || {}).filter(([k, v]) => k !== 'options' && k !== 'prices' && v);
  if (attrs.length) {
    node.additionalProperty = attrs.map(([name, value]) => ({
      '@type': 'PropertyValue', name, value: String(value),
    }));
  }
  return node;
}

// ── <head> tag builder ───────────────────────────────────────────────────────
function buildHeadTags(seo) {
  const canonical = seo.canonical;
  const image = seo.image || DEFAULT_IMAGE;
  const ogTitle = seo.ogTitle || seo.title;
  const lines = [
    `  <meta name="description" content="${esc(seo.description)}">`,
    seo.keywords ? `  <meta name="keywords" content="${esc(seo.keywords)}">` : '',
    `  <meta name="robots" content="${seo.robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}">`,
    `  <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1">`,
    `  <meta name="author" content="${SITE_NAME}">`,
    `  <meta name="theme-color" content="#141414">`,
    `  <meta name="geo.region" content="AL-11">`,
    `  <meta name="geo.placename" content="Tiranë, Shqipëri">`,
    `  <link rel="canonical" href="${esc(canonical)}">`,
    // Open Graph
    `  <meta property="og:type" content="${seo.ogType || 'website'}">`,
    `  <meta property="og:site_name" content="${SITE_NAME}">`,
    `  <meta property="og:locale" content="${LOCALE}">`,
    `  <meta property="og:title" content="${esc(ogTitle)}">`,
    `  <meta property="og:description" content="${esc(seo.description)}">`,
    `  <meta property="og:url" content="${esc(canonical)}">`,
    `  <meta property="og:image" content="${esc(image)}">`,
    `  <meta property="og:image:alt" content="${esc(ogTitle)}">`,
    // Twitter Card
    `  <meta name="twitter:card" content="summary_large_image">`,
    `  <meta name="twitter:title" content="${esc(ogTitle)}">`,
    `  <meta name="twitter:description" content="${esc(seo.description)}">`,
    `  <meta name="twitter:image" content="${esc(image)}">`,
    seo.extraMeta || '',
    seo.jsonLd && seo.jsonLd.length ? graphScript(seo.jsonLd) : '',
  ];
  return lines.filter(Boolean).join('\n');
}

function inject(html, seo, ssr) {
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(seo.title)}</title>`);
  html = html.replace('</head>', `${buildHeadTags(seo)}\n</head>`);
  if (ssr) {
    const anchor = '<div class="product-page" id="product-page">';
    html = html.replace(anchor, anchor + ssr);
  }
  return html;
}

// ── Server-rendered product content (for non-JS crawlers) ────────────────────
// The page's own JS overwrites #product-page on load, so real users never see
// this — but AI/search crawlers that don't run JS get full, readable content.
function productSsr(p) {
  const price = effectivePrice(p);
  const hasPrice = Number(price) > 0;
  const onSale = p.sale_price && p.sale_price > 0 && p.sale_price < p.price;
  const img = absImg(p.images && p.images[0]);
  const rawAttrs = p.attributes || {};
  const optionsMap = rawAttrs.options && typeof rawAttrs.options === 'object' ? rawAttrs.options : null;
  const pricesMap = rawAttrs.prices && typeof rawAttrs.prices === 'object' ? rawAttrs.prices : null;
  const specs = Object.entries(rawAttrs).filter(([k, v]) => k !== 'options' && k !== 'prices' && v);
  const waText = encodeURIComponent(`Përshëndetje, jam i interesuar për: ${p.name}`);
  const priceLine = hasPrice
    ? `Çmimi: ${fmtPrice(price)} L${onSale ? ` <span style="opacity:.5;font-weight:400;text-decoration:line-through;">${fmtPrice(p.price)} L</span>` : ''}`
    : '';
  const optionsBlock = optionsMap
    ? `<h2>Konfigurimet e Disponueshme</h2>${Object.entries(optionsMap).map(([k, vs]) =>
        `<p><strong>${esc(k)}:</strong> ${(Array.isArray(vs) ? vs : []).map(esc).join(', ')}</p>`
      ).join('')}${pricesMap ? `<h3>Çmimet sipas variantit</h3><ul>${Object.entries(pricesMap)
        .map(([k, v]) => `<li><strong>${esc(k.replace(/\|/g, ' / '))}:</strong> ${fmtPrice(v)} L</li>`).join('')}</ul>` : ''}`
    : '';
  return `
    <article class="ssr-product" style="max-width:1100px;margin:0 auto;line-height:1.7;">
      <nav aria-label="breadcrumb" style="font-size:1.2rem;opacity:.7;margin-bottom:14px;">
        <a href="/">Kreu</a> › <a href="/shop.html">Produktet</a>${p.category_slug ? ` › <a href="/shop.html?cat=${esc(p.category_slug)}">${esc(p.category_name)}</a>` : ''} › <span>${esc(p.name)}</span>
      </nav>
      <h1 style="margin:0 0 12px;">${esc(p.name)}</h1>
      ${img ? `<img src="${esc(img)}" alt="${esc(p.name)}" width="640" style="max-width:100%;height:auto;border-radius:8px;" loading="eager">` : ''}
      <p style="font-size:1.6rem;font-weight:700;margin:16px 0 4px;">${priceLine}</p>
      <p style="margin:0 0 12px;">${p.in_stock ? 'Në gjendje — gati për dërgesë.' : 'Aktualisht i padisponueshëm.'}</p>
      ${p.brand ? `<p><strong>Markë:</strong> ${esc(p.brand)}</p>` : ''}
      ${p.short_description && stripTags(p.short_description) !== p.name ? `<p>${esc(stripTags(p.short_description))}</p>` : ''}
      ${specs.length ? `<h2>Specifikimet</h2><ul>${specs.map(([k, v]) => `<li><strong>${esc(k)}:</strong> ${esc(v)}</li>`).join('')}</ul>` : ''}
      ${optionsBlock}
      ${p.description ? `<h2>Përshkrimi</h2><p>${esc(stripTags(p.description))}</p>` : ''}
      <p style="margin-top:20px;"><a href="https://wa.me/${WHATSAPP}?text=${waText}" rel="nofollow">Porosit në WhatsApp →</a></p>
    </article>`;
}

// ── Per-page renderer ────────────────────────────────────────────────────────
// Returns { status, html } for an HTML page request.
export function renderPage(pageKey, { query = {}, slug = '' } = {}) {
  const base = [organizationLd(), websiteLd()];

  if (pageKey === 'home') {
    const seo = {
      title: 'IT Store — Kompjutera, Laptopë & Workstation të Rinovuar në Tiranë',
      description: 'IT Store — dyqani juaj i kompjuterave të rinovuar në Tiranë. Laptopë, desktop, workstation, server dhe monitorë me cilësi e garanci. Porosit shpejt përmes WhatsApp.',
      keywords: 'kompjutera Tiranë, laptop të rinovuar, workstation, desktop, server, monitorë, refurbished Shqipëri, IT Store',
      canonical: `${SITE_URL}/`,
      image: LOGO,
      ogType: 'website',
      jsonLd: base,
    };
    return { status: 200, html: inject(readPage('index.html'), seo) };
  }

  if (pageKey === 'shop') {
    const cats = getCategories();
    const cat = cats.find(c => c.slug === String(query.cat || ''));
    let title, description, canonical;
    if (cat) {
      title = `${cat.name} të Rinovuar — Çmime në Tiranë | IT Store`;
      description = `Blej ${cat.name} të rinovuar te IT Store, Tiranë. Pajisje IT cilësore me çmime të mira dhe garanci. Porosit lehtë përmes WhatsApp.`;
      canonical = `${SITE_URL}/shop.html?cat=${encodeURIComponent(cat.slug)}`;
    } else if (String(query.sale || '') === '1') {
      title = 'Oferta & Zbritje — Kompjutera me Çmime të Ulëta | IT Store';
      description = 'Produktet në ofertë te IT Store Tiranë — kompjutera, laptopë dhe pajisje IT të rinovuara me zbritje. Sasi e kufizuar.';
      canonical = `${SITE_URL}/shop.html?sale=1`;
    } else {
      title = 'Të Gjitha Produktet — Kompjutera & Pajisje IT | IT Store';
      description = 'Shfleto të gjitha produktet e IT Store: laptopë, desktop, workstation, server, monitorë e më shumë — të rinovuara, me garanci, në Tiranë.';
      canonical = `${SITE_URL}/shop.html`;
    }
    const crumbs = [{ name: 'Kreu', url: `${SITE_URL}/` }, { name: 'Produktet', url: `${SITE_URL}/shop.html` }];
    if (cat) crumbs.push({ name: cat.name, url: canonical });
    const seo = {
      title, description, canonical,
      image: LOGO,
      ogType: 'website',
      jsonLd: [
        ...base,
        { '@type': 'CollectionPage', name: title, description, url: canonical, inLanguage: 'sq', isPartOf: { '@id': `${SITE_URL}/#website` } },
        breadcrumbLd(crumbs),
      ],
    };
    return { status: 200, html: inject(readPage('shop.html'), seo) };
  }

  if (pageKey === 'about') {
    const canonical = `${SITE_URL}/rreth-nesh.html`;
    const seo = {
      title: 'Rreth Nesh — IT Store | Dyqan Kompjuterash i Rinovuar në Tiranë',
      description: 'Njihu me IT Store — përvoja jonë në kompjutera dhe pajisje IT të rinovuara në Tiranë, Shqipëri. Cilësi, garanci dhe shërbim i besueshëm.',
      canonical,
      image: LOGO,
      ogType: 'website',
      jsonLd: [
        ...base,
        { '@type': 'AboutPage', name: 'Rreth Nesh — IT Store', url: canonical, inLanguage: 'sq', about: { '@id': `${SITE_URL}/#store` } },
        breadcrumbLd([{ name: 'Kreu', url: `${SITE_URL}/` }, { name: 'Rreth Nesh', url: canonical }]),
      ],
    };
    return { status: 200, html: inject(readPage('rreth-nesh.html'), seo) };
  }

  if (pageKey === 'contact') {
    const canonical = `${SITE_URL}/na-kontaktoni.html`;
    const seo = {
      title: 'Na Kontaktoni — IT Store Tiranë | WhatsApp, Telefon & Adresa',
      description: 'Kontaktoni IT Store në Tiranë: WhatsApp/Telefon +355 69 318 1062, email info@itstore.al. Na gjeni në Rr. Ibrahim Pashë Bushatlliu, Tiranë.',
      canonical,
      image: LOGO,
      ogType: 'website',
      jsonLd: [
        ...base,
        { '@type': 'ContactPage', name: 'Na Kontaktoni — IT Store', url: canonical, inLanguage: 'sq', about: { '@id': `${SITE_URL}/#store` } },
        breadcrumbLd([{ name: 'Kreu', url: `${SITE_URL}/` }, { name: 'Na Kontaktoni', url: canonical }]),
      ],
    };
    return { status: 200, html: inject(readPage('na-kontaktoni.html'), seo) };
  }

  if (pageKey === 'product') {
    const p = getProductBySlug(slug);
    if (!p) {
      const seo = {
        title: 'Produkti nuk u gjet — IT Store',
        description: 'Ky produkt nuk është më i disponueshëm. Shfletoni produktet e tjera te IT Store, Tiranë.',
        canonical: `${SITE_URL}/product/${encodeURIComponent(slug)}`,
        robots: 'noindex, follow',
        image: LOGO,
        jsonLd: base,
      };
      return { status: 404, html: inject(readPage('product.html'), seo) };
    }
    const url = `${SITE_URL}/product/${p.slug}`;
    const price = effectivePrice(p);
    const desc = clip(
      (p.short_description && stripTags(p.short_description) !== p.name)
        ? p.short_description
        : (p.description || p.name),
      160,
    ) || `${p.name} në shitje te IT Store Tiranë — pajisje e rinovuar me çmim të mirë. Porosit me WhatsApp.`;
    const seo = {
      title: `${p.name} — Çmimi & Specifikimet | IT Store`,
      ogTitle: p.name,
      description: desc,
      canonical: url,
      image: absImg(p.images && p.images[0]) || LOGO,
      ogType: 'product',
      extraMeta: [
        `  <meta property="product:price:amount" content="${price}">`,
        `  <meta property="product:price:currency" content="ALL">`,
        `  <meta property="product:availability" content="${p.in_stock ? 'in stock' : 'out of stock'}">`,
        `  <meta property="product:condition" content="refurbished">`,
      ].join('\n'),
      jsonLd: [
        ...base,
        productLd(p),
        breadcrumbLd([
          { name: 'Kreu', url: `${SITE_URL}/` },
          { name: 'Produktet', url: `${SITE_URL}/shop.html` },
          ...(p.category_slug ? [{ name: p.category_name, url: `${SITE_URL}/shop.html?cat=${encodeURIComponent(p.category_slug)}` }] : []),
          { name: p.name, url },
        ]),
      ],
    };
    return { status: 200, html: inject(readPage('product.html'), seo, productSsr(p)) };
  }

  return { status: 404, html: '' };
}

// ── Dynamic sitemap.xml ──────────────────────────────────────────────────────
export function buildSitemapXml() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE_URL}/`,                  changefreq: 'daily',   priority: '1.0', lastmod: today },
    { loc: `${SITE_URL}/shop.html`,         changefreq: 'daily',   priority: '0.9', lastmod: today },
    { loc: `${SITE_URL}/pyetje-te-shpeshta.html`,                          changefreq: 'monthly', priority: '0.7', lastmod: today },
    { loc: `${SITE_URL}/udhezues/ku-te-blesh-kompjuter-ne-tirane.html`,    changefreq: 'monthly', priority: '0.7', lastmod: today },
    { loc: `${SITE_URL}/udhezues/refurbished-vs-i-ri.html`,                changefreq: 'monthly', priority: '0.6', lastmod: today },
    { loc: `${SITE_URL}/udhezues/si-te-zgjedhesh-laptopin-per-pune.html`,  changefreq: 'monthly', priority: '0.6', lastmod: today },
    { loc: `${SITE_URL}/na-kontaktoni.html`, changefreq: 'monthly', priority: '0.6', lastmod: today },
    { loc: `${SITE_URL}/rreth-nesh.html`,   changefreq: 'monthly', priority: '0.5', lastmod: today },
  ];

  for (const c of getCategories()) {
    urls.push({ loc: `${SITE_URL}/shop.html?cat=${encodeURIComponent(c.slug)}`, changefreq: 'weekly', priority: '0.7', lastmod: today });
  }

  for (const p of getProductsForSitemap()) {
    let images = [];
    try { images = JSON.parse(p.images || '[]'); } catch { /* ignore */ }
    urls.push({
      loc: `${SITE_URL}/product/${encodeURIComponent(p.slug)}`,
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: (p.updated_at || today).slice(0, 10),
      image: images[0] ? absImg(images[0]) : null,
    });
  }

  const body = urls.map(u => `  <url>
    <loc>${xmlEsc(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${u.image ? `
    <image:image><image:loc>${xmlEsc(u.image)}</image:loc></image:image>` : ''}
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${body}
</urlset>
`;
}
