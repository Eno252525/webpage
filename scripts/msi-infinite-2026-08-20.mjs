// MSI INFINITE gaming desktops, 2026-08-20:
//   * removes both MPG INFINITE X2 towers —
//       #131 "MSI MPG Z690 INFINITE X2 - i7-13700KF / 16GB RAM / 1TB NVMe SSD"
//            (slug msi-msi-mpg-z690-infinite-x2)
//       #132 "MSI MPG Z790 INFINITE X2 - i7-14700KF / 32GB RAM / 1TB NVMe SSD"
//            (slug msi-msi-mpg-z790-infinite-x2)
//   * reprices #130 "MSI INFINITE B904 - i7-14700KF / 32GB RAM / 1TB NVMe SSD"
//     (slug msi-msi-infinite-b904) from 160,000 L to 190,000 L.
//
// Guard rails, because a delete cannot be undone:
//   * keyed by slug, not id, so it targets the same rows on the server;
//   * idempotent — an already-deleted slug is reported and skipped, and the
//     price is simply re-asserted on every run;
//   * backs products.db up first;
//   * an image is only unlinked if no surviving product still references it
//     (the Z690 shared the B904 photo, so it must stay).
//
// redirects.js ships with this script, mapping both retired slugs to the
// INFINITE B904 — the only MSI INFINITE tower left — so the URLs 301, not 404.
//
// products.db is git-ignored, so this must also be run on the server:
//   node scripts/msi-infinite-2026-08-20.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const REMOVE_SLUGS = [
  'msi-msi-mpg-z690-infinite-x2',
  'msi-msi-mpg-z790-infinite-x2',
];
const PRICE_SLUG = 'msi-msi-infinite-b904';
const PRICE = 190000;

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log('Backup: products.db.bak-' + stamp + '\n');

const db = new Database(dbPath);
const stillUsed = db.prepare('SELECT COUNT(*) n FROM products WHERE images LIKE ?');

// --- 1. remove both MPG INFINITE X2 towers ----------------------------------
for (const slug of REMOVE_SLUGS) {
  const gone = db
    .prepare('SELECT id, name, price, images FROM products WHERE slug = ?')
    .get(slug);

  if (!gone) {
    console.log(`already gone: ${slug}`);
    continue;
  }

  let images = [];
  try { images = JSON.parse(gone.images || '[]') || []; } catch { images = []; }

  db.transaction(() => {
    db.prepare('DELETE FROM products WHERE id = ?').run(gone.id);
  })();
  console.log(`deleted #${gone.id} ${gone.name} (${gone.price} Lekë)`);

  // Drop the image file only if it became an orphan — some photos are shared
  // between several rows and deleting one would blank out a surviving product.
  for (const img of images) {
    const name = path.basename(img);
    if (stillUsed.get(`%${name}%`).n > 0) {
      console.log(`  kept ${name} — still used by another product`);
      continue;
    }
    const file = path.join(root, 'uploads', name);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`  removed orphaned image uploads/${name}`);
    } else {
      console.log(`  image uploads/${name} not present here`);
    }
  }
}

// --- 2. reprice the INFINITE B904 -------------------------------------------
db.transaction(() => {
  const row = db.prepare('SELECT id, name, price FROM products WHERE slug = ?').get(PRICE_SLUG);
  if (!row) throw new Error(`product "${PRICE_SLUG}" missing from products.db`);

  db.prepare(
    // sale_price stays NULL, never 0 — see catalog-cleanup-2 step C.
    "UPDATE products SET price = ?, sale_price = NULL, in_stock = 1, updated_at = datetime('now') WHERE id = ?"
  ).run(PRICE, row.id);

  console.log(`  #${row.id} ${row.name}: ${row.price} L -> ${PRICE} L`);
})();

db.close();
console.log('\nDone.');
