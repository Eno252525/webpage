// Sets prices for the branded 2.5" SAS HDD products, mapped by product id.
//   - all 1.2TB 12Gbps SAS HDDs         -> 9000 Lekë
//   - HGST Ultrastar C10K1800 1.8TB     -> 16000 Lekë (the 12Gbps unit)
//   - Dell Ultrastar C10K1800 1.8TB     -> 13000 Lekë (the 6Gbps unit)
// Idempotent: re-running just re-asserts the same prices. Backs the DB up first.
// Run on the server too, after a deploy, since products.db is git-ignored:
//   node scripts/set-sas-hdd-prices.mjs
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

// id -> price (Lekë)
const PRICES = [
  // 1.2TB 12Gbps SAS HDDs
  [374, 9000], [375, 9000], [376, 9000], [377, 9000],
  [378, 9000], [379, 9000], [380, 9000],
  // 1.8TB
  [359, 16000], // HGST Ultrastar C10K1800 1.8TB (12Gbps)
  [360, 13000], // Dell Ultrastar C10K1800 1.8TB (6Gbps)
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

console.log(`Updated ${PRICES.length} SAS HDD products (${changed} rows written).`);
for (const [id] of PRICES) {
  const r = db.prepare('SELECT id, price, name FROM products WHERE id = ?').get(id);
  console.log(`  ${r.id} | ${r.price} | ${r.name}`);
}
