import Database from 'better-sqlite3';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const db = new Database(path.join(root, 'products.db'), { readonly: true });

// RAM is category id 23 (Komponente → RAM)
const rows = db
  .prepare('SELECT id,name,attributes FROM products WHERE category_id=23 ORDER BY name')
  .all();

// Each RAM product carries variant pricing in attributes.prices, keyed either by
// capacity alone ("8 GB") or capacity+frequency ("8 GB|3200 MHz"). Expand every
// priced variant into its own row.
const data = [];
for (const r of rows) {
  let attr = {};
  try { attr = JSON.parse(r.attributes || '{}'); } catch {}
  const prices = attr.prices || {};
  for (const [key, price] of Object.entries(prices)) {
    const [capacity, frequency] = key.split('|');
    data.push({
      model: r.name,
      type: attr['Tipi'] || '',
      usage: attr['Përdorimi'] || '',
      ecc: attr['ECC'] || '',
      voltage: attr['Voltazhi'] || '',
      capacity: capacity || '',
      frequency: frequency || '',
      price: Number(price) || 0,
    });
  }
}

// Sort by model, then capacity (GB numeric), then frequency (MHz numeric).
const num = (s) => Number(String(s).replace(/[^\d.]/g, '')) || 0;
data.sort((a, b) =>
  a.model.localeCompare(b.model) ||
  num(a.capacity) - num(b.capacity) ||
  num(a.frequency) - num(b.frequency)
);

const header = [
  'Model', 'Tipi', 'Përdorimi', 'ECC', 'Voltazhi',
  'Kapaciteti', 'Frekuenca', 'Çmimi (Lekë)',
];

const aoa = [header];
for (const d of data) {
  aoa.push([
    d.model, d.type, d.usage, d.ecc, d.voltage,
    d.capacity, d.frequency, d.price,
  ]);
}

const ws = xlsx.utils.aoa_to_sheet(aoa);
ws['!cols'] = [
  { wch: 42 }, { wch: 34 }, { wch: 20 }, { wch: 16 },
  { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
];
ws['!autofilter'] = {
  ref: xlsx.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }),
};

const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'RAM');

const out = path.join(root, 'RAM-models-and-prices.xlsx');
xlsx.writeFile(wb, out);
console.log('Wrote', out, 'with', data.length, 'RAM variants from', rows.length, 'products');
