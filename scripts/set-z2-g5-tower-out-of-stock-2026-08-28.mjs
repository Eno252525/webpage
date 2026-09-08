// Marks the HP Z2 G5 *tower* out of stock, 2026-08-28.
//
// Two Z2 G5 rows carry the same i7-10700 / 32GB / 512GB spec and the same
// 55,000 L price; only the photo tells them apart:
//   #198 hp-z2-g5           -> tower chassis  (this one)
//   #478 hp-z2-g5-i7-10700  -> small form factor (left in stock)
//
// in_stock = 0, not hidden = 1: the product stays on the site and in search,
// marked "Pa stok", instead of disappearing. Price, specs, slug and photo are
// untouched, so /product/hp-z2-g5 keeps working and needs no redirect.
//
// Idempotent: keyed by slug, re-asserts in_stock = 0 on every run.
// Must also be run on the server after the deploy — products.db is git-ignored.
//
//   node scripts/set-z2-g5-tower-out-of-stock-2026-08-28.mjs
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

const SLUG = 'hp-z2-g5';

const run = db.transaction(() => {
  const row = db.prepare('SELECT id, name, in_stock FROM products WHERE slug = ?').get(SLUG);
  if (!row) throw new Error(`product "${SLUG}" missing from products.db`);

  db.prepare(
    `UPDATE products
        SET in_stock = 0, updated_at = datetime('now')
      WHERE id = ?`
  ).run(row.id);

  console.log(`  #${row.id} ${row.name}`);
  console.log(`    Stock: ${row.in_stock ? 'në stok' : 'pa stok'} -> pa stok`);
});

run();
db.close();
console.log('\nDone.');
