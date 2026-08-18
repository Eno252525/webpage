// Catalog consistency pass, 2026-08-18.
//
//  A. Model-name / spec corrections (wrong CPU, wrong product line, typos).
//  B. Whole-catalog normalisation of RAM/SSD size formatting (8gb -> 8GB,
//     "256 SSD" -> "256GB SSD", "1 TB" -> "1TB") in names and attributes.
//  C. Products filed under the wrong category.
//  D. Two duplicate listings removed (301s added in redirects.js).
//  E. Price corrections.
//  F. Lenovo ThinkPad T14s back in stock.
//
// Idempotent: every step is keyed by id and re-asserts a target value, so a
// re-run (e.g. on the server after deploy) is a no-op rather than a double edit.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = path.join(root, `products.db.bak-${stamp}`);
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup), '\n');

const db = new Database(dbPath);

// ── helpers ──────────────────────────────────────────────────────────────────
const get = db.prepare('SELECT * FROM products WHERE id = ?');
const note = (s) => console.log(s);

function setFields(id, fields) {
  const row = get.get(id);
  if (!row) { note(`  ! #${id} missing — skipped`); return; }
  const changed = Object.entries(fields).filter(([k, v]) => row[k] !== v);
  if (!changed.length) return;
  const sql = `UPDATE products SET ${changed.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...changed.map(([, v]) => v), id);
  for (const [k, v] of changed) note(`  #${id} ${k}: ${JSON.stringify(row[k])} -> ${JSON.stringify(v)}`);
}

// Rename a product, keeping short_description in sync when it just mirrors the name.
function rename(id, newName, newSlug) {
  const row = get.get(id);
  if (!row) { note(`  ! #${id} missing — skipped`); return; }
  const fields = { name: newName };
  if ((row.short_description || '').trim() === (row.name || '').trim()) fields.short_description = newName;
  if (newSlug) fields.slug = newSlug;
  setFields(id, fields);
}

// Normalise a size token: 8gb/8 Gb -> 8GB, 1 TB -> 1TB, bare "256 SSD" -> "256GB SSD".
//
// The "Gb -> GB" rule is deliberately an ALLOW-list rather than a block-list.
// A block-list ("everything except /s, SFP, SAS…") kept mangling gigabit
// interface speeds in prose — "10Gb/40Gb", "6Gb/s SATA", "12 Gb/s SAS" are
// bits, not bytes, and must stay lower-case-b. So in free text a "Gb" is only
// treated as a capacity when a capacity word follows it. Inside a RAM/SSD/HDD
// attribute the whole field *is* a capacity, so there the rule is unconditional
// (pass bareValue: true).
//
// The lookbehind on "." keeps form factors intact: the 2 in "U.2 SSD" / "M.2
// SSD" is part of the connector name, not a 2GB capacity.
const CAPACITY_FOLLOWS = '(?=\\s*(?:RAM|SSD|HDD|NVMe)\\b)';

function normSizes(text, { bareValue = false } = {}) {
  if (!text) return text;
  const out = text
    .replace(/(\d+)\s*[Tt][Bb]\b(?!\/)/g, '$1TB')
    .replace(/(?<![.\d])\b(\d+)\s+RAM\b/g, '$1GB RAM')
    .replace(/(?<![.\d])\b(\d+)\s+SSD\b/g, '$1GB SSD');
  return bareValue
    ? out.replace(/(\d+)\s*[Gg][Bb]\b/g, '$1GB')
    : out.replace(new RegExp(`(\\d+)\\s*[Gg][Bb]\\b${CAPACITY_FOLLOWS}`, 'g'), '$1GB');
}

