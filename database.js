import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs';
import { FACET_DEFS, FACET_GROUPS, groupForCategory, facetValue, facetParams } from './facets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'products.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL UNIQUE,
    parent_id  INTEGER REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT NOT NULL,
    slug              TEXT NOT NULL UNIQUE,
    short_description TEXT DEFAULT '',
    description       TEXT DEFAULT '',
    price             REAL NOT NULL,
    sale_price        REAL,
    category_id       INTEGER REFERENCES categories(id),
    images            TEXT DEFAULT '[]',
    attributes        TEXT DEFAULT '{}',
    badge             TEXT,
    featured          INTEGER DEFAULT 0,
    in_stock          INTEGER DEFAULT 1,
    created_at        TEXT DEFAULT (datetime('now')),
    updated_at        TEXT DEFAULT (datetime('now'))
  );
`);

// ── Migration: add brand column if missing ───────────────────────────────────
try {
  db.exec(`ALTER TABLE products ADD COLUMN brand TEXT DEFAULT ''`);
} catch {
  // column already exists
}

// ── Migration: add view_count column if missing ──────────────────────────────
try {
  db.exec(`ALTER TABLE products ADD COLUMN view_count INTEGER DEFAULT 0`);
} catch {
  // column already exists
}

// ── Migration: add sku column if missing ─────────────────────────────────────
try {
  db.exec(`ALTER TABLE products ADD COLUMN sku TEXT DEFAULT ''`);
} catch {
  // column already exists
}

// ── Migration: add hidden column if missing ──────────────────────────────────
// hidden = 1 keeps the row (and its view count / history) in the DB but takes
// the product off the site completely: it is absent from listings, search,
// filters and the sitemap, and /product/<slug> 404s. That is deliberately
// stronger than in_stock = 0, which still shows the product, marked "Pa stok".
try {
  db.exec(`ALTER TABLE products ADD COLUMN hidden INTEGER DEFAULT 0`);
} catch {
  // column already exists
}

// ── View counts: persisted to a sidecar file so they survive a DB swap ───────
// Live view counts are mirrored (keyed by slug) into view-counts.json, which is
// git-ignored and NOT part of products.db. So replacing products.db — e.g.
// pasting in a locally-edited copy — never wipes the counts: on startup we fold
// the saved counts back into whatever products.db is present, keeping the higher
// of the two so a count is never lowered. Just paste the DB and restart.
const viewCountsFile = path.join(__dirname, 'view-counts.json');

function restoreViewCounts() {
  if (!existsSync(viewCountsFile)) return;
  let saved;
  try {
    saved = JSON.parse(readFileSync(viewCountsFile, 'utf8'));
  } catch {
    return; // missing/corrupt — ignore; it gets rewritten on the next snapshot
  }
  const stmt = db.prepare(
    'UPDATE products SET view_count = MAX(COALESCE(view_count, 0), ?) WHERE slug = ?'
  );
  const apply = db.transaction((entries) => {
    for (const [slug, count] of entries) stmt.run(Number(count) || 0, slug);
  });
  apply(Object.entries(saved));
}

function persistViewCounts() {
  const rows = db.prepare('SELECT slug, view_count FROM products').all();
  const out = {};
  for (const r of rows) out[r.slug] = r.view_count || 0;
  const tmp = viewCountsFile + '.tmp';
  writeFileSync(tmp, JSON.stringify(out));
  renameSync(tmp, viewCountsFile); // atomic replace, never a half-written file
}

// Debounce: an increment schedules one snapshot a few seconds later, so a burst
// of views is a single file write rather than one write per request.
let persistTimer = null;
function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try { persistViewCounts(); } catch { /* non-critical */ }
  }, 5000);
  if (persistTimer.unref) persistTimer.unref(); // don't keep the process alive
}

// Flush on shutdown so the last few views aren't lost. SIGINT/SIGTERM (Passenger
// stop, Ctrl+C) exit explicitly, which fires the 'exit' handler.
process.once('exit', () => { try { persistViewCounts(); } catch { /* ignore */ } });
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.once(sig, () => process.exit(0));
}

restoreViewCounts();

// ── Migration: add laptop subcategories if missing ───────────────────────────
{
  const laptopCat = db.prepare("SELECT id FROM categories WHERE slug = 'laptop'").get();
  if (laptopCat) {
    const insertSub = db.prepare(
      'INSERT OR IGNORE INTO categories (name, slug, parent_id, sort_order) VALUES (?, ?, ?, ?)'
    );
    insertSub.run('Business Laptops', 'business-laptops', laptopCat.id, 1);
    insertSub.run('Workstation Laptops', 'workstation-laptops', laptopCat.id, 2);
  }
}

// ── Migration: add Komponente subcategories if missing ───────────────────────
{
  const komponenteCat = db.prepare("SELECT id FROM categories WHERE slug = 'komponente'").get();
  if (komponenteCat) {
    const insertSub = db.prepare(
      'INSERT OR IGNORE INTO categories (name, slug, parent_id, sort_order) VALUES (?, ?, ?, ?)'
    );
    insertSub.run('Caddy', 'caddy', komponenteCat.id, 0);
    insertSub.run('Karta Rrjeti', 'karta-rrjeti', komponenteCat.id, 0);
    insertSub.run('RAID Controller', 'raid-controller', komponenteCat.id, 0);
    insertSub.run('Docking Station', 'docking-station', komponenteCat.id, 0);
    insertSub.run('Procesor', 'procesor', komponenteCat.id, 0);
  }
}

// ── Migration: Aksesorë top-level category ───────────────────────────────────
// Home for peripherals (mice, keyboards, cables). Komponente is reserved for
// parts that go *inside* a machine, so accessories get their own top level.
db.prepare(
  "INSERT OR IGNORE INTO categories (name, slug, parent_id, sort_order) VALUES ('Aksesorë', 'aksesore', NULL, 10)"
).run();

// ── Migration: Printerë top-level category ───────────────────────────────────
// Office printers and multifunction devices (laser, MFP, receipt printers).
db.prepare(
  "INSERT OR IGNORE INTO categories (name, slug, parent_id, sort_order) VALUES ('Printerë', 'printere', NULL, 11)"
).run();

// ── Newsletter subscribers ───────────────────────────────────────────────────
// The footer "Abonohu" form stores addresses here; the admin downloads them as
// CSV from /api/admin/newsletter.csv. One row per address (re-subscribing is a
// no-op), with the page it came from.
db.exec(`
  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    source     TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ── Migration: Server is a top-level category (was nested under Networking) ──
{
  const serverCat = db.prepare("SELECT id, parent_id FROM categories WHERE slug = 'server'").get();
  if (serverCat && serverCat.parent_id !== null) {
    db.prepare("UPDATE categories SET parent_id = NULL, sort_order = 4 WHERE slug = 'server'").run();
  }
}

