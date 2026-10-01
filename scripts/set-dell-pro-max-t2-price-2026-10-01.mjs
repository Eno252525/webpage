// Sets the price of the Dell Pro Max Tower T2 (Ultra 7 265K / 32GB DDR5 /
// 512GB NVMe / RTX 4000 Ada 20GB) to 240 000 L, per Eno 2026-10-01. It was
// listed as "price on request" (0) until now.
//
// Idempotent: keyed by slug, re-running re-asserts the same price. Safe to
// re-run — required on the server, where products.db is git-ignored:
//   node scripts/set-dell-pro-max-t2-price-2026-10-01.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const SLUG = 'dell-pro-max-tower-t2-ultra-7-265k';
const PRICE = 240000;

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);
const row = db.prepare('SELECT id, name, price FROM products WHERE slug = ?').get(SLUG);
if (!row) throw new Error(`product ${SLUG} not found`);

db.transaction(() => {
  db.prepare(`UPDATE products SET price = ?, sale_price = NULL, updated_at = datetime('now') WHERE slug = ?`)
    .run(PRICE, SLUG);
})();
console.log(`#${row.id} ${row.name}: ${row.price} L -> ${PRICE} L`);

db.close();
console.log('\nDone.');
