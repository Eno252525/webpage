// Sets prices for the 2.5" 800GB SAS SSD products, mapped by product id.
//   - all 800GB SAS SSDs  -> 13000 Lekë
// Excludes complete servers that merely contain 800GB SAS SSDs.
// Idempotent: re-running just re-asserts the same prices. Backs the DB up first.
// Run on the server too, after a deploy, since products.db is git-ignored:
//   node scripts/set-sas-ssd-prices.mjs
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

// id -> price (Lekë)
const PRICES = [
  [381, 13000], // Dell EMC PM1645a 800GB SAS SSD 2.5"
  [386, 13000], // Dell KPM5XMUG800G 800GB SAS SSD 2.5"
  [387, 13000], // HPE KPM5XMUG800G 800GB SAS SSD 2.5"
  [388, 13000], // HPE ST800FM0403 800GB SAS SSD 2.5"
  [389, 13000], // HPE MO000800JWDKV 800GB SAS SSD 2.5"
  [390, 13000], // HPE MO000800JWTBR 800GB SAS SSD 2.5"
];

const db = new Database(dbPath);

// sanity: every id must exist
const existing = new Set(db.prepare('SELECT id FROM products').all().map(r => r.id));
const missing = PRICES.map(([id]) => id).filter(id => !existing.has(id));
if (missing.length) {
  console.error('Aborting — these ids do not exist:', missing.join(', '));
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
    changed += upd.run(price, id).changes;
  }
});
apply();

console.log(`Updated ${PRICES.length} SAS SSD products (${changed} rows written).`);
for (const [id] of PRICES) {
  const r = db.prepare('SELECT id, price, name FROM products WHERE id = ?').get(id);
  console.log(`  ${r.id} | ${r.price} | ${r.name}`);
}
