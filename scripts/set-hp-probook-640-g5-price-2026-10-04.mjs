// HP ProBook 640 G5 (i5-8365U / 8GB / 256GB) goes to 20 000 L, per Eno
// 2026-10-04. It was 21 000 on sale at 18 000; the sale is dropped and the
// regular price becomes 20 000.
//
// Idempotent: sets absolute values, so a re-run re-asserts them. products.db is
// git-ignored, so run it on the server after a deploy too:
//   node scripts/set-hp-probook-640-g5-price-2026-10-04.mjs
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
    UPDATE products SET price = 20000, sale_price = NULL, updated_at = datetime('now')
    WHERE slug = 'hp-probook-640-g5'
  `).run();
  if (r.changes !== 1) throw new Error('hp-probook-640-g5 not found');
})();

console.log(db.prepare("SELECT id, name, price, sale_price FROM products WHERE slug = 'hp-probook-640-g5'").get());
db.close();