// ── Migration: SAS under Komponente, with HDD/SSD/NVMe subcategories ──────────
{
  const komponenteCat = db.prepare("SELECT id FROM categories WHERE slug = 'komponente'").get();
  if (komponenteCat) {
    db.prepare(
      "INSERT OR IGNORE INTO categories (name, slug, parent_id, sort_order) VALUES ('SAS', 'sas', ?, 5)"
    ).run(komponenteCat.id);
    const sasCat = db.prepare("SELECT id, parent_id FROM categories WHERE slug = 'sas'").get();
    if (sasCat) {
      // Nest SAS under Komponente (it may previously have been a top-level category)
      if (sasCat.parent_id !== komponenteCat.id) {
        db.prepare("UPDATE categories SET parent_id = ?, sort_order = 5 WHERE slug = 'sas'")
          .run(komponenteCat.id);
      }
      const insertSub = db.prepare(
        'INSERT OR IGNORE INTO categories (name, slug, parent_id, sort_order) VALUES (?, ?, ?, ?)'
      );
      insertSub.run('SAS HDD', 'sas-hdd', sasCat.id, 1);
      insertSub.run('SAS SSD', 'sas-ssd', sasCat.id, 2);
      insertSub.run('SAS NVMe', 'sas-nvme', sasCat.id, 3);
    }
  }
}

// ── Seed default categories (only if empty) ──────────────────────────────────

const catCount = db.prepare('SELECT COUNT(*) as n FROM categories').get().n;
if (catCount === 0) {
  const insertCat = db.prepare(
    'INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, ?)'
  );
  const cats = [
    ['Laptop', 'laptope', 1],
    ['Desktop', 'desktop', 2],
    ['Monitor', 'monitore', 3],
    ['Rrjet', 'rrjet', 6],
    ['Gaming', 'gaming', 7],
    ['Licenses', 'licenses', 8],
  ];
  for (const [name, slug, sort_order] of cats) insertCat.run(name, slug, sort_order);
}

// ── Query helpers ────────────────────────────────────────────────────────────

function parseProduct(row) {
  if (!row) return null;
  return {
    ...row,
    images: JSON.parse(row.images || '[]'),
    attributes: JSON.parse(row.attributes || '{}'),
    featured: row.featured === 1,
    in_stock: row.in_stock === 1,
    hidden: row.hidden === 1,
    sale_price: row.sale_price ?? null,
  };
}

// SQL fragment: matches a product whose category is `:catId` or any descendant
// of it, at any depth — so a parent-category filter includes nested subcategories
// (e.g. Komponente → SAS → SAS HDD).
const CATEGORY_SUBTREE = `p.category_id IN (
    WITH RECURSIVE subtree(id) AS (
      SELECT :catId
      UNION ALL
      SELECT c.id FROM categories c JOIN subtree ON c.parent_id = subtree.id
    )
    SELECT id FROM subtree
  )`;

// SQL fragment: only products that are live on the storefront. Every public
// query carries it; the admin list (getAllProductsAdmin) deliberately does not,
// so a hidden product stays editable and can be put back.
const VISIBLE_ONLY = 'COALESCE(p.hidden, 0) = 0';

export function getFormFactors({ category, brand } = {}) {
  const conditions = [VISIBLE_ONLY, "json_extract(p.attributes, '$.Form Factor') IS NOT NULL"];
  const params = {};

  if (category) {
    const cat = db.prepare('SELECT id FROM categories WHERE slug = ?').get(category);
    if (cat) {
      conditions.push(CATEGORY_SUBTREE);
      params.catId = cat.id;
    }
  }
  if (brand) { conditions.push('LOWER(p.brand) = LOWER(:brand)'); params.brand = brand; }

  return db.prepare(`
    SELECT DISTINCT json_extract(p.attributes, '$.Form Factor') as form_factor
    FROM products p
    WHERE ${conditions.join(' AND ')}
    ORDER BY form_factor ASC
  `).all(params).map(r => r.form_factor);
}

