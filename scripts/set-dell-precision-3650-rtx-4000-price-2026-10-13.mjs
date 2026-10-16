// Dell Precision 3650 (W-1350 / 8GB / 512GB / RTX 4000) goes to 96 000 L, per
// Eno 2026-10-13. It was 0 (price on request).
//
// Idempotent: sets absolute values, so a re-run re-asserts them. products.db is
// git-ignored, so run it on the server after a deploy too:
//   node scripts/set-dell-precision-3650-rtx-4000-price-2026-10-13.mjs
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
    UPDATE products SET price = 96000, sale_price = NULL, updated_at = datetime('now')
    WHERE slug = 'dell-precision-3650-rtx-4000'
  `).run();
  if (r.changes !== 1) throw new Error('dell-precision-3650-rtx-4000 not found');
})();

console.log(db.prepare("SELECT id, name, price, sale_price FROM products WHERE slug = 'dell-precision-3650-rtx-4000'").get());
db.close();
