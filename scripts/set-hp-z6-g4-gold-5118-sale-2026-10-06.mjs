// HP Z6 G4 (id 206) per Eno 2026-10-06: the unit has a Xeon Gold 5118 (not the
// Gold 6132 it was listed with), and it goes on sale — 60 000 L regular,
// 55 000 L sale. Name, short description and the CPU spec are updated to match.
//
// Idempotent: sets absolute values, so a re-run re-asserts them. products.db is
// git-ignored, so run it on the server after a deploy too:
//   node scripts/set-hp-z6-g4-gold-5118-sale-2026-10-06.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);
db.transaction(() => {
  const row = db.prepare("SELECT id, attributes FROM products WHERE slug = 'hp-z6-g4'").get();
  if (!row) throw new Error('hp-z6-g4 not found');
  const attrs = JSON.parse(row.attributes || '{}');
  attrs.CPU = 'Gold 5118';
  db.prepare(`
    UPDATE products SET
      name = ?, short_description = ?, description = ?, attributes = ?,
      price = 60000, sale_price = 55000, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    'HP Z6 G4 - Gold 5118 / 32GB RAM / 512GB SSD',
    'HP Z6 G4 workstation me Intel Xeon Gold 5118 (12 bërthama / 24 thread-e), 32GB RAM, 512GB SSD dhe AMD Radeon Pro WX 2100 4GB.',
    'HP Z6 G4 është një workstation profesional i ndërtuar për punë të rënda: CAD, render 3D, simulime dhe video editing. Ky konfigurim vjen me procesor Intel Xeon Gold 5118 (12 bërthama / 24 thread-e, 2.3 GHz deri 3.2 GHz turbo, 16.5MB cache), 32GB memorie RAM, 512GB SSD dhe kartë grafike AMD Radeon Pro WX 2100 4GB. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
    JSON.stringify(attrs),
    row.id,
  );
})();

console.log(db.prepare("SELECT id, name, price, sale_price, attributes FROM products WHERE slug = 'hp-z6-g4'").get());
db.close();