export function getBrands({ category } = {}) {
  const conditions = [VISIBLE_ONLY, "p.brand IS NOT NULL AND p.brand != ''"];
  const params = {};

  if (category) {
    const cat = db.prepare('SELECT id FROM categories WHERE slug = ?').get(category);
    if (cat) {
      conditions.push(CATEGORY_SUBTREE);
      params.catId = cat.id;
    }
  }

  return db.prepare(`
    SELECT DISTINCT p.brand FROM products p
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.brand ASC
  `).all(params).map(r => r.brand);
}

// ── Smart product search ─────────────────────────────────────────────────────
// Expand a free-text query into tokens that combine CPU family + generation
// phrases (e.g. "i5 gen9" or "i5 9th gen" → "i5-9", matching CPU "i5-9400").
function expandSearchTokens(q) {
  let s = String(q || '').toLowerCase().trim();
  if (!s) return [];
  // Normalize generation phrases to canonical "genN".
  s = s.replace(/(\d+)\s*(?:st|nd|rd|th)\s*gen(?:eration)?\b/g, 'gen$1');
  s = s.replace(/\bgen(?:eration)?\s*(\d+)/g, 'gen$1');

  const tokens = s.split(/[\s,;/]+/).filter(t => t.length >= 2);

  // Combine i{3,5,7,9} + genN  →  i{x}-{n}  (e.g. "i5-9" matches CPU "i5-9400")
  const familyRe = /^i([3579])$/;
  const genRe = /^gen(\d+)$/;
  const fam = tokens.find(t => familyRe.test(t));
  const gen = tokens.find(t => genRe.test(t));
  if (fam && gen) {
    const fx = familyRe.exec(fam)[1];
    const gn = genRe.exec(gen)[1];
    return tokens.filter(t => t !== fam && t !== gen).concat(`i${fx}-${gn}`);
  }
  return tokens;
}

const categoryMatchStmt = db.prepare(`
  WITH RECURSIVE subtree(id) AS (
    SELECT id FROM categories WHERE LOWER(name) LIKE ? OR LOWER(slug) LIKE ?
    UNION ALL
    SELECT c.id FROM categories c JOIN subtree s ON c.parent_id = s.id
  )
  SELECT DISTINCT id FROM subtree
`);

// Text with separators turned into spaces and a leading space, so
// `LIKE '% tok%'` matches a token only at the start of a word ("pc" finds
// "Terra PC" and "PC Gaming", not "PCIe" buried in a description).
const wordText = col =>
  `(' ' || replace(replace(replace(replace(replace(replace(replace(replace(COALESCE(${col}, ''), '/', ' '), '(', ' '), ')', ' '), '-', ' '), ',', ' '), '"', ' '), ':', ' '), ';', ' ') || ' ')`;
