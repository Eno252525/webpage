// ─────────────────────────────────────────────────────────────────────────────
// redirects.js — 301 redirects from the old WordPress/WooCommerce URL scheme
// to the new site, so search-ranking equity and inbound links survive the
// migration instead of dying as 404s.
//
// The old itstore.al (WordPress + WooCommerce) used these URL families:
//   /product/<slug>/                  product pages
//   /product-category/<…>/<cat>/       category archives
//   /product-brand/, /product-tag/     taxonomy archives
//   /shop/, /kontakt/, /rreth-nesh/    static pages
//   /<post-slug>/                      blog posts
//
// Strategy:
//   • Pages & categories  → mapped explicitly to their new equivalent.
//   • Products that still exist (slug unchanged) → 301 to the canonical
//     no-trailing-slash URL.
//   • Products that were removed / re-slugged → 301 to the most relevant
//     category page (best-effort, inferred from the slug). A relevant
//     catalog page beats a dead end; Google endorses category fallbacks.
//   • Brand/tag/blog archives → shop or home.
//
// Mounted before the SEO routes in server.js so it intercepts legacy URLs.
// ─────────────────────────────────────────────────────────────────────────────
import { getCategories, getProductBySlug } from './database.js';

// Valid category slugs on the new site — built once at startup.
const CAT_SLUGS = new Set(getCategories().map(c => c.slug));

// Exact legacy path → new path.
const PAGE_MAP = {
  '/shop/':             '/shop.html',
  '/product-category/': '/shop.html',
  '/kontakt/':          '/na-kontaktoni.html',
  '/rreth-nesh/':       '/rreth-nesh.html',
  '/kompania/':         '/rreth-nesh.html',
  '/blog/':             '/',
  '/full-width/':       '/',
  '/evercompare/':      '/',
  '/index.php':         '/',
  // Legacy WordPress blog posts (the new site has no blog).
  '/procesori-ne-laptop/':               '/',
  '/kompjuter-per-programim-dhe-kodim/': '/',
};

// Legacy path families (matched as prefixes) → new path.
const PREFIX_MAP = [
  ['/product-brand', '/shop.html'],
  ['/product-tag',   '/shop.html'],
  ['/cart',          '/shop.html'],
  ['/checkout',      '/shop.html'],
  ['/my-account',    '/'],
  ['/wishlist',      '/'],
  ['/tag',           '/'],   // blog tags
  ['/category',      '/'],   // blog categories
  ['/author',        '/'],
  ['/feed',          '/'],
];

// Old WooCommerce category slug → new category slug, where they differ.
const CAT_OVERRIDE = { mouse: 'gaming' };

// Products that were re-slugged on the new site: old product slug → new slug.
// 301'd to the new canonical product URL so inbound links and rankings survive.
const PRODUCT_RESLUG = {
  'hp-z8-g4-ai-server-2x-xeon-platinum-8160-rtx-3090':
    'hp-z8-g4-ai-server-2x-xeon-gold-6262-rtx-3090',
  // "i8-8295U" was a typo for the Core i5-8295U — no such thing as a Core i8.
  'apple-macbook-pro-2018-13-i8-8295u': 'apple-macbook-pro-2018-13-i5-8295u',
  // Sold out and removed 2026-08-12 → nearest surviving model, so the retired
  // product URLs land on something relevant instead of 404ing.
  'apple-macbook-air-2020': 'apple-macbook-air-2019',
  'apple-macbook-pro-2020': 'apple-macbook-pro-2020-i5-1038ng7',
  'apple-macbook-pro-2019': 'apple-macbook-pro-2019-i7',

  // ── 2026-08-18 catalog cleanup ─────────────────────────────────────────────
  // Fujitsu's line is spelled "Celsius"; every slug carried the misspelling.
  'fujitsu-celcius-m470':  'fujitsu-celsius-m470',
  'fujitsu-celcius-m720':  'fujitsu-celsius-m720',
  'fujitsu-celcius-w280':  'fujitsu-celsius-w280',
  'fujitsu-celcius-w370':  'fujitsu-celsius-w370',
  'fujitsu-celcius-w370-2':'fujitsu-celsius-w370-2',
  'fujitsu-celcius-w380':  'fujitsu-celsius-w380',
  'fujitsu-celcius-w550':  'fujitsu-celsius-w550',
  'fujitsu-celcius-j550n': 'fujitsu-celsius-j550n',
  'fujitsu-celcius-c740':  'fujitsu-celsius-c740',
  // The three R570s had three different naming styles (and a leftover "-2"
  // dedupe suffix); they are now distinguished by CPU instead.
  'fujitsu-celcius-r570':   'fujitsu-celsius-r570-e5645',
  'fujitsu-celcius-r570-2': 'fujitsu-celsius-r570-2x-e5620',
  'fujitsu-r570':           'fujitsu-celsius-r570-e5640',
  // The S20 is a ThinkStation, not a ThinkCentre.
  'lenovo-thinkcentre-s20':   'lenovo-thinkstation-s20-w3530',
  'lenovo-thinkcentre-s20-2': 'lenovo-thinkstation-s20-e5640',
  // Duplicate listings removed → the surviving identical product.
  'dell-precision-3620-5': 'dell-precision-3620',
  'zotac-mini-pc-3':       'zotac-mini-pc-2',
  'dell-latitude-5500-2':  'dell-latitude-5500',
  // #411 was listed as "Firebridge ... switch"; it is an ATTO FibreBridge.
  'firebridge-fcbr-7500-dn1': 'atto-fibrebridge-7500n',
};

