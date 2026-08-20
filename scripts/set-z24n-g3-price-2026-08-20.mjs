// Prices the HP Z24n G3 monitor, 2026-08-20: 9,500 L.
//
// The row already existed (added 2026-05-14, with photo and specs) but sat at
// price 0, i.e. "Çmim sipas kërkesës". This only sets the price — name, specs,
// image and sku are left exactly as they are.
//
// Idempotent: keyed by slug, re-asserts the same price on every run. Must also
// be run on the server after the deploy, because products.db is git-ignored.
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

const SLUG = 'hp-z24n-g3';
const PRICE = 9500;

const run = db.transaction(() => {
  const row = db.prepare('SELECT id, name, price FROM products WHERE slug = ?').get(SLUG);
  if (!row) throw new Error(`product "${SLUG}" missing from products.db`);

  db.prepare(
    // sale_price stays NULL, never 0 — see catalog-cleanup-2 step C.
    "UPDATE products SET price = ?, sale_price = NULL, in_stock = 1, updated_at = datetime('now') WHERE id = ?"
  ).run(PRICE, row.id);

  console.log(`  #${row.id} ${row.name}: ${row.price} L -> ${PRICE} L`);
});

run();
db.close();
console.log('\nDone.');
