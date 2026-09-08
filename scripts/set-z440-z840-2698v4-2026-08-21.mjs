// Re-specs the two base workstation rows, 2026-08-21:
//
//   #205 hp-z440  E5-1620 V3        -> E5-2698 V4        25,000 L -> 35,000 L
//                 (re-priced 29,900 -> 35,000 on 2026-08-24, before this
//                  script had been run on the server)
//   #210 hp-z840  2 x E5-2687 V3    -> 2 x E5-2698 V4    60,000 L -> 55,000 L
//                 GPU K6000         -> K5000
//
// RAM, SSD, the Z440's K2200 4GB, the photos and the (empty) sku are left as
// they are. Slugs are NOT touched — /product/hp-z440 and /product/hp-z840 keep
// working, so no redirect is needed; only name / short_description carry the
// new CPU. The Z840 name gains "/ K5000" so it reads apart from the other
// Z840 row in the shop grid (hp-z840-e5-2643-v3-gtx-980).
//
// GPU/CPU values stay in the bare-model shape the other workstation rows use
// ("K2200 4GB", "2 x E5-2687 V3"), so the spec tables keep reading the same.
//
// Idempotent: keyed by slug, re-asserts the same name/specs/price every run.
// Must also be run on the server after the deploy, because products.db is
// git-ignored.
//
//   node scripts/set-z440-z840-2698v4-2026-08-21.mjs
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

const TARGETS = [
  {
    slug: 'hp-z440',
    name: 'HP Z440 - E5-2698 V4 / 32GB RAM / 256GB SSD',
    price: 35000,
    attrs: { CPU: 'E5-2698 V4' },
  },
  {
    slug: 'hp-z840',
    name: 'HP Z840 - 2 x E5-2698 V4 / 64GB RAM / 256GB SSD / K5000',
    price: 55000,
    attrs: { CPU: '2 x E5-2698 V4', GPU: 'K5000' },
  },
];

const run = db.transaction(() => {
  for (const t of TARGETS) {
    const row = db
      .prepare('SELECT id, name, price, attributes FROM products WHERE slug = ?')
      .get(t.slug);
    if (!row) throw new Error(`product "${t.slug}" missing from products.db`);

    const attrs = JSON.parse(row.attributes || '{}');
    const before = { ...attrs };
    Object.assign(attrs, t.attrs);

    db.prepare(
      // sale_price stays NULL, never 0 — see catalog-cleanup-2 step C.
      `UPDATE products
          SET name = ?, short_description = ?, attributes = ?, price = ?,
              sale_price = NULL, in_stock = 1, updated_at = datetime('now')
        WHERE id = ?`
    ).run(t.name, t.name, JSON.stringify(attrs), t.price, row.id);

    console.log(`  #${row.id} ${t.slug}`);
    console.log(`    Name:  ${row.name}`);
    console.log(`        -> ${t.name}`);
    for (const k of Object.keys(t.attrs)) {
      console.log(`    ${k}:   ${before[k] ?? '(none)'} -> ${attrs[k]}`);
    }
    console.log(`    Price: ${row.price} L -> ${t.price} L`);
  }
});

run();
db.close();
console.log('\nDone.');
