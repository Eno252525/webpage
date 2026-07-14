// Adds generic 3.5" (LFF) SAS HDD listings by capacity to the "SAS HDD" subcategory.
// These are capacity-based generic listings (no specific model), sharing the
// generic unbranded 3.5" HDD photo already in uploads/ (hdd-500gb.webp).
// Idempotent: if a slug already exists its price is updated; otherwise it is created.
import db, { createProduct, getProductBySlug } from '../database.js';

const cat = db.prepare("SELECT id FROM categories WHERE slug = 'sas-hdd'").get();
if (!cat) throw new Error('sas-hdd category missing');

const GENERIC_IMG = '/uploads/hdd-500gb.webp';

const short = (cap) =>
  `Disk SAS enterprise 3.5" me kapacitet ${cap} për servera dhe sisteme storage. I testuar dhe i rinovuar.`;
const desc = (cap) =>
  `Hard disk i klasës enterprise me ndërfaqe SAS dhe format 3.5" (LFF), kapacitet ${cap}. I projektuar për ` +
  `punë të vazhdueshme 24/7 në servera dhe sisteme storage, me besueshmëri dhe performancë të lartë. ` +
  `Disku është i testuar dhe i rinovuar, gati për përdorim.`;

// [capacity label, slug suffix, price]
const rows = [
  ['600GB', '600gb', 500],
  ['1TB', '1tb', 2500],
  ['2TB', '2tb', 5200],
  ['3TB', '3tb', 6200],
  ['4TB', '4tb', 10000],
  ['6TB', '6tb', 12000],
  ['8TB', '8tb', 14000],
  ['12TB', '12tb', 18000],
  ['18TB', '18tb', 25000],
];

for (const [cap, suffix, price] of rows) {
  const slug = `sas-hdd-3-5-${suffix}`;
  const name = `SAS HDD 3.5" ${cap}`;
  const existing = getProductBySlug(slug);
  if (existing) {
    db.prepare('UPDATE products SET price = ?, sale_price = NULL WHERE id = ?').run(price, existing.id);
    console.log(`Updated #${existing.id}: ${name} -> ${price} L`);
    continue;
  }
  const p = createProduct({
    name,
    slug,
    short_description: short(cap),
    description: desc(cap),
    price,
    category_id: cat.id,
    brand: '',
    images: [GENERIC_IMG],
    attributes: {
      Type: 'HDD',
      Class: 'Enterprise',
      Interface: 'SAS',
      'Form Factor': '3.5-inch (LFF)',
      Capacity: cap,
    },
    in_stock: true,
  });
  console.log(`Added #${p.id}: ${p.name} -> ${price} L`);
}

console.log('Done.');
