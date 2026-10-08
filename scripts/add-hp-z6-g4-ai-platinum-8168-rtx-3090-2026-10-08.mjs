// Adds an HP Z6 G4 in the same AI configuration as the HP Z8 G4 AI Server, per
// Eno 2026-10-08:
//
//   HP Z6 G4 AI — 2x Xeon Platinum 8168 / 128GB DDR4 / 1TB NVMe / RTX 3090 24GB   195 000 L
//
// Photo: HP's official Z6 G4 render (Icecat), shipped in scripts/assets/ and
// copied into uploads/ when missing (uploads/ is git-ignored).
//
// sku left empty on purpose — Eno assigns SKUs.
//
// Idempotent: keyed by slug (insert-or-update). Safe to re-run — required on
// the server, where products.db and uploads/ are git-ignored:
//   node scripts/add-hp-z6-g4-ai-platinum-8168-rtx-3090-2026-10-08.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dbPath = path.join(root, 'products.db');

const ASSET = 'hp-z6-g4-front.webp';
const P = {
  slug: 'hp-z6-g4-ai-2x-platinum-8168-rtx-3090',
  name: 'HP Z6 G4 AI — 2x Xeon Platinum 8168 / 128GB DDR4 / 1TB NVMe / RTX 3090 24GB',
  brand: 'HP',
  price: 195000,
  short_description:
    'HP Z6 G4 me 2x Intel Xeon Platinum 8168, 128GB DDR4, 1TB SSD NVMe dhe NVIDIA RTX 3090 24GB — ideal për AI dhe ngarkesa të rënda kompjutimi.',
  description:
    'HP Z6 G4 është një workstation profesional i konfiguruar për AI dhe punë të rënda, me dy procesorë Intel Xeon Platinum 8168 (gjithsej 48 bërthama / 96 thread-e), 128GB memorie DDR4 ECC dhe ruajtje të shpejtë në SSD NVMe 1TB. Karta grafike NVIDIA GeForce RTX 3090 me 24GB GDDR6X ofron fuqi të jashtëzakonshme për trajnim modelesh AI, LLM lokale, inferencë, renderim 3D, video 4K dhe simulime. Gjendja: i përdorur dhe i testuar.',
  attributes: {
    CPU: '2x Intel Xeon Platinum 8168 (48 bërthama / 96 thread-e gjithsej)',
    RAM: '128GB DDR4',
    SSD: '1TB NVMe',
    GPU: 'NVIDIA RTX 3090 24GB',
    Gjendja: 'I përdorur / Testuar',
  },
};

const img = path.join(root, 'uploads', ASSET);
if (!fs.existsSync(img)) {
  fs.mkdirSync(path.dirname(img), { recursive: true });
  fs.copyFileSync(path.join(here, 'assets', ASSET), img);
  console.log(`Image: copied to uploads/${ASSET}`);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);
const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('workstation')?.id;
if (!catId) throw new Error('category "workstation" not found');

const row = {
  name: P.name, slug: P.slug, short_description: P.short_description, description: P.description,
  price: P.price, category_id: catId, images: JSON.stringify([`/uploads/${ASSET}`]),
  attributes: JSON.stringify(P.attributes), brand: P.brand,
};
const found = db.prepare('SELECT id FROM products WHERE slug = ?').get(P.slug);
db.transaction(() => {
  if (found) {
    db.prepare(`
      UPDATE products SET
        name = @name, short_description = @short_description, description = @description,
        price = @price, sale_price = NULL, category_id = @category_id, images = @images,
        attributes = @attributes, brand = @brand, sku = '', in_stock = 1, hidden = 0,
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
         @images, @attributes, @brand, '', 1, 0, 0, datetime('now'), datetime('now'))
    `).run(row);
    console.log(`+ #${r.lastInsertRowid} ${P.name} — ${P.price} L`);
  }
})();
db.close();
console.log('\nDone.');
