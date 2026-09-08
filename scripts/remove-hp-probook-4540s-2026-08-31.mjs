// Removes #567 "HP ProBook 4540s - i3-3110M / 8GB RAM / 128GB SSD"
// (slug hp-probook-4540s, 6000 Lekë) from the catalog.
// Requested 2026-08-31: https://itstore.al/product/hp-probook-4540s off the site.
//
// redirects.js 301s the retired slug to hp-probook-640-g1 — the nearest
// surviving laptop (14", i3, 8GB/128GB SSD, 7000 Lekë) — so the old URL keeps
// its inbound links instead of 404ing.
//
// Guard rails, because a delete cannot be undone:
//   * keyed by slug, not id, so it targets the same product on the server;
//   * idempotent — an already-deleted slug is reported and skipped;
//   * backs products.db up first;
//   * images are only unlinked if no surviving product still references them.
//
//   node scripts/remove-hp-probook-4540s-2026-08-31.mjs

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const SLUG = 'hp-probook-4540s';

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

const target = db.prepare('SELECT id, slug, name, price FROM products WHERE slug = ?')
  .get('hp-probook-640-g1');
console.log(
  target
    ? `\nredirect target present: #${target.id} ${target.name} (${target.price} Lekë)`
    : '\nWARNING: redirect target hp-probook-640-g1 is missing from this DB'
);
db.close();
