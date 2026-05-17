const fs = require('fs');
const rawProducts = JSON.parse(fs.readFileSync('products-final.json', 'utf-8'));

const products = rawProducts.map(p => ({
  name: p.name,
  price: p.price,
  priceMax: p.priceMax || null,
  isVariable: p.isVariable || false,
  salePrice: p.salePrice || null,
  cats: p.categories || [],
  img: p.img || '',
  desc: (p.shortDesc || '').replace(/\r/g,'').replace(/\\n/g,' ').replace(/\s+/g,' ').trim().slice(0,120),
  brand: p.brand || '',
  inStock: p.inStock !== false
}));

// â”€â”€ Write catalog-products.js â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const productsJS = 'var PRODUCTS = ' + JSON.stringify(products) + ';\n';
fs.writeFileSync('catalog-products.js', productsJS);
console.log('catalog-products.js written:', productsJS.length, 'bytes');

// â”€â”€ Write catalog-app.js â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const appJS = `
var CATEGORY_CONFIG = [
  { key: 'Laptop', label: 'Laptop', subs: ['Laptop > MacBook'] },
  { key: 'Desktop', label: 'Desktop / PC', subs: ['Desktop > PC'] },
  { key: 'Workstation', label: 'Workstation', subs: [] },
  { key: 'Networking', label: 'Networking', subs: ['Networking > Server','Networking > Switch','Networking > NAS','Networking > MikroTik','Networking > KVM'] },
  { key: 'Komponente', label: 'Komponente', subs: ['Komponente > GPU','Komponente > RAM','Komponente > SSD','Komponente > HDD'] },
  { key: 'Monitor', label: 'Monitor', subs: [] },
  { key: 'UPS', label: 'UPS', subs: [] },
];

function fmtPrice(p) { return p.toLocaleString('sq-AL') + ' L'; }

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function makeCard(p, hidden) {
  var badge = p.isVariable
    ? '<span class="product-badge variable">Variante</span>'
    : (!p.inStock ? '<span class="product-badge out-of-stock">Mungon</span>' : '');
  var priceHtml = (p.salePrice && p.salePrice < p.price)
    ? '<span class="price-main">' + fmtPrice(p.salePrice) + '</span><span class="price-was">' + fmtPrice(p.price) + '</span>'
    : p.isVariable
      ? '<span class="price-main">Nga ' + fmtPrice(p.price) + '</span>'
      : '<span class="price-main">' + fmtPrice(p.price) + '</span>';
  var imgSrc = p.img || 'https://placehold.co/600x600/1C1C1C/F0A020';
  var desc = p.desc ? '<p class="product-desc">' + esc(p.desc) + '</p>' : '';
  var hiddenClass = hidden ? ' hidden-card' : '';
  return '<div class="product-card' + hiddenClass + '">'
    + '<div class="product-img-wrap">'
    + '<img src="' + esc(imgSrc) + '" alt="' + esc(p.name) + '" loading="lazy" data-fallback="1">'
    + badge
    + '</div>'
    + '<div class="product-info">'
    + '<p class="product-name">' + esc(p.name) + '</p>'
    + desc
    + '<p class="product-price">' + priceHtml + '</p>'
    + '</div></div>';
}

function productMatchesCat(p, catKey) {
  if (catKey === 'all') return true;
  return p.cats.some(function(c) { return c === catKey || c.indexOf(catKey + ' >') === 0; });
}

function productMatchesSubcat(p, subcat) {
  return p.cats.some(function(c) { return c === subcat; });
}

var activeCat = 'all';
var activeSubcat = null;
var INITIAL = 8;

