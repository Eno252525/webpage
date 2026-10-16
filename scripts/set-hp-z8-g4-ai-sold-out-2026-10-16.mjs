// HP Z8 G4 AI Server (2x Platinum 8168 / 128GB / 1TB NVMe / RTX 3090) is sold
// out, per Eno 2026-10-16: marked "Pa stok" and its public price removed.
//  · in_stock = 0 keeps the page up, marked "Pa stok" (basket button disabled)
//  · price = 0 / sale_price = NULL → "Çmim sipas kërkesës"; with no price it
//    also drops out of the Meta catalog feed
//  · featured = 0, so a sold-out item isn't pinned to the top of the shop
//    (also removed from scripts/set-featured-home-2026-10-16.mjs)
//
// Idempotent: sets an absolute value. products.db is git-ignored, so run it on
// the server copy too:
//   node scripts/set-hp-z8-g4-ai-sold-out-2026-10-16.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');
const SLUG = 'hp-z8-g4-ai-server-2x-xeon-platinum-8168-rtx-3090';

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);
const r = db.prepare("UPDATE products SET in_stock = 0, price = 0, sale_price = NULL, featured = 0, updated_at = datetime('now') WHERE slug = ?").run(SLUG);
if (r.changes !== 1) throw new Error(`${SLUG} not found`);
console.log(db.prepare('SELECT id, name, price, sale_price, in_stock, featured FROM products WHERE slug = ?').get(SLUG));
db.close();
