// Adds the HP ProLiant DL360 Gen10 4x LFF "Server Storage" build, per Eno
// 2026-10-03 (same config as the Instagram/Facebook post of that day):
//
//   HP DL360 Gen10 4x LFF — 2x Xeon Gold 5118 / 32GB / 4x 12TB SAS / 1TB NVMe   140 000 L
//
// The Xeon Gold 5118 is a 12-core / 24-thread Skylake-SP part at 2.3 GHz
// (3.2 GHz turbo, 16.5MB cache), so two give 24 cores / 48 threads. 4x 12TB is
// 48TB raw; the listing advertises 36TB, the usable space in RAID 5.
//
// Photo: the official DL360 Gen10 LFF render with the drive labels changed
// from "10 TB" to "12 TB". uploads/ is git-ignored, so the file travels in
// scripts/assets/ and this script copies it into uploads/ when it is missing.
//
// sku left empty on purpose — Eno assigns SKUs.
//
// Idempotent: keyed by slug (insert-or-update). Safe to re-run — which is
// required on the server, where products.db is git-ignored and never arrives
// through a deploy:
//   node scripts/add-hp-dl360-g10-server-storage-2026-10-03.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const IMAGE = 'hp-dl360-g10-lff-12tb.webp';

const P = {
  slug: 'hp-dl360-g10-server-storage-4x12tb',
  name: 'Server Storage HP DL360 Gen10 4x LFF — 2x Xeon Gold 5118 / 32GB / 4x 12TB SAS / 1TB NVMe',
  brand: 'HP',
  sku: '',
  price: 140000,
  images: [`/uploads/${IMAGE}`],
  short_description:
    'Server Storage HP ProLiant DL360 Gen10 rack 1U me 4 foletë LFF, 2x Intel Xeon Gold 5118 (24 bërthama / 48 thread-e), 32GB DDR4 ECC, 4x 12TB SAS HDD (36TB hapësirë) dhe 1TB NVMe.',
  description:
    'HP ProLiant DL360 Gen10 me 4 foletë LFF (3.5") është një server rack 1U i konfiguruar si Server Storage: 36TB hapësirë (4x 12TB SAS HDD në RAID 5) për backup, file server, NAS, arkivë, video-mbikëqyrje dhe virtualizim. Vjen me dy procesorë Intel Xeon Gold 5118 (12 bërthama / 24 thread-e secili, 2.3 GHz deri 3.2 GHz turbo, 16.5MB cache), gjithsej 24 bërthama dhe 48 thread-e, 32GB memorie DDR4 ECC dhe 1TB NVMe për sistemin operativ dhe shpejtësi maksimale. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
  attributes: {
    Brand: 'HP',
    Model: 'ProLiant DL360 Gen10 (4x LFF)',
    CPU: '2 x Intel Xeon Gold 5118 (24 bërthama / 48 thread-e gjithsej, 2.3 GHz, 16.5MB cache)',
    RAM: '32GB DDR4 ECC',
    Storage: '4 x 12TB SAS HDD (36TB hapësirë në RAID 5) + 1TB NVMe',
    Forma: 'Rack 1U',
    Gjendja: 'I përdorur / Testuar',
  },
};

const img = path.join(root, 'uploads', IMAGE);
if (!fs.existsSync(img)) {
  fs.mkdirSync(path.dirname(img), { recursive: true });
  fs.copyFileSync(path.join(root, 'scripts', 'assets', IMAGE), img);
  console.log(`Image: copied to uploads/${IMAGE}`);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);

const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('server')?.id;
if (!catId) throw new Error('category "server" not found');

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
