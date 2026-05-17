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

  // 2. Legacy product URLs — always carried a trailing slash in WordPress.
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
