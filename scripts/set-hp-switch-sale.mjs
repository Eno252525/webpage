// Puts every HP switch priced at 10000 Lekë or below on sale at 5000 Lekë.
// The ones that sat at 4000 / 5000 are first lifted to a 10000 list price, so
// after this run all six share the same 10000 => 5000 sale.
// The HP / Aruba 2920-48G PoE+ (15000) is above the threshold and untouched.
// Idempotent: re-running just re-asserts the same price / sale_price.
// Backs the DB up before writing. Run on the server too, after a deploy, since
// products.db is git-ignored:  node scripts/set-hp-switch-sale.mjs
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const SWITCH_CATEGORY_ID = 18;
const LIST_PRICE = 10000;
const SALE_PRICE = 5000;

const db = new Database(dbPath);

// HP switches in the Switch category at or below the 10000 threshold. Matched on
// brand *and* name so an "HP" branded non-switch can never slip in.
const targets = db.prepare(`
  SELECT id, name, price, sale_price
  FROM products
  WHERE category_id = ?
    AND (LOWER(brand) = 'hp' OR LOWER(name) LIKE '%hp %')
    AND price <= ?
  ORDER BY price, id
`).all(SWITCH_CATEGORY_ID, LIST_PRICE);

if (!targets.length) {
  console.error('Aborting — no HP switches found at or below', LIST_PRICE);
  process.exit(1);
}

const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const upd = db.prepare(
  "UPDATE products SET price = ?, sale_price = ?, updated_at = datetime('now') WHERE id = ?"
);
const apply = db.transaction(() => {
  for (const p of targets) upd.run(LIST_PRICE, SALE_PRICE, p.id);
});
apply();

for (const p of targets) {
  console.log(`#${p.id} ${p.name}: ${p.price} -> ${LIST_PRICE} (sale ${SALE_PRICE})`);
}
console.log(`Done — ${targets.length} HP switches on sale.`);