const normToken = tok => tok.replace(/[-/(),":;]+/g, ' ').trim();

function buildProductSearch(q) {
  const tokens = expandSearchTokens(q);
  const clauses = [];
  const scoreParts = [];
  const params = {};
  tokens.forEach((tok, i) => {
    const key = `_sq${i}`;
    const wkey = `_sw${i}`;
    params[key] = `%${tok}%`;
    // Two-letter tokens must be whole words ("pc" ≠ "PCIe"); longer ones may
    // start a word ("think" → "ThinkPad").
    params[wkey] = tok.length <= 2 ? `% ${normToken(tok)} %` : `% ${normToken(tok)}%`;
    const catIds = categoryMatchStmt.all(`%${tok}%`, `%${tok}%`).map(r => r.id);
    const catInList = catIds.length ? `p.category_id IN (${catIds.join(',')})` : null;
    const catClause = catInList ? ` OR ${catInList}` : '';
    // Short tokens ("pc", "hp") only match at a word start everywhere; longer
    // ones may match inside names, SKUs, brands and specs, but descriptions
    // always need a word start, so prose doesn't drag in unrelated products.
    const short = tok.length <= 2;
    const inName = short ? `${wordText('p.name')} LIKE :${wkey}` : `p.name LIKE :${key}`;
    const inSku = short ? `${wordText('p.sku')} LIKE :${wkey}` : `p.sku LIKE :${key}`;
    const inBrand = short ? `${wordText('p.brand')} LIKE :${wkey}` : `p.brand LIKE :${key}`;
    const inAttrs = short ? `${wordText('p.attributes')} LIKE :${wkey}` : `p.attributes LIKE :${key}`;
    const inShort = `${wordText('p.short_description')} LIKE :${wkey}`;
    const inDesc = `${wordText('p.description')} LIKE :${wkey}`;
    clauses.push(`(${inName} OR ${inSku} OR ${inShort} OR ${inDesc} OR ${inBrand} OR ${inAttrs}${catClause})`);
    // Per-token relevance: a name hit at a word start counts most, then SKU and
    // category, brand, specs; prose mentions count least. Name and category
    // lead so "laptop" surfaces actual laptops ahead of docks that mention one.
    scoreParts.push(
      `(CASE WHEN ${wordText('p.name')} LIKE :${wkey} THEN 8 WHEN ${inName} THEN 4 ELSE 0 END)`,
      `(CASE WHEN ${inSku} THEN 6 ELSE 0 END)`,
      catInList ? `(CASE WHEN ${catInList} THEN 5 ELSE 0 END)` : '0',
      `(CASE WHEN ${inBrand} THEN 3 ELSE 0 END)`,
      `(CASE WHEN ${inAttrs} THEN 2 ELSE 0 END)`,
      `(CASE WHEN ${inShort} THEN 1 ELSE 0 END)`,
      `(CASE WHEN ${inDesc} THEN 1 ELSE 0 END)`,
    );
  });
  // The whole query as a phrase inside the name ("z4 g4", "monitor arm").
  if (tokens.length > 1) {
    params._sphrase = `%${String(q).trim().replace(/\s+/g, ' ')}%`;
    scoreParts.push(`(CASE WHEN p.name LIKE :_sphrase THEN 10 ELSE 0 END)`);
  }
  const score = scoreParts.length ? scoreParts.join(' + ') : '0';
  return { clauses, params, score };
}

// ── Typo tolerance ───────────────────────────────────────────────────────────
// When a search finds nothing, each unknown word is swapped for the closest
// word in the catalogue (product names, brands, categories) within an edit
// distance of 1 (2 for words of 7+ letters): "pavillion" → "pavilion",
// "lenvo" → "lenovo". The vocabulary is rebuilt at most once a minute.
let vocabCache = { at: 0, words: [] };
function catalogueWords() {
  if (Date.now() - vocabCache.at < 60_000) return vocabCache.words;
  const rows = db.prepare(`
    SELECT p.name AS t FROM products p WHERE ${VISIBLE_ONLY}
    UNION ALL SELECT p.brand FROM products p WHERE ${VISIBLE_ONLY}
    UNION ALL SELECT name FROM categories
  `).all();
  const set = new Set();
  for (const r of rows) {
    for (const w of String(r.t || '').toLowerCase().split(/[^a-z0-9ëç]+/)) if (w.length >= 3) set.add(w);
  }
  vocabCache = { at: Date.now(), words: [...set] };
  return vocabCache.words;
}

function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

export function correctSearch(q) {
  const words = catalogueWords();
  const known = new Set(words);
  let changed = false;
  const out = String(q || '').split(/\s+/).filter(Boolean).map(w => {
    const lw = w.toLowerCase();
    if (lw.length < 4 || /\d/.test(lw) || known.has(lw) || words.some(v => v.startsWith(lw))) return w;
    const max = lw.length >= 7 ? 2 : 1;
    let best = null, bestD = max + 1;
    for (const v of words) {
      const d = editDistance(lw, v, max);
      if (d < bestD) { best = v; bestD = d; if (d === 1 && max === 1) break; }
    }
    if (best) { changed = true; return best; }
    return w;
  });
  return changed ? out.join(' ') : null;
}

// Switch-only filter expressions. Switch products store networking specs as
// free-text in `attributes` JSON (Ports / SFP / Uplink / Layer / PoE / PoE Budget),
// so each filter pattern-matches those fields. Keep these in sync with the
// sidebar in shop.html.
const SWITCH_PORTS_SQL = "json_extract(p.attributes, '$.Ports') LIKE :sw_ports_pat";
const SWITCH_SPEED_SQL = {
  fast: "json_extract(p.attributes, '$.Ports') LIKE '%10/100 %'"
        + " AND json_extract(p.attributes, '$.Ports') NOT LIKE '%10/100/1000%'",
  gigabit: "json_extract(p.attributes, '$.Ports') LIKE '%10/100/1000%'",
  '10g': "(json_extract(p.attributes, '$.Ports') LIKE '%10G%'"
         + " OR json_extract(p.attributes, '$.Ports') LIKE '%SFP+%')",
};
const SWITCH_UPLINK_SQL = {
  // No SFP/Uplink attribute at all → access-only switch.
  none: "json_extract(p.attributes, '$.SFP') IS NULL"
        + " AND json_extract(p.attributes, '$.Uplink') IS NULL",
  '1g': "((json_extract(p.attributes, '$.SFP') LIKE '%SFP (1G)%' OR json_extract(p.attributes, '$.SFP') LIKE '%Gigabit%')"
        + " OR (json_extract(p.attributes, '$.Uplink') LIKE '%SFP (1G)%' OR json_extract(p.attributes, '$.Uplink') LIKE '%Gigabit%'))",
  '10g': "(json_extract(p.attributes, '$.SFP') LIKE '%SFP+%'"
         + " OR json_extract(p.attributes, '$.Uplink') LIKE '%SFP+%'"
         + " OR json_extract(p.attributes, '$.Uplink') LIKE '%10G%'"
         + " OR json_extract(p.attributes, '$.Uplink') LIKE '%X2%')",
  '40g': "(json_extract(p.attributes, '$.SFP') LIKE '%QSFP+%'"
         + " OR json_extract(p.attributes, '$.Uplink') LIKE '%QSFP+%'"
         + " OR json_extract(p.attributes, '$.Uplink') LIKE '%40G%')",
};
const SWITCH_LAYER_SQL = {
  l2: "json_extract(p.attributes, '$.Layer') NOT LIKE '%Layer 3%'",
  l3: "json_extract(p.attributes, '$.Layer') LIKE '%Layer 3%'",
};
const SWITCH_POE_SQL = {
  // No PoE if Ports mentions no PoE *and* (PoE field is explicitly "Jo"/"No" or no PoE field at all).
  none: "json_extract(p.attributes, '$.Ports') NOT LIKE '%PoE%'"
        + " AND (json_extract(p.attributes, '$.PoE') IN ('Jo', 'No') OR json_extract(p.attributes, '$.PoE') IS NULL)"
        + " AND json_extract(p.attributes, '$.PoE Budget') IS NULL",
  poe: "(json_extract(p.attributes, '$.Ports') LIKE '% PoE %' AND json_extract(p.attributes, '$.Ports') NOT LIKE '%PoE+%')"
       + " OR (json_extract(p.attributes, '$.PoE Budget') LIKE '%802.3af%' AND json_extract(p.attributes, '$.PoE Budget') NOT LIKE '%802.3at%')",
  poe_plus: "json_extract(p.attributes, '$.Ports') LIKE '%PoE+%'"
            + " OR json_extract(p.attributes, '$.PoE Budget') LIKE '%802.3at%'",
};

// CPU-only filters — for the PC / Desktop / AIO categories. Products store the
// processor in `attributes.CPU` as Intel Core strings ("i5-8500", "i5-9500T",
// "i5-10500", "i5 Gen 6"). Family matches the leading `iN`; generation matches
// the model-number prefix. Every Core model carries exactly three trailing
// digits after the generation, so one pattern (`i_-{gen}___%`) covers both
// single-digit gens (i5-8500 → 8) and two-digit gens (i5-10500 → 10); the
// trailing `%` absorbs suffix letters (T/K/U/…). The explicit "Gen N" wording
// is matched too. Keep these in sync with the sidebar in shop.html.
const CPU_FAMILY_SQL = {
  i3: "json_extract(p.attributes, '$.CPU') LIKE 'i3%'",
  i5: "json_extract(p.attributes, '$.CPU') LIKE 'i5%'",
  i7: "json_extract(p.attributes, '$.CPU') LIKE 'i7%'",
  i9: "json_extract(p.attributes, '$.CPU') LIKE 'i9%'",
};

function cpuGenSQL(gen) {
  const g = String(gen);
  if (!/^\d{1,2}$/.test(g)) return null; // digits only — safe to interpolate
  const cpu = "json_extract(p.attributes, '$.CPU')";
  return `(${cpu} LIKE 'i_-${g}___%' OR ${cpu} LIKE '%Gen ${g}%' OR ${cpu} LIKE '%Gen${g}%')`;
}

// Product ids whose attributes match every selected spec filter (f_<id>).
// Returns null when no spec filter is set.
function idsMatchingFacets(selected) {
  const ids = Object.keys(selected);
  if (!ids.length) return null;
  const rows = db.prepare(`SELECT id, attributes FROM products p WHERE ${VISIBLE_ONLY}`).all();
  const out = [];
  for (const r of rows) {
    let a = {};
    try { a = JSON.parse(r.attributes || '{}'); } catch { /* ignore */ }
    if (ids.every(id => facetValue(id, a) === selected[id])) out.push(r.id);
  }
  return out;
}

export function getProducts(query = {}) {
  const result = queryProducts(query);
  const search = String(query.search || '').trim();
  if (result.total > 0 || !search || query._retry) return result;
  // Nothing found: try the typo-corrected query, then the words that match.
  const corrected = correctSearch(search);
  if (corrected) {
    const r = queryProducts({ ...query, search: corrected, _retry: true });
    if (r.total > 0) return { ...r, corrected_query: corrected };
  }
  const words = search.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const matching = words.filter(w => queryProducts({ search: w, per_page: 1, _retry: true }).total > 0);
    if (matching.length && matching.length < words.length) {
      const partial = matching.join(' ');
      const r = queryProducts({ ...query, search: partial, _retry: true });
      if (r.total > 0) return { ...r, corrected_query: partial };
    }
  }
  return result;
}

// SQL conditions for a shop query. `omit` leaves out dimensions the caller
// handles itself (the facet counter does category / brand / form factor and
// spec filters in JS, so each list can count "everything but itself").
function buildConditions({ category, brand, form_factor, min_price, max_price, search, featured, sale, sw_ports, sw_uplink, sw_speed, sw_layer, sw_poe, cpu_family, cpu_gen, ...rest } = {}, omit = new Set()) {
  // Split filters: "base" (non-price) drives the slider range; price-bounds
  // narrow the visible products on top of that.
  const baseConditions = [VISIBLE_ONLY];
  const baseParams = {};

  if (category && !omit.has('category')) {
    const cat = db.prepare('SELECT id FROM categories WHERE slug = ?').get(category);
    if (cat) {
      // Include products from this category AND all subcategories (any depth)
      baseConditions.push(CATEGORY_SUBTREE);
      baseParams.catId = cat.id;
    }
  }
  if (brand && !omit.has('brand')) { baseConditions.push('LOWER(p.brand) = LOWER(:brand)'); baseParams.brand = brand; }
  if (form_factor && !omit.has('form_factor')) { baseConditions.push("json_extract(p.attributes, '$.Form Factor') = :form_factor"); baseParams.form_factor = form_factor; }
  let searchScore = null;
  if (search) {
    const { clauses: searchClauses, params: searchParams, score } = buildProductSearch(search);
    if (searchClauses.length) {
      baseConditions.push(...searchClauses);
      Object.assign(baseParams, searchParams);
      searchScore = score;
    }
  }
  const facetIds = omit.has('facets') ? null : idsMatchingFacets(facetParams(rest));
  if (facetIds) baseConditions.push(facetIds.length ? `p.id IN (${facetIds.join(',')})` : '0');
  if (featured === '1' || featured === true) { baseConditions.push('p.featured = 1'); }
  if (sale === '1') { baseConditions.push('p.sale_price IS NOT NULL AND p.sale_price > 0'); }

  // Switch-only filters — only meaningful inside the `switch` category (or its
  // subtree); if applied outside, they simply narrow the result set further.
  if (sw_ports && /^\d+$/.test(String(sw_ports))) {
    baseConditions.push(SWITCH_PORTS_SQL);
    baseParams.sw_ports_pat = `${sw_ports}x %`;
  }
  if (sw_speed && SWITCH_SPEED_SQL[sw_speed]) {
    baseConditions.push(SWITCH_SPEED_SQL[sw_speed]);
  }
  if (sw_uplink && SWITCH_UPLINK_SQL[sw_uplink]) {
    baseConditions.push(SWITCH_UPLINK_SQL[sw_uplink]);
  }
  if (sw_layer && SWITCH_LAYER_SQL[sw_layer]) {
    baseConditions.push(SWITCH_LAYER_SQL[sw_layer]);
  }
  if (sw_poe && SWITCH_POE_SQL[sw_poe]) {
    baseConditions.push(`(${SWITCH_POE_SQL[sw_poe]})`);
  }

  // CPU-only filters — meaningful inside the PC / Desktop / AIO categories; if
  // applied elsewhere they simply narrow the result set further.
  if (cpu_family && CPU_FAMILY_SQL[cpu_family]) {
    baseConditions.push(CPU_FAMILY_SQL[cpu_family]);
  }
  if (cpu_gen) {
    const genSql = cpuGenSQL(cpu_gen);
    if (genSql) baseConditions.push(genSql);
  }

  const priceConditions = [];
  const priceParams = {};
  if (min_price) { priceConditions.push('COALESCE(NULLIF(p.sale_price, 0), p.price) >= :min_price'); priceParams.min_price = Number(min_price); }
  if (max_price) { priceConditions.push('COALESCE(NULLIF(p.sale_price, 0), p.price) <= :max_price'); priceParams.max_price = Number(max_price); }

  return { baseConditions, baseParams, priceConditions, priceParams, searchScore };
}

function queryProducts(query = {}) {
  const { orderby, page, per_page } = query;
  const { baseConditions, baseParams, priceConditions, priceParams, searchScore } = buildConditions(query);

  const allConditions = [...baseConditions, ...priceConditions];
  const allParams = { ...baseParams, ...priceParams };
  const where = allConditions.length ? 'WHERE ' + allConditions.join(' AND ') : '';
  const baseWhere = baseConditions.length ? 'WHERE ' + baseConditions.join(' AND ') : '';

  // Price sorts are strictly by price ("price on request" rows last), so a
  // featured product never breaks the order. With a search, the default sort
  // is relevance: best match first, featured and newest as tie-breakers.
  const effPrice = 'COALESCE(NULLIF(p.sale_price, 0), p.price)';
  const orderMap = {
    price_asc: `(${effPrice} <= 0) ASC, ${effPrice} ASC`,
    price_desc: `(${effPrice} <= 0) ASC, ${effPrice} DESC`,
    newest: 'p.featured DESC, p.created_at DESC',
    featured: 'p.featured DESC, p.created_at DESC',
    popularity: 'p.featured DESC, p.view_count DESC, p.created_at DESC',
    // Pure page-view order (in-stock first) for the home page's "most viewed" row.
    views: 'p.in_stock DESC, p.view_count DESC, p.created_at DESC',
  };
  const useRelevance = searchScore && (!orderby || orderby === 'newest' || orderby === 'relevance');
  const order = useRelevance
    ? `(${searchScore}) DESC, p.featured DESC, p.created_at DESC`
    : (orderMap[orderby] || 'p.featured DESC, p.created_at DESC');

  const limit = Math.min(Number(per_page) || 12, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const total = db.prepare(`SELECT COUNT(*) as n FROM products p ${where}`).get(allParams).n;

  const rows = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${where}
    ORDER BY ${order}
    LIMIT :limit OFFSET :offset
  `).all({ ...allParams, limit, offset });

  // Max price across products matching the non-price filters — used by the
  // sidebar to size the price slider so the track always ends near a real
  // product price instead of a hard-coded ceiling.
  const priceMaxRow = db.prepare(`
    SELECT MAX(COALESCE(NULLIF(p.sale_price, 0), p.price)) AS price_max
    FROM products p ${baseWhere}
  `).get(baseParams);

  return {
    products: rows.map(parseProduct),
    total,
    pages: Math.ceil(total / limit),
    page: Math.max(Number(page) || 1, 1),
    price_max: priceMaxRow?.price_max || 0,
  };
}

// ── Shop sidebar facets ──────────────────────────────────────────────────────
// Everything the sidebar lists for the current query, with counts: categories,
// brands, form factors and the spec filters of the product family in view.
// Each list counts the products matching every *other* active filter, so a
// visitor sees exactly what each choice would leave. The family ("group") is
// the selected category's; with no category, it is inferred when at least 75%
// of the matches belong to one family (a "pc" search → computer filters).
export function getProductFacets(query = {}) {
  const omit = new Set(['category', 'brand', 'form_factor', 'facets']);
  const { baseConditions, baseParams, priceConditions, priceParams } = buildConditions(query, omit);
  const where = [...baseConditions, ...priceConditions].join(' AND ');
  const rows = db.prepare(`
    SELECT p.id, p.category_id, p.brand, p.attributes FROM products p WHERE ${where}
  `).all({ ...baseParams, ...priceParams });

  const cats = db.prepare('SELECT id, slug, parent_id FROM categories').all();
  const byId = new Map(cats.map(c => [c.id, c]));
  const ancestors = id => { const out = []; let c = byId.get(id); while (c) { out.push(c); c = byId.get(c.parent_id); } return out; };
  const slugOf = id => byId.get(id)?.slug;
  const groupOfCat = id => { for (const c of ancestors(id)) { const g = groupForCategory(c.slug); if (g) return g; } return null; };

  const catSlug = String(query.category || '');
  const catRow = cats.find(c => c.slug === catSlug);
  const inCat = r => !catRow || ancestors(r.category_id).some(c => c.id === catRow.id);
  const brand = String(query.brand || '').toLowerCase();
  const inBrand = r => !brand || String(r.brand || '').toLowerCase() === brand;
  const ff = String(query.form_factor || '');
  const selected = facetParams(query);

  const items = rows.map(r => {
    let a = {};
    try { a = JSON.parse(r.attributes || '{}'); } catch { /* ignore */ }
    return { ...r, attrs: a, ff: a['Form Factor'] ?? null, group: groupOfCat(r.category_id) };
  });
  const passFacets = (it, skip) => Object.entries(selected).every(([id, v]) => id === skip || facetValue(id, it.attrs) === v);
  const pass = (it, skip) =>
    (skip === 'category' || inCat(it)) && (skip === 'brand' || inBrand(it))
    && (skip === 'ff' || !ff || it.ff === ff) && passFacets(it, skip);

  const count = (list, keyFn) => {
    const m = new Map();
    for (const it of list) for (const k of [].concat(keyFn(it))) if (k != null && k !== '') m.set(k, (m.get(k) || 0) + 1);
    return m;
  };

  // Category counts roll up to every ancestor, so "Desktop" includes PC + AIO.
  // They ignore spec / form-factor filters: those belong to one product family
  // and are cleared when the visitor picks another category.
  const catCounts = count(items.filter(it => inBrand(it)), it => ancestors(it.category_id).map(c => c.slug));
  const brandCounts = count(items.filter(it => pass(it, 'brand')), it => (it.brand || '').trim());
  // Form factor (SFF / MT / USFF…) only means something for computers.

  const matching = items.filter(it => pass(it));
  let group = catRow ? (groupOfCat(catRow.id) || null) : null;
  if (!catRow && (query.search || query.brand) && matching.length) {
    const g = count(matching, it => it.group);
    const [top, n] = [...g.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    if (top && n / matching.length >= 0.75) group = top;
  }

  const ffCounts = group === 'computers'
    ? count(items.filter(it => it.group === group && pass(it, 'ff')), it => it.ff)
    : new Map();

  const facets = [];
  for (const id of (FACET_GROUPS[group]?.facets || [])) {
    const def = FACET_DEFS[id];
    const list = items.filter(it => it.group === group && pass(it, id));
    const m = count(list, it => facetValue(id, it.attrs));
    if (selected[id] && !m.has(selected[id])) m.set(selected[id], 0);
    // A filter needs a real choice, but not a wall of one-off values.
    if (m.size < 2 && !selected[id]) continue;
    if (m.size > 12) continue;
    const values = [...m.keys()].sort(def.order || ((a, b) => a.localeCompare(b))).map(v => ({ value: v, count: m.get(v) }));
    facets.push({ id, label: def.label, values });
  }

  const sortCount = m => [...m.entries()].map(([value, n]) => ({ value, count: n }));
  return {
    group,
    total: matching.length,
    categories: Object.fromEntries(catCounts),
    brands: sortCount(brandCounts).sort((a, b) => a.value.localeCompare(b.value)),
    form_factors: sortCount(ffCounts).sort((a, b) => a.value.localeCompare(b.value)),
    facets,
  };
}

// ── Newsletter ───────────────────────────────────────────────────────────────
export function addNewsletterSubscriber(email, source = '') {
  const r = db.prepare('INSERT OR IGNORE INTO newsletter_subscribers (email, source) VALUES (?, ?)')
    .run(String(email).trim().toLowerCase(), String(source || '').slice(0, 200));
  return { added: r.changes === 1 };
}

export function getNewsletterSubscribers() {
  return db.prepare('SELECT email, source, created_at FROM newsletter_subscribers ORDER BY created_at DESC').all();
}

export function getProduct(id) {
  const row = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(id);
  if (!row) return null;
  const product = parseProduct(row);

  // Related products (same category, exclude self)
  if (product.category_id) {
    const related = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ? AND p.id != ? AND ${VISIBLE_ONLY}
      ORDER BY p.created_at DESC LIMIT 8
    `).all(product.category_id, product.id);
    product.related = related.map(parseProduct);
  } else {
    product.related = [];
  }
  return product;
}

