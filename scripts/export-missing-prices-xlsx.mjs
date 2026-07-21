// Export every product that has no price into an Excel workbook, one sheet per
// category, each carrying that category's relevant specs. "No price" = the
// `price` column is NULL or 0 (and no sale_price). Read-only; writes the .xlsx
// to the project root.
import Database from 'better-sqlite3';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const db = new Database(path.join(root, 'products.db'), { readonly: true });

// Products with no usable price: price NULL/0 AND no positive sale_price.
const rows = db.prepare(`
  SELECT p.id, p.name, p.brand, p.sku, p.attributes,
         c.name AS cat, c.slug AS cat_slug
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE (p.price IS NULL OR p.price = 0)
    AND (p.sale_price IS NULL OR p.sale_price = 0)
  ORDER BY c.name, p.name
`).all();

// Per-category spec columns: [attribute key in JSON, column header]. Order the
// columns the way a human would want to read them. Categories not listed fall
// back to "every attribute key present on their products" (see buildGeneric).
const SPEC_COLUMNS = {
  AIO: [['CPU', 'CPU'], ['RAM', 'RAM'], ['SSD', 'Storage'], ['Screen', 'Screen']],
  'Business Laptops': [['CPU', 'CPU'], ['RAM', 'RAM'], ['SSD', 'Storage'], ['Screen', 'Screen'], ['Touch', 'Touch']],
  PC: [['CPU', 'CPU'], ['RAM', 'RAM'], ['SSD', 'Storage'], ['GPU', 'GPU'], ['Form Factor', 'Form Factor']],
  Workstation: [['CPU', 'CPU'], ['RAM', 'RAM'], ['SSD', 'Storage'], ['GPU', 'GPU']],
  Server: [['CPU', 'CPU'], ['RAM', 'RAM'], ['Storage', 'Storage'], ['Chassis', 'Chassis'],
           ['PSU', 'PSU'], ['Forma', 'Forma'], ['Tipi', 'Tipi'], ['Përputhshmëria', 'Compatibility'],
           ['Part Number', 'Part Number'], ['Gjendja', 'Condition'], ['Condition', 'Condition']],
  Monitor: [['Screen Size', 'Screen Size'], ['Ekrani', 'Screen'], ['Resolution', 'Resolution'],
            ['Rezolucioni', 'Resolution'], ['Refresh Rate', 'Refresh Rate'], ['Panel', 'Panel'],
            ['Response Time', 'Response Time'], ['Ports', 'Ports'], ['Lidhja', 'Ports'],
            ['Rack Units', 'Rack Units'], ['Features', 'Features'], ['Tipi', 'Type'], ['Condition', 'Condition']],
  GPU: [['GPU', 'GPU'], ['Memoria', 'Memory'], ['Ndërfaqja e Memories', 'Memory Interface'],
        ['Ndërfaqja', 'Interface'], ['Daljet', 'Outputs'], ['Konsumi (TDP)', 'TDP'],
        ['Ftohja', 'Cooling'], ['Kategoria', 'Class']],
  'SAS SSD': [['Interface', 'Interface'], ['Form Factor', 'Form Factor'], ['Capacity', 'Capacity'],
              ['Class', 'Class'], ['Series', 'Series'], ['NAND Flash', 'NAND'], ['Endurance', 'Endurance'],
              ['Features', 'Features'], ['Model Number', 'Model Number'], ['Part Number', 'Part Number'],
              ['Gjendja', 'Condition']],
  Others: [['Type', 'Type'], ['Series', 'Series'], ['Ports', 'Ports'], ['WAN', 'WAN'], ['LAN', 'LAN'],
           ['Wi-Fi', 'Wi-Fi'], ['Module Slots', 'Module Slots'], ['AP Capacity', 'AP Capacity'],
           ['Throughput', 'Throughput'], ['Throughput (typ.)', 'Throughput'], ['VPN Throughput', 'VPN Throughput'],
           ['IPsec Peers', 'IPsec Peers'], ['Switching Capacity', 'Switching Capacity'], ['Fabric', 'Fabric'],
           ['Compatibility', 'Compatibility'], ['Parent Required', 'Parent Required'],
           ['Rack Units', 'Rack Units'], ['Variant', 'Variant'], ['Condition', 'Condition']],
};

const parseAttrs = (s) => { try { return JSON.parse(s || '{}'); } catch { return {}; } };

// Group products by category.
const groups = new Map();
for (const r of rows) {
  const key = r.cat || '(Pa kategori)';
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

// For categories without an explicit column map, derive columns from the union
// of attribute keys actually present (stable first-seen order).
function buildGeneric(products) {
  const seen = [];
  for (const p of products) {
    for (const k of Object.keys(parseAttrs(p.attributes))) {
      if (!seen.includes(k)) seen.push(k);
    }
  }
  return seen.map((k) => [k, k]);
}

const wb = xlsx.utils.book_new();
let grandTotal = 0;

// A worksheet-name-safe, unique label (Excel: <=31 chars, no []:*?/\).
const usedNames = new Set();
function sheetName(cat) {
  let n = cat.replace(/[\[\]:*?/\\]/g, ' ').trim().slice(0, 28);
  let name = n, i = 2;
  while (usedNames.has(name.toLowerCase())) name = `${n.slice(0, 25)} ${i++}`;
  usedNames.add(name.toLowerCase());
  return name;
}

for (const [cat, products] of groups) {
  let specCols = SPEC_COLUMNS[cat] || buildGeneric(products);

  // Drop spec columns that are empty for every product in this category, and
  // collapse duplicate headers (some categories map two JSON keys to one header,
  // e.g. Screen/Ekrani) into a single column that takes whichever key is set.
  const headerMap = new Map(); // header -> [json keys]
  for (const [jsonKey, header] of specCols) {
    if (!headerMap.has(header)) headerMap.set(header, []);
    headerMap.get(header).push(jsonKey);
  }
  const valueFor = (attrs, keys) => {
    for (const k of keys) {
      const v = attrs[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
    }
    return '';
  };
  const activeHeaders = [];
  for (const [header, keys] of headerMap) {
    const anySet = products.some((p) => valueFor(parseAttrs(p.attributes), keys) !== '');
    if (anySet) activeHeaders.push([header, keys]);
  }

  const header = ['ID', 'Produkti', 'Marka', 'SKU', ...activeHeaders.map(([h]) => h), 'Çmimi (Lekë)'];
  const aoa = [header];
  for (const p of products) {
    const attrs = parseAttrs(p.attributes);
    aoa.push([
      p.id,
      p.name,
      p.brand || '',
      p.sku || '',
      ...activeHeaders.map(([, keys]) => valueFor(attrs, keys)),
      '', // price intentionally blank — this is the column to fill in
    ]);
  }

  const ws = xlsx.utils.aoa_to_sheet(aoa);
  ws['!cols'] = header.map((h, i) => {
    if (i === 0) return { wch: 6 };            // ID
    if (i === 1) return { wch: 52 };           // Produkti
    if (h === 'Çmimi (Lekë)') return { wch: 14 };
    return { wch: Math.min(Math.max(h.length + 4, 12), 34) };
  });
  ws['!autofilter'] = {
    ref: xlsx.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }),
  };
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  xlsx.utils.book_append_sheet(wb, ws, sheetName(cat));
  grandTotal += products.length;
}

const out = path.join(root, 'Produktet-pa-cmim.xlsx');
xlsx.writeFile(wb, out);
console.log('Wrote', out);
console.log('Categories (sheets):', groups.size, '| Products without price:', grandTotal);
for (const [cat, products] of groups) console.log(`  ${cat}: ${products.length}`);
