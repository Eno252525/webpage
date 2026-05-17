import Database from 'better-sqlite3';
import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'products.db'));

const rows = db.prepare(`
  SELECT p.*, c.name as category_name
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE p.price = 0 OR p.price IS NULL
  ORDER BY c.name ASC, p.name ASC
`).all();

function stripHtml(str) {
  return (str || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|dt|dd|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#?[a-z0-9]+;/gi, ' ');
}

// Parse "Key: Value" pairs from text.
// The DB stores separators as CR + literal backslash-n (chars 13, 92, 110).
// Normalise all separator variants to real LF before splitting.
function parseKV(text) {
  const map = {};
  const normalised = text
    .replace(/\r/g, '\n')      // real CR → LF
    .replace(/\\n/g, '\n');    // literal backslash-n → LF
  const lines = normalised.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^([^:]+?):\s*(.+)$/);
    if (m) map[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return map;
}

function extractSpecs(row) {
  const raw = stripHtml(row.short_description || row.description || '');
  const kv = parseKV(raw);

  // CPU
  const cpu = kv['cpu'] || '';

  // RAM
  const ram = kv['ram'] || '';

  // SSD — labelled as STORAGE, Storage, SSD, or HDD
  const ssd = kv['storage'] || kv['ssd'] || kv['hdd'] || '';

  // GPU — labelled as GPU, Graphics, Graphics card
  let gpu = kv['gpu'] || kv['graphics'] || kv['graphics card'] || '';

  // For products that ARE a GPU card, use the product name as GPU value
  if (!gpu) {
    const nameLower = row.name.toLowerCase();
    if (nameLower.includes('gpu') || nameLower.includes('graphics card') ||
        nameLower.includes('geforce') || nameLower.includes('quadro') ||
        nameLower.includes('radeon') || nameLower.includes('rtx') ||
        nameLower.includes('gtx') || nameLower.includes('rx ')) {
      gpu = row.name;
    }
  }

  return { cpu, ram, ssd, gpu };
}

const sheetData = rows.map(row => {
  const { cpu, ram, ssd, gpu } = extractSpecs(row);

  return {
    'ID':       row.id,
    'Name':     row.name,
    'Brand':    row.brand || '',
    'Category': row.category_name || '',
    'CPU':      cpu,
    'RAM':      ram,
    'GPU':      gpu,
    'SSD':      ssd,
    'Badge':    row.badge || '',
    'In Stock': row.in_stock ? 'Yes' : 'No',
    'Featured': row.featured ? 'Yes' : 'No',
  };
});

// Log fill stats
const filled = { cpu: 0, ram: 0, gpu: 0, ssd: 0 };
for (const r of sheetData) {
  if (r['CPU']) filled.cpu++;
  if (r['RAM']) filled.ram++;
  if (r['GPU']) filled.gpu++;
  if (r['SSD']) filled.ssd++;
}
console.log(`Filled: CPU=${filled.cpu}, RAM=${filled.ram}, GPU=${filled.gpu}, SSD=${filled.ssd} out of ${rows.length}`);

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(sheetData);

// Auto-size columns
const colWidths = {};
for (const row of sheetData) {
  for (const [key, val] of Object.entries(row)) {
    const len = Math.max(String(key).length, String(val).length);
    colWidths[key] = Math.max(colWidths[key] || 0, len);
  }
}
ws['!cols'] = Object.values(colWidths).map(w => ({ wch: Math.min(w + 2, 80) }));

XLSX.utils.book_append_sheet(wb, ws, 'No Price Products');

const outPath = path.join(__dirname, 'products-no-price.xlsx');
XLSX.writeFile(wb, outPath);

console.log(`Exported ${rows.length} products → ${outPath}`);