export function getProductBySlug(slug) {
  const row = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
  return row ? getProduct(row.id) : null;
}

const incrementViewStmt = db.prepare('UPDATE products SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?');
export function incrementProductViews(id) {
  try { incrementViewStmt.run(Number(id)); schedulePersist(); } catch { /* non-critical */ }
}

export function createProduct(data) {
  const stmt = db.prepare(`
    INSERT INTO products (name, slug, short_description, description, price, sale_price,
      category_id, images, attributes, badge, featured, in_stock, brand, sku, hidden)
    VALUES (:name, :slug, :short_description, :description, :price, :sale_price,
      :category_id, :images, :attributes, :badge, :featured, :in_stock, :brand, :sku, :hidden)
  `);
  const result = stmt.run({
    name: data.name,
    slug: data.slug,
    short_description: data.short_description || '',
    description: data.description || '',
    price: Number(data.price),
    sale_price: data.sale_price ? Number(data.sale_price) : null,
    category_id: data.category_id ? Number(data.category_id) : null,
    images: JSON.stringify(data.images || []),
    attributes: JSON.stringify(data.attributes || {}),
    badge: data.badge || null,
    featured: data.featured ? 1 : 0,
    in_stock: data.in_stock !== false ? 1 : 0,
    brand: data.brand || '',
    sku: data.sku || '',
    hidden: data.hidden ? 1 : 0,
  });
  return getProduct(result.lastInsertRowid);
}

