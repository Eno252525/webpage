// Keeps the `badge` column in step with attributes.Gjendja, 2026-08-18.
//
// Condition is stored in two independent places:
//   • attributes.Gjendja — shown in the spec table on the product page;
//   • the badge column   — what the product CARD reads (conditionTag() in
//     webroot/js/ui.js), which prints "Të Përdorur" for anything that is not
//     exactly "i ri".
//
// When they disagree the card lies. That is how the LG 32UP550-W (#481) — a new
// monitor — ended up advertised as used on the shop grid.
//
// Only sets badge = 'I RI' where Gjendja says the item is new and the badge does
// not. It never clears a badge: some products (#272 HDD 6TB, #320 Surface Hub)
// carry badge 'I RI' with no Gjendja attribute at all, and those are left alone.
//
// Idempotent — re-running changes nothing once the two agree.
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
const norm = (s) => (s || '').trim().toLowerCase().replace(/ë/g, 'e');

const run = db.transaction(() => {
  let fixed = 0;
  for (const row of db.prepare('SELECT id, name, badge, attributes FROM products').all()) {
    let attrs;
    try { attrs = JSON.parse(row.attributes || '{}'); } catch { continue; }
    if (norm(attrs?.Gjendja) !== 'i ri') continue;   // only act on genuinely new stock
    if (norm(row.badge) === 'i ri') continue;        // already agrees
    db.prepare("UPDATE products SET badge = 'I RI', updated_at = datetime('now') WHERE id = ?").run(row.id);
    console.log(`  #${row.id} badge: ${JSON.stringify(row.badge)} -> "I RI"  (${row.name.slice(0, 55)})`);
    fixed++;
  }
  console.log(fixed ? `\n${fixed} card badge(s) corrected` : '  all condition badges already agree');
});

run();
db.close();
console.log('\nDone.');
