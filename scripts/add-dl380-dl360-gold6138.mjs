// Adds three HPE ProLiant servers (2x Xeon Gold 6138) to the "server" category:
//   1. HP DL380 G10 — 128GB / 2x 800GB + 2x 3.84TB SAS SSD / 2x 10GB SFP
//   2. HP DL360 G10 — 64GB  / 2x 800GB SAS SSD / 2x 10GB SFP
//   3. HP DL360 G10 — 256GB / 2x 800GB SAS SSD / 4x 10GB SFP
// Idempotent: skips slugs that already exist. The DL380 G10 photo (project root,
// hp-dl380-g10.png) is converted to WebP into uploads/; the two DL360 G10 reuse
// the existing /uploads/hp-dl360-g10-sff.webp already on the site.
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';
import { createProduct, getProductBySlug, getCategories } from '../database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uploadsDir = path.join(root, 'uploads');

async function toWebp(srcFile, destSlug) {
  const srcAbs = path.join(root, srcFile);
  if (!fs.existsSync(srcAbs)) throw new Error(`Missing source image: ${srcFile}`);
  const destAbs = path.join(uploadsDir, `${destSlug}.webp`);
  await sharp(srcAbs)
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(destAbs);
  return `/uploads/${destSlug}.webp`;
}

const cat = getCategories().find((c) => c.slug === 'server');
if (!cat) throw new Error('server category missing');