export function updateProduct(id, data) {
  const fields = [];
  const params = { id };

  const allowed = ['name', 'slug', 'short_description', 'description', 'price', 'sale_price',
    'category_id', 'badge', 'featured', 'in_stock', 'brand', 'sku', 'hidden'];
  // better-sqlite3 refuses to bind a boolean, so the flag columns are coerced.
  const flags = new Set(['featured', 'in_stock', 'hidden']);
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = :${key}`);
      params[key] = flags.has(key) ? (data[key] ? 1 : 0) : data[key];
    }
  }
  if (data.images !== undefined) { fields.push('images = :images'); params.images = JSON.stringify(data.images); }
  if (data.attributes !== undefined) { fields.push('attributes = :attributes'); params.attributes = JSON.stringify(data.attributes); }
  fields.push("updated_at = datetime('now')");

  db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = :id`).run(params);
  return getProduct(id);
}

export function deleteProduct(id) {
  const product = getProduct(id);
  if (!product) return null;
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return product;
}

export function searchProducts(q) {
  const { clauses, params, score } = buildProductSearch(q);
  if (!clauses.length) return [];
  return db.prepare(`
    SELECT p.id, p.name, p.slug, p.price, p.sale_price, p.images,
           ${score} AS _score
    FROM products p
    WHERE ${VISIBLE_ONLY} AND ${clauses.join(' AND ')}
    ORDER BY _score DESC, p.featured DESC, p.name ASC
    LIMIT 6
  `).all(params).map(r => {
    const { _score, ...rest } = r;
    return { ...rest, images: JSON.parse(rest.images || '[]') };
  });
}

