const KEY = 'itstore_basket';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function save(items) { localStorage.setItem(KEY, JSON.stringify(items)); }

export function addItem(product) {
  const items = load();
  const existing = items.find(i => i.id === product.id);
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
    });
  }
  save(items);
  updateBadge();
}

export function removeItem(id) {
  save(load().filter(i => i.id !== id));
  updateBadge();
}

export function setQty(id, qty) {
  const items = load();
  const item = items.find(i => i.id === id);
  if (item) {
    if (qty < 1) { save(items.filter(i => i.id !== id)); }
    else { item.qty = qty; save(items); }
  }
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
    const price = Math.round(i.price).toLocaleString('en-US');
    const link = i.slug ? `${origin}/product/${i.slug}` : '';
    return `- ${i.name} × ${i.qty} — ${price} L${link ? `\n  ${link}` : ''}`;
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
