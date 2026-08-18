// Spec/spelling corrections across the Apple laptop rows (2026-08-12).
//
//   * #607  "i8-8295U" -> "i5-8295U" — there is no Core i8; the supplier sheet
//           says i5. Fixed in the name, the CPU attribute, the short description
//           AND the slug, so redirects.js gets a PRODUCT_RESLUG entry alongside.
//   * #607  drops GPU "Radeon Pro" — the 13" 2018 has Iris Plus 655, no discrete
//           GPU, and the supplier sheet lists no GPU for this row.
//   * #253  screen 15.6" -> 15.4"; #613 15" -> 15.4"; #607 13" -> 13.3".
//           Apple never shipped a 15.6" or a bare 13" panel — those are PC sizes.
//   * short_description on nine rows repeated the screen size ("MacBook Pro 13"
//           Late 2015 13.3" me …") because the generator appended the Screen
//           attribute to a name that already carried it.
//
// Attributes are read, patched and written back, so unrelated keys survive.
// Idempotent: keyed by product id with the expected current value asserted, so a
// re-run is a no-op rather than a second edit. Backs the DB up first. Must also
// be run on the server after the deploy — products.db is git-ignored:
//
//   node scripts/fix-macbook-specs-2026-08-12.mjs

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const db = new Database(dbPath);

// id -> the fields to re-assert. `attrs` is merged into the existing JSON;
// a key set to null is deleted.
const FIXES = {
  253: {
    attrs: { Screen: '15.4"' },
  },
  606: {
    short_description:
      'Apple MacBook Pro 15" 2018 me i9-8950HK, 32GB RAM, 256GB SSD dhe grafikë Radeon Pro.',
  },
  607: {
    name: 'Apple MacBook Pro 13" 2018 - i5-8295U / 8GB RAM / 256GB SSD',
    slug: 'apple-macbook-pro-2018-13-i5-8295u',
    short_description: 'Apple MacBook Pro 13" 2018 me i5-8295U, 8GB RAM dhe 256GB SSD.',
    attrs: { CPU: 'i5-8295U', Screen: '13.3"', GPU: null },
  },
  608: {
    short_description: 'Apple MacBook Pro 13" 2018 me i5-8259U, 8GB RAM dhe 256GB SSD.',
  },
  610: {
    short_description: 'Apple MacBook Pro 13" Late 2015 me i5-6267U, 8GB RAM dhe 512GB SSD.',
  },
  612: {
    short_description: 'Apple MacBook Pro 13" me i5-8257U, 8GB RAM dhe 256GB SSD.',
  },
  613: {
    short_description:
      'Apple MacBook Pro 15" 2019 me i7-9750H, 16GB RAM, 250GB SSD dhe grafikë Radeon Pro.',
    attrs: { Screen: '15.4"' },
  },
  614: {
    short_description: 'Apple MacBook Pro 13" 2020 me i5-1038NG7, 32GB RAM dhe 256GB SSD.',
  },
  615: {
    short_description:
      'Apple MacBook Pro 15" 2018 me i7-8850H, 32GB RAM, 512GB SSD dhe grafikë Radeon Pro.',
  },
};

const get = db.prepare('SELECT id, name, slug, short_description, attributes FROM products WHERE id = ?');
const upd = db.prepare(`
  UPDATE products
  SET name = ?, slug = ?, short_description = ?, attributes = ?, updated_at = datetime('now')
  WHERE id = ?
`);

let changed = 0;
const apply = db.transaction(() => {
  for (const [id, fix] of Object.entries(FIXES)) {
    const row = get.get(Number(id));
    if (!row) { console.warn(`SKIP (no such product): #${id}`); continue; }

    const attrs = JSON.parse(row.attributes || '{}');
    for (const [k, v] of Object.entries(fix.attrs || {})) {
      if (v === null) delete attrs[k]; else attrs[k] = v;
    }

    const next = {
      name: fix.name ?? row.name,
      slug: fix.slug ?? row.slug,
      short_description: fix.short_description ?? row.short_description,
      attributes: JSON.stringify(attrs),
    };

    const same =
      next.name === row.name &&
      next.slug === row.slug &&
      next.short_description === row.short_description &&
      next.attributes === row.attributes;
    if (same) { console.log(`#${id} already correct`); continue; }

    upd.run(next.name, next.slug, next.short_description, next.attributes, Number(id));
    console.log(`#${id} ${next.name}`);
    if (next.slug !== row.slug) console.log(`      slug: ${row.slug} -> ${next.slug}`);
    changed++;
  }
});
apply();

console.log(changed ? `Done — ${changed} row(s) corrected.` : 'Done — nothing to change.');
