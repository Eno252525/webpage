
var CATEGORY_CONFIG = [
  { key: 'Laptop', label: 'Laptop', subs: ['Laptop > MacBook'] },
  { key: 'Desktop', label: 'Desktop / PC', subs: ['Desktop > PC'] },
  { key: 'Workstation', label: 'Workstation', subs: [] },
  { key: 'Networking', label: 'Networking', subs: ['Networking > Server','Networking > Switch','Networking > NAS','Networking > MikroTik','Networking > KVM'] },
  { key: 'Komponente', label: 'Komponente', subs: ['Komponente > GPU','Komponente > RAM','Komponente > SSD','Komponente > HDD'] },
  { key: 'Monitor', label: 'Monitor', subs: [] },
  { key: 'UPS', label: 'UPS', subs: [] },
];

function fmtPrice(p) { return Math.round(Number(p)).toLocaleString('en-US') + ' L'; }

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
        + '<button class="sub-tab' + allActive + '" data-setsubcat="" data-maincat="' + esc(section.key) + '">' + 'TÃ« Gjitha' + '</button>'
        + section.subs.map(function(sub) {
          var isA = activeSubcat === sub ? ' active' : '';
          var subLabel = sub.split('>').pop().trim();
          return '<button class="sub-tab' + isA + '" data-setsubcat="' + esc(sub) + '" data-maincat="' + esc(section.key) + '">' + esc(subLabel) + '</button>';
        }).join('')
        + '</div>';
    }

    var cardsHtml = sp.map(function(p, i) { return makeCard(p, i >= INITIAL); }).join('');
    var showMoreHtml = sp.length > INITIAL
      ? '<div class="show-more-wrap"><button class="show-more-btn" data-sectionid="' + sectionId + '">Shiko TÃ« Gjitha (' + sp.length + ')</button></div>'
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

  catalog.innerHTML = html || '<div class="no-results">Nuk u gjetÃ«n produkte</div>';
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
    catalog.innerHTML = '<div class="no-results">Nuk u gjetÃ«n produkte.</div>';
    return;
  }
  catalog.innerHTML = '<section class="collection-section">'
    + '<div class="collection-header"><h2 class="collection-title">Rezultate KÃ«rkimi</h2>'
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
