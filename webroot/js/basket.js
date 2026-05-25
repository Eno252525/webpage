const KEY = 'itstore_basket';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function save(items) { localStorage.setItem(KEY, JSON.stringify(items)); }

export function addItem(product, options) {
  const items = load();
  const cleanOptions = options && typeof options === 'object'
    ? Object.fromEntries(Object.entries(options).filter(([, v]) => v))
    : null;
  const hasOptions = cleanOptions && Object.keys(cleanOptions).length > 0;
  // Treat each (product, options) pair as a distinct basket line — picking a
  // different RAM frequency shouldn't merge into the previous selection.
  const matches = (i) => i.id === product.id
    && JSON.stringify(i.options || null) === JSON.stringify(hasOptions ? cleanOptions : null);
  const existing = items.find(matches);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    items.push({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.sale_price ?? product.price,
      image: (product.images || [])[0] || '',
      qty: 1,
      options: hasOptions ? cleanOptions : null,
    });
  }
  save(items);
  updateBadge();
}

// Identify a line by its index so two entries with the same product id but
// different options (e.g. RAM 8GB vs 16GB) can be edited independently.
export function removeItemAt(idx) {
  const items = load();
  if (idx >= 0 && idx < items.length) {
    items.splice(idx, 1);
    save(items);
  }
  updateBadge();
}

export function setQtyAt(idx, qty) {
  const items = load();
  if (idx < 0 || idx >= items.length) return;
  if (qty < 1) { items.splice(idx, 1); }
  else { items[idx].qty = qty; }
  save(items);
  updateBadge();
}

export function getItems() { return load(); }

export function getCount() { return load().reduce((n, i) => n + (i.qty || 1), 0); }

export function getTotal() {
  return load().reduce((sum, i) => sum + i.price * (i.qty || 1), 0).toFixed(2);
}

export function clearBasket() { save([]); updateBadge(); }

export function buildWhatsAppURL() {
  const items = load();
  const phone = window.__WA_NUMBER__ || '355693181062';
  const origin = (typeof location !== 'undefined' && location.origin) ? location.origin : '';
  const lines = items.map(i => {
    const priceLabel = Number(i.price) > 0
      ? Math.round(i.price).toLocaleString('en-US') + ' L'
      : 'çmim sipas kërkesës';
    const link = i.slug ? `${origin}/product/${i.slug}` : '';
    const opts = i.options && typeof i.options === 'object'
      ? Object.entries(i.options).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')
      : '';
    return `- ${i.name}${opts ? ` (${opts})` : ''} × ${i.qty} — ${priceLabel}${link ? `\n  ${link}` : ''}`;
  }).join('\n');
  const total = Math.round(Number(getTotal())).toLocaleString('en-US');
  const msg = `Përshëndetje, dua të porosis:\n${lines}\nTotali: ${total} L`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

export function updateBadge() {
  const count = getCount();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}
