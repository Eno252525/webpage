// Two catalog changes requested 2026-08-24:
//
//   * /product/wd-ultrastar-dc-hc520-12tb — price 20900 -> 25000 Lekë.
//   * /product/hdd-4tb — hidden from the site (hidden = 1) but kept in the DB.
//     hidden = 1 removes the product from the shop, the homepage, search, the
//     filter facets and sitemap.xml, and makes /product/hdd-4tb return the 404
//     page; the row, its specs and its view count stay untouched, so setting
//     hidden = 0 (or unticking "Fshihe nga faqja" in the admin) puts it back.
//     This is stronger than in_stock = 0, which still shows the product marked
//     "Pa stok" — hdd-4tb was already in_stock = 0 and still visible.
//
// Idempotent: keyed by slug, re-asserts the same values on every run.
// Must also be run on the server after the deploy, because products.db is
// git-ignored.
//
//   node scripts/set-hdd-price-visibility-2026-08-24.mjs

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log('Backup: products.db.bak-' + stamp + '\n');

const db = new Database(dbPath);

// The hidden column normally arrives via the migration in database.js; add it
// here too so the script also works against a DB the server has not opened yet.
try { db.exec('ALTER TABLE products ADD COLUMN hidden INTEGER DEFAULT 0'); } catch { /* exists */ }

const PRICE = { slug: 'wd-ultrastar-dc-hc520-12tb', price: 25000 };
const HIDE = 'hdd-4tb';

const run = db.transaction(() => {
  const get = db.prepare('SELECT id, name, price, sale_price, in_stock, COALESCE(hidden, 0) hidden FROM products WHERE slug = ?');

  const priced = get.get(PRICE.slug);
  if (!priced) throw new Error(`product "${PRICE.slug}" missing from products.db`);
  db.prepare("UPDATE products SET price = ?, updated_at = datetime('now') WHERE slug = ?")
    .run(PRICE.price, PRICE.slug);
  console.log(`#${priced.id} ${priced.name}`);
  console.log(`  price: ${priced.price} -> ${PRICE.price} Lekë`);
  if (priced.sale_price) console.log(`  note: sale_price is ${priced.sale_price} — the shop shows that, not the base price`);

  const hidden = get.get(HIDE);
  if (!hidden) throw new Error(`product "${HIDE}" missing from products.db`);
  db.prepare("UPDATE products SET hidden = 1, updated_at = datetime('now') WHERE slug = ?").run(HIDE);
  console.log(`#${hidden.id} ${hidden.name}`);
  console.log(`  hidden: ${hidden.hidden} -> 1 (kept in the DB, off the site)`);
});

run();

console.log('\nVerify:');
for (const slug of [PRICE.slug, HIDE]) {
  const r = db.prepare('SELECT slug, price, sale_price, in_stock, COALESCE(hidden, 0) hidden FROM products WHERE slug = ?').get(slug);
  console.log(`  ${r.slug}: price=${r.price} sale_price=${r.sale_price ?? 'null'} in_stock=${r.in_stock} hidden=${r.hidden}`);
}

db.close();
