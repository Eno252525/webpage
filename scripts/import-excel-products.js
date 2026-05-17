/**
 * Import products from Liste Cmimesh.xlsx into products.db.
 *
 * Usage:
 *   node scripts/import-excel-products.js --dry-run   # preview only
 *   node scripts/import-excel-products.js             # write to DB
 *
 * NOTE: Prices in the Excel are stored as-is. If they are in EUR and you
 * need Lek, set the PRICE_MULTIPLIER below (e.g. 100 for ~1 EUR = 100 ALL).
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import * as XLSX from 'xlsx';
import { findImage } from './fetch-images.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDryRun = process.argv.includes('--dry-run');

// ─── PRICE MULTIPLIER ─────────────────────────────────────────────────────────
// PC/Workstation/Laptop columns are priced in EUR; HDD SSD is already in Lek.
// 1 EUR ≈ 100 ALL — override per sheet in SHEET_CONFIG.priceMultiplier below.
const EUR_TO_LEK = 100;

// ─── PER-SHEET COLUMN CONFIG ─────────────────────────────────────────────────
const SHEET_CONFIG = {
  PC: {
    hasHeaderRow: true,   // row 0 is a header, skip it
    brandCol: 0,
    modelCol: 1,
    cpuCol: 2,
    ramCol: 3,
    storageCol: 4,
    gpuCol: null,          // col 5 = Hyrje (purchase price), not GPU
    priceCol: 6,           // col 6 = Shitje (selling price)
    gradeCol: null,
    categorySlug: 'pc',
    priceMultiplier: EUR_TO_LEK,  // prices are in EUR
  },
  Workstation: {
    hasHeaderRow: true,
    brandCol: 0,
    modelCol: 1,
    cpuCol: 2,
    ramCol: 3,
    storageCol: 4,
    gpuCol: 5,
    priceCol: 6,
    gradeCol: null,
    categorySlug: 'workstation',
    priceMultiplier: EUR_TO_LEK,
  },
  Laptop: {
    hasHeaderRow: false,  // no header row; first row is data
    brandCol: 0,
    modelCol: 1,
    cpuCol: 2,
    ramCol: 3,
    storageCol: 4,
    gpuCol: 5,
    priceCol: 6,
    gradeCol: 7,
    categorySlug: 'laptop',
    priceMultiplier: EUR_TO_LEK,
  },
  'HDD SSD': {
    special: 'storage',   // unique layout handled separately
    typeCol: 0,
    sizeCol: 1,
    priceCol: 2,
    priceMultiplier: 1,   // already in Lek
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function str(v) { return String(v ?? '').trim(); }

function parsePrice(v, multiplier = 1) {
  const n = parseFloat(String(v || '0').replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : Math.round(n * multiplier);
}

function formatUnit(v) {
  const s = str(v);
  if (!s || s === '-' || s === '0') return '';
  if (/[a-z]/i.test(s)) return s.replace(/\s+/g, ''); // already has unit (GB/TB)
  const n = parseFloat(s);
  return n ? `${n}GB` : '';
}

function makeSlug(name) {
  return name.toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeBrand(raw) {
  const s = str(raw).toLowerCase();
  const map = {
    dell: 'Dell', hp: 'HP', lenovo: 'Lenovo', apple: 'Apple',
    fujitsu: 'Fujitsu', fujtisu: 'Fujitsu', apc: 'APC',
    mikrotik: 'MikroTik', lg: 'LG', eizo: 'Eizo',
    samsung: 'Samsung', asus: 'Asus', acer: 'Acer', msi: 'MSI',
  };
  for (const [key, val] of Object.entries(map)) {
    if (s.includes(key)) return val;
  }
  return str(raw);
}

// ─── DATABASE SETUP ───────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, '..', 'products.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function getCategoryId(slug) {
  return db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug)?.id ?? null;
}

function getSlugUnique(base) {
  let slug = base.slice(0, 60);
  let n = 1;
  while (db.prepare('SELECT id FROM products WHERE slug = ?').get(slug)) {
    slug = `${base.slice(0, 55)}-${n++}`;
  }
  return slug;
}

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO products
    (name, slug, short_description, price, category_id, images, in_stock, brand, created_at, updated_at)
  VALUES
    (:name, :slug, :shortDesc, :price, :categoryId, :images, 1, :brand, datetime('now'), datetime('now'))
`);

// ─── LOAD REFERENCE DATA ──────────────────────────────────────────────────────
console.log(isDryRun ? '\n🔍 DRY RUN — no DB changes\n' : '\n🚀 IMPORTING PRODUCTS\n');

const existingJSON = JSON.parse(
  await readFile(path.join(__dirname, '..', 'products-final.json'), 'utf-8')
);
console.log(`Loaded ${existingJSON.length} existing products for image cross-reference.`);

// ─── PARSE EXCEL ─────────────────────────────────────────────────────────────
const buf = await readFile(path.join(__dirname, '..', 'Liste Cmimesh.xlsx'));
const wb = XLSX.read(buf, { type: 'buffer' });

const stats = { inserted: 0, skipped: 0, imgMatched: 0, imgDDG: 0, imgPlaceholder: 0 };

// ─── PROCESS EACH SHEET ───────────────────────────────────────────────────────
for (const sheetName of wb.SheetNames) {
  const cfg = SHEET_CONFIG[sheetName];
  if (!cfg) {
    console.log(`\nSheet "${sheetName}": no config defined — skipping.`);
    continue;
  }

  const ws = wb.Sheets[sheetName];
  const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const dataRows = cfg.hasHeaderRow ? allRows.slice(1) : allRows;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📄 Sheet: "${sheetName}" — ${dataRows.length} rows`);
  console.log('─'.repeat(60));

  // ── HDD / SSD (special layout) ──────────────────────────────────────────────
  if (cfg.special === 'storage') {
    let currentType = 'SSD';
    for (const row of dataRows) {
      const typeRaw = str(row[cfg.typeCol]).toUpperCase();
      if (typeRaw) currentType = typeRaw.includes('HDD') ? 'HDD' : 'SSD';

      const size = str(row[cfg.sizeCol]);
      const price = parsePrice(row[cfg.priceCol], cfg.priceMultiplier ?? 1);
      if (!size || !price) continue;

      const name = `${currentType} ${size}`;
      const catSlug = currentType === 'HDD' ? 'hdd' : 'ssd';

      const existing = db.prepare('SELECT id FROM products WHERE name = ?').get(name);
      if (existing) {
        console.log(`  ⟳ Duplicate: "${name}"`);
        stats.skipped++;
        continue;
      }

      const slug = getSlugUnique(makeSlug(name) || 'storage');
      const { url: imageUrl, source: imgSrc } = await findImage(
        { brand: currentType, model: size, slug },
        existingJSON
      );
      trackImageStat(imgSrc);
      console.log(`  ${isDryRun ? '[dry]' : '+'} ${name} | ${price} | 🖼 ${imgSrc}`);

      if (!isDryRun) {
        insertStmt.run({
          name, slug, shortDesc: `${currentType} ${size}`,
          price, categoryId: getCategoryId(catSlug),
          images: JSON.stringify([imageUrl]), brand: '',
        });
        stats.inserted++;
      }
    }
    continue;
  }

  // ── PC / Workstation / Laptop ────────────────────────────────────────────────
  for (const row of dataRows) {
    const brandRaw = str(row[cfg.brandCol]);
    const model    = str(row[cfg.modelCol]);
    const cpu      = str(row[cfg.cpuCol]);
    const ramRaw   = str(row[cfg.ramCol]);
    const storage  = formatUnit(row[cfg.storageCol]);
    const gpu      = cfg.gpuCol != null ? str(row[cfg.gpuCol]) : '';
    const price    = parsePrice(row[cfg.priceCol], cfg.priceMultiplier ?? 1);
    const grade    = cfg.gradeCol != null ? str(row[cfg.gradeCol]) : '';

    // Skip rows with no useful data or no price
    if (!cpu && !model) continue;
    if (!price) continue;

    const brand = normalizeBrand(brandRaw);
    const ram = formatUnit(ramRaw);

    // Build product name: "Brand Model CPU RAM Storage [Grade]"
    // For brandless/modelless PCs, prefix with sheet category
    const nameParts = [];
    if (brand) nameParts.push(brand);
    if (model) nameParts.push(model);
    else if (!brand) nameParts.push(sheetName === 'PC' ? 'PC' : sheetName);
    if (cpu) nameParts.push(cpu);
    if (ram) nameParts.push(ram);
    if (storage) nameParts.push(storage);
    if (grade) nameParts.push(grade);  // differentiates Grade A vs Grade B
    const name = nameParts.join(' ');
    if (!name) continue;

    // Skip duplicates already in DB
    const existing = db.prepare('SELECT id FROM products WHERE name = ?').get(name);
    if (existing) {
      console.log(`  ⟳ Duplicate: "${name}"`);
      stats.skipped++;
      continue;
    }

    // Build short description
    const descParts = [];
    if (cpu) descParts.push(`CPU: ${cpu}`);
    if (ram) descParts.push(`RAM: ${ram}`);
    if (storage) descParts.push(`Storage: ${storage}`);
    if (gpu) descParts.push(`GPU: ${gpu}`);
    if (grade) descParts.push(`Grade: ${grade}`);
    const shortDesc = descParts.join(' | ');

    const slug = getSlugUnique(makeSlug(name) || 'product');

    // Find image via tiered lookup
    const { url: imageUrl, source: imgSrc, matchedName } = await findImage(
      { brand, model: model || cpu, slug },
      existingJSON
    );
    trackImageStat(imgSrc);

    const matchLabel = matchedName ? ` → matched: "${matchedName.slice(0, 35)}"` : '';
    console.log(`  ${isDryRun ? '[dry]' : '+'} ${name} | ${price} | 🖼 ${imgSrc}${matchLabel}`);

    if (!isDryRun) {
      insertStmt.run({
        name, slug, shortDesc,
        price, categoryId: getCategoryId(cfg.categorySlug),
        images: JSON.stringify([imageUrl]), brand,
      });
      stats.inserted++;
    }
  }
}

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
const action = isDryRun ? '(would insert)' : 'Inserted';
console.log(`
${'═'.repeat(55)}
✅ Summary
  ${action}:               ${isDryRun ? stats.inserted + ' (dry)' : stats.inserted}
  Skipped duplicates:       ${stats.skipped}
  Images from store data:   ${stats.imgMatched}
  Images from DDG:          ${stats.imgDDG}
  Placeholder images:       ${stats.imgPlaceholder}
${'═'.repeat(55)}
`);

if (!isDryRun) {
  const total = db.prepare('SELECT COUNT(*) as n FROM products').get().n;
  console.log(`Total products in DB now: ${total}`);
}

function trackImageStat(src) {
  if (src === 'matched') stats.imgMatched++;
  else if (src.startsWith('ddg')) stats.imgDDG++;
  else stats.imgPlaceholder++;
}
