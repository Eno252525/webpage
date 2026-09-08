// Price floor of 2026-08-26: no i5 8th-gen laptop sells below 18 000 Lekë —
// "the cheapest i5 gen 8 laptop should be 18000".
//
// Two rows were under it. They are fixed in different places, because each has a
// different source of truth, and both of those scripts are still pending on the
// server:
//
//   dell-latitude-7390   15 000 -> 18 000   in scripts/set-laptop-sale-2026-08-12.mjs
//                        (stays in the promo: list 18 000 -> 22 000, sale 18 000, -18%)
//   dell-latitude-5400   17 000 -> 18 000   HERE — it is not part of the promo,
//                        so it just carries a flat price
//
// The base prices in scripts/replace-laptops-2026-08.mjs were raised to 18 000
// for both, plus for hp-probook-640-g5 (whose sale price was set to 18 000 the
// same week), so re-running the laptop import alone cannot drop any of the three
// back under the floor.
//
// This script only writes the Latitude 5400 — the other two belong to the promo
// script, and asserting them here as well would give the same number two owners
// that could drift apart. It ends by listing every i5 8th-gen laptop still under
// 18 000, which should print nothing; run it after the promo script and use that
// list as the check that the floor holds.
//
// Idempotent: keyed by slug, re-asserts the same price every run. Must also be
// run on the server after the deploy, because products.db is git-ignored:
//   node scripts/set-i5-gen8-floor-2026-08-26.mjs
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

const SLUG = 'dell-latitude-5400';
const PRICE = 18000;

const run = db.transaction(() => {
  const row = db
    .prepare('SELECT id, name, price, sale_price FROM products WHERE slug = ?')
    .get(SLUG);
  if (!row) throw new Error(`product "${SLUG}" missing from products.db`);
  if (row.sale_price) {
    // Not expected: the 5400 is not in the promo. If a sale ever gets added, the
    // shop would show that instead, and this price would stop being the floor.
    console.log(`  warning: ${SLUG} carries sale_price ${row.sale_price} — the shop shows that, not ${PRICE}`);
  }
  db.prepare("UPDATE products SET price = ?, updated_at = datetime('now') WHERE slug = ?")
    .run(PRICE, SLUG);
  console.log(`#${row.id} ${row.name}`);
  console.log(`  price: ${row.price} -> ${PRICE} Lekë`);
});

run();

// Check: every i5 8th-gen laptop, by the price a customer actually pays.
const under = db.prepare(`
  WITH RECURSIVE sub(id) AS (
    SELECT id FROM categories WHERE slug = 'laptop'
    UNION ALL
    SELECT c.id FROM categories c JOIN sub ON c.parent_id = sub.id
  )
  SELECT p.slug, json_extract(p.attributes, '$.CPU') cpu,
         COALESCE(NULLIF(p.sale_price, 0), p.price) eff
  FROM products p
  WHERE p.category_id IN (SELECT id FROM sub)
    AND json_extract(p.attributes, '$.CPU') LIKE 'i5-8%'
    AND COALESCE(NULLIF(p.sale_price, 0), p.price) < ${PRICE}
    AND COALESCE(NULLIF(p.sale_price, 0), p.price) > 0
  ORDER BY eff
`).all();

console.log('\ni5 8th-gen laptops still under ' + PRICE + ':');
if (!under.length) console.log('  none — floor holds.');
for (const r of under) console.log(`  ${r.slug} (${r.cpu}) — ${r.eff} Lekë`);

db.close();
