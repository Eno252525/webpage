// Promo pricing of 2026-08-12 for a hand-picked subset of the laptop catalogue.
//
// The shop's current asking price becomes `sale_price`, and `price` is raised to a
// higher "list" price so the card renders as a discount (webroot/js/ui.js draws the
// struck-through price and computes the -N% sticker from the two values).
//
// Only 24 of the ~96 laptop rows are included, deliberately:
//   * every one is in stock and already had a real price (never a price-0 row —
//     those show "Çmim sipas kërkesës" and must stay that way),
//   * they are the models worth advertising: the MacBook Pro / Air line, the
//     mobile workstations, and the strongest business ThinkPads / Latitudes /
//     EliteBooks, plus two entry-level machines so the promo covers every budget,
//   * spread across Apple / Dell / HP / Lenovo / Microsoft so the sale reads as a
//     selection rather than a blanket markup on the whole category.
// Rows 226 (Precision 7560) and 365 (ThinkPad T14s) already carried a sale price
// and are out of stock — left untouched.
//
// Discounts land in the 15-20% band and every list price is rounded to a shape a
// real price tag would take. LIST is an absolute value, not a multiplier, so the
// script is idempotent: re-running re-asserts the same two numbers instead of
// inflating the price again.
//
// products.db is git-ignored, so this must also be run on the server after the
// deploy:  node scripts/set-laptop-sale-2026-08-12.mjs
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

// slug -> [list price, sale price]. The sale price is the row's pre-promo price.
const SALES = {
  // MacBooks
  'apple-macbook-pro-2018-i9': [79000, 65000],
  'apple-macbook-pro-2019-i7': [72000, 60000],
  'apple-macbook-pro-2020-i5-1038ng7': [56000, 47000],
  'apple-macbook-pro-2018-13-i5-8259u': [45000, 37000],
  'apple-macbook-air-2019': [36000, 30000],
  // Mobile workstations
  'hp-zbook-firefly-15-g7': [54000, 45000],
  'dell-precision-7540': [53000, 44000],
  'lenovo-thinkpad-p53': [39000, 33000],
  'hp-zbook-15-g3': [33000, 27000],
  // Business laptops
  'dell-latitude-9520': [42000, 35000],
  'dell-latitude-5511-2': [39000, 32500],
  'microsoft-surface-3-13': [36000, 30000],
  'hp-probook-455-g7': [36000, 30000],
  'lenovo-thinkpad-t14-gen2': [34000, 28000],
  'lenovo-thinkpad-x13-gen-2': [33900, 27900],
  'dell-latitude-7940-touch': [30000, 25000],
  'hp-elitebook-850-g6': [27000, 22000],
  'lenovo-thinkpad-x13-gen-1-i5-10210u': [26500, 22000],
  'lenovo-thinkpad-t460s': [24000, 20000],
  'hp-probook-640-g5': [21000, 17000],
  'lenovo-thinkpad-x1-yoga': [18500, 15000],
  'dell-latitude-7390': [18000, 15000],
  // Entry level
  'hp-probook-450-g2': [13500, 11000],
  'lenovo-thinkpad-x240': [12500, 10000],
};

const db = new Database(dbPath);
const get = db.prepare('SELECT id, name, price, sale_price, in_stock FROM products WHERE slug = ?');

const targets = [];
let missing = 0;
for (const [slug, [list, sale]] of Object.entries(SALES)) {
  const p = get.get(slug);
  if (!p) { console.warn(`SKIP (no such product): ${slug}`); missing++; continue; }
  if (sale >= list) { console.warn(`SKIP (sale not below list): ${slug}`); missing++; continue; }
  targets.push({ ...p, slug, list, sale });
}

if (!targets.length) {
  console.error('Aborting — nothing to update.');
  process.exit(1);
}

const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const upd = db.prepare(
  "UPDATE products SET price = ?, sale_price = ?, updated_at = datetime('now') WHERE id = ?"
);
db.transaction(() => {
  for (const t of targets) upd.run(t.list, t.sale, t.id);
})();

for (const t of targets) {
  const pct = Math.round((1 - t.sale / t.list) * 100);
  console.log(`#${t.id} ${t.name}: ${t.price} -> ${t.list} (sale ${t.sale}, -${pct}%)`);
}
console.log(missing
  ? `Done — ${targets.length} laptops on sale, ${missing} skipped.`
  : `Done — ${targets.length} laptops on sale.`);
