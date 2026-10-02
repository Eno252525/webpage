// Adds the Lexmark XM3150 mono laser MFP (print / copy / scan, duplex, A4)
// at 26 000 L, on sale for 12 000 L, per Eno 2026-10-01. First product in the
// new "Printerë" category (created by the migration in database.js — run the
// app once after `git pull`, or this script creates it too).
//
// Speed is as Eno lists it (47 ppm). The photo is Lexmark's official render,
// cut out onto white; lexmark.com only serves it at 395px, so the 1200px copy
// ships in the repo as scripts/assets/lexmark-xm3150.webp and is copied into
// uploads/ here.
//
// sku left empty on purpose — Eno assigns SKUs.
//
// Idempotent: keyed by slug (insert-or-update); the photo is only copied if
// missing. Safe to re-run — required on the server, where products.db and
// uploads/ are git-ignored:
//   node scripts/add-lexmark-xm3150-2026-10-01.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dbPath = path.join(root, 'products.db');

const P = {
  slug: 'lexmark-xm3150',
  name: 'Lexmark XM3150 — Printer / Fotokopje / Skaner Laser Mono A4',
  brand: 'Lexmark',
  sku: '',
  price: 26000,
  sale_price: 12000,
  asset: 'lexmark-xm3150.webp',
  short_description:
    'Multifunksional laser bardhë e zi Lexmark XM3150: printim, fotokopje dhe skanim, duplex automatik, deri 47 faqe në minutë, format A4.',
  description:
    'Lexmark XM3150 është pajisje multifunksionale laser (printer, fotokopje dhe skaner) e ndërtuar për zyra dhe biznese me volum të lartë printimi. Printon bardhë e zi me shpejtësi deri 47 faqe në minutë, ka printim automatik nga të dyja anët (duplex), ushqyes automatik dokumentesh për fotokopje dhe skanim, dhe ekran me prekje për përdorim të lehtë. Format A4. Gjendja: i përdorur dhe i testuar.',
  attributes: {
    Brand: 'Lexmark',
    Model: 'XM3150',
    Funksionet: 'Printer / Fotokopje / Skaner',
    Printimi: 'Laser bardhë e zi (Mono)',
    Duplex: 'Po, automatik',
    Shpejtësia: '47 faqe/minutë',
    Formati: 'A4',
    Gjendja: 'I përdorur / Testuar',
  },
};

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const out = path.join(root, 'uploads', P.asset);
if (fs.existsSync(out)) {
  console.log(`Image: ${P.asset} already present — skipped`);
} else {
  fs.copyFileSync(path.join(here, 'assets', P.asset), out);
  console.log(`Image: ${P.asset} copied into uploads/`);
}

const db = new Database(dbPath);

// Same statement as the migration in database.js, so the script also works
// if the app has not been restarted since the pull.
db.prepare(
  "INSERT OR IGNORE INTO categories (name, slug, parent_id, sort_order) VALUES ('Printerë', 'printere', NULL, 11)"
).run();
const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('printere')?.id;
if (!catId) throw new Error('category "printere" not found');


const row = {
  name: P.name, slug: P.slug, short_description: P.short_description, description: P.description,
  price: P.price, sale_price: P.sale_price, category_id: catId,
  images: JSON.stringify([`/uploads/${P.asset}`]), attributes: JSON.stringify(P.attributes),
  brand: P.brand, sku: P.sku,
};

const found = db.prepare('SELECT id FROM products WHERE slug = ?').get(P.slug);
db.transaction(() => {
  if (found) {
    db.prepare(`
      UPDATE products SET
        name = @name, short_description = @short_description, description = @description,
        price = @price, sale_price = @sale_price, category_id = @category_id, images = @images,
        attributes = @attributes, brand = @brand, sku = @sku, in_stock = 1, hidden = 0,
        updated_at = datetime('now')
      WHERE slug = @slug
    `).run(row);
    console.log(`~ #${found.id} ${P.name} — ${P.sale_price} L (updated)`);
  } else {
    const r = db.prepare(`
      INSERT INTO products
        (name, slug, short_description, description, price, sale_price, category_id,
         images, attributes, brand, sku, in_stock, featured, hidden, created_at, updated_at)
      VALUES
        (@name, @slug, @short_description, @description, @price, @sale_price, @category_id,
         @images, @attributes, @brand, @sku, 1, 0, 0, datetime('now'), datetime('now'))
    `).run(row);
    console.log(`+ #${r.lastInsertRowid} ${P.name} — ${P.sale_price} L (from ${P.price} L)`);
  }
})();

db.close();
console.log('\nDone.');
