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

function parseKV(text) {
  const map = {};
  const normalised = text
    .replace(/\r/g, '\n')
    .replace(/\\n/g, '\n');
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

  const cpu = kv['cpu'] || '';
  const ram = kv['ram'] || '';
  const ssd = kv['storage'] || kv['ssd'] || kv['hdd'] || '';

  let gpu = kv['gpu'] || kv['graphics'] || kv['graphics card'] || '';
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
  const hasPrice = row.price && row.price > 0;

  return {
    'ID':         row.id,
    'Name':       row.name,
    'Brand':      row.brand || '',
    'Category':   row.category_name || '',
    'CPU':        cpu,
    'RAM':        ram,
    'GPU':        gpu,
    'SSD':        ssd,
    'Price':      hasPrice ? row.price : '',
    'Sale Price': row.sale_price || '',
    'Badge':      row.badge || '',
    'In Stock':   row.in_stock ? 'Yes' : 'No',
    'Featured':   row.featured ? 'Yes' : 'No',
  };
});

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(sheetData);

const colWidths = {};
for (const row of sheetData) {
  for (const [key, val] of Object.entries(row)) {
    const len = Math.max(String(key).length, String(val).length);
    colWidths[key] = Math.max(colWidths[key] || 0, len);
  }
}
ws['!cols'] = Object.values(colWidths).map(w => ({ wch: Math.min(w + 2, 80) }));

XLSX.utils.book_append_sheet(wb, ws, 'All Products');

const outPath = path.join(__dirname, 'products-all.xlsx');
XLSX.writeFile(wb, outPath);

console.log(`Exported ${rows.length} products → ${outPath}`);
