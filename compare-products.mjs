import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

const db = new Database('products.db');

// ──────────────────────────────────────────────
// 1. Load Excel file items into sets per category
// ──────────────────────────────────────────────
const wb = xlsx.readFile('Liste cmimesh.xlsx');

// Brand typo corrections (both in Excel and in DB)
const BRAND_ALIASES = {
  'fujtisu': 'fujitsu',
  'fjuitsu': 'fujitsu',
  'fujistsu': 'fujitsu',
  'fujistu': 'fujitsu',
  'presicion': 'precision',
  'precisoon': 'precision',
  'optipex': 'optiplex',
  'optipelx': 'optiplex',
};

function norm(s) {
  if (!s) return '';
  let t = String(s).toLowerCase().trim();
  // Collapse "128 gb" → "128gb", "1 tb" → "1tb" before stripping
  t = t.replace(/(\d+)\s+(gb|tb)/gi, '$1$2');
  t = t.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  // Collapse again after stripping (handles "128 gb" variants)
  t = t.replace(/(\d+)\s+(gb|tb)/gi, '$1$2');
  // Apply alias corrections word-by-word
  t = t.split(' ').map(w => BRAND_ALIASES[w] || w).join(' ');
  return t;
}

// Build a set of "brand+model" keys from each Excel sheet
function modelKey(brand, model) {
  return norm(brand) + ' ' + norm(model);
}

// PC1 sheet
const excelPC = new Set();
const pc1Rows = xlsx.utils.sheet_to_json(wb.Sheets['PC1']);
for (const r of pc1Rows) {
  if (r.Marka && r.Model) excelPC.add(modelKey(r.Marka, r.Model));
}

// Workstation sheet
const excelWS = new Set();
const wsRows = xlsx.utils.sheet_to_json(wb.Sheets['Workstation']);
for (const r of wsRows) {
  if (r.Brand && r.Model) excelWS.add(modelKey(r.Brand, r.Model));
}

// Laptop sheet (no header — first row is data)
const excelLaptop = new Set();
const laptopRows = xlsx.utils.sheet_to_json(wb.Sheets['Laptop'], { header: 1 });
for (const r of laptopRows) {
  if (r[0] && r[1]) excelLaptop.add(modelKey(r[0], r[1]));
}

// Server sheet
const excelServer = new Set();
const serverRows = xlsx.utils.sheet_to_json(wb.Sheets['Server']);
for (const r of serverRows) {
  if (r.Brand && r.Model) excelServer.add(modelKey(r.Brand, r.Model));
}

// Switch sheet
const excelSwitch = new Set();
const switchRows = xlsx.utils.sheet_to_json(wb.Sheets['Switch']);
for (const r of switchRows) {
  if (r.Brand && r.Model) excelSwitch.add(modelKey(r.Brand, r.Model));
}

// HDD SSD — generic entries (128GB, 256GB etc. for each type)
// We'll match on type keyword + capacity
const excelHddSsd = new Set();
const hddSsdRows = xlsx.utils.sheet_to_json(wb.Sheets['HDD SSD'], { header: 1 });
let currentType = '';
for (const r of hddSsdRows) {
  if (r[0]) currentType = norm(r[0]);
  if (r[1]) excelHddSsd.add(currentType + ' ' + norm(r[1]));
}

// ──────────────────────────────────────────────
// 2. Check if a DB product matches any Excel item
// ──────────────────────────────────────────────
function nameContainsKey(name, keySet) {
  const nname = norm(name);
  for (const key of keySet) {
    const parts = key.split(' ').filter(p => p.length >= 2); // skip empty/trivial parts
    if (parts.length < 2) continue; // need at least brand + 1 model word
    if (parts.every(p => nname.includes(p))) return true;
  }
  return false;
}

// Dedicated matchers per category
function matchesPC(p) { return nameContainsKey(p.name, excelPC); }
function matchesWS(p) { return nameContainsKey(p.name, excelWS); }
function matchesLaptop(p) { return nameContainsKey(p.name, excelLaptop); }
function matchesServer(p) { return nameContainsKey(p.name, excelServer); }
function matchesSwitch(p) { return nameContainsKey(p.name, excelSwitch); }
function matchesHddSsd(p) {
  // Match on capacity keywords in product name
  const nname = norm(p.name);
  for (const key of excelHddSsd) {
    const parts = key.split(' ').filter(Boolean);
    if (parts.every(pp => nname.includes(pp))) return true;
  }
  return false;
}

