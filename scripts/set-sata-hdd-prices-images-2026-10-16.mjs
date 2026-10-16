// SATA HDD line refresh, per Eno 2026-10-16 (price list photo):
//
//   HDD 2TB    5 200        HDD 6TB   15 000
//   HDD 3TB    6 200        HDD 8TB   24 000  (new)
//   HDD 4TB   11 000        HDD 10TB  27 000  (new)
//                           HDD 12TB  30 000  (new)
//
//   * hdd-4tb comes back: hidden = 0, in_stock = 1.
//   * The WD Ultrastar DC HC520 12TB listing is taken off the site (hidden = 1,
//     row kept) — the generic "HDD 12TB" replaces it; redirects.js 301s the old
//     URL there.
//   * Every generic SATA HDD (500GB … 12TB) gets its own generic image: a drawn,
//     unbranded closed 3.5" drive with its capacity on the label (the old shared
//     photo was an opened drive). The images are generated here with sharp into
//     uploads/hdd-generic-<size>.webp, so nothing needs to be shipped.
//
// New products mirror the existing HDD rows (Capacity / Type attributes, same
// description template); sku left empty on purpose.
//
// Idempotent: keyed by slug (insert-or-update), absolute values, images are
// regenerated identically. products.db and uploads/ are git-ignored, so run it
// on the server copy too:
//   node scripts/set-sata-hdd-prices-images-2026-10-16.mjs
import Database from 'better-sqlite3';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

// [slug, capacity, price] — every generic SATA HDD on the site
const LINE = [
  ['hdd-500gb', '500GB', null],      // price unchanged
  ['hdd-1tb', '1TB', null],          // price unchanged
  ['hdd-2tb', '2TB', 5200],
  ['hdd-3tb', '3TB', 6200],
  ['hdd-4tb', '4TB', 11000],
  ['hdd-6tb-perdorur', '6TB', 15000],
  ['hdd-8tb', '8TB', 24000],
  ['hdd-10tb', '10TB', 27000],
  ['hdd-12tb', '12TB', 30000],
];
const NEW = new Set(['hdd-8tb', 'hdd-10tb', 'hdd-12tb']);
const RETIRE = 'wd-ultrastar-dc-hc520-12tb';

const describe = (cap) =>
  `Hard disk ${cap} për ruajtje të madhe me kosto të ulët: arkiva, backup, foto dhe video, ose si disk i dytë në PC. I përshtatshëm edhe për DVR/NVR kamerash dhe NAS. Pajisje e përdorur, e testuar nga IT Store.`;

