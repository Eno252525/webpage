/**
 * Import products from "Liste cmimesh.xlsx" into products.db.
 * - Reuses existing images from DB where brand+model matches
 * - Uses web-searched URLs for new products (badged TEMP IMG)
 * - Clears existing products first (backup must exist before running)
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

// Minimal CSV parser — strips \r first so only \n is a row separator
function parseCSV(text) {
  text = text.replace(/\r/g, ''); // normalize: \r\n→\n, bare \r in fields→gone
  const rows = [];
  let i = 0;
  while (i < text.length) {
    const row = [];
    while (true) {
      let field = '';
      if (i < text.length && text[i] === '"') {
        i++;
        while (i < text.length) {
          if (text[i] === '"' && text[i + 1] === '"') { field += '"'; i += 2; }
          else if (text[i] === '"') { i++; break; }
          else { field += text[i++]; }
        }
      } else {
        while (i < text.length && text[i] !== ',' && text[i] !== '\n') {
          field += text[i++];
        }
      }
      row.push(field);
      if (i >= text.length || text[i] === '\n') break;
      i++; // comma
    }
    if (text[i] === '\n') i++;
    rows.push(row);
  }
  return rows;
}

const db = new Database('products.db');

// ─────────────────────────────────────────────
// BRAND/MODEL NORMALIZATION
// ─────────────────────────────────────────────
const BRAND_ALIASES = {
  'fujtisu': 'fujitsu', 'fjuitsu': 'fujitsu', 'fujistsu': 'fujitsu',
  'presicion': 'precision', 'precisoon': 'precision',
  'optipex': 'optiplex', 'optipelx': 'optiplex',
};
function norm(s) {
  if (!s) return '';
  let t = String(s).toLowerCase().trim()
    .replace(/(\d+)\s+(gb|tb)/gi, '$1$2')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  return t.split(' ').map(w => BRAND_ALIASES[w] || w).join(' ');
}
function slug(s) {
  return norm(s).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 100);
}

// ─────────────────────────────────────────────
// EXISTING DB IMAGE MAP
// ─────────────────────────────────────────────
const dbProducts = db.prepare(`
  SELECT p.name, p.brand, p.images, p.price, p.attributes,
         c.name as cat_name, c.id as cat_id
  FROM products p LEFT JOIN categories c ON p.category_id = c.id
`).all();

const imageMap = new Map(); // normalized-key → { url }

function storeKey(key, data) {
  if (!imageMap.has(key) && data.url) imageMap.set(key, data);
}

const SKIP_PREFIXES = new Set(['monitor', 'server', 'laptop', 'rack', 'internal', 'external']);

function indexName(nameN, data) {
  const words = nameN.split(' ').filter(w => w.length > 1);
  for (let len = Math.min(words.length, 5); len >= 2; len--) {
    storeKey(words.slice(0, len).join(' '), data);
  }
  if (words.length > 2 && SKIP_PREFIXES.has(words[0])) {
    const rest = words.slice(1);
    for (let len = Math.min(rest.length, 4); len >= 2; len--) {
      storeKey(rest.slice(0, len).join(' '), data);
    }
  }
}

// ── Build imageMap from backup CSV first (has form factor in product names) ──
// This gives us form-factor-specific keys like "hp elitedesk 800 g2 sff"
try {
  const csvRows = parseCSV(readFileSync('db-backup-2026-05-14.csv', 'utf8'));
  const headers = csvRows[0];
  const nameIdx   = headers.indexOf('name');
  const imagesIdx = headers.indexOf('images');
  for (let r = 1; r < csvRows.length; r++) {
    const row = csvRows[r];
    const name = row[nameIdx] || '';
    const url  = (() => { try { return JSON.parse(row[imagesIdx] || '[]')[0] || ''; } catch { return ''; } })();
    if (!name || !url) continue;
    indexName(norm(name), { url });
  }
} catch (e) {
  console.warn('Warning: could not read backup CSV for imageMap:', e.message);
}

// ── Overlay with current DB products (fills gaps for anything not in backup) ──
for (const p of dbProducts) {
  const url = (() => { try { return JSON.parse(p.images)[0] || ''; } catch { return ''; } })();
  const attrs = (() => { try { return JSON.parse(p.attributes) || {}; } catch { return {}; } })();
  if (!url) continue;
  const data = { url };

  const nameN = norm(p.name);
  const ffN   = norm(attrs['Form Factor'] || '');

  // Index with form factor appended (for current DB entries that lack FF in name)
  if (ffN) {
    const words = nameN.split(' ').filter(w => w.length > 1);
    const wordsFF = [...words, ffN];
    for (let len = Math.min(wordsFF.length, 6); len >= 2; len--) {
      storeKey(wordsFF.slice(0, len).join(' '), data);
    }
  }
  indexName(nameN, data);
}

function findDbMatch(brand, model, formFactor) {
  // Try with form factor first (more specific match)
  if (formFactor) {
    const ffN = norm(formFactor);
    const keyFF = norm(`${brand} ${model} ${ffN}`);
    const wordsFF = keyFF.split(' ').filter(w => w.length > 1);
    for (let len = Math.min(wordsFF.length, 6); len >= 2; len--) {
      const key = wordsFF.slice(0, len).join(' ');
      if (imageMap.has(key)) return imageMap.get(key);
    }
  }
  // Fall back to brand+model without form factor
  const fullKey = norm(`${brand} ${model}`);
  const words = fullKey.split(' ').filter(w => w.length > 1);
  for (let len = Math.min(words.length, 5); len >= 2; len--) {
    const key = words.slice(0, len).join(' ');
    if (imageMap.has(key)) return imageMap.get(key);
  }
  return null;
}

// ─────────────────────────────────────────────
// WEB-SEARCHED IMAGES (TEMP IMG)
// ─────────────────────────────────────────────
const WEB_IMAGES = {
  'zotac mini pc': 'https://c1.neweggimages.com/productimage/nb640/56-173-157-V01.jpg',
  'pc gaming assembluar': 'https://microless.com/cdn/products/1e42ef8429f5814c90ce408da1ae69a4-md.jpg',
  'cooler master assembluar': 'https://microless.com/cdn/products/f3d42e48e3e00d267c8caa8e4f2a543f-md.jpg',
  'hp precision t1700': 'https://c1.neweggimages.com/productimage/nb640/A65E_1_201903282103675169.jpg',
  'dell d10u': 'https://c1.neweggimages.com/productimage/nb640/A7RB_132132922358938471Sj5HXWFyyq.jpg',
  'msi msi infinite b904': 'https://microless.com/cdn/products/56bf4dd3f7bf223a7312a05754adaaa5-md.jpg',
  'msi msi mpg z690 infinite x2': 'https://microless.com/cdn/products/d60edb1ecd9c62c591f0558b436deebf-md.jpg',
  'msi msi mpg z790 infinite x2': 'https://microless.com/cdn/products/5a94052c677b4b069f8c63bdabfb7b22-md.jpg',
  'hp z2 g4': 'https://c1.neweggimages.com/productimage/nb640/AKVUD24071118JM8GFC.jpg',
  'hp z2 g5': 'https://superworkstations.com/site/assets/files/2092326/hp-z2-tower-g5-workstation-main.jpg',
  'hp z400': 'https://c1.neweggimages.com/productimage/nb640/83-147-515-02.jpg',
  'hp z420': 'https://superworkstations.com/site/assets/files/1147397/hp-z420-main.jpg',
  'hp z440': 'https://superworkstations.com/site/assets/files/130739/hp-z440-main.jpg',
  'hp z6 g4': 'https://www.hp.com/content/dam/sites/worldwide/personal-computers/commercial/workstations/z6/redesign_202111/1280-image-front.png',
  'hp z620': 'https://c1.neweggimages.com/productimage/nb640/A68F_1_20170516561882172.jpg',
  'hp z820': 'https://superworkstations.com/site/assets/files/6466/hp-z820-main.jpg',
  'ssd nvme 128gb': 'https://image-us.samsung.com/SamsungUS/home/computing/memory-storage/solid-state-drives/06022025/MZ-V8V1T0BW_001_Front_Black.jpg',
  'ssd nvme 256gb': 'https://image-us.samsung.com/SamsungUS/home/computing/memory-storage/solid-state-drives/06022025/MZ-V8V1T0BW_001_Front_Black.jpg',
  'ssd nvme 512gb': 'https://image-us.samsung.com/SamsungUS/home/computing/memory-storage/solid-state-drives/06022025/MZ-V8V1T0BW_001_Front_Black.jpg',
  'ssd nvme 1tb': 'https://image-us.samsung.com/SamsungUS/home/computing/memory-storage/solid-state-drives/06022025/MZ-V8V1T0BW_001_Front_Black.jpg',
  'hdd 500gb': 'https://content.dam.seagate.com/migrated-assets/www-content/products/hard-drives/barracuda-hard-drive/_shared/images/row-4-640x640.jpg',
  'hdd 1tb': 'https://content.dam.seagate.com/migrated-assets/www-content/products/hard-drives/barracuda-hard-drive/_shared/images/row-4-640x640.jpg',
  'hdd 2tb': 'https://content.dam.seagate.com/migrated-assets/www-content/products/hard-drives/barracuda-hard-drive/_shared/images/row-4-640x640.jpg',
  'hdd 3tb': 'https://content.dam.seagate.com/migrated-assets/www-content/products/hard-drives/barracuda-hard-drive/_shared/images/row-4-640x640.jpg',
  'hdd 4tb': 'https://content.dam.seagate.com/migrated-assets/www-content/products/hard-drives/barracuda-hard-drive/_shared/images/row-4-640x640.jpg',
  'hdd 6tb': 'https://content.dam.seagate.com/migrated-assets/www-content/products/hard-drives/barracuda-hard-drive/_shared/images/row-4-640x640.jpg',
  'hp dl360 g10 lff': 'https://www.itcreations.com/dist/landing/i/dl360g10/carousel/dl360-gen10-1_reflection.png',
  'hp dl380 g9': 'https://www.itcreations.com/dist/landing/i/dl380g9/carousel/hp-dl380-g9.jpg',
  'hp dl360 g10 sff': 'https://c1.neweggimages.com/productimage/nb640/A8Z0D220714157M66CB.jpg',
  'cisco sf300 24mp': 'https://cdn11.bigcommerce.com/s-u3uxlvxq3h/products/7937/images/25264/SF300-24MP-K9-NA-2__43006.1584436522.386.513.jpg',
  'cisco sf300 24pp': 'https://cdn.blueally.com/secureitstore/images/300-series/sf300-24pp.jpg',
  'cisco sf300 48': 'https://cdn.blueally.com/secureitstore/images/300-series/sf300-48.jpg',
  'cisco sf300 48p': 'https://cdn.blueally.com/secureitstore/images/300-series/sf300-48p.jpg',
  'cisco sg220 50': 'https://cdn.blueally.com/secureitstore/images/220-series/sg220-50.jpg',
  'cisco sg300 28': 'https://cdn.blueally.com/secureitstore/images/300-series/sg300-28.jpg',
  'cisco sg500 28': 'https://cdn.blueally.com/secureitstore/images/managed-switches/sg500-28.jpg',
  'cisco sg500 52': 'https://cdn.blueally.com/secureitstore/images/managed-switches/sg500-52.png',
  'nvidia rtx 3090 24gb': 'https://www.nvidia.com/content/dam/en-zz/Solutions/geforce/ampere/rtx-3090/geforce-rtx-3090-shop-600-p@2x.png',
  'nvidia rtx 3090 suprim x': 'https://microless.com/cdn/products/1e42ef8429f5814c90ce408da1ae69a4-md.jpg',
  // Monitors with bad Excel data (brand='Hp' for Lenovo/HP/LG)
  'lenovo t27i': 'https://itstore.al/wp-content/uploads/2025/03/Lenovo-T27i-10.jpg',
  'hp z24n g3': 'https://itstore.al/wp-content/uploads/2025/01/Monitor-HP-Z24n-G3.webp',
  'lg 32ud99': 'https://itstore.al/wp-content/uploads/2025/01/Monitor-LG-32UD99-W-1.png',
};

function findWebImage(brand, model) {
  const key = norm(`${brand} ${model}`);
  if (WEB_IMAGES[key]) return WEB_IMAGES[key];
  // Partial key match
  for (const [k, v] of Object.entries(WEB_IMAGES)) {
    if (key.startsWith(k) || k.startsWith(key.slice(0, k.length))) return v;
  }
  return null;
}

// ─────────────────────────────────────────────
// CATEGORY MAP
// ─────────────────────────────────────────────
const catIds = Object.fromEntries(
  db.prepare('SELECT id, name FROM categories').all().map(c => [c.name, c.id])
);
const SHEET_CAT = {
  PC1:        catIds['PC']         || 16,
  Workstation: catIds['Workstation'] || 10,
  Laptop:     catIds['Laptop']     || 9,
  'HDD SSD':  null, // handled per-row
  Server:     catIds['Server']     || 17,
  Switch:     catIds['Switch']     || 18,
  UPS:        catIds['UPS']        || 13,
  GPU:        catIds['GPU']        || 22,
  Monitor:    catIds['Monitor']    || 3,
  NAS:        catIds['NAS']        || 19,
};
const SSD_CAT = catIds['SSD'] || 24;
const HDD_CAT = catIds['HDD'] || 25;

// ─────────────────────────────────────────────
// PRICE HELPERS
// ─────────────────────────────────────────────
function toPrice(raw) {
  const v = Number(raw) || 0;
  if (v <= 0) return 0;
  return Math.round(v * 100);
}

// ─────────────────────────────────────────────
// PARSE ALL EXCEL PRODUCTS
// ─────────────────────────────────────────────
const wb = xlsx.readFile('Liste cmimesh.xlsx');

const products = []; // final product list

function cleanModel(model) {
  // Remove trailing " - " artifacts, clean up
  return String(model || '').replace(/\s*[-–]+\s*$/, '').trim();
}

function cleanBrand(brand) {
  return String(brand || '').trim();
}

function makeProductName(brand, model, extra) {
  let name = `${brand} ${model}`.trim();
  if (extra) name += ` - ${extra}`;
  return name;
}

function makeAttrs(obj) {
  // Remove null/empty/0 entries
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v != null && v !== '' && v !== 0 && v !== '0') out[k] = String(v).trim();
  }
  return out;
}

// ── PC1 ──────────────────────────────────────
const pc1Rows = xlsx.utils.sheet_to_json(wb.Sheets['PC1']).filter(r => r.Marka && r.Model && r.Marka !== '??');
for (const r of pc1Rows) {
  const brand = cleanBrand(r.Marka);
  const model = cleanModel(r.Model);
  const cpu = String(r.CPU || '').trim();
  const ram = String(r.RAM || '').trim();
  const ssd = String(r.SSD || '').trim();
  const gpu = r.GPU && r.GPU !== 0 ? String(r.GPU).trim() : '';
  const ff  = String(r['Form Factor'] || '').trim();
  const price = toPrice(r.Shitje);

  const specParts = [cpu, ram && (ram + ' RAM'), ssd && (ssd + ' SSD')].filter(Boolean);
  const name = makeProductName(brand, model, specParts.join(' / '));
  const attrs = makeAttrs({ CPU: cpu, RAM: ram, SSD: ssd, GPU: gpu, 'Form Factor': ff });

  products.push({ name, brand, model, attrs, price, cat_id: SHEET_CAT.PC1, sheet: 'PC1', excelRow: r });
}

// ── Workstation ──────────────────────────────
const wsRows = xlsx.utils.sheet_to_json(wb.Sheets['Workstation']).filter(r => r.Brand && r.Model);
for (const r of wsRows) {
  const brand = cleanBrand(r.Brand);
  const model = cleanModel(r.Model);
  const cpu = String(r.CPU || '').trim();
  const ram = String(r.RAM || '').trim();
  const ssd = String(r.SSD || '').trim();
  const gpu = r.GPU ? String(r.GPU).trim() : '';
  const price = toPrice(r.Shitje);

  const specParts = [cpu, ram && (ram + ' RAM'), ssd && (ssd + ' SSD')].filter(Boolean);
  const name = makeProductName(brand, model, specParts.join(' / '));
  const attrs = makeAttrs({ CPU: cpu, RAM: ram, SSD: ssd, GPU: gpu });

  products.push({ name, brand, model, attrs, price, cat_id: SHEET_CAT.Workstation, sheet: 'Workstation', excelRow: r });
}

// ── Laptop (no header row) ───────────────────
const laptopRaw = xlsx.utils.sheet_to_json(wb.Sheets['Laptop'], { header: 1 })
  .filter(r => r.some(c => c != null && c !== ''));
for (const r of laptopRaw) {
  const brand = cleanBrand(r[0]);
  const model = cleanModel(r[1]);
  const cpu   = String(r[2] || '').trim();
  const ram   = String(r[3] || '').trim();
  const ssd   = String(r[4] || '').trim();
  const gpu   = r[5] ? String(r[5]).trim() : '';
  const price = toPrice(r[6]);
  const grade = r[7] ? String(r[7]).trim() : '';

  if (!brand || !model) continue;

  const specParts = [cpu, ram && (ram + ' RAM'), ssd && (ssd + ' SSD'), grade].filter(Boolean);
  const name = makeProductName(brand, model, specParts.join(' / '));
  const attrs = makeAttrs({ CPU: cpu, RAM: ram, SSD: ssd, GPU: gpu, Grade: grade });

  products.push({ name, brand, model, attrs, price, cat_id: SHEET_CAT.Laptop, sheet: 'Laptop', excelRow: r });
}

// ── HDD SSD ──────────────────────────────────
{
  const rows = xlsx.utils.sheet_to_json(wb.Sheets['HDD SSD'], { header: 1 })
    .filter(r => r.some(c => c != null && c !== ''));

  let currentType = '';
  for (const r of rows) {
    if (r[0] != null) {
      const t = String(r[0]).trim();
      if (t && t.toLowerCase() !== 'shitje leke') currentType = t;
    }
    const cap = String(r[1] || '').trim();
    const priceRaw = r[2];
    if (!cap || !currentType) continue;

    const isHdd = currentType.toLowerCase().includes('hdd');
    const isNvme = currentType.toLowerCase().includes('nvme');
    const isM2 = currentType.toLowerCase().includes('m.2') || currentType.toLowerCase().includes('m 2');

    const cat_id = isHdd ? HDD_CAT : SSD_CAT;
    const name = `${currentType} ${cap}`;
    const brand = isHdd ? 'HDD' : 'SSD';
    const model = cap;
    const attrs = makeAttrs({ Capacity: cap, Type: currentType });
    const price = toPrice(priceRaw);

    products.push({ name, brand, model, attrs, price, cat_id, sheet: 'HDD SSD', excelRow: r });
  }
}

// ── Server ───────────────────────────────────
const KVM_CAT = catIds['KVM'] || 20;
const serverRows = xlsx.utils.sheet_to_json(wb.Sheets['Server']).filter(r => r.Brand && r.Model);
for (const r of serverRows) {
  const brand = cleanBrand(r.Brand);
  const model = cleanModel(r.Model);

  // KVM mistakenly placed in Server sheet — it has malformed columns
  if (brand === 'KVM' && model === 'KVM') {
    // Cols: Brand=KVM, Model=KVM, CPU=actual model (Raritan KX2-116), RAM=price (18000 Lek)
    const kvmModel = String(r.CPU || 'KVM Switch').trim();
    const kvmPrice = toPrice(r.RAM);
    const kvmName  = `KVM ${kvmModel}`;
    products.push({ name: kvmName, brand: 'KVM', model: kvmModel, attrs: {}, price: kvmPrice,
                    cat_id: KVM_CAT, sheet: 'Server', excelRow: r });
    continue;
  }

  const cpu = String(r.CPU || '').trim();
  const ram = String(r.RAM || '').trim();
  const storage = String(r.Storage || '').trim();
  const price = toPrice(r.Shitje);

  const specParts = [cpu, ram && (ram + ' RAM'), storage].filter(Boolean);
  const name = makeProductName(brand, model, specParts.join(' / '));
  const attrs = makeAttrs({ CPU: cpu, RAM: ram, Storage: storage });

  products.push({ name, brand, model, attrs, price, cat_id: SHEET_CAT.Server, sheet: 'Server', excelRow: r });
}

// ── Switch ───────────────────────────────────
const switchRows = xlsx.utils.sheet_to_json(wb.Sheets['Switch']).filter(r => r.Brand && r.Model);
for (const r of switchRows) {
  const brand = cleanBrand(r.Brand);
  const model = cleanModel(r.Model);
  const ports = String(r.Ports || '').trim();
  const sfp   = String(r.SPF || '').trim();
  const layer = String(r.Layer || '').trim();
  const poe   = String(r.POE || '').trim();
  const price = toPrice(r.Shitje);

  const name = makeProductName(brand, model, '');
  const attrs = makeAttrs({ Ports: ports, SFP: sfp, Layer: layer, PoE: poe });

  products.push({ name, brand, model, attrs, price, cat_id: SHEET_CAT.Switch, sheet: 'Switch', excelRow: r });
}

// ── UPS ──────────────────────────────────────
const upsRows = xlsx.utils.sheet_to_json(wb.Sheets['UPS']).filter(r => r.Brand && r.Model);
for (const r of upsRows) {
  const brand = cleanBrand(r.Brand);
  const model = cleanModel(r.Model);
  const cap   = String(r.Capacity || '').trim();
  const price = toPrice(r.Shitje);

  const name = makeProductName(brand, model, '');
  const attrs = makeAttrs({ Capacity: cap });

  products.push({ name, brand, model, attrs, price, cat_id: SHEET_CAT.UPS, sheet: 'UPS', excelRow: r });
}

// ── GPU ──────────────────────────────────────
const gpuRows = xlsx.utils.sheet_to_json(wb.Sheets['GPU']).filter(r => r.Brand && r.Model);
for (const r of gpuRows) {
  const brand = cleanBrand(r.Brand);
  const model = cleanModel(r.Model).replace(/\s*-\s*$/, '').trim(); // remove trailing " - "
  const vram  = String(r.VRAM || '').trim();
  const price = 0; // No price column

  const name = makeProductName(brand, model, vram ? `${vram} VRAM` : '');
  const attrs = makeAttrs({ VRAM: vram });

  products.push({ name, brand, model, attrs, price, cat_id: SHEET_CAT.GPU, sheet: 'GPU', excelRow: r });
}

// ── Monitor ──────────────────────────────────
const monRows = xlsx.utils.sheet_to_json(wb.Sheets['Monitor']).filter(r => r.Brand && r.Model);
for (const r of monRows) {
  let brand = cleanBrand(r.Brand);
  let model = cleanModel(r.Model);
  // Save original for image lookup (DB names often start with "Monitor ...")
  const lookupBrand = brand;
  const lookupModel = model;

  // Fix bad data entries where brand/model got mixed up in Excel
  if (brand === 'Monitor') {
    // "Monitor" brand, model = "Eizo FlexScan EV2736W" → brand Eizo, model FlexScan EV2736W
    const firstWord = model.split(' ')[0];
    brand = firstWord;
    model = model.slice(firstWord.length).trim();
  }
  if (brand === 'Surface') { brand = 'Microsoft'; model = 'Surface ' + model; }
  if (brand === 'Hp' && model.toLowerCase().startsWith('lenovo')) {
    brand = 'Lenovo';
    model = model.replace(/^lenovo\s*/i, '').trim();
  }
  if (brand === 'Hp' && model.toLowerCase().startsWith('monitor hp')) {
    brand = 'HP';
    model = model.replace(/^monitor\s+hp\s*/i, '').trim();
  }
  if (brand === 'LG' && model.toLowerCase().startsWith('monitor lg')) {
    model = model.replace(/^monitor\s+lg\s*/i, '').trim();
  }
  if (brand === 'Hp') brand = 'HP'; // normalize case

  const name = `${brand} ${model}`.trim();
  const attrs = {};
  const price = 0;

  products.push({ name, brand, model, attrs, price, cat_id: SHEET_CAT.Monitor, sheet: 'Monitor',
                  lookupBrand, lookupModel, excelRow: r });
}

