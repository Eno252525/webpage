// Re-prices #317 "NVIDIA RTX 3090 24GB" (slug nvidia-rtx-3090-24gb),
// 2026-08-28: 70,000 L -> 90,000 L.
//
// This is the standalone graphics card in the "gpu" category, not the RTX 3090
// inside the Z8 G4 AI server (#474, priced separately at 195,000 L).
// sale_price stays NULL — the card is at full price, not on offer. Name, slug,
// specs and photo are untouched, so the live URL needs no redirect.
//
// Idempotent: keyed by slug, re-asserts the same price on every run.
// Must also be run on the server after the deploy — products.db is git-ignored.
//
//   node scripts/set-rtx-3090-price-2026-08-28.mjs
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

const SLUG = 'nvidia-rtx-3090-24gb';
const PRICE = 90000;

const run = db.transaction(() => {
  const row = db.prepare('SELECT id, name, price, sale_price FROM products WHERE slug = ?').get(SLUG);
  if (!row) throw new Error(`product "${SLUG}" missing from products.db`);

  db.prepare(
    // sale_price stays NULL, never 0 — see catalog-cleanup-2 step C.
    `UPDATE products
        SET price = ?, sale_price = NULL, in_stock = 1, updated_at = datetime('now')
      WHERE id = ?`
  ).run(PRICE, row.id);

  console.log(`  #${row.id} ${row.name}`);
  console.log(`    Price: ${row.price} L -> ${PRICE} L`);
  if (row.sale_price != null) console.log(`    Offer: ${row.sale_price} L -> (cleared)`);
});

run();
db.close();
console.log('\nDone.');
