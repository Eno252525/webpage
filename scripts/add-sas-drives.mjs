// Adds enterprise SAS drives and tidies the SAS category.
// Idempotent: re-running skips products whose slug already exists.
// Source images live in ../_drive_src/ ; they are converted to WebP into uploads/.
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

// ── Resolve categories (database.js created/migrated them on import) ──────────
const catId = slug => {
  const c = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (!c) throw new Error(`category missing: ${slug}`);
  return c.id;
};
const SAS = catId('sas'), SAS_HDD = catId('sas-hdd'), SAS_SSD = catId('sas-ssd');

// ── Move any drives sitting directly in the SAS root into SAS HDD ─────────────
const moved = db.prepare(
  "UPDATE products SET category_id = ?, updated_at = datetime('now') WHERE category_id = ?"
).run(SAS_HDD, SAS);
if (moved.changes) console.log(`Moved ${moved.changes} existing drive(s) from SAS into SAS HDD.`);

// ── Product data ─────────────────────────────────────────────────────────────
const HDD_DESC = brand =>
  `Disk i fortë (HDD) i klasës enterprise me ndërfaqe SAS 12Gbps dhe shpejtësi rrotullimi 10,000 RPM. ` +
  `I projektuar për servera dhe sisteme storage me ngarkesë të vazhdueshme 24/7, ofron besueshmëri të lartë ` +
  `dhe akses të shpejtë në të dhëna. Disku ${brand} është i testuar dhe i rinovuar, gati për përdorim.`;

