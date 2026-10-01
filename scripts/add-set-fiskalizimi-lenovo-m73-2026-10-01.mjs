// Adds the fiscalisation bundle per Eno 2026-10-01:
//
//   Set Fiskalizimi — Lenovo ThinkCentre M73 SFF (Pentium G2020 / 8GB / 128GB
//   SSD) + generic 22" monitor + Bixolon SRP-350II thermal receipt printer
//   12 000 L, on sale for 10 000 L
//
// The CPU is as Eno lists it (and as the earlier Instagram posts of this set
// did). Note for whoever checks the spec: a G2020 is an LGA1155 part, while
// the M73 board is LGA1150 — worth confirming the exact chip on the units.
//
// The photo is a composite made for the ad: the official Lenovo M73 SFF and
// ThinkVision 22" renders (Icecat) and the Bixolon SRP-350II render from
// bixolon.com, on white. It is not downloadable anywhere, so it ships in the
// repo as scripts/assets/set-fiskalizimi-lenovo-m73.webp and is copied into
// uploads/ here.
//
// SKU POS0023 — next in the POS sequence (POS0022 was the last one taken).
//
// Idempotent: keyed by slug (insert-or-update); the photo is only copied if
// missing. Safe to re-run — required on the server, where products.db and
// uploads/ are git-ignored:
//   node scripts/add-set-fiskalizimi-lenovo-m73-2026-10-01.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dbPath = path.join(root, 'products.db');

const P = {
  slug: 'set-fiskalizimi-lenovo-m73-g2020',
  name: 'Set Fiskalizimi — Lenovo M73 G2020 / 8GB / 128GB SSD + Monitor 22" + Printer Bixolon SRP-350II',
  brand: 'Lenovo',
  sku: 'POS0023',
  price: 12000,
  sale_price: 10000,
  asset: 'set-fiskalizimi-lenovo-m73.webp',
  short_description:
    'Paketë e plotë fiskalizimi gati për punë: kompjuter Lenovo ThinkCentre M73, monitor 22" dhe printer termik faturash Bixolon SRP-350II.',
  description:
    'Set i plotë për fiskalizim dhe pika shitjeje (dyqane, bar-restorante, farmaci, mini-markete). Përfshin kompjuterin Lenovo ThinkCentre M73 SFF me procesor Intel Pentium G2020, 8GB RAM dhe disk SSD 128GB, një monitor 22" dhe printerin termik të faturave Bixolon SRP-350II (80mm, i shpejtë dhe i besueshëm, pa nevojë për bojë). Gjithçka e testuar dhe gati për t\'u lidhur me programin tuaj të fiskalizimit.',
  attributes: {
    Kompjuter: 'Lenovo ThinkCentre M73 SFF',
    CPU: 'Pentium G2020',
    RAM: '8GB',
    SSD: '128GB',
    Monitor: '22"',
    Printer: 'Bixolon SRP-350II (termik, 80mm)',
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
const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('pos')?.id;
if (!catId) throw new Error('category "pos" not found');

const clash = db.prepare('SELECT slug FROM products WHERE sku = ? AND slug != ?').get(P.sku, P.slug);
if (clash) throw new Error(`SKU ${P.sku} is already used by ${clash.slug}`);

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