// ── NAS ──────────────────────────────────────
const nasRows = xlsx.utils.sheet_to_json(wb.Sheets['NAS']).filter(r => r.Brand && r.Model);
for (const r of nasRows) {
  const brand = cleanBrand(r.Brand);
  const model = cleanModel(r.Model);
  const bays  = String(r.Bays || '').trim();
  const price = toPrice(r.Shitje);

  const name = `${brand} ${model}`.trim();
  const attrs = makeAttrs({ Bays: bays });

  products.push({ name, brand, model, attrs, price, cat_id: SHEET_CAT.NAS, sheet: 'NAS', excelRow: r });
}

console.log(`Parsed ${products.length} products from Excel`);

// ─────────────────────────────────────────────
// RESOLVE IMAGES FOR EVERY PRODUCT
// ─────────────────────────────────────────────
// Special SSD/HDD image lookup by category type
const SSD_SATA_IMG   = 'https://itstore.al/wp-content/uploads/2025/03/SSD-2.5.jpg';
const SSD_NVME_IMG   = 'https://itstore.al/wp-content/uploads/2025/02/M.2-NVMe-SSD-1.jpg';
const SSD_M2_IMG     = 'https://itstore.al/wp-content/uploads/2025/02/M.2-SATA-SSD-1.jpg';
const HDD_SATA_IMG   = 'https://itstore.al/wp-content/uploads/2025/03/HDD-3.5-inch-SATA.jpg';