function renderCatalog() {
  var catalog = document.getElementById('catalog');
  var html = '';
  var sections = activeCat === 'all' ? CATEGORY_CONFIG : CATEGORY_CONFIG.filter(function(c) { return c.key === activeCat; });

  sections.forEach(function(section) {
    var sp = PRODUCTS.filter(function(p) { return productMatchesCat(p, section.key); });
    if (activeSubcat) { sp = sp.filter(function(p) { return productMatchesSubcat(p, activeSubcat); }); }
    if (!sp.length) return;

    var sectionId = 'sec-' + section.key.replace(/[^a-z0-9]/gi,'_');

    var subTabsHtml = '';
    if (section.subs && section.subs.length) {
      var allActive = !activeSubcat ? ' active' : '';
      subTabsHtml = '<div class="sub-tabs">'
        + '<button class="sub-tab' + allActive + '" data-setsubcat="" data-maincat="' + esc(section.key) + '">' + 'T\u00eb Gjitha' + '</button>'
        + section.subs.map(function(sub) {
          var isA = activeSubcat === sub ? ' active' : '';
          var subLabel = sub.split('>').pop().trim();
          return '<button class="sub-tab' + isA + '" data-setsubcat="' + esc(sub) + '" data-maincat="' + esc(section.key) + '">' + esc(subLabel) + '</button>';
        }).join('')
        + '</div>';
    }

    var cardsHtml = sp.map(function(p, i) { return makeCard(p, i >= INITIAL); }).join('');
    var showMoreHtml = sp.length > INITIAL
      ? '<div class="show-more-wrap"><button class="show-more-btn" data-sectionid="' + sectionId + '">Shiko T\u00eb Gjitha (' + sp.length + ')</button></div>'
      : '';

    html += '<section class="collection-section" id="' + sectionId + '">'
      + '<div class="collection-header">'
      + '<h2 class="collection-title"><small>IT Store</small>' + esc(section.label) + '</h2>'
      + '<span class="product-count">' + sp.length + ' Produkte</span>'
      + '</div>'
      + subTabsHtml
      + '<div class="product-grid">' + cardsHtml + '</div>'
      + showMoreHtml
      + '</section><div class="section-divider"></div>';
  });

  catalog.innerHTML = html || '<div class="no-results">Nuk u gjet\u00ebn produkte</div>';
  wireEvents();
  setupImgFallbacks();
}

function setupImgFallbacks() {
  document.querySelectorAll('img[data-fallback]').forEach(function(img) {
    img.onerror = function() {
      this.src = 'https://placehold.co/600x600/1C1C1C/F0A020';
      this.onerror = null;
    };
  });
}

function wireEvents() {
  // Sub-tab buttons
  document.querySelectorAll('[data-setsubcat]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var sub = btn.getAttribute('data-setsubcat') || null;
      var mc = btn.getAttribute('data-maincat');
      activeCat = mc;
      activeSubcat = sub || null;
      renderCatalog();
    });
  });
  // Show more buttons
  document.querySelectorAll('.show-more-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var sec = document.getElementById(btn.getAttribute('data-sectionid'));
      if (sec) sec.querySelectorAll('.hidden-card').forEach(function(c) { c.classList.remove('hidden-card'); });
      btn.parentElement.remove();
    });
  });
}

