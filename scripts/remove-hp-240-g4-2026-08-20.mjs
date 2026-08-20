// Removes #568 "HP 240 G4 - i3-4005U / 8GB RAM / 128GB SSD" (slug hp-240-g4),
// from the 2026-08 laptop import. Requested 2026-08-20.
//
// Guard rails, because a delete cannot be undone:
//   * keyed by slug, not id, so it targets the same product on the server;
//   * idempotent — an already-deleted slug is reported and skipped;
//   * backs products.db up first;
//   * the image is only unlinked if no surviving product still references it.
//
// Two companion edits ship with this script:
//   * scripts/replace-laptops-2026-08.mjs no longer carries the hp-240-g4 row,
//     so re-running the import on the server cannot resurrect the product;
//   * redirects.js maps hp-240-g4 -> hp-probook-640-g1 (same 14" screen, same
//     4th-gen i3, same 7000 Lekë) so the retired URL 301s instead of 404ing.
//
//   node scripts/remove-hp-240-g4-2026-08-20.mjs

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const SLUG = 'hp-240-g4';

const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const db = new Database(dbPath);
const row = db
  .prepare('SELECT id, name, slug, price, images FROM products WHERE slug = ?')
  .get(SLUG);

if (!row) {
  console.log(`already gone: ${SLUG}`);
} else {
  let images = [];
  try { images = JSON.parse(row.images || '[]') || []; } catch { images = []; }

  db.transaction(() => {
    db.prepare('DELETE FROM products WHERE id = ?').run(row.id);
  })();
  console.log(`deleted #${row.id} ${row.name} (${row.price} Lekë)`);

  // Drop the image file only if it became an orphan — some photos are shared
  // between several rows and deleting one would blank out a surviving product.
  const stillUsed = db.prepare(
    'SELECT COUNT(*) n FROM products WHERE images LIKE ?'
  );
  for (const img of images) {
    const name = path.basename(img);
    if (stillUsed.get(`%${name}%`).n > 0) {
      console.log(`kept ${name} — still used by another product`);
      continue;
    }
    const file = path.join(root, 'uploads', name);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`removed orphaned image uploads/${name}`);
    } else {
      console.log(`image uploads/${name} not present here`);
    }
  }
}

const left = db.prepare(
  "SELECT COUNT(*) n FROM products WHERE brand = 'HP' AND category_id = (SELECT id FROM categories WHERE slug = 'business-laptops')"
).get().n;
console.log(`Done — ${left} HP rows left in Business Laptops.`);
db.close();