// Keyword → category slug. Used to route a removed product to the most
// relevant catalog page. Best-effort and order-sensitive (first match wins).
const CAT_RULES = [
  [/^laptop[-/]/,                                                    'laptop'],
  [/^monitor-|thinkvision|flexscan|eizo|philips|^lg-/,               'monitore'],
  [/quadro|geforce|nvidia|tesla|graphics-card|\bgpu\b|gt640|\brtx\b/, 'gpu'],
  [/\bnas\b|buffalo/,                                                'nas'],
  [/cisco|juniper|datto|\bswitch\b/,                                 'switch'],
  [/mikrotik|css326/,                                                'mikrotik'],
  [/\bkvm\b|raritan/,                                                'kvm'],
  [/\bups\b|smart-ups|\bapc\b|netshelter/,                           'ups'],
  [/macbook|imac/,                                                   'macbook'],
  [/server|poweredge|ml110|dl3[68]0|dl560/,                          'server'],
  [/precision|thinkstation|workstation|cel[cs]ius|hp-z\d/,           'workstation'],
  [/latitude|probook|elitebook|thinkpad|ideapad|notebook|surface|razer-blade|miix|\byoga\b|vostro-35/, 'laptop'],
  [/optiplex|prodesk|elitedesk|thinkcentre|esprimo|compaq|veriton|zbox|zotac-mini|pc-i3|elite-7|pro-3|pro-vision|pro-slime/, 'desktop'],
  [/\bssd\b|m-2-|nvme/,                                              'ssd'],
  [/\bhdd\b|hard-drive/,                                             'hdd'],
  [/\bram\b|memory/,                                                 'ram'],
  [/mouse|marvo|keyboard/,                                           'gaming'],
];

// A category slug → its shop URL, falling back to the full shop if the
// category does not exist on the new site.
function catUrl(slug) {
  return CAT_SLUGS.has(slug) ? `/shop.html?cat=${slug}` : '/shop.html';
}

// Best landing page for a removed product, inferred from its slug.
function inferProductFallback(slug) {
  for (const [re, cat] of CAT_RULES) {
    if (re.test(slug)) return catUrl(cat);
  }
  return '/shop.html';
}

export function legacyRedirects(req, res, next) {
  const p = req.path;

  // 1. Exact static-page matches.
  if (PAGE_MAP[p]) return res.redirect(301, PAGE_MAP[p]);

  // 2. Re-slugged products → new canonical URL. Handles both the new-site form
  //    (no trailing slash) and the legacy WordPress form (trailing slash).
  const reslug = p.match(/^\/product\/([^/]+)\/?$/);
  if (reslug) {
    const target = PRODUCT_RESLUG[decodeURIComponent(reslug[1])];
    if (target) return res.redirect(301, `/product/${target}`);
  }

  // 3. Legacy product URLs — always carried a trailing slash in WordPress.
  //    (New-site URLs have no trailing slash, so they skip this entirely.)
  const prod = p.match(/^\/product\/([^/]+)\/$/);
  if (prod) {
    const slug = decodeURIComponent(prod[1]);
    return getProductBySlug(slug)
      ? res.redirect(301, `/product/${slug}`)        // still exists → canonical URL
      : res.redirect(301, inferProductFallback(slug)); // removed → relevant category
  }

  // 3. Legacy category archives — use the last path segment as the slug.
  const cat = p.match(/^\/product-category\/(?:[^/]+\/)*([^/]+)\/?$/);
  if (cat) {
    const seg = decodeURIComponent(cat[1]);
    const slug = CAT_OVERRIDE[seg] || seg;
    return res.redirect(301, catUrl(slug));
  }

  // 4. Prefix families (brands, blog tags, cart, account, feeds…).
  for (const [base, target] of PREFIX_MAP) {
    if (p === base || p.startsWith(base + '/')) return res.redirect(301, target);
  }

  next();
}
