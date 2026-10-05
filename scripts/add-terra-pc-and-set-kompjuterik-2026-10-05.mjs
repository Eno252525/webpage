// Adds two listings per Eno 2026-10-05:
//
//   Terra PC (Wortmann) tower — i3-6100 / 8GB RAM / 128GB SSD            6 000 L
//   Set Kompjuterik — the same Terra PC + generic 22" monitor             8 000 L
//
// The set has its own listing so the set ad can link to a page that shows the
// bundle price only (Eno: don't show the individual prices in the ad).
//
// Photos (official renders, not Eno's shop photo, per his request):
//   - terra-pc-i3-6100.webp: the Wortmann TERRA tower render from Icecat.
//   - set-kompjuterik-terra-i3-6100.webp: that tower next to a generic 22"
//     monitor (the Lenovo 22" render from the Fiskalizimi set with the
//     wordmark removed), on white.
// Neither is downloadable, so they ship in scripts/assets/ and are copied into
// uploads/ when missing.
//
// sku left empty on purpose — Eno assigns SKUs.
//
// Idempotent: keyed by slug (insert-or-update). Safe to re-run — required on
// the server, where products.db and uploads/ are git-ignored:
//   node scripts/add-terra-pc-and-set-kompjuterik-2026-10-05.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dbPath = path.join(root, 'products.db');

const PRODUCTS = [
  {
    slug: 'terra-pc-i3-6100',
    name: 'Terra PC (Wortmann) - i3-6100 / 8GB RAM / 128GB SSD',
    brand: 'Terra',
    price: 6000,
    asset: 'terra-pc-i3-6100.webp',
    short_description:
      'Kompjuter zyre Terra (Wortmann) tower me Intel Core i3-6100, 8GB RAM dhe SSD 128GB.',
    description:
      'Terra PC nga Wortmann (Gjermani) është një kompjuter zyre i besueshëm në format tower, me procesor Intel Core i3-6100 (2 bërthama / 4 thread-e, 3.7 GHz), 8GB memorie RAM dhe disk SSD 128GB për ndezje dhe hapje të shpejtë të programeve. Ideal për punë zyre, recepsion, kontabilitet, internet dhe programe të përditshme. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
    attributes: {
      CPU: 'i3-6100',
      RAM: '8GB',
      SSD: '128GB',
      'Form Factor': 'MT',
      Gjendja: 'I përdorur / Testuar',
    },
  },
  {
    slug: 'set-kompjuterik-terra-i3-6100',
    name: 'Set Kompjuterik — Terra PC i3-6100 / 8GB / 128GB SSD + Monitor 22"',
    brand: 'Terra',
    price: 8000,
    asset: 'set-kompjuterik-terra-i3-6100.webp',
    short_description:
      'Set kompjuterik gati për punë: kompjuter Terra me Intel Core i3-6100, 8GB RAM, SSD 128GB dhe monitor 22".',
    description:
      'Set i plotë kompjuterik për zyrë, shtëpi ose recepsion: kompjuter Terra (Wortmann) tower me procesor Intel Core i3-6100, 8GB RAM dhe SSD 128GB, së bashku me një monitor 22". Mjafton ta lidhni dhe të filloni punën. Gjithçka e testuar. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
    attributes: {
      Kompjuter: 'Terra PC (Wortmann) tower',
      CPU: 'i3-6100',
      RAM: '8GB',
      SSD: '128GB',
      Monitor: '22"',
      'Form Factor': 'MT',
      Gjendja: 'I përdorur / Testuar',
    },
  },
];

for (const P of PRODUCTS) {
  const img = path.join(root, 'uploads', P.asset);
  if (!fs.existsSync(img)) {
    fs.mkdirSync(path.dirname(img), { recursive: true });
    fs.copyFileSync(path.join(here, 'assets', P.asset), img);
    console.log(`Image: copied to uploads/${P.asset}`);
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);

const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('pc')?.id;
if (!catId) throw new Error('category "pc" not found');

db.transaction(() => {
  for (const P of PRODUCTS) {
    const row = {
      name: P.name,
      slug: P.slug,
      short_description: P.short_description,
      description: P.description,
      price: P.price,
      category_id: catId,
      images: JSON.stringify([`/uploads/${P.asset}`]),
      attributes: JSON.stringify(P.attributes),
      brand: P.brand,
    };
    const found = db.prepare('SELECT id FROM products WHERE slug = ?').get(P.slug);
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
  }
})();

db.close();
console.log('\nDone.');
