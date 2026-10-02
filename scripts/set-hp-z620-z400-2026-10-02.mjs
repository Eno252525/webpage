// Updates two existing listings per Eno 2026-10-02 (no new products):
//
//   HP Z620 (hp-z620): graphics card K4000 -> Quadro K4200 4GB; price unchanged.
//   HP Z400 (hp-z400): 32GB RAM / 128GB SSD, no graphics card, 8 000 L
//                      (was 12GB / 128GB / FX 3800, 6 000 L).
//
// Idempotent: keyed by slug, re-running re-asserts the same values. Safe to
// re-run — required on the server, where products.db is git-ignored:
//   node scripts/set-hp-z620-z400-2026-10-02.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const UPDATES = [
  {
    slug: 'hp-z620',
    name: 'HP Z620 - E5-2630 V2 / 32GB RAM / 256GB SSD / Quadro K4200',
    attributes: { CPU: 'E5-2630 V2', RAM: '32GB', SSD: '256GB', GPU: 'Quadro K4200 4GB' },
  },
  {
    slug: 'hp-z400',
    name: 'HP Z400 - W3565 / 32GB RAM / 128GB SSD',
    price: 8000,
    attributes: { CPU: 'W3565', RAM: '32GB', SSD: '128GB' },
  },
];

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);
const get = db.prepare('SELECT id, name, price FROM products WHERE slug = ?');

db.transaction(() => {
  for (const u of UPDATES) {
    const row = get.get(u.slug);
    if (!row) throw new Error(`product ${u.slug} not found`);
    const price = u.price ?? row.price;
    db.prepare(`
      UPDATE products SET name = ?, short_description = ?, price = ?, attributes = ?,
        in_stock = 1, hidden = 0, updated_at = datetime('now')
      WHERE slug = ?
    `).run(u.name, u.name, price, JSON.stringify(u.attributes), u.slug);
    console.log(`#${row.id}: "${row.name}" ${row.price} L\n  -> "${u.name}" ${price} L`);
  }
})();

db.close();
console.log('\nDone.');
