// Short Albanian descriptions — what each product is and what it is used for —
// for the 307 products that had none (or a one-liner), per Eno 2026-10-16.
// Google search is the shop's best source of WhatsApp leads, and a product
// page with real text ranks and converts better than one with only a spec table.
//
// The texts live in scripts/assets/descriptions-2026-10-16.json ({ slug: text }).
// They were drafted from each product's own attributes (CPU tier, RAM, storage,
// GPU, form factor; screen / resolution / Hz for monitors; ports / PoE /
// uplinks / layer for switches…), the odd ones (routers, firewalls, servers
// without specs, rail kit, KVM) written by hand, and all reviewed. A product
// is described as used unless its badge is "I ri".
//
// Idempotent and non-destructive: a product is only written when its current
// description is still empty / under 80 characters, or already equals the text
// here — a description edited by hand in the meantime is left alone. products.db
// is git-ignored, so run it on the server copy too:
//   node scripts/set-descriptions-2026-10-16.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dbPath = path.join(root, 'products.db');
const texts = JSON.parse(fs.readFileSync(path.join(here, 'assets', 'descriptions-2026-10-16.json'), 'utf8'));

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);
const get = db.prepare('SELECT id, description FROM products WHERE slug = ?');
const set = db.prepare("UPDATE products SET description = ?, updated_at = datetime('now') WHERE id = ?");

let written = 0, same = 0, kept = 0, missing = 0;
db.transaction(() => {
  for (const [slug, text] of Object.entries(texts)) {
    const row = get.get(slug);
    if (!row) { missing++; continue; }
    const cur = String(row.description || '');
    if (cur === text) { same++; continue; }
    if (cur.trim().length >= 80) { kept++; continue; }
    set.run(text, row.id);
    written++;
  }
})();
db.close();

console.log(`written ${written} · already current ${same} · kept (edited since) ${kept} · slug not found ${missing}`);
