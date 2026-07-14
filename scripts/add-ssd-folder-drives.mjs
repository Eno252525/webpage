// Imports the enterprise SSDs photographed in the /SSD folder.
// Per request: every enterprise SSD (SAS + enterprise-SATA) goes into the
// "sas-ssd" subcategory and is labelled Enterprise; the NVMe drive goes into
// "sas-nvme". No fixed price — customers inquire via WhatsApp.
//
// Idempotent: re-running skips products whose slug already exists.
// Source photos live in SSD/_dl/ (sourced online); they are converted to WebP
// into uploads/ and the DB is repointed at /uploads/<slug>.webp.
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
const catId = (slug) => {
  const c = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (!c) throw new Error(`category missing: ${slug}`);
  return c.id;
};
const SAS_SSD = catId('sas-ssd');
const SAS_NVME = catId('sas-nvme');

// ── Products ──────────────────────────────────────────────────────────────────
const products = [
  // ═══ Enterprise SAS SSD ═════════════════════════════════════════════════════
  {
    name: 'Samsung PM1635a 960GB SAS SSD 2.5"',
    slug: 'samsung-pm1635a-960gb-sas-ssd',
    brand: 'Samsung',
    category_id: SAS_SSD,
    image: 'SSD/_dl/samsung-pm1635a.jpg',
    short_description:
      'SSD enterprise Samsung PM1635a 960GB · SAS 12Gbps · Mixed Use · 2.5" për servera dhe storage.',
    description:
      'Samsung PM1635a është një SSD i klasës enterprise me kapacitet 960GB dhe ndërfaqe dual-port SAS 12Gbps, i ndërtuar me memorie V-NAND për ngarkesa të përziera leximi/shkrimi (Mixed Use). Ofron performancë të lartë e të qëndrueshme, mbrojtje nga humbja e energjisë dhe besueshmëri për servera HPE/Dell dhe sisteme storage. Ky variant OEM (HPE/NetApp) është i testuar dhe i rinovuar, gati për përdorim.',
    attributes: {
      Type: 'SSD',
      Class: 'Enterprise',
      Series: 'Samsung PM1635a',
      Interface: 'SAS 12Gbps (dual-port)',
      'Form Factor': '2.5-inch (SFF)',
      Capacity: '960 GB',
      'NAND Flash': 'Samsung V-NAND',
      Endurance: 'Mixed Use',
      Features: 'Dual-port SAS, hot-plug, power-loss protection',
      'Model Number': 'MZ-ILS800B',
      'Part Number': 'MZILS800HEHP-000G3 · HPE X371A / SP-371A',
      Gjendja: 'I përdorur / i rinovuar',
    },
  },
  {
    name: 'HPE SanDisk 3.84TB SAS SSD 2.5"',
    slug: 'hpe-sandisk-3-84tb-sas-ssd',
    brand: 'HPE',
    category_id: SAS_SSD,
    image: 'SSD/_dl/hpe-sandisk-384.png',
    short_description:
      'SSD enterprise HPE/SanDisk 3.84TB · SAS · Read Intensive · 2.5" me kapacitet të madh për storage.',
    description:
      'SSD i klasës enterprise me kapacitet të madh 3.84TB dhe ndërfaqe SAS, i prodhuar nga SanDisk (Optimus) për HPE. I projektuar për ngarkesa me shumë lexim (Read Intensive) në servera dhe sisteme storage / 3PAR, ku kërkohet kapacitet i lartë dhe besueshmëri enterprise. Disku është i testuar dhe i rinovuar, gati për përdorim.',
    attributes: {
      Type: 'SSD',
      Class: 'Enterprise',
      Series: 'HPE / SanDisk Optimus',
      Interface: 'SAS 6Gbps',
      'Form Factor': '2.5-inch (SFF)',
      Capacity: '3.84 TB',
      Endurance: 'Read Intensive',
      Features: 'Dual-port SAS, hot-plug',
      'Model Number': 'DOPM3840S5xnNMRI',
      'Part Number': 'HPE 804170-001 · GPN 806950-001',
      Manufacturer: 'SanDisk Corporation',
      Gjendja: 'I përdorur / i rinovuar',
    },
  },
  {
    name: 'HGST Ultrastar SSD1600MR 1.6TB SAS SSD 2.5"',
    slug: 'hgst-ultrastar-ssd1600mr-1-6tb-sas-ssd',
    brand: 'HGST',
    category_id: SAS_SSD,
    image: 'SSD/_dl/hgst-1600mr.png',
    short_description:
      'SSD enterprise HGST Ultrastar SSD1600MR 1.6TB · SAS 12Gbps · Mixed Use · 2.5".',
    description:
      'HGST (Western Digital) Ultrastar SSD1600MR është një SSD i klasës enterprise me kapacitet 1.6TB dhe ndërfaqe dual-port SAS 12Gbps, me memorie MLC për ngarkesa të përziera (Mixed Use). Ofron performancë të lartë, latencë të ulët dhe besueshmëri për servera dhe sisteme storage. Variant OEM Dell (DP/N 0G8XPN), i testuar dhe i rinovuar.',
    attributes: {
      Type: 'SSD',
      Class: 'Enterprise',
      Series: 'HGST Ultrastar SSD1600MR',
      Interface: 'SAS 12Gbps (dual-port)',
      'Form Factor': '2.5-inch (SFF)',
      Capacity: '1.6 TB',
      'NAND Flash': 'MLC',
      Endurance: 'Mixed Use',
      Features: 'Dual-port SAS, hot-plug',
      'Model Number': 'HUSMR1616ASS205',
      'Part Number': 'Dell DP/N 0G8XPN (0B32299)',
      Gjendja: 'I përdorur / i rinovuar',
    },
  },
  {
    name: 'Dell Toshiba PX02SMF020 200GB SAS SSD 2.5"',
    slug: 'dell-toshiba-px02smf020-200gb-sas-ssd',
    brand: 'Dell',
    category_id: SAS_SSD,
    image: 'SSD/_dl/toshiba-px02smf020.jpg',
    short_description:
      'SSD enterprise Dell/Toshiba PX02SMF020 200GB · SAS 12Gbps · Write Intensive · 2.5".',
    description:
      'Toshiba PX02SMF020 është një SSD i klasës enterprise me kapacitet 200GB dhe ndërfaqe dual-port SAS 12Gbps, me memorie eMLC dhe qëndrueshmëri të lartë (Write Intensive) për ngarkesa intensive shkrimi. I certifikuar Enterprise Class nga Dell (DP/N 0K41XJ), ideal për servera PowerEdge dhe sisteme storage. I testuar dhe i rinovuar.',
    attributes: {
      Type: 'SSD',
      Class: 'Enterprise',
      Series: 'Toshiba PX02SM',
      Interface: 'SAS 12Gbps (dual-port)',
      'Form Factor': '2.5-inch (SFF)',
      Capacity: '200 GB',
      'NAND Flash': 'eMLC',
      Endurance: 'Write Intensive (high endurance)',
      Compatibility: 'Dell PowerEdge',
      Features: 'Dual-port SAS, hot-plug, power-loss protection',
      'Model Number': 'PX02SMF020',
      'Part Number': 'Dell DP/N 0K41XJ',
      Manufacturer: 'Toshiba Corporation',
      Gjendja: 'I përdorur / i rinovuar',
    },
  },
  {
    name: 'Seagate 1200 ST200FM0053 200GB SAS SSD 2.5"',
    slug: 'seagate-1200-st200fm0053-200gb-sas-ssd',
    brand: 'Seagate',
    category_id: SAS_SSD,
    image: 'SSD/_dl/seagate-st200fm0053.jpg',
    short_description:
      'SSD enterprise Seagate 1200 200GB · SAS 12Gbps · eMLC · 2.5" për servera dhe storage.',
    description:
      'Seagate 1200 SSD (ST200FM0053) është një SSD i klasës enterprise me kapacitet 200GB dhe ndërfaqe dual-port SAS 12Gbps, me memorie MLC dhe kontrollues të integruar për performancë të shpejtë e konsistente. I projektuar për servera dhe aplikacione storage që kërkojnë qasje të shpejtë e besueshmëri të lartë. I testuar dhe i rinovuar.',
    attributes: {
      Type: 'SSD',
      Class: 'Enterprise',
      Series: 'Seagate 1200 SSD',
      Interface: 'SAS 12Gbps (dual-port)',
      'Form Factor': '2.5-inch (SFF)',
      Capacity: '200 GB',
      'NAND Flash': 'MLC',
      Features: 'Dual-port SAS, hot-plug',
      'Model Number': 'ST200FM0053',
      'Part Number': '1GD252-007',
      Manufacturer: 'Seagate Technology',
      Gjendja: 'I përdorur / i rinovuar',
    },
  },
  {
    name: 'Intel DC S3500 480GB Enterprise SATA SSD 2.5"',
    slug: 'intel-dc-s3500-480gb-sata-ssd',
    brand: 'Intel',
    category_id: SAS_SSD,
    image: 'SSD/_dl/intel-s3500-480.jpg',
    short_description:
      'SSD enterprise Intel DC S3500 480GB · SATA 6Gbps · Read Intensive · 2.5".',
    description:
      'Intel SSD DC S3500 është një SSD i klasës enterprise (data center) me kapacitet 480GB dhe ndërfaqe SATA 6Gbps, me memorie MLC dhe mbrojtje nga humbja e energjisë. I optimizuar për ngarkesa me shumë lexim (Read Intensive), ofron performancë të qëndrueshme e latencë të ulët për servera. Variant HPE (VK0480GDJXV), i testuar dhe i rinovuar.',
    attributes: {
      Type: 'SSD',
      Class: 'Enterprise (Data Center)',
      Series: 'Intel SSD DC S3500',
      Interface: 'SATA 6Gbps',
      'Form Factor': '2.5-inch (7mm)',
      Capacity: '480 GB',
      'NAND Flash': 'MLC',
      Endurance: 'Read Intensive',
      Features: 'Power-loss protection',
      'Model Number': 'SSDSC2BB480G4 / SSDSC2BB480G4P',
      'Part Number': 'HPE VK0480GDJXV (717968-002)',
      Gjendja: 'I përdorur / i rinovuar',
    },
  },
  {
    name: 'Intel DC S3500 240GB Enterprise SATA SSD 2.5"',
    slug: 'intel-dc-s3500-240gb-sata-ssd',
    brand: 'Intel',
    category_id: SAS_SSD,
    image: 'SSD/_dl/intel-s3500-240.jpg',
    short_description:
      'SSD enterprise Intel DC S3500 240GB · SATA 6Gbps · Read Intensive · 2.5".',
    description:
      'Intel SSD DC S3500 është një SSD i klasës enterprise (data center) me kapacitet 240GB dhe ndërfaqe SATA 6Gbps, me memorie MLC dhe mbrojtje nga humbja e energjisë. I projektuar për ngarkesa me shumë lexim (Read Intensive) në servera, me performancë të qëndrueshme dhe besueshmëri. I testuar dhe i rinovuar.',
    attributes: {
      Type: 'SSD',
      Class: 'Enterprise (Data Center)',
      Series: 'Intel SSD DC S3500',
      Interface: 'SATA 6Gbps',
      'Form Factor': '2.5-inch (7mm)',
      Capacity: '240 GB',
      'NAND Flash': 'MLC',
      Endurance: 'Read Intensive',
      Features: 'Power-loss protection',
      'Model Number': 'SSDSC2BB240G4',
      Gjendja: 'I përdorur / i rinovuar',
    },
  },
  {
    name: 'Intel DC S3510 120GB Enterprise SATA SSD 2.5"',
    slug: 'intel-dc-s3510-120gb-sata-ssd',
    brand: 'Intel',
    category_id: SAS_SSD,
    image: 'SSD/_dl/intel-s3510-120.jpg',
    short_description:
      'SSD enterprise Intel DC S3510 120GB · SATA 6Gbps · Read Intensive · 2.5".',
    description:
      'Intel SSD DC S3510 është një SSD i klasës enterprise (data center) me kapacitet 120GB dhe ndërfaqe SATA 6Gbps, me memorie MLC 16nm dhe mbrojtje nga humbja e energjisë. I optimizuar për ngarkesa me shumë lexim (Read Intensive), i përshtatshëm për boot dhe servera. Variant Dell (DP/N 0KX83R), i testuar dhe i rinovuar.',
    attributes: {
      Type: 'SSD',
      Class: 'Enterprise (Data Center)',
      Series: 'Intel SSD DC S3510',
      Interface: 'SATA 6Gbps',
      'Form Factor': '2.5-inch',
      Capacity: '120 GB',
      'NAND Flash': 'MLC 16nm',
      Endurance: 'Read Intensive',
      Features: 'Power-loss protection',
      'Model Number': 'SSDSC2BB120G6R',
      'Part Number': 'Dell DP/N 0KX83R',
      Gjendja: 'I përdorur / i rinovuar',
    },
  },
  {
    name: 'Samsung PM853T 240GB Enterprise SATA SSD 2.5"',
    slug: 'samsung-pm853t-240gb-sata-ssd',
    brand: 'Samsung',
    category_id: SAS_SSD,
    image: 'SSD/_dl/samsung-pm853t.jpg',
    short_description:
      'SSD enterprise Samsung PM853T 240GB · SATA 6Gbps · Data Center · 2.5".',
    description:
      'Samsung PM853T është një SSD i klasës enterprise / data center me kapacitet 240GB dhe ndërfaqe SATA 6Gbps, me memorie 3D TLC dhe mbrojtje nga humbja e energjisë. Ofron performancë të qëndrueshme dhe qëndrueshmëri për servera dhe ngarkesa data center. I testuar dhe i rinovuar.',
    attributes: {
      Type: 'SSD',
      Class: 'Enterprise (Data Center)',
      Series: 'Samsung PM853T',
      Interface: 'SATA 6Gbps',
      'Form Factor': '2.5-inch',
      Capacity: '240 GB',
      'NAND Flash': '3D TLC',
      Features: 'Power-loss protection',
      'Model Number': 'MZ-7GE2400',
      'Part Number': 'MZ7GE240HMGR-00003',
      Gjendja: 'I përdorur / i rinovuar',
    },
  },
  {
    name: 'Micron RealSSD P300 100GB Enterprise SATA SSD 2.5"',
    slug: 'micron-realssd-p300-100gb-sata-ssd',
    brand: 'Micron',
    category_id: SAS_SSD,
    image: 'SSD/_dl/micron-generic.jpg',
    short_description:
      'SSD enterprise Micron RealSSD P300 100GB · SATA 6Gbps · SLC · qëndrueshmëri e lartë · 2.5".',
    description:
      'Micron RealSSD P300 është një SSD i klasës enterprise me kapacitet 100GB dhe ndërfaqe SATA 6Gbps, me memorie SLC për qëndrueshmëri shumë të lartë dhe besueshmëri — ideal për ngarkesa intensive shkrimi si logging dhe cache. Variant OEM (EMC), i testuar dhe i rinovuar.',
    attributes: {
      Type: 'SSD',
      Class: 'Enterprise',
      Series: 'Micron RealSSD P300',
      Interface: 'SATA 6Gbps',
      'Form Factor': '2.5-inch',
      Capacity: '100 GB',
      'NAND Flash': 'SLC',
      Endurance: 'High endurance',
      'Model Number': 'MTFDDAC100SAL-1N1AA',
      'Part Number': 'EMC 118032853',
      Gjendja: 'I përdorur / i rinovuar',
    },
  },
  {
    name: 'Cisco Micron 5100 MAX 100GB Enterprise SATA SSD 2.5"',
    slug: 'cisco-micron-5100-max-100gb-sata-ssd',
    brand: 'Micron',
    category_id: SAS_SSD,
    image: 'SSD/_dl/micron-5100.jpg',
    short_description:
      'SSD enterprise Cisco/Micron 5100 MAX 100GB · SATA 6Gbps · Write Intensive · SED · 2.5".',
    description:
      'Micron 5100 MAX është një SSD i klasës enterprise me ndërfaqe SATA 6Gbps dhe memorie 3D TLC, i optimizuar për ngarkesa intensive shkrimi (Write Intensive, deri në 5 DWPD). Ky variant Cisco (100GB) mbështet enkriptim harduerik (TCG / SED). I testuar dhe i rinovuar, gati për servera dhe sisteme storage.',
    attributes: {
      Type: 'SSD',
      Class: 'Enterprise',
      Series: 'Micron 5100 MAX (Cisco OEM)',
      Interface: 'SATA 6Gbps',
      'Form Factor': '2.5-inch',
      Capacity: '100 GB',
      'NAND Flash': '3D TLC',
      Endurance: 'Write Intensive',
      Features: 'Enkriptim harduerik TCG / SED (SED-e)',
      'Model Number': 'MTFDDAK100TCC',
      'Part Number': 'Cisco CPN 16-100831-01',
      Gjendja: 'I përdorur / i rinovuar',
    },
  },
  // ═══ Enterprise NVMe ════════════════════════════════════════════════════════
  {
    name: 'Intel DC P4610 1.6TB NVMe U.2 SSD 2.5"',
    slug: 'intel-dc-p4610-1-6tb-nvme-ssd',
    brand: 'Intel',
    category_id: SAS_NVME,
    image: 'SSD/_dl/intel-p4610-16tb.jpg',
    short_description:
      'SSD enterprise Intel DC P4610 1.6TB · NVMe PCIe 3.1 x4 · U.2 · Mixed Use 3 DWPD · 2.5".',
    description:
      'Intel SSD DC P4610 është një SSD i klasës enterprise me kapacitet 1.6TB dhe ndërfaqe NVMe PCIe 3.1 x4 (U.2, 2.5"), me memorie 3D TLC dhe qëndrueshmëri Mixed Use (3 DWPD). Ofron performancë shumë të lartë me deri në ~3200/2000 MB/s lexim/shkrim dhe latencë të ulët për servera dhe aplikacione data center intensive. Variant Dell EMC (DP/N 0YWWTM), i testuar dhe i rinovuar.',
    attributes: {
      Type: 'SSD',
      Class: 'Enterprise (Data Center)',
      Series: 'Intel SSD DC P4610',
      Interface: 'NVMe PCIe 3.1 x4',
      'Form Factor': 'U.2 2.5-inch (15mm)',
      Capacity: '1.6 TB',
      'NAND Flash': '3D TLC',
      Endurance: 'Mixed Use — 3 DWPD',
      Features: 'Power-loss protection, end-to-end data protection',
      'Model Number': 'SSDPE2KE016T8T',
      'Part Number': 'Dell EMC DP/N 0YWWTM',
      Gjendja: 'I përdorur / i rinovuar',
    },
  },
];

// ── Import ────────────────────────────────────────────────────────────────────
for (const p of products) {
  if (getProductBySlug(p.slug)) {
    console.log(`Skipped (exists): ${p.slug}`);
    continue;
  }
  const imageUrl = await toWebp(p.image, p.slug);
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
