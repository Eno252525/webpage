// Sets prices for all Switch-category products (category_id 18).
// Prices sourced from the "Switches-worst-to-best" spreadsheet, mapped by
// product id (ids are stable; two SG500-28 / SG220-50 duplicates are handled
// individually). Idempotent: re-running just re-asserts the same prices.
// Backs the DB up before writing. Run on the server too, after a deploy, since
// products.db is git-ignored:  node scripts/set-switch-prices.mjs
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

// id -> price (Lekë)
const PRICES = [
  [411, 9000], [410, 2000], [438, 3000], [408, 4000], [439, 4000],
  [440, 4000], [428, 4000], [431, 3000], [424, 5000], [427, 3000],
  [443, 3500], [436, 5000], [437, 5000], [426, 5000], [289, 5000],
  [280, 3000], [278, 3000], [279, 3000], [281, 5000], [418, 6000],
  [415, 5000], [400, 4000], [416, 5000], [417, 5000], [419, 10000],
  [283, 5000], [284, 5000], [285, 5000], [288, 7000], [401, 8000],
  [441, 10000], [404, 10000], [412, 10000], [282, 10000], [287, 10000],
  [434, 7000], [405, 10000], [435, 10000], [512, 7000], [508, 10000],
  [513, 10000], [516, 7000], [432, 13000], [507, 13000], [286, 10000],
  [403, 10000], [406, 10000], [402, 13000], [514, 12000], [420, 15000],
  [429, 10000], [414, 9000], [425, 12000], [442, 15000], [422, 8500],
  [510, 8500], [421, 12000], [505, 12000], [407, 5000], [509, 11000],
  [413, 8000], [504, 14000], [506, 12500], [423, 15000], [511, 15000],
  [409, 15000], [430, 12000], [433, 12000], [518, 15000], [515, 20000],
  [517, 20000], [367, 40000], [444, 30000],
];

const db = new Database(dbPath);

// sanity: every id must exist and be a switch
const switchIds = new Set(db.prepare('SELECT id FROM products WHERE category_id = 18').all().map(r => r.id));
const missing = PRICES.map(([id]) => id).filter(id => !switchIds.has(id));
if (missing.length) {
  console.error('Aborting — these ids are not Switch products:', missing.join(', '));
  process.exit(1);
}
if (PRICES.length !== switchIds.size) {
  console.error(`Aborting — have ${PRICES.length} prices but ${switchIds.size} switches in DB.`);
  process.exit(1);
}

// backup first
const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const upd = db.prepare('UPDATE products SET price = ? WHERE id = ?');
let changed = 0;
const apply = db.transaction(() => {
  for (const [id, price] of PRICES) {
    const info = upd.run(price, id);
    changed += info.changes;
  }
});
apply();

console.log(`Updated ${PRICES.length} switches (${changed} rows written).`);
const zero = db.prepare('SELECT COUNT(*) c FROM products WHERE category_id = 18 AND (price IS NULL OR price = 0)').get().c;
console.log('Switches still at price 0:', zero);
