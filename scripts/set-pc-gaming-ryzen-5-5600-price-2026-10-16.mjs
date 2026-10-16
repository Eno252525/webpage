// PC Gaming Ryzen 5 5600 / 16GB / 256GB / RX 580 goes to 35 000 L, per
// Eno 2026-10-16. It was 0 (price on request) when added the same day.
//
// Idempotent: sets absolute values, so a re-run re-asserts them. products.db is
// git-ignored, so run it on the server after a deploy too:
//   node scripts/set-pc-gaming-ryzen-5-5600-price-2026-10-16.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);
db.transaction(() => {
  const r = db.prepare(`
    UPDATE products SET price = 35000, sale_price = NULL, updated_at = datetime('now')
    WHERE slug = 'pc-gaming-ryzen-5-5600-rx-580'
  `).run();
  if (r.changes !== 1) throw new Error('pc-gaming-ryzen-5-5600-rx-580 not found');
})();

console.log(db.prepare("SELECT id, name, price, sale_price FROM products WHERE slug = 'pc-gaming-ryzen-5-5600-rx-580'").get());
db.close();
