/* Shared site header: mobile drawer, shop mega-menu, search + suggestions.
   Every page ships the same header markup (see any *.html) and calls
   initHeader() once, so behaviour can never drift page to page. */
import { searchProducts } from '/js/api.js';
import { escapeHtml } from '/js/ui.js';

const SEARCH_PAGE = '/shop.html';

/* ── Mobile drawer ──────────────────────────────────────────────────── */
function initMobileNav() {
  const nav = document.getElementById('mobile-nav');
  const burger = document.getElementById('hamburger');
  if (!nav || !burger) return;

  const open = () => nav.classList.add('open');
  const close = () => nav.classList.remove('open');

  burger.addEventListener('click', open);
  document.getElementById('mobile-nav-close')?.addEventListener('click', close);
  // Tap on the dimmed backdrop closes the drawer
  nav.addEventListener('click', e => { if (e.target === e.currentTarget) close(); });
  // Following a link inside the drawer should leave it closed behind you
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) close();
  });

  // Shop accordion inside the drawer
  const toggle = document.getElementById('mobile-shop-toggle');
  const children = document.getElementById('mobile-shop-children');
  if (toggle && children) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      const willOpen = !children.classList.contains('open');
      children.classList.toggle('open', willOpen);
      toggle.classList.toggle('open', willOpen);
      toggle.setAttribute('aria-expanded', String(willOpen));
    });
  }
}

/* ── Desktop mega-menu ──────────────────────────────────────────────── */
function initShopDropdown() {
  const item = document.getElementById('shop-nav-item');
  const drop = document.getElementById('shop-dropdown');
  if (!item || !drop) return;

  let timer;
  const show = () => {
    clearTimeout(timer);
    drop.classList.add('open');
    item.classList.add('dropdown-open');
  };
  const hide = () => {
    timer = setTimeout(() => {
      drop.classList.remove('open');
      item.classList.remove('dropdown-open');
    }, 200);
  };

  item.addEventListener('mouseenter', show);
  item.addEventListener('mouseleave', hide);
  drop.addEventListener('mouseenter', show);
  drop.addEventListener('mouseleave', hide);
  // Keyboard users get the same menu when tabbing through it
  item.addEventListener('focusin', show);
  item.addEventListener('focusout', e => {
    if (!item.contains(e.relatedTarget)) hide();
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    clearTimeout(timer);
    drop.classList.remove('open');
    item.classList.remove('dropdown-open');
  });
}

/* ── Header search + suggestions ────────────────────────────────────── */
function initSearch(onSearch) {
  const form = document.getElementById('header-search-form');
  const input = document.getElementById('header-search-input');
  const box = document.getElementById('header-search-suggest');
  if (!form || !input || !box) return;

  let timer, items = [], cursor = -1, seq = 0;

  const closeBox = () => {
    box.classList.remove('open');
    input.setAttribute('aria-expanded', 'false');
    items = [];
    cursor = -1;
  };

  const highlight = i => {
    cursor = i;
    items.forEach((el, n) => el.classList.toggle('active', n === i));
    if (i >= 0) items[i].scrollIntoView({ block: 'nearest' });
  };

  const goToSearch = () => {
    const query = input.value.trim();
    closeBox();
    if (onSearch) { onSearch(query); return; }
    window.location.href = query
      ? `${SEARCH_PAGE}?q=${encodeURIComponent(query)}`
      : SEARCH_PAGE;
  };

  const render = (results, q) => {
    const rows = results.map(r => {
      const price = Number(r.sale_price) > 0 ? Number(r.sale_price) : Number(r.price);
      const href = r.slug ? `/product/${encodeURIComponent(r.slug)}` : `/product.html?id=${Number(r.id)}`;
      return `
        <a class="suggest-item" role="option" href="${href}">
          ${r.images?.[0]
            ? `<img class="suggest-thumb" src="${escapeHtml(r.images[0])}" alt="" loading="lazy">`
            : '<span class="suggest-thumb"></span>'}
          <span class="suggest-name">${escapeHtml(r.name)}</span>
          ${price > 0
            ? `<span class="suggest-price">${Math.round(price).toLocaleString('en-US')} L</span>`
            : '<span class="suggest-price">Sipas kërkesës</span>'}
        </a>`;
    }).join('');

    box.innerHTML = results.length
      ? rows + `<button type="button" class="suggest-all" role="option">Shiko të gjitha rezultatet për “${escapeHtml(q)}”</button>`
      : `<div class="suggest-empty">Asnjë produkt për “${escapeHtml(q)}”</div>`;

    items = [...box.querySelectorAll('.suggest-item, .suggest-all')];
    cursor = -1;
    box.classList.add('open');
    input.setAttribute('aria-expanded', 'true');

    box.querySelector('.suggest-all')?.addEventListener('click', goToSearch);
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { closeBox(); return; }
    const mine = ++seq;
    timer = setTimeout(async () => {
      const results = await searchProducts(q).catch(() => []);
      if (mine !== seq || input.value.trim() !== q) return;   // a newer keystroke won
      render(results.slice(0, 5), q);
    }, 250);
  });

  input.addEventListener('keydown', e => {
    if (!box.classList.contains('open') || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); highlight((cursor + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlight((cursor - 1 + items.length) % items.length); }
    else if (e.key === 'Escape') { closeBox(); }
    else if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); items[cursor].click(); }
  });

  input.addEventListener('focus', () => {
    if (items.length) {
      box.classList.add('open');
      input.setAttribute('aria-expanded', 'true');
    }
  });

  form.addEventListener('submit', e => { e.preventDefault(); goToSearch(); });

  document.addEventListener('click', e => {
    if (!form.contains(e.target)) closeBox();
  });
}

/* ── Current-page highlighting ──────────────────────────────────────── */
function markActiveLink() {
  const path = window.location.pathname;
  const onSale = new URLSearchParams(window.location.search).get('sale') === '1';
  let key = null;
  if (path === '/' || path === '/index.html') key = 'home';
  else if (path === '/shop.html' || path.startsWith('/product')) key = 'shop';
  else if (path.startsWith('/rreth-nesh')) key = 'rreth';
  else if (path.startsWith('/na-kontaktoni')) key = 'kontakt';
  if (onSale) key = 'sale';
  if (!key) return;
  document.querySelectorAll(`[data-nav="${key}"]`).forEach(a => a.classList.add('active'));
}

/* ── Hide the header while scrolling down ───────────────────────────── */
function initScrollHide() {
  const header = document.getElementById('main-header');
  if (!header) return;
  let lastY = 0, ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (y < 10 || y < lastY - 6) header.classList.remove('header-hidden');
      else if (y > lastY + 6) header.classList.add('header-hidden');
      lastY = y;
      ticking = false;
    });
  }, { passive: true });
}

/**
 * Wire up the shared header.
 * @param {{onSearch?: (query: string) => void}} [opts]
 *        onSearch overrides the default "go to /shop.html?q=" behaviour —
 *        the shop page filters in place instead of navigating.
 */
export function initHeader(opts = {}) {
  initMobileNav();
  initShopDropdown();
  initSearch(opts.onSearch);
  markActiveLink();
  initScrollHide();
}
