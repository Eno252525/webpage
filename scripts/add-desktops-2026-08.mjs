// Adds the August 2026 batch of refurbished desktops:
//   * 2x HP ProDesk 400 G6 SFF   (i5-8500 / i5-9500)  -> Desktop > PC
//   * 1x HP ProDesk 600 G5 DM 35W (i5-9500T)          -> Desktop > PC
//   * 1x Lenovo ThinkCentre M720q Tiny (i5-8400T)     -> Desktop > PC
//   * 1x Lenovo ThinkSmart Hub 500 AIO (i5-7500T)     -> Desktop > AIO
//
// Source photos are the tracked files in _drive_src/ (the two 400 G6 rows share
// one chassis photo but each still gets its own /uploads/<slug>.webp, so the DB
// rows stay independent). Idempotent: keyed by slug — an existing row is
// re-asserted (price / specs / image) instead of duplicated, so this is safe to
// re-run on the server after a deploy.
//
//   node scripts/add-desktops-2026-08.mjs

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { createProduct, updateProduct, getProductBySlug, getCategories } from '../database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uploadsDir = path.join(root, 'uploads');
const srcDir = path.join(root, '_drive_src');

// Back the DB up before touching it.
const dbFile = path.join(root, 'products.db');
if (fs.existsSync(dbFile)) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(dbFile, path.join(root, `products.db.bak-${stamp}`));
  console.log(`Backed up products.db -> products.db.bak-${stamp}`);
}

const cats = getCategories();
const catId = (slug) => {
  const c = cats.find((x) => x.slug === slug);
  if (!c) throw new Error(`category missing: ${slug}`);
  return c.id;
};
const PC = catId('pc');
const AIO = catId('aio');

async function toWebp(srcFile, destSlug) {
  const srcAbs = path.join(srcDir, srcFile);
  if (!fs.existsSync(srcAbs)) throw new Error(`Missing source image: _drive_src/${srcFile}`);
  const destAbs = path.join(uploadsDir, `${destSlug}.webp`);
  await sharp(srcAbs)
    .flatten({ background: '#ffffff' }) // product renders ship with alpha; cards are white
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(destAbs);
  return `/uploads/${destSlug}.webp`;
}

