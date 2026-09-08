// Removes #272 "HDD 6TB" (slug hdd-6tb, 16000 Lekë) from the catalog.
// Requested 2026-08-24: https://itstore.al/product/hdd-6tb off the site.
//
// The catalog keeps a second 6TB drive — #529 "HDD 6TB" (slug hdd-6tb-perdorur,
// 12500 Lekë) — so nothing is lost from the 6TB slot; redirects.js 301s the
// retired slug there instead of letting it 404.
//
// Guard rails, because a delete cannot be undone:
//   * keyed by slug, not id, so it targets the same product on the server;
//   * idempotent — an already-deleted slug is reported and skipped;
//   * backs products.db up first;
//   * the image is only unlinked if no surviving product still references it
//     (here /uploads/hdd-500gb.webp is shared by every generic HDD row, so it
//     stays).
//
//   node scripts/remove-hdd-6tb-2026-08-24.mjs

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const SLUG = 'hdd-6tb';

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

  const stillUsed = db.prepare('SELECT COUNT(*) n FROM products WHERE images LIKE ?');
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
  "SELECT slug, name, price FROM products WHERE category_id = (SELECT id FROM categories WHERE slug = 'hdd') ORDER BY price"
).all();
console.log(`\nHDD category now (${left.length} rows):`);
for (const r of left) console.log(`  ${r.slug} — ${r.name} — ${r.price} Lekë`);
db.close();