// ──────────────────────────────────────────────
// 3. Fetch all DB products with their category
// ──────────────────────────────────────────────
const allProducts = db.prepare(`
  SELECT p.id, p.name, p.brand, p.price, p.sale_price, p.attributes,
         c.name as cat_name, c.slug as cat_slug
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  ORDER BY c.name, p.brand, p.name
`).all();

function parseAttrs(raw) {
  try { return JSON.parse(raw) || {}; } catch { return {}; }
}

// ──────────────────────────────────────────────
// 4. Categorize: "on site but NOT in Excel"
// ──────────────────────────────────────────────

// Categories entirely absent from Excel → all go in
const alwaysInclude = new Set([
  'GPU', 'Monitor', 'UPS', 'NAS', 'Aksesore', 'MacBook',
  'RAM', 'KVM', 'Komponente', 'MikroTik', 'Printer & Fotokopje',
  'Business Laptops', 'Workstation Laptops', 'Networking', 'AIO',
  'Periferikë', 'Gaming'
]);

// Result buckets
const notInExcel = {
  PC: [],
  Workstation: [],
  Laptop: [],
  Server: [],
  Switch: [],
  SSD: [],
  HDD: [],
  Other: [], // all other categories
};

for (const p of allProducts) {
  const cat = p.cat_name || 'Unknown';
  const attrs = parseAttrs(p.attributes);

  if (alwaysInclude.has(cat)) {
    notInExcel.Other.push({ ...p, attrs });
    continue;
  }

  switch (cat) {
    case 'PC':
      if (!matchesPC(p)) notInExcel.PC.push({ ...p, attrs });
      break;
    case 'Workstation':
      if (!matchesWS(p)) notInExcel.Workstation.push({ ...p, attrs });
      break;
    case 'Laptop':
      if (!matchesLaptop(p)) notInExcel.Laptop.push({ ...p, attrs });
      break;
    case 'Server':
      if (!matchesServer(p)) notInExcel.Server.push({ ...p, attrs });
      break;
    case 'Switch':
      if (!matchesSwitch(p)) notInExcel.Switch.push({ ...p, attrs });
      break;
    case 'SSD':
      if (!matchesHddSsd(p)) notInExcel.SSD.push({ ...p, attrs });
      break;
    case 'HDD':
      if (!matchesHddSsd(p)) notInExcel.HDD.push({ ...p, attrs });
      break;
    default:
      // Any other category not matched → include
      notInExcel.Other.push({ ...p, attrs });
  }
}

// ──────────────────────────────────────────────
// 5. Build output Excel workbook
//    Same column format as input file per sheet
// ──────────────────────────────────────────────
const outWb = xlsx.utils.book_new();

function extractSpec(p, key) {
  const a = p.attrs;
  return a[key] || a[key.toLowerCase()] || '';
}

function priceDisplay(p) {
  const price = p.sale_price || p.price || 0;
  return price > 0 ? price : '';
}

// Helper: extract CPU/RAM/SSD from product name (for items with no attrs)
function parseNameSpec(name, field) {
  const n = name || '';
  if (field === 'CPU') {
    const m = n.match(/\b(i[3579]-\d{4,5}[A-Z]*|Core 2[^,\-]+|Celeron [A-Z]\d+|Pentium [A-Z]\d+|Ryzen \d+ \w+|Xeon [EGW]\d[^,\-\s]+|AMD [A-Z][^,\-\s]+|Atom [A-Z]\d+|E\d-\d{4}[A-Z]?\s+V?\d?|E5-\d{4}[A-Z]?\s+V?\d?|W-?\d{4}[A-Z]?|Gold \d+|Silver \d+|2 x [A-Z]\d[^,\-]+)\b/i);
    return m ? m[0].trim() : '';
  }
  if (field === 'RAM') {
    const m = n.match(/\b(\d+\s*GB)\b/i);
    return m ? m[0] : '';
  }
  if (field === 'SSD') {
    const m = n.match(/(\d+\s*(?:GB|TB))\s*(?:SSD|NVMe|HDD)?/gi);
    return m ? m[m.length - 1] : '';
  }
  return '';
}