function filterCat(cat) {
  activeCat = cat;
  activeSubcat = null;
  document.querySelectorAll('.cat-pill').forEach(function(p) { p.classList.toggle('active', p.getAttribute('data-cat') === cat); });
  renderCatalog();
  setTimeout(function() { var el = document.getElementById('catalog'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
}

function searchProducts(query) {
  query = (query || '').toLowerCase().trim();
  var catalog = document.getElementById('catalog');
  if (!query) {
    activeCat = 'all';
    activeSubcat = null;
    document.querySelectorAll('.cat-pill').forEach(function(p) { p.classList.toggle('active', p.getAttribute('data-cat') === 'all'); });
    renderCatalog();
    return;
  }
  var matched = PRODUCTS.filter(function(p) {
    return p.name.toLowerCase().indexOf(query) > -1
      || (p.brand || '').toLowerCase().indexOf(query) > -1
      || (p.desc || '').toLowerCase().indexOf(query) > -1
      || p.cats.some(function(c) { return c.toLowerCase().indexOf(query) > -1; });
  });
  if (!matched.length) {
    catalog.innerHTML = '<div class="no-results">Nuk u gjet\u00ebn produkte.</div>';
    return;
  }
  catalog.innerHTML = '<section class="collection-section">'
    + '<div class="collection-header"><h2 class="collection-title">Rezultate K\u00ebrkimi</h2>'
    + '<span class="product-count">' + matched.length + ' Produkte</span></div>'
    + '<div class="product-grid">' + matched.map(function(p) { return makeCard(p, false); }).join('') + '</div>'
    + '</section>';
  setupImgFallbacks();
}

// Init
document.addEventListener('DOMContentLoaded', function() {
  renderCatalog();

  // Category pill clicks
  document.querySelectorAll('.cat-pill').forEach(function(btn) {
    btn.addEventListener('click', function() {
      filterCat(btn.getAttribute('data-cat'));
    });
  });

  // Search
  var searchInp = document.getElementById('search-input');
  if (searchInp) {
    var searchTimer;
    searchInp.addEventListener('input', function() {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function() { searchProducts(searchInp.value); }, 300);
    });
  }
});
`;

fs.writeFileSync('catalog-app.js', appJS);
console.log('catalog-app.js written:', appJS.length, 'bytes');

// â”€â”€ Write index.html â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const html = `<!DOCTYPE html>
<html lang="sq">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IT Store &mdash; Information &amp; Technology Resource Specialist</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;0,900;1,800&family=Barlow:wght@300;400;500;600;800&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: { 'brand-bg': '#141414', 'brand-bg2': '#0E0E0E', 'brand-amber': '#F0A020' },
                    fontFamily: { heading: ['"Barlow Condensed"', 'Barlow', 'sans-serif'], body: ['Barlow', 'sans-serif'] }
                }
            }
        }
    <\/script>
    <style>
        :root {
            --color-bg: #141414; --color-bg2: #0E0E0E;
            --color-amber: #F0A020; --color-amber-dark: #C07810;
            --color-text: #ffffff; --header-height: 101px; --site-px: 72px;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { font-size: 62.5%; }
        body { background-color: var(--color-bg); color: var(--color-text); font-family: 'Barlow', sans-serif; font-weight: 300; font-size: 1.4rem; line-height: 1.6; -webkit-font-smoothing: antialiased; padding-top: var(--header-height); }
        h1, h2, h3, h4, h5 { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em; line-height: 0.92; }
        a { text-decoration: none; color: inherit; }

        .announce-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 200; height: 36px; background: var(--color-amber); display: flex; align-items: center; justify-content: center; gap: 48px; overflow: hidden; }
        .announce-bar span { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.15rem; letter-spacing: 0.12em; text-transform: uppercase; color: #141414; white-space: nowrap; }

        header { position: fixed; top: 36px; left: 0; right: 0; z-index: 100; height: calc(var(--header-height) - 36px); background: var(--color-bg); border-bottom: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; padding: 0 var(--site-px); gap: 32px; }
        .nav-logo img { height: 36px; width: auto; display: block; }
        .nav-links { flex: 1; display: flex; justify-content: center; align-items: center; gap: 22px; list-style: none; }
        .nav-links li { position: relative; }
        .nav-links a { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.2rem; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.8); transition: color 0.15s; }
        .nav-links a:hover { color: var(--color-amber); }
        .nav-dropdown { position: absolute; top: calc(100% + 14px); left: 50%; transform: translateX(-50%); background: #1A1A1A; border: 1px solid rgba(255,255,255,0.08); min-width: 175px; padding: 8px 0; opacity: 0; pointer-events: none; transition: opacity 0.15s; z-index: 300; }
        .nav-links li:hover .nav-dropdown { opacity: 1; pointer-events: auto; }
        .nav-dropdown a { display: block; padding: 8px 18px; font-size: 1.1rem; color: rgba(255,255,255,0.7); letter-spacing: 0.08em; transition: color 0.12s, background 0.12s; }
        .nav-dropdown a:hover { color: var(--color-amber); background: rgba(240,160,32,0.06); }
        .nav-icons { display: flex; align-items: center; gap: 18px; }
        .nav-icon-btn { background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.85); display: flex; align-items: center; justify-content: center; padding: 4px; transition: color 0.15s; }
        .nav-icon-btn:hover { color: var(--color-amber); }

        .hero-banner { position: relative; width: 100%; overflow: hidden; }
        .hero-banner img { width: 100%; height: 65vh; min-height: 440px; object-fit: cover; display: block; }
        .hero-gradient { position: absolute; inset: 0; background: linear-gradient(to top, rgba(20,20,20,0.92) 0%, rgba(20,20,20,0.45) 45%, transparent 100%); }
        .hero-content { position: absolute; bottom: 44px; left: var(--site-px); }
        .hero-label { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.1rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-amber); margin-bottom: 12px; }
        .hero-title { font-size: clamp(3.6rem, 6vw, 8rem); color: white; margin-bottom: 24px; }
        .btn-primary { display: inline-block; background: var(--color-amber); color: #141414; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 1.2rem; letter-spacing: 0.14em; text-transform: uppercase; padding: 13px 30px; transition: background 0.15s, color 0.15s; cursor: pointer; border: none; }
        .btn-primary:hover { background: #ffffff; color: #141414; }

        .marquee-band { background: var(--color-amber); overflow: hidden; padding: 10px 0; white-space: nowrap; }
        .marquee-track { display: inline-flex; animation: marquee 22s linear infinite; }
        .marquee-item { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 1.2rem; letter-spacing: 0.14em; text-transform: uppercase; color: #141414; padding: 0 28px; }
        .marquee-dot { color: rgba(23,26,3,0.35); font-size: 1.6rem; line-height: 1; }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

        .search-bar-wrap { padding: 18px var(--site-px); background: var(--color-bg2); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .search-bar-inner { max-width: 520px; margin: 0 auto; display: flex; }
        .search-input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-right: none; padding: 11px 18px; color: white; font-family: 'Barlow', sans-serif; font-size: 1.3rem; outline: none; transition: border-color 0.15s; }
        .search-input:focus { border-color: rgba(240,160,32,0.5); }
        .search-input::placeholder { color: rgba(255,255,255,0.3); }
        .search-btn { background: var(--color-amber); border: none; padding: 11px 20px; cursor: pointer; color: #141414; }

        .cat-filter-bar { background: var(--color-bg2); border-bottom: 1px solid rgba(255,255,255,0.06); padding: 0 var(--site-px); position: sticky; top: var(--header-height); z-index: 50; overflow-x: auto; scrollbar-width: none; }
        .cat-filter-bar::-webkit-scrollbar { display: none; }
        .cat-filter-inner { display: flex; min-width: max-content; }
        .cat-pill { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.1rem; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.5); background: none; border: none; cursor: pointer; padding: 14px 20px; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s; white-space: nowrap; }
        .cat-pill:hover { color: rgba(255,255,255,0.85); }
        .cat-pill.active { color: var(--color-amber); border-bottom-color: var(--color-amber); }

        .collection-section { padding: 52px var(--site-px); }
        .collection-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
        .collection-title { font-size: clamp(2.2rem, 3.5vw, 5rem); color: white; }
        .collection-title small { font-size: 0.42em; color: rgba(255,255,255,0.3); display: block; letter-spacing: 0.15em; font-weight: 600; margin-bottom: 4px; }
        .product-count { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.1rem; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.3); align-self: flex-end; padding-bottom: 10px; }

        .sub-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
        .sub-tab { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.05rem; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); cursor: pointer; padding: 6px 14px; transition: color 0.12s, border-color 0.12s, background 0.12s; }
        .sub-tab:hover { color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.2); }
        .sub-tab.active { color: var(--color-amber); border-color: var(--color-amber); background: rgba(240,160,32,0.06); }

        .product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; }
        .product-card { cursor: pointer; background: var(--color-bg2); position: relative; overflow: hidden; }
        .product-card.hidden-card { display: none; }
        .product-img-wrap { width: 100%; aspect-ratio: 1; overflow: hidden; background: #111111; position: relative; }
        .product-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1); }
        .product-card:hover .product-img-wrap img { transform: scale(1.05); }
        .product-info { padding: 14px 16px 20px; }
        .product-name { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.4rem; letter-spacing: 0.06em; text-transform: uppercase; color: white; margin-bottom: 4px; line-height: 1.15; }
        .product-desc { font-size: 1.15rem; color: rgba(255,255,255,0.38); line-height: 1.45; margin-bottom: 7px; }
        .product-price { font-size: 1.3rem; font-weight: 300; color: rgba(255,255,255,0.55); display: flex; align-items: center; gap: 8px; }
        .price-main { color: var(--color-amber); font-weight: 500; }
        .price-was { text-decoration: line-through; font-size: 1.15rem; }
        .product-badge { position: absolute; top: 12px; left: 12px; background: var(--color-amber); color: #141414; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 1.05rem; letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 9px; z-index: 2; }
        .product-badge.out-of-stock { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.45); }
        .product-badge.variable { background: rgba(240,160,32,0.12); color: var(--color-amber); border: 1px solid rgba(240,160,32,0.3); }
        .show-more-wrap { text-align: center; margin-top: 16px; }
        .show-more-btn { border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.1rem; letter-spacing: 0.12em; text-transform: uppercase; padding: 11px 32px; background: none; cursor: pointer; transition: border-color 0.15s, color 0.15s; }
        .show-more-btn:hover { border-color: var(--color-amber); color: var(--color-amber); }
        .no-results { padding: 80px var(--site-px); text-align: center; color: rgba(255,255,255,0.3); font-family: 'Barlow Condensed', sans-serif; font-size: 2rem; letter-spacing: 0.1em; text-transform: uppercase; }
        .section-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 0 var(--site-px); }

        .promo-banner { background: var(--color-bg2); padding: 72px var(--site-px); text-align: center; position: relative; overflow: hidden; }
        .promo-banner::before { content: ''; position: absolute; top: -80px; left: 50%; transform: translateX(-50%); width: 600px; height: 300px; background: radial-gradient(ellipse, rgba(240,160,32,0.08) 0%, transparent 70%); pointer-events: none; }
        .promo-number { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: clamp(8rem, 18vw, 22rem); color: rgba(255,255,255,0.03); line-height: 0.85; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); white-space: nowrap; pointer-events: none; user-select: none; }
        .promo-label { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.1rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-amber); margin-bottom: 12px; position: relative; }
        .promo-title { font-size: clamp(3rem, 5vw, 6rem); color: white; margin-bottom: 20px; position: relative; }
        .promo-title em { font-style: normal; color: var(--color-amber); }
        .promo-desc { font-size: 1.4rem; font-weight: 300; color: rgba(255,255,255,0.55); max-width: 480px; margin: 0 auto 32px; line-height: 1.7; position: relative; }

        footer { background: var(--color-bg2); border-top: 1px solid rgba(255,255,255,0.07); padding: 60px var(--site-px) 36px; }
        .footer-top { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr; gap: 48px; padding-bottom: 48px; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .footer-brand-logo { height: 32px; width: auto; display: block; margin-bottom: 18px; }
        .footer-brand-desc { font-size: 1.25rem; font-weight: 300; color: rgba(255,255,255,0.45); line-height: 1.7; max-width: 260px; }
        .footer-social { display: flex; gap: 10px; margin-top: 22px; }
        .social-link { width: 34px; height: 34px; border: 1px solid rgba(255,255,255,0.14); display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.6); transition: border-color 0.15s, color 0.15s; }
        .social-link:hover { border-color: var(--color-amber); color: var(--color-amber); }
        .footer-col-title { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 1.2rem; letter-spacing: 0.14em; text-transform: uppercase; color: white; margin-bottom: 16px; }
        .footer-col ul { list-style: none; }
        .footer-col ul li { margin-bottom: 10px; }
        .footer-col ul li a { font-size: 1.25rem; font-weight: 300; color: rgba(255,255,255,0.45); transition: color 0.15s; }
        .footer-col ul li a:hover { color: var(--color-amber); }
        .newsletter-input { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); padding: 10px 14px; color: white; font-family: 'Barlow', sans-serif; font-size: 1.25rem; font-weight: 300; outline: none; margin-bottom: 10px; transition: border-color 0.15s; }
        .newsletter-input::placeholder { color: rgba(255,255,255,0.3); }
        .newsletter-input:focus { border-color: rgba(240,160,32,0.5); }
        .newsletter-btn { width: 100%; background: var(--color-amber); color: #141414; border: none; padding: 11px; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 1.2rem; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: background 0.15s; }
        .newsletter-btn:hover { background: white; }
        .footer-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 28px; }
        .footer-bottom p { font-size: 1.15rem; font-weight: 300; color: rgba(255,255,255,0.3); }
        .footer-bottom a { color: rgba(255,255,255,0.3); transition: color 0.15s; }
        .footer-bottom a:hover { color: var(--color-amber); }

        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: var(--color-bg); }
        ::-webkit-scrollbar-thumb { background: rgba(240,160,32,0.25); }
        ::-webkit-scrollbar-thumb:hover { background: var(--color-amber); }

        @media (max-width: 1100px) {
            .product-grid { grid-template-columns: repeat(2, 1fr); }
            .footer-top { grid-template-columns: 1fr 1fr; }
            :root { --site-px: 32px; }
            .nav-links { gap: 14px; }
        }
        @media (max-width: 640px) {
            .product-grid { grid-template-columns: repeat(2, 1fr); }
            .footer-top { grid-template-columns: 1fr; }
            :root { --site-px: 20px; }
            .nav-links { display: none; }
        }
    </style>