export function getCategories() {
  return db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
}

export function createCategory(data) {
  const stmt = db.prepare('INSERT INTO categories (name, slug, parent_id, sort_order) VALUES (?, ?, ?, ?)');
  const result = stmt.run(data.name, data.slug, data.parent_id || null, data.sort_order || 0);
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
}

export function deleteCategory(id) {
  const used = db.prepare('SELECT COUNT(*) as n FROM products WHERE category_id = ?').get(id).n;
  if (used > 0) return { error: 'Kjo kategori ka produkte. Hiqeni produktet fillimisht.' };
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  return { ok: true };
}

export function getProductsForSitemap() {
  return db.prepare(
    'SELECT slug, updated_at, images FROM products WHERE COALESCE(hidden, 0) = 0 ORDER BY updated_at DESC'
  ).all();
}

// Meta catalog feed: only priced products (Meta rejects items without a price,
// so "price on request" rows are left out).
export function getProductsForFeed() {
  return db.prepare(`
    SELECT p.slug, p.name, p.short_description, p.description, p.price, p.sale_price,
           p.images, p.attributes, p.badge, p.brand, p.in_stock,
           c.name AS category_name, pc.name AS parent_category_name
    FROM products p
    LEFT JOIN categories c  ON c.id = p.category_id
    LEFT JOIN categories pc ON pc.id = c.parent_id
    WHERE COALESCE(p.hidden, 0) = 0 AND p.price > 0
    ORDER BY p.id
  `).all();
}

export function getAllProductsAdmin() {
  return db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.created_at DESC
  `).all().map(parseProduct);
}

export default db;
