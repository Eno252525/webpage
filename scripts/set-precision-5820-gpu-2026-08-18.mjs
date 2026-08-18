// Correct the GPU on the Dell Precision 5820 (W-2123 / 32GB / 512GB SSD):
// it was listed with a Quadro P2000, the actual card is a Quadro P1000.
// (It is priced identically to the HP Z4 G4 W-2123, which carries a P1000.)
// Idempotent: keyed by slug, re-asserts GPU=P1000 on every run.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = path.join(root, `products.db.bak-${stamp}`);
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const db = new Database(dbPath);

const SLUG = 'dell-precision-5820';
const NEW_GPU = 'P1000';

const run = db.transaction(() => {
  const row = db.prepare('SELECT id, name, attributes FROM products WHERE slug = ?').get(SLUG);
  if (!row) {
    console.log(`! No product with slug "${SLUG}" — nothing to do.`);
    return;
  }
  const attrs = JSON.parse(row.attributes || '{}');
  const before = attrs.GPU;
  attrs.GPU = NEW_GPU;
  db.prepare('UPDATE products SET attributes = ? WHERE id = ?').run(JSON.stringify(attrs), row.id);
  console.log(`#${row.id} ${row.name}`);
  console.log(`  GPU: ${before ?? '(none)'} -> ${NEW_GPU}`);
});

run();
db.close();