function getCPU(p) { return extractSpec(p, 'CPU') || extractSpec(p, 'Processor') || parseNameSpec(p.name, 'CPU'); }
function getRAM(p) { return extractSpec(p, 'RAM') || parseNameSpec(p.name, 'RAM'); }
function getSSD(p) { return extractSpec(p, 'SSD') || extractSpec(p, 'Storage') || parseNameSpec(p.name, 'SSD'); }
function getGPU(p) { return extractSpec(p, 'GPU') || ''; }

// Extract brand + model from DB product name
function splitBrandModel(p) {
  let brand = (p.brand || '').trim();
  let modelStr = (p.name || '').trim();

  // Strip common leading prefixes that are not the brand
  modelStr = modelStr.replace(/^(Rack\s+Server|Server|Laptop|Internal|External)\s+/i, '').trim();

  // Strip brand from start of model string (case-insensitive)
  if (brand && modelStr.toLowerCase().startsWith(brand.toLowerCase())) {
    modelStr = modelStr.slice(brand.length).trim();
  } else if (!brand && modelStr) {
    // No brand in DB: extract first word as brand
    const firstWord = modelStr.split(' ')[0];
    brand = firstWord;
    modelStr = modelStr.slice(firstWord.length).trim();
  }

  // Remove trailing spec strings like "- i5-6500 - 8 GB", "- 4 x Intel Xeon", etc.
  modelStr = modelStr.replace(/[-–]\s*(i[3579]-\d+|\d+\s*x\s*|Intel|Core|Celeron|Pentium|Ryzen|Xeon|AMD|Atom|E\d-|W-?\d).*/i, '').trim();
  // Remove trailing sizes like "8GB 256GB" etc.
  modelStr = modelStr.replace(/\s+\d+\s*(?:GB|TB).*$/i, '').trim();
  // Remove trailing "Workstation", "Laptop", "Server" suffix words
  modelStr = modelStr.replace(/\s+(Workstation|Laptop|Server)$/i, '').trim();
  return { brand: brand || modelStr.split(' ')[0], model: modelStr };
}

function getFormFactor(p) {
  const n = norm(p.name);
  if (n.includes('usff') || n.includes('ultra slim')) return 'USFF';
  if (n.includes('sff') || n.includes('small form')) return 'SFF';
  if (n.includes(' mt ') || n.includes('tower') || n.includes(' t ') || n.endsWith(' t')) return 'MT';
  if (n.includes('usdt')) return 'USDT';
  if (n.includes('mini')) return 'Mini';
  return '';
}

// ── Sheet: PC (same columns as PC1) ──────────────────
// Marka | Model | CPU | RAM | SSD | GPU | Form Factor | Cope | Shitje
if (notInExcel.PC.length > 0) {
  const pcData = [['Marka', 'Model', 'CPU', 'RAM', 'SSD', 'GPU', 'Form Factor', 'Cope', 'Shitje']];
  for (const p of notInExcel.PC) {
    const { brand, model } = splitBrandModel(p);
    pcData.push([
      brand,
      model,
      getCPU(p),
      getRAM(p),
      getSSD(p),
      getGPU(p),
      getFormFactor(p),
      '',
      priceDisplay(p),
    ]);
  }
  const ws = xlsx.utils.aoa_to_sheet(pcData);
  xlsx.utils.book_append_sheet(outWb, ws, 'PC');
}

// ── Sheet: Workstation ────────────────────────────────
// Brand | Model | CPU | RAM | SSD | GPU | Shitje
if (notInExcel.Workstation.length > 0) {
  const wsData = [['Brand', 'Model', 'CPU', 'RAM', 'SSD', 'GPU', 'Shitje']];
  for (const p of notInExcel.Workstation) {
    const { brand, model } = splitBrandModel(p);
    wsData.push([
      brand,
      model,
      getCPU(p),
      getRAM(p),
      getSSD(p),
      getGPU(p),
      priceDisplay(p),
    ]);
  }
  const ws = xlsx.utils.aoa_to_sheet(wsData);
  xlsx.utils.book_append_sheet(outWb, ws, 'Workstation');
}

