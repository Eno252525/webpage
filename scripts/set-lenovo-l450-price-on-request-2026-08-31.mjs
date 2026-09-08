// #214 Lenovo ThinkPad L450 (slug lenovo-l450) was listed at 8000 Lekë.
// Requested 2026-08-31: take the price off the listing.
//
// House convention: price 0 (never null) + sale_price NULL makes the frontend
// hide the price and show "Çmim sipas kërkesës" — the product stays visible
// and in stock.
//
// Keyed by slug, idempotent (re-asserts the same values), backs the DB up first.
//
//   node scripts/set-lenovo-l450-price-on-request-2026-08-31.mjs

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const SLUG = 'lenovo-l450';

const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const db = new Database(dbPath);
const row = db.prepare('SELECT id, name, price, sale_price FROM products WHERE slug = ?').get(SLUG);

if (!row) {
  console.log(`not found: ${SLUG} — nothing changed`);
} else {
  db.transaction(() => {
    db.prepare(
      `UPDATE products
          SET price = 0, sale_price = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`
    ).run(row.id);
  })();

  const after = db.prepare('SELECT id, name, price, sale_price FROM products WHERE id = ?').get(row.id);
  console.log(`#${after.id} ${after.name}`);
  console.log(`  price ${row.price} -> ${after.price} (sale_price ${after.sale_price}) — "Çmim sipas kërkesës"`);
}
db.close();