const products = [
  {
    name: 'HP ProLiant DL380 Gen10 — 2x Xeon Gold 6138 / 128GB / 2x 800GB + 2x 3.84TB SAS SSD / 2x 10GB SFP',
    slug: 'hp-dl380-g10-gold-6138',
    brand: 'HP',
    price: 2450000,
    convert: { src: 'hp-dl380-g10.png' },
    short_description:
      'HP ProLiant DL380 Gen10 rack 2U me 2x Intel Xeon Gold 6138 (40 bërthama / 80 thread-e), 128GB DDR4 ECC, 2x 800GB + 2x 3.84TB SAS SSD, 2x port 10GB SFP+ dhe shina për rack.',
    description:
      'HP ProLiant DL380 Gen10 është serveri rack 2U më i shitur i HPE-së, ndërtuar për virtualizim, baza të dhënash dhe ngarkesa biznesi kritike. Ky konfigurim vjen me dy procesorë Intel Xeon Gold 6138 (gjithsej 40 bërthama / 80 thread-e, 2.0 GHz, 27.5MB cache), 128GB memorie DDR4 ECC dhe ruajtje hibride të shpejtë: 2x 800GB SAS SSD për sistemin plus 2x 3.84TB SAS SSD për të dhëna, gjithsej rreth 9.2TB hapësirë SSD. Rrjetëzimi mbulohet nga 2 porta 10GB SFP+ për lidhje me shpejtësi të lartë. Vjen me shina (rails) për montim në rack. Gjendja: i rinovuar dhe i testuar.',
    attributes: {
      Brand: 'HP',
      Model: 'ProLiant DL380 Gen10',
      CPU: '2 x Intel Xeon Gold 6138 (40 bërthama / 80 thread-e gjithsej, 2.0 GHz, 27.5MB cache)',
      RAM: '128GB DDR4 ECC',
      Storage: '2 x 800GB SAS SSD + 2 x 3.84TB SAS SSD',
      Network: '2 x 10GB SFP+',
      Forma: 'Rack 2U',
      Rack: 'Shina (rails) të përfshira',
      Gjendja: 'I rinovuar',
    },
  },
  {
    name: 'HP ProLiant DL360 Gen10 — 2x Xeon Gold 6138 / 64GB / 2x 800GB SAS SSD / 2x 10GB SFP',
    slug: 'hp-dl360-g10-gold-6138-64gb',
    brand: 'HP',
    price: 1300000,
    image: '/uploads/hp-dl360-g10-sff.webp',
    short_description:
      'HP ProLiant DL360 Gen10 rack 1U me 2x Intel Xeon Gold 6138 (40 bërthama / 80 thread-e), 64GB DDR4 ECC, 2x 800GB SAS SSD, 2x port 10GB SFP+ dhe shina për rack.',
    description:
      'HP ProLiant DL360 Gen10 është një server rack 1U kompakt dhe me densitet të lartë, ideal për qendra të dhënash ku hapësira është e kufizuar. Ky konfigurim ka dy procesorë Intel Xeon Gold 6138 (gjithsej 40 bërthama / 80 thread-e, 2.0 GHz, 27.5MB cache), 64GB memorie DDR4 ECC dhe 2x 800GB SAS SSD për performancë të shpejtë I/O. Rrjetëzimi vjen me 2 porta 10GB SFP+ për lidhje me shpejtësi të lartë. Përfshihen shinat (rails) për montim në rack. Gjendja: i rinovuar dhe i testuar.',
    attributes: {
      Brand: 'HP',
      Model: 'ProLiant DL360 Gen10',
      CPU: '2 x Intel Xeon Gold 6138 (40 bërthama / 80 thread-e gjithsej, 2.0 GHz, 27.5MB cache)',
      RAM: '64GB DDR4 ECC',
      Storage: '2 x 800GB SAS SSD',
      Network: '2 x 10GB SFP+',
      Forma: 'Rack 1U',
      Rack: 'Shina (rails) të përfshira',
      Gjendja: 'I rinovuar',
    },
  },
  {
    name: 'HP ProLiant DL360 Gen10 — 2x Xeon Gold 6138 / 256GB / 2x 800GB SAS SSD / 4x 10GB SFP',
    slug: 'hp-dl360-g10-gold-6138-256gb',
    brand: 'HP',
    price: 2000000,
    image: '/uploads/hp-dl360-g10-sff.webp',
    short_description:
      'HP ProLiant DL360 Gen10 rack 1U me 2x Intel Xeon Gold 6138 (40 bërthama / 80 thread-e), 256GB DDR4 ECC, 2x 800GB SAS SSD, 4x port 10GB SFP+ dhe shina për rack.',
    description:
      'HP ProLiant DL360 Gen10 është një server rack 1U kompakt dhe me densitet të lartë për qendra të dhënash. Ky konfigurim i fuqishëm vjen me dy procesorë Intel Xeon Gold 6138 (gjithsej 40 bërthama / 80 thread-e, 2.0 GHz, 27.5MB cache), 256GB memorie DDR4 ECC për virtualizim intensiv dhe 2x 800GB SAS SSD për ruajtje të shpejtë. Rrjetëzimi i zgjeruar mbulohet nga 4 porta 10GB SFP+ për bandwidth të lartë. Përfshihen shinat (rails) për montim në rack. Gjendja: i rinovuar dhe i testuar.',
    attributes: {
      Brand: 'HP',
      Model: 'ProLiant DL360 Gen10',
      CPU: '2 x Intel Xeon Gold 6138 (40 bërthama / 80 thread-e gjithsej, 2.0 GHz, 27.5MB cache)',
      RAM: '256GB DDR4 ECC',
      Storage: '2 x 800GB SAS SSD',
      Network: '4 x 10GB SFP+',
      Forma: 'Rack 1U',
      Rack: 'Shina (rails) të përfshira',
      Gjendja: 'I rinovuar',
    },
  },
];

for (const p of products) {
  if (getProductBySlug(p.slug)) {
    console.log(`Skipped (exists): ${p.slug}`);
    continue;
  }
  let images;
  if (p.convert) {
    images = [await toWebp(p.convert.src, p.slug)];
  } else {
    images = [p.image];
  }
  const product = createProduct({
    name: p.name,
    slug: p.slug,
    short_description: p.short_description,
    description: p.description,
    price: p.price,
    category_id: cat.id,
    brand: p.brand,
    images,
    attributes: p.attributes,
    in_stock: true,
  });
  console.log(`Added #${product.id}: ${product.name} -> ${images.join(', ')}`);
}

console.log('Done.');
