// New Dell Latitude prices, per Eno 2026-10-16:
//
//   Latitude 5511  i7-10850H / 16GB / 512GB (no dedicated GPU)   28 000 → 40 000
//   Latitude 5511  i7-10850H / 16GB / 256GB / GeForce MX250       39 000 (32 500) → 45 000
//   Latitude 9520  i7-1185G7 / 8GB / 256GB                         64 000 → 59 000 on sale
//   Latitude 5420  Grada A                                         25 000 → 30 000
//   Latitude 5420  Grada B                                         22 000 → 25 000
//   Latitude 5520  i7-1185G7 / 8GB / 256GB                         30 000 → 35 000
//
// Idempotent: sets absolute values, so a re-run re-asserts them. products.db is
// git-ignored, so run it on the server copy too:
//   node scripts/set-dell-latitude-prices-2026-10-16.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const PRICES = [
  // [slug, price, sale_price]
  ['dell-latitude-5511', 40000, null],
  ['dell-latitude-5511-2', 45000, null],
  ['dell-latitude-9520', 64000, 59000],
  ['dell-latitude-5420-2', 30000, null], // Grada A
  ['dell-latitude-5420', 25000, null], // Grada B
  ['dell-latitude-5520', 35000, null],
];

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);
const set = db.prepare("UPDATE products SET price = ?, sale_price = ?, updated_at = datetime('now') WHERE slug = ?");
db.transaction(() => {
  for (const [slug, price, sale] of PRICES) {
    if (set.run(price, sale, slug).changes !== 1) throw new Error(`${slug} not found`);
  }
})();

const get = db.prepare('SELECT id, name, price, sale_price FROM products WHERE slug = ?');
for (const [slug] of PRICES) {
  const r = get.get(slug);
  console.log(`#${r.id} ${r.name} — ${r.price}${r.sale_price ? ` → ${r.sale_price}` : ''} L`);
}
db.close();
