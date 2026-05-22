// Adds enterprise 800GB SAS SSDs (Mixed Use) to the SAS SSD subcategory.
// Idempotent: re-running skips products whose slug already exists.
// Source images live in the project root; they are converted to WebP into uploads/.
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';
import db, { createProduct, getProductBySlug } from '../database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uploadsDir = path.join(root, 'uploads');

async function toWebp(srcRel, destSlug) {
  const srcAbs = path.join(root, srcRel);
  if (!fs.existsSync(srcAbs)) throw new Error(`Missing source image: ${srcRel}`);
  const destAbs = path.join(uploadsDir, `${destSlug}.webp`);
  await sharp(srcAbs)
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(destAbs);
  return `/uploads/${destSlug}.webp`;
}

// ── Resolve category (database.js created/migrated it on import) ──────────────
const catId = slug => {
  const c = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (!c) throw new Error(`category missing: ${slug}`);
  return c.id;
};
const SAS_SSD = catId('sas-ssd');

// ── Product data ─────────────────────────────────────────────────────────────
const SSD_DESC = subject =>
  `SSD i klasës enterprise me ndërfaqe SAS 12Gbps dhe memorie 3D TLC NAND. I projektuar për ngarkesa ` +
  `të përziera leximi/shkrimi (Mixed Use, 3 DWPD), ofron performancë të lartë, qëndrueshmëri dhe mbrojtje ` +
  `nga humbja e energjisë për servera e sisteme storage. ${subject} është i testuar dhe i rinovuar, gati për përdorim.`;

