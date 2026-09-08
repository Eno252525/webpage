// #569 HP ProBook 640 G1 (slug hp-probook-640-g1) was listed with an i3-4210M
// at 7000 Lekë. Requested 2026-08-31: it is a 4th-gen i5 machine, priced like
// the rest of the i5 4th-gen laptops in the catalog.
//
// i5-4210M is the direct i5 counterpart of the i3-4210M it replaces (same
// socket/generation) and is already used by #573 ThinkPad L540 and #575 HP G62.
// 10000 Lekë is what every 4th-gen-i5 / 8GB / 128GB SSD laptop sells for here
// (#235 + #571 E6440, #572 L440, #573 L540, #575 G62).
//
// Keyed by slug, idempotent (re-asserts the same values), backs the DB up
// first. The slug carries no CPU, so no redirect is needed.
//
//   node scripts/set-probook-640-g1-i5-2026-08-31.mjs

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const SLUG = 'hp-probook-640-g1';
const CPU = 'i5-4210M';
const PRICE = 10000;

const NAME = `HP ProBook 640 G1 - ${CPU} / 8GB RAM / 128GB SSD`;
const SHORT = `HP ProBook 640 G1 14" me ${CPU}, 8GB RAM dhe 128GB SSD.`;
const DESC =
  'HP ProBook është seria e laptopëve të biznesit për përdorim të përditshëm ' +
  'në zyrë: ndërtim i qëndrueshëm, tastierë komode dhe siguri e nivelit ' +
  `profesional me TPM. Konfigurimi: procesor ${CPU}, 8GB memorie RAM, disk ` +
  'SSD 128GB, ekran 14". Gjendja: i përdorur, i testuar dhe në gjendje pune, ' +
  'me garanci nga IT Store.';

const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const db = new Database(dbPath);
const row = db.prepare('SELECT * FROM products WHERE slug = ?').get(SLUG);

if (!row) {
  console.log(`not found: ${SLUG} — nothing changed`);
} else {
  let attrs = {};
  try { attrs = JSON.parse(row.attributes || '{}') || {}; } catch { attrs = {}; }
  attrs.CPU = CPU;

  db.transaction(() => {
    db.prepare(
      `UPDATE products
          SET name = ?, short_description = ?, description = ?,
              price = ?, sale_price = NULL, attributes = ?,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`
    ).run(NAME, SHORT, DESC, PRICE, JSON.stringify(attrs), row.id);
  })();

  const after = db.prepare('SELECT id, name, price, sale_price, attributes FROM products WHERE id = ?').get(row.id);
  console.log(`#${after.id} ${after.name}`);
  console.log(`  price ${row.price} -> ${after.price} Lekë`);
  console.log(`  attributes ${after.attributes}`);
}

console.log('\n4th-gen i5 laptops now:');
for (const r of db.prepare(
  "SELECT id, slug, price, sale_price FROM products WHERE category_id = 27 AND attributes LIKE '%i5-4%' ORDER BY price"
).all()) {
  console.log(`  #${r.id} ${r.slug} — ${r.sale_price || r.price} Lekë`);
}
db.close();
