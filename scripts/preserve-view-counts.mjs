// Preserves live view_count values when swapping in a new products.db.
//
// The live server DB accumulates real per-product view counts, but a database
// you edit locally (adding products, running import scripts) usually has stale
// or zero counts. Overwriting the server DB with the local one would reset the
// counts. This script reads the counts out of the OLD (live) DB and writes them
// into the NEW (incoming) DB, matching products by `slug` (a stable UNIQUE key).
//
// It applies MAX(old, new) per product, so a count is never lowered regardless
// of which DB is "old" and which is "new". Products that exist in only one DB
// are left untouched. Idempotent: re-running changes nothing.
//
// Usage:
//   node scripts/preserve-view-counts.mjs <old-db> <new-db>
//   node scripts/preserve-view-counts.mjs                # defaults below
//
// Typical server workflow:
//   1. Upload your new database next to the live one, e.g. as products.db.new
//   2. node scripts/preserve-view-counts.mjs products.db products.db.new
//   3. Stop the app, replace products.db with products.db.new, restart.
import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';

const oldPath = process.argv[2] || 'products.db';       // live DB (source of counts)
const newPath = process.argv[3] || 'products.db.new';   // incoming DB (gets the counts)

for (const [label, p] of [['old', oldPath], ['new', newPath]]) {
  if (!existsSync(p)) {
    console.error(`Error: ${label} database not found: ${p}`);
    process.exit(1);
  }
}

const oldDb = new Database(oldPath, { readonly: true });
const newDb = new Database(newPath);

// slug -> view_count from the live DB
const liveCounts = new Map();
for (const row of oldDb.prepare('SELECT slug, view_count FROM products').all()) {
  liveCounts.set(row.slug, row.view_count || 0);
}

const update = newDb.prepare('UPDATE products SET view_count = ? WHERE slug = ?');
const newRows = newDb.prepare('SELECT slug, view_count FROM products').all();

let changed = 0, matched = 0, unmatched = 0;
const apply = newDb.transaction(() => {
  for (const row of newRows) {
    if (!liveCounts.has(row.slug)) { unmatched++; continue; }
    matched++;
    const merged = Math.max(liveCounts.get(row.slug), row.view_count || 0);
    if (merged !== (row.view_count || 0)) {
      update.run(merged, row.slug);
      changed++;
    }
  }
});
apply();

console.log(`Matched by slug: ${matched}  |  updated: ${changed}  |  new-only (untouched): ${unmatched}`);
console.log(`View counts preserved into ${newPath}. Now swap it in as products.db and restart.`);

oldDb.close();
newDb.close();