const products = [
  {
    name: 'Seagate Exos 10E2400 1.2TB 10K SAS 2.5"',
    slug: 'seagate-exos-10e2400-1-2tb-10k-sas',
    brand: 'Seagate',
    category_id: SAS_HDD,
    image: { src: 'ST1200MM0009_1000-1.jpg', dest: 'seagate-exos-10e2400-1-2tb-10k-sas' },
    short_description: 'Disk SAS enterprise 1.2TB · 10K RPM · 2.5" — i testuar për servera dhe storage.',
    description: HDD_DESC('Seagate Exos'),
    attributes: {
      'Type': 'HDD',
      'Series': 'Seagate Exos 10E2400',
      'Interface': 'SAS 12Gbps',
      'Form Factor': '2.5-inch (SFF)',
      'Capacity': '1.2 TB',
      'Rotational Speed': '10,000 RPM',
      'Cache': '128 MB',
      'Class': 'Enterprise / Mission-Critical',
      'Features': 'Dual-port SAS, hot-plug',
      'Model Number': 'ST1200MM0009',
      'Part Number': '1XH200-040',
    },
  },
  {
    name: 'Dell Exos 10E2400 1.2TB 10K SAS 2.5"',
    slug: 'dell-exos-10e2400-1-2tb-10k-sas',
    brand: 'Dell',
    category_id: SAS_HDD,
    image: { src: 'ST1200MM0069-DEL_1000-1.jpg', dest: 'dell-exos-10e2400-1-2tb-10k-sas' },
    short_description: 'Disk SAS Dell-certified 1.2TB · 10K RPM · 2.5" për servera PowerEdge.',
    description: HDD_DESC('Dell (Seagate Exos)'),
    attributes: {
      'Type': 'HDD',
      'Series': 'Seagate Exos 10E2400 (Dell-certified)',
      'Interface': 'SAS 12Gbps',
      'Form Factor': '2.5-inch (SFF)',
      'Capacity': '1.2 TB',
      'Rotational Speed': '10,000 RPM',
      'Cache': '128 MB',
      'Class': 'Enterprise / Mission-Critical',
      'Compatibility': 'Dell PowerEdge',
      'Features': 'Dual-port SAS, hot-plug',
      'Model Number': 'ST1200MM0099',
      'Part Number': 'Dell DP/N 0MMYNM (0G2G54 / 1XH230-150)',
    },
  },
  {
    name: 'Toshiba AL15SEB120N 1.2TB 10K SAS 2.5"',
    slug: 'toshiba-al15seb120n-1-2tb-10k-sas',
    brand: 'Toshiba',
    category_id: SAS_HDD,
    image: { src: 's-l1200-1.jpg', dest: 'toshiba-al15seb120n-1-2tb-10k-sas' },
    short_description: 'Disk SAS enterprise 1.2TB · 10K RPM · 2.5" — i testuar për servera dhe storage.',
    description: HDD_DESC('Toshiba'),
    attributes: {
      'Type': 'HDD',
      'Series': 'Toshiba AL15SEB (Enterprise Performance)',
      'Interface': 'SAS 12Gbps',
      'Form Factor': '2.5-inch (SFF)',
      'Capacity': '1.2 TB',
      'Rotational Speed': '10,000 RPM',
      'Cache': '128 MB',
      'Class': 'Enterprise / Mission-Critical',
      'Features': 'Dual-port SAS, hot-plug',
      'Model Number': 'AL15SEB120N',
      'Part Number': 'HDEBL02FSA51',
    },
  },
  {
    name: 'HGST Ultrastar C10K1800 1.2TB 10K SAS 2.5"',
    slug: 'hgst-ultrastar-c10k1800-1-2tb-10k-sas',
    brand: 'HGST',
    category_id: SAS_HDD,
    image: { path: '/uploads/hgst-ultrastar-c10k1800-1-8tb-10k-sas-hard-drive.avif' },
    short_description: 'Disk SAS enterprise 1.2TB · 10K RPM · 2.5" — i testuar për servera dhe storage.',
    description: HDD_DESC('HGST Ultrastar'),
    attributes: {
      'Type': 'HDD',
      'Series': 'HGST Ultrastar C10K1800',
      'Interface': 'SAS 12Gbps',
      'Form Factor': '2.5-inch (SFF)',
      'Capacity': '1.2 TB',
      'Rotational Speed': '10,000 RPM',
      'Cache': '128 MB',
      'Class': 'Enterprise / Mission-Critical',
      'Features': 'Dual-port SAS, hot-plug',
      'Model Number': 'HUC101812CSS200',
      'Part Number': '0B31816 (EMC 118000059-01)',
    },
  },
  {
    name: 'Dell Toshiba AL15SEB120NY 1.2TB 10K SAS 2.5"',
    slug: 'dell-toshiba-al15seb120ny-1-2tb-10k-sas',
    brand: 'Dell',
    category_id: SAS_HDD,
    image: { path: '/uploads/dell-ultrastar-c10k1800-1-8tb-10k-sas-hard-drive-caddy.jpg' },
    short_description: 'Disk SAS Dell-certified 1.2TB · 10K RPM · 2.5" për servera PowerEdge.',
    description: HDD_DESC('Dell (Toshiba)'),
    attributes: {
      'Type': 'HDD',
      'Series': 'Toshiba AL15SEB (Dell-certified)',
      'Interface': 'SAS 12Gbps',
      'Form Factor': '2.5-inch (SFF)',
      'Capacity': '1.2 TB',
      'Rotational Speed': '10,000 RPM',
      'Cache': '128 MB',
      'Class': 'Enterprise / Mission-Critical',
      'Compatibility': 'Dell PowerEdge',
      'Features': 'Dual-port SAS, hot-plug',
      'Model Number': 'AL15SEB120NY',
      'Part Number': 'Dell DP/N 001M0D (HDEBL82DAB51)',
    },
  },
  {
    name: 'HPE EG1200JEMDA 1.2TB 10K SAS 2.5"',
    slug: 'hpe-eg1200jemda-1-2tb-10k-sas',
    brand: 'HPE',
    category_id: SAS_HDD,
    image: { src: '_drive_src/hpe-sas.png', dest: 'hpe-eg1200jemda-1-2tb-10k-sas' },
    short_description: 'Disk SAS HPE 1.2TB · 10K RPM · 2.5" për servera ProLiant.',
    description: HDD_DESC('HPE (Seagate)'),
    attributes: {
      'Type': 'HDD',
      'Series': 'HPE Enterprise',
      'Interface': 'SAS 12Gbps',
      'Form Factor': '2.5-inch (SFF)',
      'Capacity': '1.2 TB',
      'Rotational Speed': '10,000 RPM',
      'Cache': '128 MB',
      'Class': 'Enterprise / Mission-Critical',
      'Compatibility': 'HPE ProLiant Gen8 / Gen9 / Gen10',
      'Features': 'Dual-port SAS, hot-plug',
      'Model Number': 'EG1200JEMDA',
      'OEM Equivalent': 'Seagate ST1200MM0088',
      'Part Number': 'HPE 781514-002',
    },
  },
  {
    name: 'HPE EG1200JEHMC 1.2TB 10K SAS 2.5"',
    slug: 'hpe-eg1200jehmc-1-2tb-10k-sas',
    brand: 'HPE',
    category_id: SAS_HDD,
    image: { src: '872479-B21-600x600.jpg', dest: 'hpe-eg1200jehmc-1-2tb-10k-sas' },
    short_description: 'Disk SAS HPE 1.2TB · 10K RPM · 2.5" për servera ProLiant.',
    description: HDD_DESC('HPE (HGST)'),
    attributes: {
      'Type': 'HDD',
      'Series': 'HPE Enterprise',
      'Interface': 'SAS 12Gbps',
      'Form Factor': '2.5-inch (SFF)',
      'Capacity': '1.2 TB',
      'Rotational Speed': '10,000 RPM',
      'Cache': '128 MB',
      'Class': 'Enterprise / Mission-Critical',
      'Compatibility': 'HPE ProLiant Gen8 / Gen9 / Gen10',
      'Features': 'Dual-port SAS, hot-plug',
      'Model Number': 'EG1200JEHMC',
      'OEM Equivalent': 'HGST Ultrastar C10K1800 (HUC101812CSS204)',
      'Part Number': 'HPE 768788-004',
    },
  },
  {
    name: 'Dell EMC PM1645a 800GB SAS SSD 2.5"',
    slug: 'dell-emc-pm1645a-800gb-sas-ssd',
    brand: 'Dell',
    category_id: SAS_SSD,
    image: { src: '348215.jpg', dest: 'dell-emc-pm1645a-800gb-sas-ssd' },
    short_description: 'SSD SAS enterprise 800GB · Mixed Use 3 DWPD · 2.5".',
    description:
      'SSD i klasës enterprise me ndërfaqe SAS 12Gbps dhe memorie Samsung V-NAND TLC. Modeli PM1645a ' +
      '(Mixed Use, 3 DWPD) ofron performancë të lartë dhe qëndrueshmëri për servera e sisteme storage me ' +
      'ngarkesë të përzier leximi/shkrimi, me mbrojtje nga humbja e energjisë. I testuar dhe i rinovuar.',
    attributes: {
      'Type': 'SSD',
      'Series': 'Samsung PM1645a (Dell EMC)',
      'Interface': 'SAS 12Gbps',
      'Form Factor': '2.5-inch (SFF)',
      'Capacity': '800 GB',
      'NAND Flash': 'Samsung V-NAND TLC',
      'Endurance': 'Mixed Use — 3 DWPD',
      'MTBF': '2,000,000 orë',
      'Class': 'Enterprise',
      'Features': 'Dual-port SAS, hot-plug, power-loss protection',
      'Model Number': 'MZILT800HBHQAD3 (MZ-ILT800C)',
      'Part Number': 'Dell DP/N 06FVW4 (0GW8T1)',
    },
  },
];

for (const p of products) {
  if (getProductBySlug(p.slug)) {
    console.log(`Skipped (exists): ${p.slug}`);
    continue;
  }
  const imageUrl = p.image.path
    ? p.image.path
    : await toWebp(p.image.src, p.image.dest);
  const product = createProduct({
    name: p.name,
    slug: p.slug,
    short_description: p.short_description,
    description: p.description,
    price: 0, // no fixed price — customers inquire via WhatsApp
    category_id: p.category_id,
    brand: p.brand,
    images: [imageUrl],
    attributes: p.attributes,
    in_stock: true,
  });
  console.log(`Added #${product.id}: ${product.name} -> ${imageUrl}`);
}

console.log('Done.');
