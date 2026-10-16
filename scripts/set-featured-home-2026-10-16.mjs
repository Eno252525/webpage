// Marks the products the home page leads with (hero deck + spotlight), per
// Eno 2026-10-16. Picked from what visitors look at most (Google Analytics,
// Sep 30 – Oct 15: HP Z840, HP Z8 G4 AI, RTX 3090) plus the workstation /
// gaming / Apple lines that do best on Instagram. Nothing was featured before,
// so the home page fell back to whatever happened to be on sale.
//
// featured = 1 also pins these to the top of the shop's default "Më të reja"
// order and of their categories; price sorts ignore it.
//
// Idempotent: the list below is the whole featured set — products in it are
// set to 1 and every other product to 0, so a re-run re-asserts it. products.db
// is git-ignored, so run it on the server copy too:
//   node scripts/set-featured-home-2026-10-16.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const FEATURED = [
  'hp-z840',
  'dell-precision-5820-3',
  'pc-gaming-ryzen-5-5600-rx-580',
  'nvidia-rtx-3090-24gb',
  'apple-mac-mini-2018-i3-8100b',
  'hp-z8-g4-ai-server-2x-xeon-platinum-8168-rtx-3090',
];

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);
db.transaction(() => {
  db.prepare('UPDATE products SET featured = 0 WHERE featured != 0').run();
  const set = db.prepare("UPDATE products SET featured = 1, updated_at = datetime('now') WHERE slug = ?");
  for (const slug of FEATURED) {
    if (set.run(slug).changes !== 1) throw new Error(`${slug} not found`);
  }
})();

for (const r of db.prepare('SELECT id, name, price, sale_price FROM products WHERE featured = 1').all()) {
  console.log(`★ #${r.id} ${r.name} — ${r.sale_price || r.price} L`);
}
db.close();