const products = [
  {
    name: 'HP Prodesk 400 G6 SFF - i5-8500 / 8GB RAM / 256GB SSD',
    slug: 'hp-prodesk-400-g6-sff-i5-8500',
    sku: 'PCH0002',
    brand: 'HP',
    price: 19000,
    category_id: PC,
    image: 'hp-prodesk-400-g6-sff.jpg',
    short_description: 'HP Prodesk 400 G6 SFF me Intel Core i5-8500, 8GB RAM DDR4 dhe SSD 256GB 2.5".',
    description:
      'HP ProDesk 400 G6 në format SFF (Small Form Factor) është një desktop biznesi kompakt dhe i qëndrueshëm për zyrë. Vjen me procesor Intel Core i5-8500 me 6 bërthama (deri në 4.1 GHz Turbo), 8GB memorie DDR4 dhe SSD 256GB 2.5" SATA për ndezje e hapje të shpejtë të programeve. Trupi SFF kursen hapësirë në tavolinë, ndërsa portat e shumta USB, DisplayPort, HDMI dhe VGA e bëjnë të lehtë lidhjen me monitorë dhe pajisje ekzistuese. Ka gjithashtu hapësirë për zgjerim të RAM-it dhe të diskut.',
    attributes: { CPU: 'i5-8500', RAM: '8GB DDR4', SSD: '256GB', 'Form Factor': 'SFF' },
  },
  {
    name: 'HP Prodesk 400 G6 SFF - i5-9500 / 8GB RAM / 256GB SSD',
    slug: 'hp-prodesk-400-g6-sff-i5-9500',
    sku: 'PCH0003',
    brand: 'HP',
    price: 20000,
    category_id: PC,
    image: 'hp-prodesk-400-g6-sff.jpg',
    short_description: 'HP Prodesk 400 G6 SFF me Intel Core i5-9500, 8GB RAM DDR4 dhe SSD 256GB 2.5".',
    description:
      'HP ProDesk 400 G6 SFF me procesor Intel Core i5-9500 të gjeneratës së 9-të (6 bërthama, deri në 4.4 GHz Turbo), 8GB memorie DDR4 dhe SSD 256GB 2.5" SATA. Një desktop biznesi kompakt që përballon pa problem punën e përditshme në zyrë: dokumente, tabela, shfletim me shumë tabs dhe aplikacione kontabiliteti. Formati SFF zë pak hapësirë, ndërsa daljet DisplayPort dhe HDMI mbështesin punën me dy monitorë njëkohësisht.',
    attributes: { CPU: 'i5-9500', RAM: '8GB DDR4', SSD: '256GB', 'Form Factor': 'SFF' },
  },
  {
    name: 'HP Prodesk 600 G5 DM - i5-9500T / 8GB RAM / 256GB SSD NVMe',
    slug: 'hp-prodesk-600-g5-dm-i5-9500t',
    sku: 'PCH0004',
    brand: 'HP',
    price: 20000,
    category_id: PC,
    image: 'hp-prodesk-600-g5-dm.jpg',
    short_description: 'HP Prodesk 600 G5 Desktop Mini 35W me Intel Core i5-9500T, 8GB RAM DDR4 (2x4GB) dhe SSD 256GB NVMe.',
    description:
      'HP ProDesk 600 G5 Desktop Mini (DM) është një kompjuter ultra-kompakt 35W që mund të vendoset mbi tavolinë, pas monitorit ose në një raft. I pajisur me procesor Intel Core i5-9500T (6 bërthama me konsum të ulët), 8GB memorie DDR4 SO-DIMM (2x4GB) dhe SSD 256GB NVMe PCIe M.2 2230 për performancë shumë të shpejtë leximi e shkrimi. Punon i heshtur dhe me konsum të ulët energjie, ndaj është zgjidhje ideale për zyra, recepsione dhe pika pune ku hapësira është e kufizuar.',
    attributes: { CPU: 'i5-9500T', RAM: '8GB DDR4 (2x4GB)', SSD: '256GB NVMe', 'Form Factor': 'USFF' },
  },
  {
    name: 'Lenovo Thinkcentre M720q Tiny - i5-8400T / 8GB RAM / 256GB SSD NVMe',
    slug: 'lenovo-thinkcentre-m720q-tiny-i5-8400t',
    sku: 'PCL0002',
    brand: 'Lenovo',
    price: 18500,
    category_id: PC,
    image: 'lenovo-thinkcentre-m720q-tiny.png',
    short_description: 'Lenovo ThinkCentre M720q Tiny me Intel Core i5-8400T, 8GB RAM DDR4 dhe SSD 256GB NVMe.',
    description:
      'Lenovo ThinkCentre M720q Tiny është një desktop mini me trup metalik, i ndërtuar për përdorim të vazhdueshëm në zyrë. Vjen me procesor Intel Core i5-8400T me 6 bërthama dhe konsum të ulët (35W), 8GB memorie DDR4 SO-DIMM dhe SSD 256GB NVMe PCIe M.2 për ndezje në pak sekonda. Formati Tiny lejon montim pas monitorit me mbajtëse VESA ose vendosje vertikale me stand, duke liruar plotësisht tavolinën. Ofron porta USB 3.1, DisplayPort dhe rrjet Gigabit.',
    attributes: { CPU: 'i5-8400T', RAM: '8GB DDR4', SSD: '256GB NVMe', 'Form Factor': 'USFF' },
  },
  {
    name: 'Lenovo ThinkSmart Hub 500 AIO 11.6" Touch - i5-7500T / 8GB RAM / 128GB SSD',
    slug: 'lenovo-thinksmart-hub-500-aio-i5-7500t',
    sku: 'PCL0001',
    brand: 'Lenovo',
    price: 20000,
    category_id: AIO,
    image: 'lenovo-thinksmart-hub-500.png',
    short_description: 'Lenovo ThinkSmart Hub 500 AIO me ekran 11.6" Touch rrotullues, Intel Core i5-7500T, 8GB RAM DDR4 (2x4GB) dhe SSD 128GB NVMe.',
    description:
      'Lenovo ThinkSmart Hub 500 është një All-in-One kompakt i projektuar për salla mbledhjesh dhe punë bashkëpunuese. Ka ekran 11.6" Full HD me prekje që rrotullohet 360° mbi bazamentin me altoparlant, procesor Intel Core i5-7500T, 8GB memorie DDR4 (2x4GB) dhe SSD 128GB NVMe PCIe. Vjen me WiFi të integruar, mikrofona dhe altoparlant për konferenca, si dhe stand-in origjinal. I përshtatshëm si pajisje konference, terminal recepsioni ose stacion i vogël pune me prekje.',
    attributes: { CPU: 'i5-7500T', RAM: '8GB DDR4 (2x4GB)', SSD: '128GB NVMe', Screen: '11.6" Touch' },
  },
];

let added = 0;
let updated = 0;

for (const p of products) {
  const images = [await toWebp(p.image, p.slug)];
  const fields = {
    name: p.name,
    slug: p.slug,
    short_description: p.short_description,
    description: p.description,
    price: p.price,
    category_id: p.category_id,
    brand: p.brand,
    sku: p.sku,
    images,
    attributes: p.attributes,
    in_stock: 1, // numeric: updateProduct binds this straight through to SQLite
  };

  const existing = getProductBySlug(p.slug);
  if (existing) {
    updateProduct(existing.id, fields);
    updated++;
    console.log(`  updated #${existing.id}  ${p.sku}  ${p.slug}  ${p.price} L`);
  } else {
    const created = createProduct(fields);
    added++;
    console.log(`  added   #${created.id}  ${p.sku}  ${p.slug}  ${p.price} L`);
  }
}

console.log(`\nDone. Added ${added}, updated ${updated}.`);
