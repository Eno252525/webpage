// Adds generic 2.5" (SFF) SAS HDD listings by capacity to the "SAS HDD" subcategory.
// Capacity-based generic listings (no specific model). No unbranded 2.5" photo
// exists in the repo, so a representative 2.5" SAS-in-caddy photo is copied to a
// neutral filename (sas-hdd-2-5-generic.webp) and shared — swap for a proper
// generic photo when available. Single clean price (left column of the price list).
// Idempotent: if a slug already exists its price is updated; otherwise it is created.
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import db, { createProduct, getProductBySlug } from '../database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uploadsDir = path.join(root, 'uploads');

// Provision the shared generic 2.5" image (copy of the HPE 2.5" SAS caddy photo).
const GENERIC_IMG = '/uploads/sas-hdd-2-5-generic.webp';
const genAbs = path.join(uploadsDir, 'sas-hdd-2-5-generic.webp');
if (!fs.existsSync(genAbs)) {
  const srcAbs = path.join(uploadsDir, 'hpe-eg1200jemda-1-2tb-10k-sas.webp');
  if (!fs.existsSync(srcAbs)) throw new Error('source generic image missing: hpe-eg1200jemda-1-2tb-10k-sas.webp');
  fs.copyFileSync(srcAbs, genAbs);
}

const cat = db.prepare("SELECT id FROM categories WHERE slug = 'sas-hdd'").get();
if (!cat) throw new Error('sas-hdd category missing');

const short = (cap) =>
  `Disk SAS enterprise 2.5" me kapacitet ${cap} për servera dhe sisteme storage. I testuar dhe i rinovuar.`;
const desc = (cap, iface) =>
  `Hard disk i klasës enterprise me ndërfaqe ${iface} dhe format 2.5" (SFF), kapacitet ${cap}. I projektuar ` +
  `për punë të vazhdueshme 24/7 në servera dhe sisteme storage, me besueshmëri dhe performancë të lartë. ` +
  `Disku është i testuar dhe i rinovuar, gati për përdorim.`;

// [capacity label, slug suffix, price, interface]
const rows = [
  ['600GB', '600gb', 2000, 'SAS 12Gbps'],
  ['1.2TB', '1-2tb', 9000, 'SAS 12Gbps'],
  ['1.8TB', '1-8tb-6g', 13000, 'SAS 6Gbps'],
  ['1.8TB', '1-8tb-12g', 16000, 'SAS 12Gbps'],
];

for (const [cap, suffix, price, iface] of rows) {
  const slug = `sas-hdd-2-5-${suffix}`;
  // Distinguish the two 1.8TB variants by their interface speed in the name.
  const speedTag = suffix.startsWith('1-8tb') ? ` (${iface.replace('SAS ', '')})` : '';
  const name = `SAS HDD 2.5" ${cap}${speedTag}`;
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
    description: desc(cap, iface),
    price,
    category_id: cat.id,
    brand: '',
    images: [GENERIC_IMG],
    attributes: {
      Type: 'HDD',
      Class: 'Enterprise',
      Interface: iface,
      'Form Factor': '2.5-inch (SFF)',
      Capacity: cap,
    },
    in_stock: true,
  });
  console.log(`Added #${p.id}: ${p.name} -> ${price} L`);
}

console.log('Done.');
