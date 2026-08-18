// Adds two products, 2026-08-18:
//   • Apple Magic Mouse 2 — new, 8,000 L, into the new Aksesorë category.
//   • Apple Mac mini Late 2018 (i3-8100B / 8GB / 128GB) — used, 15,000 L, into
//     PC, alongside the other mini desktops.
//
// Both photos are Eno's own product shots, staged in _drive_src/ and converted
// to WebP by scripts/add-product-photos-2026-08-18.mjs. This script only points
// the rows at the resulting files — it does not fetch or generate images, so the
// two can run in either order on the server. (It previously downloaded a
// Wikimedia Commons Mac mini shot and left the mouse without a photo; both are
// now superseded by the supplied originals.)
//
// Idempotent: keyed by slug (insert-or-update). Safe to re-run, including on
// the server, which is required because products.db and uploads/ are git-ignored.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');
const uploads = path.join(root, 'uploads');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log('Backup: products.db.bak-' + stamp + '\n');

const db = new Database(dbPath);

// Aksesorë is created by the migration at the top of database.js, which runs on
// server start. Re-assert it here with the identical values so this script does
// not depend on whether the app has been restarted yet — on a deploy the script
// and the restart can happen in either order.
db.prepare(
  "INSERT OR IGNORE INTO categories (name, slug, parent_id, sort_order) VALUES ('Aksesorë', 'aksesore', NULL, 10)"
).run();

// Categories are data, not code — resolve by slug rather than hard-coding ids.
const catId = (slug) => {
  const row = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (!row) throw new Error(`category "${slug}" missing from products.db`);
  return row.id;
};

// sku is intentionally left empty: SKUs are assigned by Eno, never generated here.
const PRODUCTS = [
  {
    slug: 'apple-magic-mouse-2',
    name: 'Apple Magic Mouse 2',
    short_description:
      'Apple Magic Mouse 2 — miush pa tel me Bluetooth, sipërfaqe Multi-Touch dhe bateri të integruar rikarikueshme. I ri, i papërdorur.',
    price: 8000,
    category: 'aksesore',
    brand: 'Apple',
    // The card's condition tag (webroot/js/ui.js conditionTag) reads the badge
    // COLUMN, not attributes.Gjendja — without this the mouse renders as used.
    badge: 'I RI',
    images: ['/uploads/apple-magic-mouse-2.webp'],
    attributes: {
      Brand: 'Apple',
      Model: 'Magic Mouse 2 (A1657)',
      Lidhja: 'Bluetooth (pa tel)',
      Sipërfaqja: 'Multi-Touch',
      Bateria: 'E integruar, rikarikueshme përmes Lightning',
      Gjendja: 'I ri',
    },
  },
  {
    slug: 'apple-mac-mini-2018-i3-8100b',
    name: 'Apple Mac mini Late 2018 - i3-8100B / 8GB RAM / 128GB SSD',
    short_description:
      'Apple Mac mini Late 2018 me Intel Core i3-8100B (4 bërthama, 3.6 GHz), 8GB RAM DDR4 dhe SSD 128GB — desktop ultra-kompakt në ngjyrë Space Grey.',
    price: 15000,
    category: 'pc',
    brand: 'Apple',
    badge: '',
    images: ['/uploads/apple-mac-mini-2018.webp'],
    attributes: {
      Brand: 'Apple',
      Model: 'Mac mini Late 2018',
      CPU: 'i3-8100B',
      RAM: '8GB',
      SSD: '128GB',
      'Form Factor': 'USFF',
      Gjendja: 'I përdorur',
    },
  },
];

const run = db.transaction(() => {
  console.log('\nProducts');
  for (const p of PRODUCTS) {
    const existing = db.prepare('SELECT id FROM products WHERE slug = ?').get(p.slug);
    const values = {
      name: p.name,
      short_description: p.short_description,
      description: '',
      price: p.price,
      sale_price: null,          // NULL, never 0 — see catalog-cleanup-2 step C
      category_id: catId(p.category),
      brand: p.brand,
      badge: p.badge,
      images: JSON.stringify(p.images),
      attributes: JSON.stringify(p.attributes),
      in_stock: 1,
    };
    if (existing) {
      db.prepare(`UPDATE products SET ${Object.keys(values).map((k) => `${k} = :${k}`).join(', ')},
                  updated_at = datetime('now') WHERE id = :id`).run({ ...values, id: existing.id });
      console.log(`  updated #${existing.id} ${p.slug} — ${p.price} L`);
    } else {
      const info = db.prepare(`INSERT INTO products (slug, ${Object.keys(values).join(', ')})
                   VALUES (:slug, ${Object.keys(values).map((k) => `:${k}`).join(', ')})`)
        .run({ ...values, slug: p.slug });
      console.log(`  inserted #${info.lastInsertRowid} ${p.slug} — ${p.price} L`);
    }
  }
});

run();
db.close();
console.log('\nDone.');