let tempImgCount = 0;
let reusedCount  = 0;
let webCount     = 0;

for (const p of products) {
  let imageUrl = '';
  let isTemp   = false;

  // Special handling for HDD SSD
  if (p.sheet === 'HDD SSD') {
    const t = norm(p.name);
    if (t.includes('nvme'))      imageUrl = SSD_NVME_IMG;
    else if (t.includes('m 2') || t.includes('m2')) imageUrl = SSD_M2_IMG;
    else if (t.includes('hdd')) imageUrl = HDD_SATA_IMG;
    else                         imageUrl = SSD_SATA_IMG;
    reusedCount++;
    p.imageUrl = imageUrl;
    p.isTemp   = false;
    continue;
  }

  // Explicit overrides for known products that lost their image in prior runs
  const KNOWN_IMAGES = {
    'eizo flexscan ev2736w': 'https://itstore.al/wp-content/uploads/2025/01/Monitor-Eizo-FlexScan-EV2736W.png',
    'kvm raritan kx2 116':   'https://itstore.al/wp-content/uploads/2025/03/KVM-Raritan-KX2-116.png',
  };
  const knownKey = norm(`${p.brand} ${p.model}`);
  if (KNOWN_IMAGES[knownKey]) {
    p.imageUrl = KNOWN_IMAGES[knownKey];
    p.isTemp   = false;
    reusedCount++;
    continue;
  }

  // Try DB match first (use original lookup brand/model if available)
  const ff = p.attrs && p.attrs['Form Factor'] ? p.attrs['Form Factor'] : '';
  const dbMatch = findDbMatch(p.lookupBrand || p.brand, p.lookupModel || p.model, ff)
               || findDbMatch(p.brand, p.model, ff);
  if (dbMatch && dbMatch.url) {
    imageUrl = dbMatch.url;
    reusedCount++;
  } else {
    // Try web image map
    const webImg = findWebImage(p.brand, p.model);
    if (webImg) {
      imageUrl = webImg;
      isTemp = true;
      webCount++;
    } else {
      // Fallback: use a category-level placeholder
      imageUrl = '';
      isTemp = true;
      tempImgCount++;
    }
  }

  p.imageUrl = imageUrl;
  // Mark as TEMP IMG if image is from an external (non-itstore.al) source
  p.isTemp   = isTemp || (imageUrl && !imageUrl.includes('itstore.al'));
}