const products = [
  {
    name: 'Dell KPM5XMUG800G 800GB SAS SSD 2.5"',
    slug: 'dell-kpm5xmug800g-800gb-sas-ssd',
    brand: 'Dell',
    image: { src: 'DHRVV___NEW_1.jpg', dest: 'dell-kpm5xmug800g-800gb-sas-ssd' },
    short_description: 'SSD SAS Dell-certified 800GB · Mixed Use 3 DWPD · 2.5" për servera PowerEdge.',
    description: SSD_DESC('Disku Dell (Toshiba/Kioxia PM5-M)'),
    attributes: {
      'Type': 'SSD',
      'Series': 'Toshiba/Kioxia PM5-M (Dell-certified)',
      'Interface': 'SAS 12Gbps',
      'Form Factor': '2.5-inch (SFF)',
      'Capacity': '800 GB',
      'NAND Flash': 'Toshiba BiCS FLASH 3D TLC',
      'Endurance': 'Mixed Use — 3 DWPD',
      'MTBF': '2,500,000 orë',
      'Class': 'Enterprise',
      'Compatibility': 'Dell PowerEdge',
      'Features': 'Dual-port SAS, hot-plug, power-loss protection',
      'Model Number': 'KPM5XMUG800G',
      'Part Number': 'Dell DP/N 0DHRVV (SDFBB85DAB01)',
    },
  },
  {
    name: 'HPE KPM5XMUG800G 800GB SAS SSD 2.5"',
    slug: 'hpe-kpm5xmug800g-800gb-sas-ssd',
    brand: 'HPE',
    // TODO: placeholder image — this source photo is actually a Samsung PM1635 400GB
    // (HPE MO0400JFFCF, P/N 822552-001). Replace with a real KPM5XMUG800G photo when available.
    image: { src: 'hp_400gb_ssd_sas_2.5_12g_mu_ec_822552-001_angle_zoom_1.avif', dest: 'hpe-kpm5xmug800g-800gb-sas-ssd' },
    short_description: 'SSD SAS HPE 800GB · Mixed Use 3 DWPD · 2.5" për servera ProLiant.',
    description: SSD_DESC('Disku HPE (Toshiba/Kioxia PM5-M)'),
    attributes: {
      'Type': 'SSD',
      'Series': 'Toshiba/Kioxia PM5-M (HPE)',
      'Interface': 'SAS 12Gbps',
      'Form Factor': '2.5-inch (SFF)',
      'Capacity': '800 GB',
      'NAND Flash': 'Toshiba BiCS FLASH 3D TLC',
      'Endurance': 'Mixed Use — 3 DWPD',
      'MTBF': '2,500,000 orë',
      'Class': 'Enterprise',
      'Compatibility': 'HPE ProLiant Gen9 / Gen10',
      'Features': 'Dual-port SAS, hot-plug, Smart Carrier (SC), power-loss protection',
      'Model Number': 'KPM5XMUG800G',
    },
  },
  {
    name: 'HPE ST800FM0403 800GB SAS SSD 2.5"',
    slug: 'hpe-st800fm0403-800gb-sas-ssd',
    brand: 'HPE',
    image: { src: 'st800fm0403-ta.jpg', dest: 'hpe-st800fm0403-800gb-sas-ssd' },
    short_description: 'SSD SAS HPE 800GB · Mixed Use 3 DWPD · 2.5" për servera ProLiant dhe storage MSA.',
    description: SSD_DESC('Disku HPE (i prodhuar nga Seagate)'),
    attributes: {
      'Type': 'SSD',
      'Series': 'HPE Enterprise (i prodhuar nga Seagate)',
      'Interface': 'SAS 12Gbps',
      'Form Factor': '2.5-inch (SFF)',
      'Capacity': '800 GB',
      'NAND Flash': '3D TLC NAND',
      'Endurance': 'Mixed Use — 3 DWPD',
      'Class': 'Enterprise',
      'Compatibility': 'HPE ProLiant Gen8 / Gen9 / Gen10 · storage MSA',
      'Features': 'Dual-port SAS, hot-plug',
      'Model Number': 'ST800FM0403',
      'Manufacturer': 'Seagate Technology',
      'Part Number': 'HPE 871888-002 (spare 842783-002)',
    },
  },
  {
    name: 'HPE MO000800JWDKV 800GB SAS SSD 2.5"',
    slug: 'hpe-mo000800jwdkv-800gb-sas-ssd',
    brand: 'HPE',
    image: { src: 'HP_G8-G10_SAS_SSD_2_5.jpg', dest: 'hpe-mo000800jwdkv-800gb-sas-ssd' },
    short_description: 'SSD SAS HPE 800GB · Mixed Use 3 DWPD · 2.5" për servera ProLiant Gen9/Gen10.',
    description: SSD_DESC('Disku HPE'),
    attributes: {
      'Type': 'SSD',
      'Series': 'HPE Enterprise',
      'Interface': 'SAS 12Gbps',
      'Form Factor': '2.5-inch (SFF)',
      'Capacity': '800 GB',
      'NAND Flash': '3D TLC NAND',
      'Endurance': 'Mixed Use — 3 DWPD',
      'Class': 'Enterprise',
      'Compatibility': 'HPE ProLiant Gen9 / Gen10',
      'Features': 'Dual-port SAS, hot-plug, Smart Carrier (SC), digitally signed firmware',
      'Model Number': 'MO000800JWDKV',
      'Part Number': 'HPE 873569-001',
    },
  },
  {
    name: 'HPE MO000800JWTBR 800GB SAS SSD 2.5"',
    slug: 'hpe-mo000800jwtbr-800gb-sas-ssd',
    brand: 'HPE',
    image: { src: '372927.webp', dest: 'hpe-mo000800jwtbr-800gb-sas-ssd' },
    short_description: 'SSD SAS HPE 800GB · Mixed Use 3 DWPD · 2.5" për servera ProLiant Gen9/Gen10.',
    description: SSD_DESC('Disku HPE (Toshiba/Kioxia PM5-V)'),
    attributes: {
      'Type': 'SSD',
      'Series': 'Toshiba/Kioxia PM5-V (HPE)',
      'Interface': 'SAS 12Gbps',
      'Form Factor': '2.5-inch (SFF)',
      'Capacity': '800 GB',
      'NAND Flash': 'Toshiba BiCS FLASH 3D TLC',
      'Endurance': 'Mixed Use — 3 DWPD',
      'MTBF': '2,500,000 orë',
      'Class': 'Enterprise',
      'Compatibility': 'HPE ProLiant Gen9 / Gen10',
      'Features': 'Dual-port SAS, hot-plug, Smart Carrier (SC), digitally signed firmware',
      'Model Number': 'MO000800JWTBR',
      'OEM Equivalent': 'Kioxia/Toshiba KPM51VUG800G (PM5-V)',
      'Part Number': 'HPE P04174-002',
    },
  },
];

for (const p of products) {
  if (getProductBySlug(p.slug)) {
    console.log(`Skipped (exists): ${p.slug}`);
    continue;
  }
  const imageUrl = await toWebp(p.image.src, p.image.dest);
  const product = createProduct({
    name: p.name,
    slug: p.slug,
    short_description: p.short_description,
    description: p.description,
    price: 0, // no fixed price — customers inquire via WhatsApp
    category_id: SAS_SSD,
    brand: p.brand,
    images: [imageUrl],
    attributes: p.attributes,
    in_stock: true,
  });
  console.log(`Added #${product.id}: ${product.name} -> ${imageUrl}`);
}

console.log('Done.');
