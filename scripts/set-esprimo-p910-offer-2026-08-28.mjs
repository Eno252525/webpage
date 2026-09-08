// Puts #471 "Fujitsu Esprimo P910 — i5-3220 / 8GB DDR3 / 128GB SSD" on offer
// at 4,000 L, 2026-08-28.
//
// price stays 5,000 L (the struck-through original) and sale_price carries the
// offer, which is how every other discounted row in the catalog is stored.
// Name, slug, specs and photo are untouched, so /product/fujitsu-esprimo-p910-i5-3220
// keeps working and needs no redirect.
//
// Idempotent: keyed by slug, re-asserts the same pair of prices on every run.
// Must also be run on the server after the deploy — products.db is git-ignored.
//
//   node scripts/set-esprimo-p910-offer-2026-08-28.mjs
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

const SLUG = 'fujitsu-esprimo-p910-i5-3220';
const PRICE = 5000;   // regular price, shown struck through
const SALE  = 4000;   // offer price

const run = db.transaction(() => {
  const row = db.prepare('SELECT id, name, price, sale_price FROM products WHERE slug = ?').get(SLUG);
  if (!row) throw new Error(`product "${SLUG}" missing from products.db`);

  db.prepare(
    `UPDATE products
        SET price = ?, sale_price = ?, in_stock = 1, updated_at = datetime('now')
      WHERE id = ?`
  ).run(PRICE, SALE, row.id);

  console.log(`  #${row.id} ${row.name}`);
  console.log(`    Price: ${row.price} L -> ${PRICE} L`);
  console.log(`    Offer: ${row.sale_price ?? '(none)'} -> ${SALE} L`);
});

run();
db.close();
console.log('\nDone.');
