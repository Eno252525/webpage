// Marks three desktops as out of stock (in_stock = 0), 2026-08-21:
//   /product/dell-d10u
//   /product/lenovo-thinkcentre-m910s-2
//   /product/lenovo-thinkcentre-m920s-2
//
// Nothing else changes — name, slug, price, specs and photos stay as they are,
// so the product pages and their URLs keep working; they just render as
// unavailable.
//
// Idempotent: keyed by slug, re-asserts in_stock = 0 on every run.
// Must also be run on the server after the deploy, because products.db is
// git-ignored.
//
//   node scripts/set-out-of-stock-2026-08-21.mjs
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

const SLUGS = [
  'dell-d10u',
  'lenovo-thinkcentre-m910s-2',
  'lenovo-thinkcentre-m920s-2',
];

const run = db.transaction(() => {
  const get = db.prepare('SELECT id, name, in_stock FROM products WHERE slug = ?');
  const set = db.prepare("UPDATE products SET in_stock = 0, updated_at = datetime('now') WHERE slug = ?");

  for (const slug of SLUGS) {
    const row = get.get(slug);
    if (!row) throw new Error(`product "${slug}" missing from products.db`);
    set.run(slug);
    console.log(`#${row.id} ${row.name}`);
    console.log(`  in_stock: ${row.in_stock} -> 0`);
  }
});

run();

console.log('\nVerify:');
for (const slug of SLUGS) {
  const r = db.prepare('SELECT slug, in_stock FROM products WHERE slug = ?').get(slug);
  console.log(`  ${r.slug}: in_stock=${r.in_stock}`);
}

db.close();
