// Lenovo ThinkPad X13 Gen 2 (i5-1145G7 / 16GB / 512GB) is out of stock, per
// Eno 2026-10-16. Only the stock flag changes — the page stays up, marked
// "Pa stok", with its price kept.
//
// Idempotent: sets an absolute value, so a re-run re-asserts it. products.db is
// git-ignored, so run it on the server copy too:
//   node scripts/set-thinkpad-x13-gen-2-sold-out-2026-10-16.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');
const SLUG = 'lenovo-thinkpad-x13-gen-2';

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);
db.transaction(() => {
  const r = db.prepare("UPDATE products SET in_stock = 0, updated_at = datetime('now') WHERE slug = ?").run(SLUG);
  if (r.changes !== 1) throw new Error(`${SLUG} not found`);
})();

console.log(db.prepare('SELECT id, name, price, sale_price, in_stock FROM products WHERE slug = ?').get(SLUG));
db.close();
