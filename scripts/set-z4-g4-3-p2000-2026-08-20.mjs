// Re-specs #201 "HP Z4 G4 - W-2123 / 32GB RAM / 512GB SSD" (slug hp-z4-g4-3),
// 2026-08-20: Quadro P1000 -> P2000, price 40,000 L -> 50,000 L.
//
// The GPU value stays in the bare-model form the other Z4 G4 rows use
// ("P620" / "P1000" / "P4000"), not "Quadro P2000", so the workstation spec
// tables keep reading the same. Name, slug, photo, CPU/RAM/SSD and sku are
// left exactly as they are — the slug in particular, so the live URL
// /product/hp-z4-g4-3 keeps working and needs no redirect.
//
// Idempotent: keyed by slug, re-asserts the same GPU and price on every run.
// Must also be run on the server after the deploy, because products.db is
// git-ignored.
//
//   node scripts/set-z4-g4-3-p2000-2026-08-20.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log('Backup: products.db.bak-' + stamp + '\n');

const db = new Database(dbPath);

const SLUG = 'hp-z4-g4-3';
const GPU = 'P2000';
const PRICE = 50000;

const run = db.transaction(() => {
  const row = db.prepare('SELECT id, name, price, attributes FROM products WHERE slug = ?').get(SLUG);
  if (!row) throw new Error(`product "${SLUG}" missing from products.db`);

  const attrs = JSON.parse(row.attributes || '{}');
  const oldGpu = attrs.GPU ?? '(none)';
  attrs.GPU = GPU;

  db.prepare(
    // sale_price stays NULL, never 0 — see catalog-cleanup-2 step C.
    `UPDATE products
        SET attributes = ?, price = ?, sale_price = NULL, in_stock = 1,
            updated_at = datetime('now')
      WHERE id = ?`
  ).run(JSON.stringify(attrs), PRICE, row.id);

  console.log(`  #${row.id} ${row.name}`);
  console.log(`    GPU:   ${oldGpu} -> ${GPU}`);
  console.log(`    Price: ${row.price} L -> ${PRICE} L`);
});

run();
db.close();
console.log('\nDone.');
