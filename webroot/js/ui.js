import { t } from './i18n.js';
import { addItem, getItems, removeItemAt, setQtyAt, getTotal, buildWhatsAppURL, updateBadge } from './basket.js';

export function fmtPrice(p) {
  return Math.round(Number(p)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Escape untrusted text before inserting into HTML to prevent XSS.
export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function parseSpecText(text) {
  if (!text) return null;
  const clean = text.replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  // Pipe-separated format: "CPU: val | RAM: val | ..."
  if (clean.includes('|')) {
    const parts = clean.split(/\s*\|\s*/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const pairs = parts.map(p => {
        const c = p.indexOf(':');
        if (c > 0) return [p.slice(0, c).trim(), p.slice(c + 1).trim()];
        return null;
      });
      if (pairs.every(Boolean)) return pairs;
    }
  }

  const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    const pairs = lines.map(l => {
      const c = l.indexOf(':');
      if (c > 0 && c < l.length - 1) return [l.slice(0, c).trim(), l.slice(c + 1).trim()];
      return null;
    });
    if (pairs.every(Boolean)) return pairs;
  }
  const re = /(?:^|(?<=\s))([A-Z][A-Za-z]*):\s*/g;
  const hits = [];
  let m;
  while ((m = re.exec(clean)) !== null) hits.push({ label: m[1], start: m.index, end: m.index + m[0].length });
  if (hits.length < 2 || hits[0].start > 15) return null;
  return hits.map((h, i) => {
    const valueEnd = i + 1 < hits.length ? hits[i + 1].start : clean.length;
    return [h.label, clean.slice(h.end, valueEnd).trim()];
  });
}

export function renderSpecGrid(pairs, maxRows) {
  const rows = (maxRows ? pairs.slice(0, maxRows) : pairs).map(([k, v]) =>
    `<span class="spec-label">${escapeHtml(k)}:</span><span class="spec-value">${escapeHtml(v)}</span>`
  ).join('');
  return `<div class="spec-grid">${rows}</div>`;
}

export function renderProductListItem(product) {
  const name = escapeHtml(product.name);
  const slug = escapeHtml(product.slug);
  const id = Number(product.id);
  const hasPrice = Number(product.price) > 0 || Number(product.sale_price) > 0;
  const price = !hasPrice ? '' : product.sale_price
    ? `<span class="price-main price-sale">${fmtPrice(product.sale_price)} L</span><span class="price-was">${fmtPrice(product.price)} L</span>`
    : `<span class="price-main">${fmtPrice(product.price)} L</span>`;
  const isUsed = isUsedBadge(product.badge);
  const badge = product.badge
    ? `<span class="product-badge${isUsed ? ' badge-used' : ''}">${escapeHtml(product.badge)}</span>` : '';
  const img = (product.images || [])[0]
    ? `<img src="${escapeHtml(product.images[0])}" alt="${name}" loading="lazy">`
    : `<img src="https://placehold.co/200x200/EDE9E3/F0A020" alt="${name}">`;
  const discountPct = product.sale_price && Number(product.price) > 0
    ? Math.round((1 - Number(product.sale_price) / Number(product.price)) * 100) : 0;
  const saleSticker = discountPct > 0
    ? `<span class="sale-sticker">-${discountPct}%</span>`
    : (product.sale_price ? `<span class="sale-sticker">SALE</span>` : '');
  const stockBadge = product.in_stock
    ? `<span class="list-stock-badge in-stock">Në stok</span>`
    : `<span class="list-stock-badge out-stock">Pa stok</span>`;
  const specPairs = parseSpecText(product.short_description);
  const shortDesc = specPairs
    ? renderSpecGrid(specPairs, 4)
    : product.short_description
      ? `<p class="list-short-desc">${escapeHtml(product.short_description.slice(0, 180))}${product.short_description.length > 180 ? '…' : ''}</p>`
      : '';
  const stockClass = product.in_stock ? '' : 'out-of-stock';
  const usedTag = conditionTag(product.badge);
  return `
    <div class="product-list-item ${stockClass}" data-id="${id}" data-slug="${slug}">
      <a href="${slug ? '/product/' + slug : '/product.html?id=' + id}" class="list-img-link" aria-label="${name}">
        <div class="list-img-wrap">${img}${badge}${saleSticker}</div>
      </a>
      <div class="list-info">
        ${product.brand ? `<span class="product-brand">${escapeHtml(product.brand)}</span>` : ''}
        <a href="${slug ? '/product/' + slug : '/product.html?id=' + id}" class="list-name">${name}</a>
        ${usedTag}
        ${shortDesc}
        <div class="list-meta">${stockBadge}</div>
      </div>
      <div class="list-right">
        <div class="product-price list-price">${price}</div>
        <button class="btn-add-to-basket list-add-btn" data-id="${id}" ${product.in_stock ? '' : 'disabled'}>
          ${product.in_stock ? t.addToBasket : t.outOfStock}
        </button>
      </div>
    </div>`;
}

function isUsedBadge(badge) {
  if (!badge) return false;
  return badge.replace(/ë/g, 'e').replace(/ö/g, 'o').toLowerCase().includes('perdorur');
}

// Bottom condition tag: "I Ri" for new products, "Të Përdorur" otherwise.
function conditionTag(badge) {
  const isNew = (badge || '').trim().toLowerCase().replace(/ë/g, 'e') === 'i ri';
  return isNew
    ? `<span class="i-ri-tag">I Ri</span>`
    : `<span class="te-perdorur-tag">Të Përdorur</span>`;
}

export function renderProductCard(product) {
  const name = escapeHtml(product.name);
  const slug = escapeHtml(product.slug);
  const id = Number(product.id);
  const hasPrice = Number(product.price) > 0 || Number(product.sale_price) > 0;
  const price = !hasPrice ? '' : product.sale_price
    ? `<span class="price-main price-sale">${fmtPrice(product.sale_price)} L</span><span class="price-was">${fmtPrice(product.price)} L</span>`
    : `<span class="price-main">${fmtPrice(product.price)} L</span>`;
  const isUsed = isUsedBadge(product.badge);
  const badge = product.badge
    ? `<span class="product-badge${isUsed ? ' badge-used' : ''}">${escapeHtml(product.badge)}</span>` : '';
  const img = (product.images || [])[0]
    ? `<img src="${escapeHtml(product.images[0])}" alt="${name}" loading="lazy">`
    : `<img src="https://placehold.co/600x600/EDE9E3/F0A020" alt="${name}">`;
  const brandLabel = product.brand
    ? `<span class="product-brand">${escapeHtml(product.brand)}</span>` : '';
  const stockClass = product.in_stock ? '' : 'out-of-stock';
  const usedTag = conditionTag(product.badge);
  const discountPct = product.sale_price && Number(product.price) > 0
    ? Math.round((1 - Number(product.sale_price) / Number(product.price)) * 100) : 0;
  const saleSticker = discountPct > 0
    ? `<span class="sale-sticker">-${discountPct}%</span>`
    : (product.sale_price ? `<span class="sale-sticker">SALE</span>` : '');
  return `
    <div class="product-card ${stockClass}" data-id="${id}" data-slug="${slug}">
      <a href="${slug ? '/product/' + slug : '/product.html?id=' + id}" class="product-card-link" aria-label="${name}">
        <div class="product-img-wrap">
          ${img}
          ${badge}
          ${saleSticker}
        </div>
        <div class="product-info">
          ${brandLabel}
          <p class="product-name">${name}</p>
          ${usedTag}
          <p class="product-price">${price}</p>
        </div>
      </a>
      <button class="btn-add-to-basket" data-id="${id}" ${product.in_stock ? '' : 'disabled'}>
        ${product.in_stock ? t.addToBasket : t.outOfStock}
      </button>
    </div>`;
}

export function renderSkeletons(count = 4) {
  return Array.from({ length: count }, () => `
    <div class="product-card skeleton-card">
      <div class="product-img-wrap skeleton-img skeleton-shimmer"></div>
      <div class="product-info">
        <div class="skeleton-line skeleton-shimmer" style="width:75%;height:1.4rem;margin-bottom:8px;border-radius:2px;"></div>
        <div class="skeleton-line skeleton-shimmer" style="width:40%;height:1.2rem;border-radius:2px;"></div>
      </div>
    </div>`).join('');
}

// ── Basket Drawer ──────────────────────────────────────────────────────────

export function initBasketDrawer() {
  if (document.getElementById('basket-drawer')) return;

  const overlay = document.createElement('div');
  overlay.id = 'basket-overlay';
  overlay.className = 'basket-overlay';
  overlay.addEventListener('click', closeBasket);

  const drawer = document.createElement('aside');
  drawer.id = 'basket-drawer';
  drawer.className = 'basket-drawer';
  drawer.innerHTML = `
    <div class="basket-header">
      <h2 class="basket-title">${t.myInquiry}</h2>
      <button class="basket-close" id="basket-close" aria-label="Mbyll">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <div class="basket-items" id="basket-items"></div>
    <div class="basket-footer" id="basket-footer"></div>`;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  document.getElementById('basket-close').addEventListener('click', closeBasket);

  // Open drawer when cart icon clicked
  document.querySelectorAll('[aria-label*="Cart"], [aria-label*="cart"], .cart-icon-btn').forEach(btn => {
    btn.addEventListener('click', openBasket);
  });
  // Also wire nav cart buttons generically
  document.querySelectorAll('.nav-icon-btn').forEach(btn => {
    if (btn.querySelector('svg path[d*="6 2"]') || btn.getAttribute('aria-label')?.toLowerCase().includes('cart')) {
      btn.addEventListener('click', openBasket);
    }
  });

  renderDrawerContents();
}

export function openBasket() {
  document.getElementById('basket-overlay')?.classList.add('open');
  document.getElementById('basket-drawer')?.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderDrawerContents();
}

export function closeBasket() {
  document.getElementById('basket-overlay')?.classList.remove('open');
  document.getElementById('basket-drawer')?.classList.remove('open');
  document.body.style.overflow = '';
}

export function renderDrawerContents() {
  const items = getItems();
  const itemsEl = document.getElementById('basket-items');
  const footerEl = document.getElementById('basket-footer');
  if (!itemsEl || !footerEl) return;

  if (items.length === 0) {
    itemsEl.innerHTML = `
      <div class="basket-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity=".3">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <p>${t.emptyBasket}</p>
        <a href="/shop.html" class="btn-primary" style="display:inline-block;margin-top:16px;font-size:1.1rem;"
           onclick="closeBasket && closeBasket()">${t.continueShopping}</a>
      </div>`;
    footerEl.innerHTML = '';
    return;
  }

  itemsEl.innerHTML = items.map((item, idx) => {
    const optsLine = item.options && typeof item.options === 'object'
      ? Object.entries(item.options).filter(([, v]) => v)
          .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`).join(' · ')
      : '';
    return `
    <div class="basket-item" data-idx="${idx}">
      <div class="basket-item-img">
        ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">` : ''}
      </div>
      <div class="basket-item-info">
        <p class="basket-item-name">${escapeHtml(item.name)}</p>
        ${optsLine ? `<p class="basket-item-options" style="font-size:1.05rem;color:rgba(20,20,20,0.55);margin:2px 0 4px;">${optsLine}</p>` : ''}
        <p class="basket-item-price">${Number(item.price) > 0 ? fmtPrice(item.price) + ' L' : 'Çmim sipas kërkesës'}</p>
        <div class="basket-item-qty">
          <button class="qty-btn" data-action="dec" data-idx="${idx}">−</button>
          <span>${item.qty}</span>
          <button class="qty-btn" data-action="inc" data-idx="${idx}">+</button>
        </div>
      </div>
      <button class="basket-item-remove" data-idx="${idx}" aria-label="${t.removeItem}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>`;
  }).join('');

  footerEl.innerHTML = `
    <div class="basket-total">
      <span>${t.total}</span>
      <span class="basket-total-amount">${fmtPrice(getTotal())} L</span>
    </div>
    <a href="${buildWhatsAppURL()}" target="_blank" rel="noopener" class="btn-primary btn-whatsapp" style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;text-align:center;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      ${t.sendWhatsApp}
    </a>`;

  // Wire qty/remove buttons
  itemsEl.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      const item = getItems()[idx];
      if (!item) return;
      setQtyAt(idx, item.qty + (btn.dataset.action === 'inc' ? 1 : -1));
      renderDrawerContents();
    });
  });
  itemsEl.querySelectorAll('.basket-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeItemAt(Number(btn.dataset.idx));
      renderDrawerContents();
    });
  });
}

// ── Add-to-basket button handler ─────────────────────────────────────────────

export function wireAddToBasketButtons(products) {
  document.querySelectorAll('.btn-add-to-basket').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = Number(btn.dataset.id);
      const product = products.find(p => p.id === id);
      if (!product) return;
      addItem(product);
      renderDrawerContents();
      btn.textContent = t.addedToBasket;
      btn.classList.add('added');
      setTimeout(() => {
        btn.textContent = t.addToBasket;
        btn.classList.remove('added');
      }, 1500);
    });
  });
}

// ── Toast notification ────────────────────────────────────────────────────────

export function showToast(msg, type = 'success') {
  let toast = document.getElementById('it-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'it-toast';
    toast.className = 'it-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `it-toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}