// ── Sheet: Laptop (no header — same as input) ─────────
// Brand | Model | CPU | RAM | SSD | GPU | Shitje | Grade
if (notInExcel.Laptop.length > 0) {
  const lapData = [];
  for (const p of notInExcel.Laptop) {
    const { brand, model } = splitBrandModel(p);
    const grade = p.name.match(/\b(Grad[ea]\s*[AB])\b/i)?.[0] || '';
    lapData.push([
      brand,
      model,
      getCPU(p),
      getRAM(p),
      getSSD(p),
      getGPU(p),
      priceDisplay(p),
      grade,
    ]);
  }
  const ws = xlsx.utils.aoa_to_sheet(lapData);
  xlsx.utils.book_append_sheet(outWb, ws, 'Laptop');
}

// ── Sheet: Server ─────────────────────────────────────
// Brand | Model | CPU | RAM | Storage | Shitje
if (notInExcel.Server.length > 0) {
  const srvData = [['Brand', 'Model', 'CPU', 'RAM', 'Storage', 'Shitje']];
  for (const p of notInExcel.Server) {
    const { brand, model } = splitBrandModel(p);
    srvData.push([
      brand,
      model,
      getCPU(p),
      getRAM(p),
      getSSD(p),
      priceDisplay(p),
    ]);
  }
  const ws = xlsx.utils.aoa_to_sheet(srvData);
  xlsx.utils.book_append_sheet(outWb, ws, 'Server');
}

// ── Sheet: Switch ─────────────────────────────────────
// Brand | Model | Ports | SFP | Layer | POE | Shitje
if (notInExcel.Switch.length > 0) {
  const swData = [['Brand', 'Model', 'Ports', 'SFP', 'Layer', 'POE', 'Shitje']];
  for (const p of notInExcel.Switch) {
    const { brand, model } = splitBrandModel(p);
    const a = p.attrs;
    swData.push([
      brand,
      model,
      a.Ports || a.ports || '',
      a.SFP || a.sfp || a.SPF || '',
      a.Layer || a.layer || '',
      a.POE || a.poe || a.PoE || '',
      priceDisplay(p),
    ]);
  }
  const ws = xlsx.utils.aoa_to_sheet(swData);
  xlsx.utils.book_append_sheet(outWb, ws, 'Switch');
}

// ── Sheet: HDD SSD ────────────────────────────────────
// Type | Capacity | Shitje
if (notInExcel.SSD.length + notInExcel.HDD.length > 0) {
  const hddData = [[null, null, 'Shitje Leke']];
  const allStorage = [...notInExcel.SSD, ...notInExcel.HDD];
  for (const p of allStorage) {
    const type = p.cat_name === 'SSD' ? 'SSD' : 'HDD';
    const cap = getSSD(p) || p.name.match(/\b\d+\s*(?:GB|TB)\b/i)?.[0] || '';
    hddData.push([type, cap, priceDisplay(p)]);
  }
  const ws = xlsx.utils.aoa_to_sheet(hddData);
  xlsx.utils.book_append_sheet(outWb, ws, 'HDD SSD');
}

// ── Sheet: GPU ────────────────────────────────────────
const gpuProducts = notInExcel.Other.filter(p => p.cat_name === 'GPU');
if (gpuProducts.length > 0) {
  const gpuData = [['Brand', 'Model', 'VRAM', 'Shitje']];
  for (const p of gpuProducts) {
    const { brand, model } = splitBrandModel(p);
    gpuData.push([brand, model, p.attrs.VRAM || p.attrs.Memory || '', priceDisplay(p)]);
  }
  const ws = xlsx.utils.aoa_to_sheet(gpuData);
  xlsx.utils.book_append_sheet(outWb, ws, 'GPU');
}

// ── Sheet: Monitor ────────────────────────────────────
const monitors = notInExcel.Other.filter(p => p.cat_name === 'Monitor');
if (monitors.length > 0) {
  const monData = [['Brand', 'Model', 'Size', 'Resolution', 'Shitje']];
  for (const p of monitors) {
    const { brand, model } = splitBrandModel(p);
    monData.push([brand, model, p.attrs.Size || p.attrs.size || '', p.attrs.Resolution || '', priceDisplay(p)]);
  }
  const ws = xlsx.utils.aoa_to_sheet(monData);
  xlsx.utils.book_append_sheet(outWb, ws, 'Monitor');
}

