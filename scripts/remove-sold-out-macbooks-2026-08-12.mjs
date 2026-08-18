// Deletes the three Apple laptops that are sold out (2026-08-12).
//
//   #251  MacBook Air 2020  i5-1038NG7 / 8GB / 256GB   44900
//   #252  MacBook Pro 2020  i7-1068NG7 / 32GB / 1TB    60000
//   #253  MacBook Pro 2019  i9-9880H   / 32GB / 1TB    80000
//
// All three were already flagged in_stock = 0 and are the only Apple rows absent
// from the August 2026 supplier list. Every other MacBook row stays.
//
// Guard rails, because a delete cannot be undone:
//   * keyed by slug, not id, so it targets the same product on the server;
//   * refuses to delete a row whose in_stock is 1 — if stock came back between
//     this being written and being run on the server, it skips instead;
//   * idempotent — an already-deleted slug is reported and skipped;
//   * backs products.db up first.
//
// uploads/ is deliberately left alone: apple-macbook-air-2020.webp is still used
// by #611 and apple-macbook-pro-2020.webp by #607/#608/#612/#614, so deleting the
// image files would blank out surviving products.
//
// redirects.js gets a PRODUCT_RESLUG entry per removed slug pointing at the
// closest remaining model, so the retired URLs 301 instead of 404.
//
//   node scripts/remove-sold-out-macbooks-2026-08-12.mjs

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const SOLD_OUT = [
  'apple-macbook-air-2020',
  'apple-macbook-pro-2020',
  'apple-macbook-pro-2019',
];

const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const db = new Database(dbPath);
const get = db.prepare('SELECT id, name, slug, price, in_stock FROM products WHERE slug = ?');
const del = db.prepare('DELETE FROM products WHERE id = ?');

let removed = 0;
let kept = 0;
const apply = db.transaction(() => {
  for (const slug of SOLD_OUT) {
    const row = get.get(slug);
    if (!row) { console.log(`already gone: ${slug}`); continue; }
    if (row.in_stock === 1) {
      console.warn(`KEEPING #${row.id} ${row.name} — back in stock, not deleting`);
      kept++;
      continue;
    }
    del.run(row.id);
    console.log(`deleted #${row.id} ${row.name} (${row.price} Lekë)`);
    removed++;
  }
});
apply();

const left = db.prepare("SELECT COUNT(*) n FROM products WHERE brand = 'Apple'").get().n;
console.log(`Done — ${removed} removed, ${kept} kept, ${left} Apple rows remaining.`);