const run = db.transaction(() => {
  // ── A. name / spec corrections ─────────────────────────────────────────────
  note('A. Name & spec corrections');

  // #164 — "E3-2171 V3" is not a real part; the T1700 Haswell Xeon is the E3-1271 V3.
  {
    const a = JSON.parse(get.get(164).attributes || '{}');
    a.CPU = 'E3-1271 V3';
    setFields(164, { attributes: JSON.stringify(a) });
    rename(164, 'Dell Precision T1700 - E3-1271 V3 / 16GB RAM / 128GB SSD');
  }

  // #181 / #183 — the S20 is a ThinkStation, not a ThinkCentre (cf. #191).
  rename(181, 'Lenovo Thinkstation S20 - W3530 / 6GB RAM / 128GB SSD', 'lenovo-thinkstation-s20-w3530');
  rename(183, 'Lenovo Thinkstation S20 - E5640 / 6GB RAM / 128GB SSD', 'lenovo-thinkstation-s20-e5640');

  // #160 — "Platinium" -> "Platinum".
  {
    const a = JSON.parse(get.get(160).attributes || '{}');
    a.CPU = '2 x Platinum 8160';
    setFields(160, { attributes: JSON.stringify(a) });
    rename(160, 'Dell Precision 7820 - 2 x Platinum 8160 / 32GB RAM / 256GB SSD');
  }

  // #95 / #96 — misspelled "Optiplex" in the display name (slugs were already right).
  rename(95, 'Dell Optiplex 5050 - i5-7500 / 8GB RAM / 256GB SSD');
  rename(96, 'Dell Optiplex 3050 - i3-7100 / 8GB RAM / 256GB SSD');

  // Fujitsu "Celcius" -> "Celsius", in names and slugs alike.
  const CELSIUS_SLUG = {
    133: 'fujitsu-celsius-m470',
    134: 'fujitsu-celsius-m720',
    137: 'fujitsu-celsius-w280',
    138: 'fujitsu-celsius-w370',
    139: 'fujitsu-celsius-w370-2',
    140: 'fujitsu-celsius-w380',
    144: 'fujitsu-celsius-w550',
    145: 'fujitsu-celsius-j550n',
    273: 'fujitsu-celsius-c740',
  };
  for (const [id, slug] of Object.entries(CELSIUS_SLUG)) {
    const row = get.get(Number(id));
    if (row) rename(Number(id), normSizes(row.name.replace(/Celcius/g, 'Celsius')), slug);
  }

  // The three R570s used three different naming styles and a leftover "-2"
  // dedupe suffix. Unify on "Fujitsu Celsius R570" + a CPU-qualified slug,
  // matching the newer house convention (cf. hp-z2-g5-i7-10700).
  rename(135, 'Fujitsu Celsius R570 - E5645 / 24GB RAM / 128GB SSD',    'fujitsu-celsius-r570-e5645');
  rename(136, 'Fujitsu Celsius R570 - 2 x E5620 / 4GB RAM / 128GB SSD', 'fujitsu-celsius-r570-2x-e5620');
  rename(146, 'Fujitsu Celsius R570 - E5640 / 8GB RAM / 128GB SSD',     'fujitsu-celsius-r570-e5640');

  // #613 — the 2019 15-inch MacBook Pro shipped 256GB, not 250GB.
  {
    const a = JSON.parse(get.get(613).attributes || '{}');
    a.SSD = '256GB';
    setFields(613, { attributes: JSON.stringify(a) });
    rename(613, 'Apple MacBook Pro 15" 2019 - i7-9750H / 16GB RAM / 256GB SSD / Radeon Pro');
  }

  // ── B. catalog-wide size formatting ────────────────────────────────────────
  note('\nB. RAM/SSD formatting normalisation');
  let touched = 0;
  for (const row of db.prepare('SELECT id, name, short_description, attributes FROM products').all()) {
    const fields = {};

    const newName = normSizes(row.name);
    if (newName !== row.name) fields.name = newName;

    const newShort = normSizes(row.short_description);
    if (newShort !== row.short_description) fields.short_description = newShort;

    let attrs;
    try { attrs = JSON.parse(row.attributes || '{}'); } catch { attrs = null; }
    if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
      let dirty = false;
      for (const key of ['RAM', 'SSD', 'HDD']) {
        const v = attrs[key];
        if (typeof v !== 'string') continue;
        // A bare number in a RAM/SSD field means gigabytes.
        const nv = normSizes(/^\d+$/.test(v.trim()) ? `${v.trim()}GB` : v, { bareValue: true });
        if (nv !== v) { attrs[key] = nv; dirty = true; }
      }
      if (dirty) fields.attributes = JSON.stringify(attrs);
    }

    if (Object.keys(fields).length) { setFields(row.id, fields); touched++; }
  }
  note(`  (${touched} products touched)`);

  // Free-text spec strings that the generic rule above deliberately leaves
  // alone, asserted here per product. Each pattern matches both the correct and
  // the incorrect spelling, so this converges on the same text whether or not
  // the DB was already touched by an earlier revision of this script.
  note('\nB2. Interface speeds & capacity spacing in prose');
  const TEXT_FIXES = [
    // Gigabit, not gigabyte — network and SAS/SATA link speeds.
    [353, 'short_description', /10G[bB]\/40G[bB]/g,   '10Gb/40Gb'],
    [354, 'short_description', /40G[bB](\s+QSFP)/g,   '40Gb$1'],
    [355, 'short_description', /10G[bB](\s+SFP)/g,    '10Gb$1'],
    [358, 'short_description', /6G[bB](\/s)/g,        '6Gb$1'],
    [480, 'name',              /6G[bB](\/s)/g,        '6Gb$1'],
    [480, 'short_description', /6G[bB](\/s)/g,        '6Gb$1'],
    [557, 'short_description', /12\s*G[bB](\/s)/g,    '12Gb$1'],
    // "U.2" is a connector, not a 2GB capacity.
    [493, 'name',              /U\.2(?:GB)?(\s+SSD)/g, 'U.2$1'],
    // Genuine capacities written with a stray space.
    [308, 'name',              /2\.5\s*GB/g,          '2.5GB'],
    [308, 'short_description', /2\.5\s*GB/g,          '2.5GB'],
    [398, 'short_description', /(\d+)\s+GB\b/g,       '$1GB'],
    [525, 'short_description', /(\d+)\s+GB\b/g,       '$1GB'],
    [526, 'short_description', /(\d+)\s+GB\b/g,       '$1GB'],
    [527, 'short_description', /(\d+)\s+GB\b/g,       '$1GB'],
    [528, 'short_description', /(\d+)\s+GB\b/g,       '$1GB'],
  ];
  for (const [id, field, pattern, replacement] of TEXT_FIXES) {
    const row = get.get(id);
    if (!row) { note(`  ! #${id} missing — skipped`); continue; }
    const fixed = (row[field] || '').replace(pattern, replacement);
    if (fixed !== row[field]) setFields(id, { [field]: fixed });
  }

  // ── C. category corrections ────────────────────────────────────────────────
  note('\nC. Category corrections');
  const CAT = { WORKSTATION: 10, PC: 16, GAMING: 7 };
  setFields(99,  { category_id: CAT.WORKSTATION }); // Precision 3420 is a workstation
  setFields(182, { category_id: CAT.PC });          // ThinkCentre E20 is a business desktop
  setFields(8,   { category_id: CAT.GAMING });      // PC Gaming Assembluar (GTX 660)
  setFields(106, { category_id: CAT.GAMING });      // Cooler Master Assembluar (GT 710)

  // ── D. duplicate removal ───────────────────────────────────────────────────
  note('\nD. Duplicate listings removed');
  // #151 duplicates #147 (identical Precision 3620 i7-6700/16GB/256GB/K620).
  // #4 duplicates #3 — "Celeron N3161" is a typo, no such CPU exists.
  for (const [dupId, keepSlug] of [[151, 'dell-precision-3620'], [4, 'zotac-mini-pc-2']]) {
    const row = get.get(dupId);
    if (!row) { note(`  #${dupId} already removed`); continue; }
    db.prepare('DELETE FROM products WHERE id = ?').run(dupId);
    note(`  deleted #${dupId} ${row.slug} ("${row.name}") -> 301 to /product/${keepSlug}`);
  }

  // ── E. price corrections ───────────────────────────────────────────────────
  note('\nE. Prices');
  // Two Z8 G4s, same RAM/SSD/GPU; #211 has the weaker CPU yet cost 25,000 more.
  setFields(211, { price: 165000 });
  // Optiplex 5070 Tower levelled up to the 7070 price — same i7-9700 config.
  setFields(620, { price: 33000 });

  // ── F. stock ───────────────────────────────────────────────────────────────
  note('\nF. Stock');
  setFields(365, { in_stock: 1 }); // Lenovo ThinkPad T14s back in stock

  db.prepare("UPDATE products SET updated_at = datetime('now') WHERE id IN (164,181,183,160,95,96,135,136,146,613,99,182,8,106,211,620,365)").run();
});

run();
db.close();
console.log('\nDone.');
