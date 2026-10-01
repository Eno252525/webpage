// Adds a second HP ProLiant DL380 Gen9 configuration next to the existing
// "HP DL380 G9 - 2 x E5-2680 V3 / 32GB RAM" (slug hp-dl380-g9), per Eno
// 2026-10-01:
//
//   HP DL380 G9 — 2x Xeon E5-2660 v4 / 32GB RAM / 2x 300GB SAS HDD   40 000 L
//
// The E5-2660 v4 is a 14-core / 28-thread Broadwell-EP part at 2.0 GHz
// (3.2 GHz turbo, 35MB cache), so two of them give 28 cores / 56 threads.
// Same chassis as the existing listing, so it reuses its photo.
//
// SKU SR0013 — next in the server sequence (SR0012 was the last one taken).
//
// Idempotent: keyed by slug (insert-or-update). Safe to re-run — which is
// required on the server, where products.db is git-ignored and never arrives
// through a deploy:
//   node scripts/add-hp-dl380-g9-e5-2660v4-2026-10-01.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const P = {
  slug: 'hp-dl380-g9-e5-2660-v4',
  name: 'HP DL380 G9 - 2 x E5-2660 V4 / 32GB RAM / 2 x 300GB SAS',
  brand: 'HP',
  sku: 'SR0013',
  price: 40000,
  images: ['/uploads/hp-dl380-g9.webp'],
  short_description:
    'Server HP ProLiant DL380 Gen9 rack 2U me 2x Intel Xeon E5-2660 v4 (28 bërthama / 56 thread-e), 32GB RAM DDR4 ECC dhe 2x 300GB SAS HDD.',
  description:
    'HP ProLiant DL380 Gen9 është serveri rack 2U më i përhapur i HP-së, i ndërtuar për virtualizim, baza të dhënash, file server dhe aplikacione biznesi. Ky konfigurim vjen me dy procesorë Intel Xeon E5-2660 v4 (14 bërthama / 28 thread-e secili, 2.0 GHz deri 3.2 GHz turbo, 35MB cache), gjithsej 28 bërthama dhe 56 thread-e, 32GB memorie DDR4 ECC dhe 2x 300GB SAS HDD. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
  attributes: {
    Brand: 'HP',
    Model: 'ProLiant DL380 Gen9',
    CPU: '2 x E5-2660 V4',
    RAM: '32GB',
    Storage: '2 x 300GB SAS HDD',
    Forma: 'Rack 2U (2 procesorë)',
  },
};

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);

const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('server')?.id;
if (!catId) throw new Error('category "server" not found');

const clash = db.prepare('SELECT slug FROM products WHERE sku = ? AND slug != ?').get(P.sku, P.slug);
if (clash) throw new Error(`SKU ${P.sku} is already used by ${clash.slug}`);

const row = {
  name: P.name,
  slug: P.slug,
  short_description: P.short_description,
  description: P.description,
  price: P.price,
  category_id: catId,
  images: JSON.stringify(P.images),
  attributes: JSON.stringify(P.attributes),
  brand: P.brand,
  sku: P.sku,
};

const found = db.prepare('SELECT id FROM products WHERE slug = ?').get(P.slug);
db.transaction(() => {
  if (found) {
    db.prepare(`
      UPDATE products SET
        name = @name, short_description = @short_description, description = @description,
        price = @price, sale_price = NULL, category_id = @category_id, images = @images,
        attributes = @attributes, brand = @brand, sku = @sku, in_stock = 1, hidden = 0,
        updated_at = datetime('now')
      WHERE slug = @slug
    `).run(row);
    console.log(`~ #${found.id} ${P.name} — ${P.price} L (updated)`);
  } else {
    const r = db.prepare(`
      INSERT INTO products
        (name, slug, short_description, description, price, sale_price, category_id,
         images, attributes, brand, sku, in_stock, featured, hidden, created_at, updated_at)
      VALUES
        (@name, @slug, @short_description, @description, @price, NULL, @category_id,
         @images, @attributes, @brand, @sku, 1, 0, 0, datetime('now'), datetime('now'))
    `).run(row);
    console.log(`+ #${r.lastInsertRowid} ${P.name} — ${P.price} L`);
  }
})();

db.close();
console.log('\nDone.');
