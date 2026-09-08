// Mark the HP Z27n G2 27" monitor as out of stock (Pa stok).
// Idempotent: keyed by slug, re-running just re-asserts in_stock = 0.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = path.join(root, `products.db.bak-${stamp}`);
fs.copyFileSync(dbPath, backup);
console.log(`Backup: ${path.basename(backup)}`);

const db = new Database(dbPath);

const SLUG = 'hp-z27n-g2-27';

const run = db.transaction(() => {
  const row = db.prepare('SELECT id, name, in_stock FROM products WHERE slug = ?').get(SLUG);
  if (!row) {
    console.log(`! Not found: ${SLUG}`);
    return;
  }
  db.prepare('UPDATE products SET in_stock = 0 WHERE slug = ?').run(SLUG);
  console.log(`✓ #${row.id} ${row.name} — in_stock ${row.in_stock} -> 0`);
});

run();
db.close();
