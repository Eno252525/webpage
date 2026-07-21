// Updates DDR4 RAM variant prices (attributes.prices) from the July 2026 price list.
//   - PC (id 397, UDIMM) and Laptop (id 395, SO-DIMM) share the same table.
//   - Workstation/Server (id 399, ECC RDIMM) has its own cheaper table plus a 64 GB tier.
// Keys are "<capacity>|<frequency> MHz" to match the existing schema. The base
// `price` column is reset to the cheapest variant (the "nga" / from price).
//
// NB: the source spreadsheet mislabels each block's "16 GB | 3200 MHz" row as
// "32 GB | 3200 MHz"; it is read here as 16 GB, completing the 16 GB progression.
//
// Idempotent: re-running re-asserts the same prices. Backs the DB up first.
// Run on the server too, after a deploy, since products.db is git-ignored:
//   node scripts/set-ddr4-ram-prices.mjs
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

// PC (UDIMM) and Laptop (SO-DIMM) share this table.
const PC_LAPTOP = {
  '8 GB|2133 MHz': 4000,
  '8 GB|2400 MHz': 4500,
  '8 GB|2666 MHz': 5000,
  '8 GB|2933 MHz': 5500,
  '8 GB|3200 MHz': 6500,
  '16 GB|2133 MHz': 8000,
  '16 GB|2400 MHz': 9000,
  '16 GB|2666 MHz': 10000,
  '16 GB|2933 MHz': 11000,
  '16 GB|3200 MHz': 13000,
  '32 GB|2133 MHz': 16000,
  '32 GB|2400 MHz': 18000,
  '32 GB|2666 MHz': 20000,
  '32 GB|2933 MHz': 22000,
  '32 GB|3200 MHz': 24000,
};

// Workstation / Server (ECC RDIMM) — includes a 64 GB tier.
const WORKSTATION = {
  '8 GB|2133 MHz': 3000,
  '8 GB|2400 MHz': 3500,
  '8 GB|2666 MHz': 4000,
  '8 GB|2933 MHz': 4500,
  '8 GB|3200 MHz': 5000,
  '16 GB|2133 MHz': 6000,
  '16 GB|2400 MHz': 7000,
  '16 GB|2666 MHz': 8000,
  '16 GB|2933 MHz': 9000,
  '16 GB|3200 MHz': 10000,
  '32 GB|2133 MHz': 12000,
  '32 GB|2400 MHz': 14000,
  '32 GB|2666 MHz': 16000,
  '32 GB|2933 MHz': 18000,
  '32 GB|3200 MHz': 20000,
  '64 GB|2133 MHz': 24000,
  '64 GB|2400 MHz': 25000,
  '64 GB|2666 MHz': 30000,
  '64 GB|2933 MHz': 35000,
  '64 GB|3200 MHz': 40000,
};

// product id -> new prices table
const TARGETS = [
  [397, PC_LAPTOP],   // RAM DDR4 PC (UDIMM)
  [395, PC_LAPTOP],   // RAM DDR4 Laptop (SO-DIMM)
  [399, WORKSTATION], // RAM DDR4 Workstation / Server (ECC RDIMM)
];

const db = new Database(dbPath);

// sanity: every id must exist and be a DDR4 RAM product
for (const [id] of TARGETS) {
  const row = db.prepare('SELECT id, category_id, name FROM products WHERE id = ?').get(id);
  if (!row) { console.error(`Aborting — id ${id} does not exist`); process.exit(1); }
  if (row.category_id !== 23) { console.error(`Aborting — id ${id} (${row.name}) is not in RAM category 23`); process.exit(1); }
}

// backup first
const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const sel = db.prepare('SELECT attributes FROM products WHERE id = ?');
const upd = db.prepare('UPDATE products SET attributes = ?, price = ? WHERE id = ?');

const apply = db.transaction(() => {
  for (const [id, prices] of TARGETS) {
    const attr = JSON.parse(sel.get(id).attributes || '{}');
    attr.prices = prices;
    const base = Math.min(...Object.values(prices)); // cheapest variant = "from" price
    upd.run(JSON.stringify(attr), base, id);
  }
});
apply();

console.log('Updated DDR4 RAM prices:');
for (const [id] of TARGETS) {
  const r = db.prepare('SELECT id, price, name, attributes FROM products WHERE id = ?').get(id);
  const n = Object.keys(JSON.parse(r.attributes).prices).length;
  console.log(`  ${r.id} | from ${r.price} Lekë | ${n} variants | ${r.name}`);
}