</head>
<body>

    <div class="announce-bar">
        <span>Garanci 1 vit &mdash; &Ccedil;do produkt i verifikuar</span>
        <span style="color:rgba(23,26,3,0.35);font-size:1.6rem">&middot;</span>
        <span>Shipping &amp; Instalim n&euml; t&euml; gjith&euml; Shqip&euml;rin&euml;</span>
        <span style="color:rgba(23,26,3,0.35);font-size:1.6rem">&middot;</span>
        <span>Garanci 1 vit &mdash; &Ccedil;do produkt i verifikuar</span>
        <span style="color:rgba(23,26,3,0.35);font-size:1.6rem">&middot;</span>
        <span>Shipping &amp; Instalim n&euml; t&euml; gjith&euml; Shqip&euml;rin&euml;</span>
    </div>

    <header>
        <div class="nav-logo"><img src="IT Store LOGO.png" alt="IT Store"></div>
        <nav style="flex:1;">
            <ul class="nav-links">
                <li><a href="#" data-cat="Laptop">Laptop</a>
                    <div class="nav-dropdown">
                        <a href="#" data-cat="Laptop">T&euml; Gjitha Laptop</a>
                        <a href="#" data-subcat="Laptop &gt; MacBook">MacBook</a>
                    </div>
                </li>
                <li><a href="#" data-cat="Desktop">Desktop</a>
                    <div class="nav-dropdown">
                        <a href="#" data-cat="Desktop">T&euml; Gjitha Desktop</a>
                        <a href="#" data-subcat="Desktop &gt; PC">PC</a>
                    </div>
                </li>
                <li><a href="#" data-cat="Workstation">Workstation</a></li>
                <li><a href="#" data-cat="Networking">Networking</a>
                    <div class="nav-dropdown">
                        <a href="#" data-cat="Networking">T&euml; Gjitha</a>
                        <a href="#" data-subcat="Networking &gt; Server">Server</a>
                        <a href="#" data-subcat="Networking &gt; Switch">Switch</a>
                        <a href="#" data-subcat="Networking &gt; NAS">NAS</a>
                        <a href="#" data-subcat="Networking &gt; MikroTik">MikroTik</a>
                        <a href="#" data-subcat="Networking &gt; KVM">KVM</a>
                    </div>
                </li>
                <li><a href="#" data-cat="Komponente">Komponente</a>
                    <div class="nav-dropdown">
                        <a href="#" data-cat="Komponente">T&euml; Gjitha</a>
                        <a href="#" data-subcat="Komponente &gt; GPU">GPU</a>
                        <a href="#" data-subcat="Komponente &gt; RAM">RAM</a>
                        <a href="#" data-subcat="Komponente &gt; SSD">SSD</a>
                        <a href="#" data-subcat="Komponente &gt; HDD">HDD</a>
                    </div>
                </li>
                <li><a href="#" data-cat="Monitor">Monitor</a></li>
                <li><a href="#" data-cat="UPS">UPS</a></li>
            </ul>
        </nav>
        <div class="nav-icons">
            <button class="nav-icon-btn" aria-label="Search">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            <button class="nav-icon-btn" aria-label="Account">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
        </div>
    </header>

    <main>
        <div class="hero-banner">
            <img src="https://placehold.co/1440x700/1A1A1A/F0A020" alt="IT Store">
            <div class="hero-gradient"></div>
            <div class="hero-content">
                <p class="hero-label">IT Store Albania</p>
                <h1 class="hero-title">TEKNOLOGJI<br>PROFESIONALE</h1>
                <a href="#catalog" class="btn-primary">Shfleto Katalogun</a>
            </div>
        </div>

        <div class="marquee-band">
            <div class="marquee-track">
                <span class="marquee-item">Laptop</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">Desktop</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">Workstation</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">Networking</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">Komponente</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">Monitor</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">UPS</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">Server</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">Switch</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">Laptop</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">Desktop</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">Workstation</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">Networking</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">Komponente</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">Monitor</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">UPS</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">Server</span><span class="marquee-dot">&middot;</span>
                <span class="marquee-item">Switch</span><span class="marquee-dot">&middot;</span>
            </div>
        </div>

        <div class="search-bar-wrap">
            <div class="search-bar-inner">
                <input id="search-input" type="text" class="search-input" placeholder="K&euml;rko produkt...">
                <button class="search-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </button>
            </div>
        </div>

        <div class="cat-filter-bar">
            <div class="cat-filter-inner">
                <button class="cat-pill active" data-cat="all">T&euml; Gjitha</button>
                <button class="cat-pill" data-cat="Laptop">Laptop</button>
                <button class="cat-pill" data-cat="Desktop">Desktop</button>
                <button class="cat-pill" data-cat="Workstation">Workstation</button>
                <button class="cat-pill" data-cat="Networking">Networking</button>
                <button class="cat-pill" data-cat="Komponente">Komponente</button>
                <button class="cat-pill" data-cat="Monitor">Monitor</button>
                <button class="cat-pill" data-cat="UPS">UPS</button>
            </div>
        </div>

        <div id="catalog"></div>

        <section class="promo-banner">
            <span class="promo-number">IT</span>
            <p class="promo-label">Ekipim Profesional</p>
            <h2 class="promo-title">PAJISJE T&Euml; <em>VERIFIKUARA</em><br>ME GARANCI</h2>
            <p class="promo-desc">&Ccedil;do pajisje e kontrolluar dhe e certifikuar. Garanci 1 vit, support teknik, d&euml;rgim dhe instalim n&euml; t&euml; gjith&euml; Shqip&euml;rin&euml;.</p>
            <a href="tel:+355" class="btn-primary" style="position:relative;">Na Kontaktoni</a>
        </section>
    </main>

    <footer>
        <div class="footer-top">
            <div>
                <img src="IT Store LOGO.png" alt="IT Store" class="footer-brand-logo">
                <p class="footer-brand-desc">Information &amp; Technology Resource Specialist. Partneri juaj i besuar p&euml;r teknologji profesionale me garanci.</p>
                <div class="footer-social">
                    <a href="#" class="social-link" aria-label="Facebook"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>
                    <a href="#" class="social-link" aria-label="Instagram"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg></a>
                    <a href="#" class="social-link" aria-label="LinkedIn"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>
                </div>
            </div>
            <div class="footer-col">
                <p class="footer-col-title">Produktet</p>
                <ul>
                    <li><a href="#" data-cat="Laptop">Laptop</a></li>
                    <li><a href="#" data-cat="Desktop">Desktop &amp; PC</a></li>
                    <li><a href="#" data-cat="Workstation">Workstation</a></li>
                    <li><a href="#" data-cat="Networking">Networking</a></li>
                    <li><a href="#" data-cat="Komponente">Komponente</a></li>
                    <li><a href="#" data-cat="Monitor">Monitor</a></li>
                    <li><a href="#" data-cat="UPS">UPS</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <p class="footer-col-title">Ndihm&euml;</p>
                <ul>
                    <li><a href="#">FAQ</a></li>
                    <li><a href="#">Shipping</a></li>
                    <li><a href="#">Kthime</a></li>
                    <li><a href="#">Garancia</a></li>
                    <li><a href="#">Na Kontaktoni</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <p class="footer-col-title">Kompania</p>
                <ul>
                    <li><a href="#">Rreth Nesh</a></li>
                    <li><a href="#">Karrier&euml;</a></li>
                    <li><a href="#">Partner&euml;</a></li>
                    <li><a href="#">Blog</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <p class="footer-col-title">Q&euml;ndro i Informuar</p>
                <p style="font-size:1.25rem;font-weight:300;color:rgba(255,255,255,0.4);margin-bottom:18px;line-height:1.6;">Merrni ofertat e fundit dhe produktet e reja.</p>
                <input type="email" class="newsletter-input" placeholder="Emaili juaj">
                <button class="newsletter-btn">Regjistrohu</button>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2025 IT Store &mdash; Information &amp; Technology Resource Specialist</p>
            <p><a href="#">Politika e Privat&euml;sis&euml;</a> &nbsp;&middot;&nbsp; <a href="#">Kushtet e Sh&euml;rbimit</a></p>
        </div>
    </footer>

    <script src="catalog-products.js"><\/script>
    <script src="catalog-app.js"><\/script>
    <script>
    // Wire nav links
    document.querySelectorAll('[data-cat]').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        filterCat(el.getAttribute('data-cat'));
      });
    });
    document.querySelectorAll('[data-subcat]').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        var subcat = el.getAttribute('data-subcat');
        var mainCat = subcat.split('>')[0].trim();
        activeCat = mainCat;
        activeSubcat = subcat;
        document.querySelectorAll('.cat-pill').forEach(function(p) {
          p.classList.toggle('active', p.getAttribute('data-cat') === mainCat);
        });
        renderCatalog();
        setTimeout(function() {
          var el2 = document.getElementById('catalog');
          if (el2) el2.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      });
    });
    <\/script>
</body>
</html>`;

fs.writeFileSync('index.html', html);
console.log('index.html written:', html.length, 'bytes');
