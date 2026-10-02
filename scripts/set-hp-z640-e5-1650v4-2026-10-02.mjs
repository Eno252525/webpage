// Re-specs the existing HP Z640 listing (slug hp-z640) per Eno 2026-10-02 —
// same listing, new configuration, no new product:
//
//   HP Z640 — Xeon E5-1650 v4 / 32GB RAM / 512GB SSD / Quadro M4000 8GB   40 000 L
//   (was E5-2630 v3 / 16GB / 256GB / AMD W2100, 23 000 L)
//
// The slug and photo stay, so existing links keep working.
//
// Idempotent: keyed by slug, re-running re-asserts the same values. Safe to
// re-run — required on the server, where products.db is git-ignored:
//   node scripts/set-hp-z640-e5-1650v4-2026-10-02.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');
const SLUG = 'hp-z640';

const P = {
  name: 'HP Z640 - E5-1650 V4 / 32GB RAM / 512GB SSD / Quadro M4000 8GB',
  short_description: 'HP Z640 - E5-1650 V4 / 32GB RAM / 512GB SSD / Quadro M4000 8GB — perfekt për AutoCAD.',
  description:
    'HP Z640 është workstation profesional i ndërtuar për punë inxhinierike dhe projektim, perfekt për AutoCAD, Revit, SolidWorks dhe renderim 3D. Procesori Intel Xeon E5-1650 v4 (6 bërthama / 12 thread-e, deri 4.0 GHz) jep shpejtësi të lartë për modelim, ndërsa 32GB RAM dhe disku SSD 512GB e mbajnë të shpejtë edhe me projekte të mëdha. Karta grafike profesionale NVIDIA Quadro M4000 me 8GB memorie është e certifikuar për programet CAD. Gjendja: i përdorur dhe i testuar.',
  price: 40000,
  attributes: { CPU: 'E5-1650 V4', RAM: '32GB', SSD: '512GB', GPU: 'Quadro M4000 8GB' },
};

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);
const row = db.prepare('SELECT id, name, price FROM products WHERE slug = ?').get(SLUG);
if (!row) throw new Error(`product ${SLUG} not found`);

db.transaction(() => {
  db.prepare(`
    UPDATE products SET name = ?, short_description = ?, description = ?, price = ?, sale_price = NULL,
      attributes = ?, in_stock = 1, hidden = 0, updated_at = datetime('now')
    WHERE slug = ?
  `).run(P.name, P.short_description, P.description, P.price, JSON.stringify(P.attributes), SLUG);
})();
console.log(`#${row.id}: "${row.name}" ${row.price} L\n  -> "${P.name}" ${P.price} L`);

db.close();
console.log('\nDone.');