// ── Generic drive image ────────────────────────────────────────────────────
const svg = (cap) => `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
<defs>
 <linearGradient id="al" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eceef1"/><stop offset=".45" stop-color="#cdd1d6"/><stop offset="1" stop-color="#aab0b6"/></linearGradient>
 <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8b9096"/><stop offset=".5" stop-color="#b9bdc2"/><stop offset="1" stop-color="#7b8086"/></linearGradient>
 <linearGradient id="lab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#272a2f"/><stop offset="1" stop-color="#121417"/></linearGradient>
 <radialGradient id="sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".26"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
 <filter id="ds" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000" flood-opacity=".2"/></filter>
</defs>
<rect width="1000" height="1000" fill="#fff"/>
<ellipse cx="500" cy="930" rx="330" ry="30" fill="url(#sh)"/>
<g transform="translate(500 480) rotate(-7) scale(1.22) translate(-232 -340)" filter="url(#ds)">
 <rect x="0" y="0" width="464" height="680" rx="22" fill="url(#edge)"/>
 <rect x="10" y="10" width="444" height="660" rx="16" fill="url(#al)"/>
 <path d="M44 38 H420 a14 14 0 0 1 14 14 V250 a20 20 0 0 1 -20 20 H50 a20 20 0 0 1 -20 -20 V52 a14 14 0 0 1 14 -14z" fill="none" stroke="#9aa0a6" stroke-width="2.5" opacity=".7"/>
 <circle cx="232" cy="150" r="74" fill="none" stroke="#a3a8ae" stroke-width="3" opacity=".8"/>
 <circle cx="232" cy="150" r="20" fill="#b9bdc2" stroke="#8f949a" stroke-width="2"/>
 ${[[40, 40], [424, 40], [40, 640], [424, 640], [232, 40], [150, 262], [314, 262]].map(([x, y]) =>
   `<g><circle cx="${x}" cy="${y}" r="11" fill="#d7dade" stroke="#8a8f95" stroke-width="2"/><path d="M${x - 6} ${y} h12 M${x} ${y - 6} v12" stroke="#7c8187" stroke-width="2.5" stroke-linecap="round"/></g>`).join('')}
 <rect x="34" y="298" width="396" height="330" rx="10" fill="url(#lab)"/>
 <rect x="34" y="298" width="396" height="8" rx="4" fill="#F0A020"/>
 <text x="62" y="372" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="26" letter-spacing="5" fill="#9aa0a7">HARD DISK DRIVE</text>
 <text x="58" y="500" font-family="Inter, Arial, sans-serif" font-weight="900" font-size="${cap.length > 4 ? 118 : 138}" letter-spacing="-2" fill="#ffffff">${cap}</text>
 <text x="62" y="560" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="28" letter-spacing="3" fill="#F0A020">SATA III · 3.5"</text>
 <g fill="#5d636a">${Array.from({ length: 22 }, (_, i) => `<rect x="${62 + i * 15}" y="588" width="${i % 3 ? 4 : 8}" height="22"/>`).join('')}</g>
 <rect x="120" y="664" width="224" height="12" rx="3" fill="#2a2d31"/>
</g>
</svg>`;

const imageFor = (cap) => `hdd-generic-${cap.toLowerCase()}.webp`;
for (const [, cap] of LINE) {
  await sharp(Buffer.from(svg(cap))).webp({ quality: 88 }).toFile(path.join(root, 'uploads', imageFor(cap)));
}
console.log(`Images: ${LINE.map(([, c]) => imageFor(c)).join(', ')}`);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);
const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('hdd')?.id;
if (!catId) throw new Error('category "hdd" not found');

db.transaction(() => {
  for (const [slug, cap, price] of LINE) {
    const images = JSON.stringify([`/uploads/${imageFor(cap)}`]);
    const found = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
    if (!found) {
      if (!NEW.has(slug)) throw new Error(`${slug} not found`);
      db.prepare(`
        INSERT INTO products
          (name, slug, short_description, description, price, sale_price, category_id,
           images, attributes, badge, brand, sku, in_stock, featured, hidden, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, '', 'HDD', '', 1, 0, 0, datetime('now'), datetime('now'))
      `).run(`HDD ${cap}`, slug, `HDD ${cap}`, describe(cap), price, catId, images,
        JSON.stringify({ Capacity: cap, Type: 'HDD', Interface: 'SATA', 'Form Factor': '3.5"' }));
      console.log(`+ HDD ${cap} — ${price} L`);
      continue;
    }
    db.prepare(`UPDATE products SET images = ?, updated_at = datetime('now') WHERE slug = ?`).run(images, slug);
    if (price != null) {
      db.prepare(`UPDATE products SET price = ?, sale_price = NULL, in_stock = 1, hidden = 0 WHERE slug = ?`).run(price, slug);
    }
    console.log(`~ HDD ${cap}${price != null ? ` — ${price} L` : ' (image only)'}`);
  }
  const r = db.prepare(`UPDATE products SET hidden = 1, featured = 0, updated_at = datetime('now') WHERE slug = ?`).run(RETIRE);
  console.log(r.changes ? `- ${RETIRE} hidden` : `  ${RETIRE} not found (skipped)`);
})();

for (const r of db.prepare(`SELECT id, name, price, in_stock, hidden, images FROM products WHERE category_id = ? ORDER BY price`).all(catId)) {
  console.log(`#${r.id} ${r.name} — ${r.price} L${r.in_stock ? '' : ' (pa stok)'}${r.hidden ? ' [hidden]' : ''} ${r.images}`);
}
db.close();