console.log(`  Reused from DB:  ${reusedCount}`);
console.log(`  Web image (new): ${webCount}`);
console.log(`  No image found:  ${tempImgCount}`);

// ─────────────────────────────────────────────
// CLEAR EXISTING PRODUCTS AND IMPORT NEW ONES
// ─────────────────────────────────────────────
const insert = db.prepare(`
  INSERT INTO products (name, slug, brand, short_description, description,
    price, sale_price, category_id, images, attributes, badge, featured, in_stock)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
`);

const slugCounts = new Map();
function uniqueSlug(base) {
  const cnt = (slugCounts.get(base) || 0) + 1;
  slugCounts.set(base, cnt);
  return cnt === 1 ? base : `${base}-${cnt}`;
}

const importAll = db.transaction(() => {
  // Clear all products
  db.prepare('DELETE FROM products').run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name = 'products'").run();

  let inserted = 0;
  for (const p of products) {
    const productSlug = uniqueSlug(slug(`${p.brand} ${p.model}`));
    const images = p.imageUrl ? JSON.stringify([p.imageUrl]) : '[]';
    const attrs  = JSON.stringify(p.attrs || {});
    const badge  = p.isTemp ? 'TEMP IMG' : '';
    const short  = p.name;
    const desc   = '';

    insert.run(
      p.name, productSlug, p.brand, short, desc,
      p.price, 0, p.cat_id, images, attrs, badge, // sale_price = 0
    );
    inserted++;
  }
  return inserted;
});

const inserted = importAll();
console.log(`\n✓ Cleared old products. Inserted ${inserted} new products.`);

// ─────────────────────────────────────────────
// SUMMARY REPORT
// ─────────────────────────────────────────────
const bySheet = {};
for (const p of products) bySheet[p.sheet] = (bySheet[p.sheet] || 0) + 1;

console.log('\nProducts by sheet:');
for (const [s, n] of Object.entries(bySheet)) console.log(`  ${s}: ${n}`);

const tempItems = products.filter(p => p.isTemp);
console.log(`\n⚠  TEMP IMG products (${tempItems.length}) — needs manual photo review:`);
for (const p of tempItems) console.log(`  [${p.sheet}] ${p.name}`);
