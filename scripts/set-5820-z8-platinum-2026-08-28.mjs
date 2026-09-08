// Two catalog corrections, 2026-08-28:
//
//   A. #199 "HP Z4 G4 - i9-10900X / 32GB RAM / 512GB SSD" (slug hp-z4-g4) is
//      not a Z4 G4 at all — it is a Dell Precision 5820. Re-branded, renamed,
//      re-slugged to dell-precision-5820-2 (dell-precision-5820 is already
//      taken by #158, the W-2123 build) and re-priced 60,000 -> 70,000 L.
//      It reuses the existing /uploads/dell-precision-5820.avif photo, the way
//      the other 5820/7820 rows already share one chassis shot.
//      The i9-10900X is a Core X-series part, which the 5820 board takes, so
//      the CPU/RAM/SSD/GPU spec block is unchanged.
//
//   B. #474 "HP Z8 G4 AI Server" runs 2x Xeon Platinum 8168, not Gold 6262.
//      Name, slug, both description fields and the CPU attribute follow, and
//      the price goes 165,000 -> 195,000 L. Core count is unchanged (both
//      parts are 24C/48T, so 48 bërthama / 96 thread-e still holds).
//
// Both slug changes get a 301 in redirects.js (PRODUCT_RESLUG).
//
// Idempotent: keyed by the new slug first, then the old one, so a re-run
// re-asserts the same values instead of failing or duplicating.
// Must also be run on the server after the deploy — products.db is git-ignored.
//
//   node scripts/set-5820-z8-platinum-2026-08-28.mjs
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

// Resolve a row by its post-change slug, falling back to the pre-change one.
function find(newSlug, oldSlug) {
  return db.prepare('SELECT * FROM products WHERE slug = ?').get(newSlug)
      ?? db.prepare('SELECT * FROM products WHERE slug = ?').get(oldSlug);
}

const run = db.transaction(() => {
  // ── A. hp-z4-g4 → Dell Precision 5820 ────────────────────────────────────
  {
    const OLD = 'hp-z4-g4';
    const NEW = 'dell-precision-5820-2';
    const NAME = 'Dell Precision 5820 - i9-10900X / 32GB RAM / 512GB SSD';
    const PRICE = 70000;
    const IMAGES = ['/uploads/dell-precision-5820.avif'];

    const row = find(NEW, OLD);
    if (!row) throw new Error(`product "${OLD}" missing from products.db`);

    const attrs = JSON.parse(row.attributes || '{}');
    attrs.CPU = 'i9-10900X';   // the shop's CPU facet reads this key verbatim

    db.prepare(
      // sale_price stays NULL, never 0 — see catalog-cleanup-2 step C.
      `UPDATE products
          SET name = ?, slug = ?, short_description = ?, brand = 'Dell',
              price = ?, sale_price = NULL, images = ?, attributes = ?,
              in_stock = 1, updated_at = datetime('now')
        WHERE id = ?`
    ).run(NAME, NEW, NAME, PRICE, JSON.stringify(IMAGES), JSON.stringify(attrs), row.id);

    console.log(`  #${row.id} ${row.name}`);
    console.log(`    Name:  -> ${NAME}`);
    console.log(`    Slug:  ${row.slug} -> ${NEW}`);
    console.log(`    Brand: ${row.brand} -> Dell`);
    console.log(`    Photo: ${JSON.parse(row.images || '[]')[0] ?? '(none)'} -> ${IMAGES[0]}`);
    console.log(`    Price: ${row.price} L -> ${PRICE} L`);
  }

  // ── B. Z8 G4 AI Server: Gold 6262 → Platinum 8168 ────────────────────────
  {
    const OLD = 'hp-z8-g4-ai-server-2x-xeon-gold-6262-rtx-3090';
    const NEW = 'hp-z8-g4-ai-server-2x-xeon-platinum-8168-rtx-3090';
    const PRICE = 195000;

    const row = find(NEW, OLD);
    if (!row) throw new Error(`product "${OLD}" missing from products.db`);

    const swap = (s) => (s || '').replace(/Xeon Gold 6262/g, 'Xeon Platinum 8168');
    const name = swap(row.name);
    const shortDesc = swap(row.short_description);
    const desc = swap(row.description);

    const attrs = JSON.parse(row.attributes || '{}');
    attrs.CPU = '2x Intel Xeon Platinum 8168 (48 bërthama / 96 thread-e gjithsej)';

    db.prepare(
      `UPDATE products
          SET name = ?, slug = ?, short_description = ?, description = ?,
              price = ?, sale_price = NULL, attributes = ?,
              in_stock = 1, updated_at = datetime('now')
        WHERE id = ?`
    ).run(name, NEW, shortDesc, desc, PRICE, JSON.stringify(attrs), row.id);

    console.log(`\n  #${row.id} ${row.name}`);
    console.log(`    Name:  -> ${name}`);
    console.log(`    Slug:  ${row.slug} -> ${NEW}`);
    console.log(`    CPU:   -> ${attrs.CPU}`);
    console.log(`    Price: ${row.price} L -> ${PRICE} L`);
  }
});

run();
db.close();
console.log('\nDone.');