// ── Sheet: UPS ────────────────────────────────────────
const upsProducts = notInExcel.Other.filter(p => p.cat_name === 'UPS');
if (upsProducts.length > 0) {
  const upsData = [['Brand', 'Model', 'Capacity', 'Shitje']];
  for (const p of upsProducts) {
    const { brand, model } = splitBrandModel(p);
    upsData.push([brand, model, p.attrs.Capacity || p.attrs.capacity || '', priceDisplay(p)]);
  }
  const ws = xlsx.utils.aoa_to_sheet(upsData);
  xlsx.utils.book_append_sheet(outWb, ws, 'UPS');
}

// ── Sheet: MacBook ─────────────────────────────────────
const macbooks = notInExcel.Other.filter(p => p.cat_name === 'MacBook');
if (macbooks.length > 0) {
  const mbData = [['Brand', 'Model', 'CPU', 'RAM', 'SSD', 'Shitje']];
  for (const p of macbooks) {
    const { brand, model } = splitBrandModel(p);
    mbData.push([brand, model, getCPU(p), getRAM(p), getSSD(p), priceDisplay(p)]);
  }
  const ws = xlsx.utils.aoa_to_sheet(mbData);
  xlsx.utils.book_append_sheet(outWb, ws, 'MacBook');
}

// ── Sheet: NAS ─────────────────────────────────────────
const nasProducts = notInExcel.Other.filter(p => p.cat_name === 'NAS');
if (nasProducts.length > 0) {
  const nasData = [['Brand', 'Model', 'Bays', 'Shitje']];
  for (const p of nasProducts) {
    const { brand, model } = splitBrandModel(p);
    nasData.push([brand, model, p.attrs.Bays || p.attrs.bays || '', priceDisplay(p)]);
  }
  const ws = xlsx.utils.aoa_to_sheet(nasData);
  xlsx.utils.book_append_sheet(outWb, ws, 'NAS');
}

// ── Sheet: RAM ─────────────────────────────────────────
const ramProducts = notInExcel.Other.filter(p => p.cat_name === 'RAM');
if (ramProducts.length > 0) {
  const ramData = [['Brand', 'Model', 'Capacity', 'Type', 'Shitje']];
  for (const p of ramProducts) {
    const { brand, model } = splitBrandModel(p);
    ramData.push([brand, model, p.attrs.Capacity || '', p.attrs.Type || '', priceDisplay(p)]);
  }
  const ws = xlsx.utils.aoa_to_sheet(ramData);
  xlsx.utils.book_append_sheet(outWb, ws, 'RAM');
}

// ── Sheet: Other (KVM, MikroTik, Printer, Aksesore etc.) ──
const otherCats = notInExcel.Other.filter(p =>
  !['GPU','Monitor','UPS','MacBook','NAS','RAM'].includes(p.cat_name)
);
if (otherCats.length > 0) {
  const othData = [['Category', 'Brand', 'Model', 'Shitje']];
  for (const p of otherCats) {
    const { brand, model } = splitBrandModel(p);
    othData.push([p.cat_name, brand, model, priceDisplay(p)]);
  }
  const ws = xlsx.utils.aoa_to_sheet(othData);
  xlsx.utils.book_append_sheet(outWb, ws, 'Tjera');
}

// ──────────────────────────────────────────────
// 6. Write the file
// ──────────────────────────────────────────────
const outFile = 'produktet-ne-site-jo-ne-liste.xlsx';
xlsx.writeFile(outWb, outFile);

// Summary
console.log('\n=== Products on site but NOT in "Liste cmimesh.xlsx" ===');
console.log('PC:', notInExcel.PC.length);
console.log('Workstation:', notInExcel.Workstation.length);
console.log('Laptop:', notInExcel.Laptop.length);
console.log('Server:', notInExcel.Server.length);
console.log('Switch:', notInExcel.Switch.length);
console.log('SSD:', notInExcel.SSD.length);
console.log('HDD:', notInExcel.HDD.length);
console.log('Other categories (GPU, Monitor, UPS, etc.):', notInExcel.Other.length);
console.log('\nTotal:', Object.values(notInExcel).reduce((s, a) => s + a.length, 0));
console.log('\nSaved to:', outFile);
