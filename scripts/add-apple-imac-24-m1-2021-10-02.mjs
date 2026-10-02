// Adds the Apple iMac 24" (4.5K, 2021) — M1 / 8GB / 256GB SSD — to AIO at
// 90 000 L, per Eno 2026-10-02. Available in green and silver.
//
// Photo: Apple's official press renders of the green and silver iMac 24"
// (apple.com/newsroom, April 2021), cut out and shown together on white. It
// ships in the repo as scripts/assets/apple-imac-24-m1-2021.webp and is copied
// into uploads/ here.
//
// SKU PCL0002 — next in the AIO sequence (PCL0001 is the only one taken).
//
// Idempotent: keyed by slug (insert-or-update); the photo is only copied if
// missing. Safe to re-run — required on the server, where products.db and
// uploads/ are git-ignored:
//   node scripts/add-apple-imac-24-m1-2021-10-02.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dbPath = path.join(root, 'products.db');

const P = {
  slug: 'apple-imac-24-m1-2021',
  name: 'Apple iMac 24" 4.5K (2021) - M1 / 8GB RAM / 256GB SSD',
  brand: 'Apple',
  sku: 'PCL0002',
  price: 90000,
  asset: 'apple-imac-24-m1-2021.webp',
  short_description:
    'Apple iMac 24" me ekran Retina 4.5K, çip Apple M1, 8GB RAM dhe SSD 256GB. Në dispozicion në ngjyrë jeshile dhe argjendtë.',
  description:
    'Apple iMac 24" (2021) është kompjuter all-in-one shumë i hollë, me ekran Retina 4.5K (4480x2520) me mbi një miliard ngjyra dhe ndriçim 500 nits. Çipi Apple M1 me CPU 8-bërthamësh e bën të shpejtë dhe të heshtur për punë zyre, dizajn, foto, video dhe studime, ndërsa 8GB memorie e unifikuar dhe SSD 256GB sigurojnë nisje dhe hapje të menjëhershme të programeve. Ka kamerë FaceTime HD 1080p, tre mikrofona dhe sistem me gjashtë altoparlantë, Wi-Fi 6 dhe Bluetooth 5.0. Në dispozicion në ngjyrë jeshile dhe argjendtë. Gjendja: i përdorur dhe i testuar.',
  attributes: {
    Brand: 'Apple',
    Model: 'iMac 24" (2021)',
    CPU: 'Apple M1',
    RAM: '8GB',
    SSD: '256GB',
    Screen: '24" 4.5K Retina',
    Ngjyra: 'Jeshile / Argjendtë',
    Gjendja: 'I përdorur / Testuar',
  },
};

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const out = path.join(root, 'uploads', P.asset);
if (fs.existsSync(out)) console.log(`Image: ${P.asset} already present — skipped`);
else { fs.copyFileSync(path.join(here, 'assets', P.asset), out); console.log(`Image: ${P.asset} copied into uploads/`); }

const db = new Database(dbPath);
const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('aio')?.id;
if (!catId) throw new Error('category "aio" not found');
const clash = db.prepare('SELECT slug FROM products WHERE sku = ? AND slug != ?').get(P.sku, P.slug);
if (clash) throw new Error(`SKU ${P.sku} is already used by ${clash.slug}`);

const row = {
  name: P.name, slug: P.slug, short_description: P.short_description, description: P.description,
  price: P.price, category_id: catId, images: JSON.stringify([`/uploads/${P.asset}`]),
  attributes: JSON.stringify(P.attributes), brand: P.brand, sku: P.sku,
};
const found = db.prepare('SELECT id FROM products WHERE slug = ?').get(P.slug);
db.transaction(() => {
  if (found) {
    db.prepare(`UPDATE products SET name=@name, short_description=@short_description, description=@description,
      price=@price, sale_price=NULL, category_id=@category_id, images=@images, attributes=@attributes,
      brand=@brand, sku=@sku, in_stock=1, hidden=0, updated_at=datetime('now') WHERE slug=@slug`).run(row);
    console.log(`~ #${found.id} ${P.name} — ${P.price} L (updated)`);
  } else {
    const r = db.prepare(`INSERT INTO products (name, slug, short_description, description, price, sale_price,
      category_id, images, attributes, brand, sku, in_stock, featured, hidden, created_at, updated_at)
      VALUES (@name, @slug, @short_description, @description, @price, NULL, @category_id, @images, @attributes,
      @brand, @sku, 1, 0, 0, datetime('now'), datetime('now'))`).run(row);
    console.log(`+ #${r.lastInsertRowid} ${P.name} — ${P.price} L`);
  }
})();
db.close();
console.log('\nDone.');
