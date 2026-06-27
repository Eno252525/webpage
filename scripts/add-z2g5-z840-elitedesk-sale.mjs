// Adds two HP workstations to the "workstation" category and puts the HP EliteDesk
// 800 G4 (i5-8500T) on sale:
//   1. HP Z2 G5 — i7-10700 / 32GB / 512GB NVMe (new image, converted to WebP)
//   2. HP Z840 — 1x E5-2643 v3 / 32GB / 512GB SSD / GTX 980 4GB (reuses hp-z840.webp)
//   3. EliteDesk 800 G4 (i5-8500T, id 128): sale_price -> 17000
// Idempotent: skips slugs that already exist; the sale update is a no-op if already set.
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';
import { createProduct, getProductBySlug, getCategories, updateProduct } from '../database.js';

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

const cat = getCategories().find((c) => c.slug === 'workstation');
if (!cat) throw new Error('workstation category missing');

const products = [
  {
    name: 'HP Z2 G5 — i7-10700 / 32GB RAM / 512GB NVMe',
    slug: 'hp-z2-g5-i7-10700',
    brand: 'HP',
    price: 55000,
    convert: { src: '61g2+enBd8L-1.jpg' },
    short_description:
      'HP Z2 G5 workstation me Intel Core i7-10700 (8 bërthama / 16 thread-e), 32GB RAM DDR4 dhe 512GB SSD NVMe.',
    description:
      'HP Z2 G5 është një workstation kompakt dhe i fuqishëm, i certifikuar për aplikacione profesionale CAD, modelim 3D, montim videoje dhe ngarkesa inxhinierike. Vjen me procesor Intel Core i7-10700 (8 bërthama / 16 thread-e, deri në 4.8 GHz Turbo), 32GB memorie DDR4 për multitasking të rëndë dhe një SSD NVMe 512GB për ngarkim shumë të shpejtë të sistemit dhe aplikacioneve. Ndërtim i fortë në standardet HP Z dhe testim i plotë. Gjendja: i rinovuar dhe i testuar.',
    attributes: {
      Brand: 'HP',
      Model: 'Z2 G5',
      CPU: 'Intel Core i7-10700 (8 bërthama / 16 thread-e, deri në 4.8 GHz)',
      RAM: '32GB DDR4',
      SSD: '512GB NVMe',
      Gjendja: 'I rinovuar',
    },
  },
  {
    name: 'HP Z840 — E5-2643 v3 / 32GB RAM / 512GB SSD / GTX 980 4GB',
    slug: 'hp-z840-e5-2643-v3-gtx-980',
    brand: 'HP',
    price: 35000,
    image: '/uploads/hp-z840.webp',
    short_description:
      'HP Z840 workstation me Intel Xeon E5-2643 v3 (6 bërthama / 12 thread-e), 32GB RAM DDR4 ECC, 512GB SSD dhe NVIDIA GeForce GTX 980 4GB.',
    description:
      'HP Z840 është një workstation i klasit të lartë për ngarkesa profesionale: renderim 3D, montim videoje, simulim dhe punë grafike intensive. Ky konfigurim vjen me procesor Intel Xeon E5-2643 v3 (6 bërthama / 12 thread-e, 3.4 GHz, 20MB cache), 32GB memorie DDR4 ECC dhe një SSD 512GB për performancë të shpejtë. Karta grafike NVIDIA GeForce GTX 980 me 4GB GDDR5 jep fuqi solide për grafikë dhe akselerim GPU. Shasi me ftohje të avancuar dhe ushqim të fuqishëm. Gjendja: i rinovuar dhe i testuar.',
    attributes: {
      Brand: 'HP',
      Model: 'Z840',
      CPU: 'Intel Xeon E5-2643 v3 (6 bërthama / 12 thread-e, 3.4 GHz, 20MB cache)',
      RAM: '32GB DDR4 ECC',
      SSD: '512GB',
      GPU: 'NVIDIA GeForce GTX 980 4GB',
      Gjendja: 'I rinovuar',
    },
  },
];

for (const p of products) {
  if (getProductBySlug(p.slug)) {
    console.log(`Skipped (exists): ${p.slug}`);
    continue;
  }
  const images = p.convert ? [await toWebp(p.convert.src, p.slug)] : [p.image];
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

// Put the EliteDesk 800 G4 (i5-8500T, USFF) on sale.
const elite = getProductBySlug('hp-elitedesk-800-g4-3');
if (!elite) {
  console.log('WARN: hp-elitedesk-800-g4-3 not found — sale not applied');
} else if (elite.sale_price === 17000) {
  console.log(`Sale already set: #${elite.id} ${elite.name}`);
} else {
  const updated = updateProduct(elite.id, { sale_price: 17000 });
  console.log(`Sale set: #${updated.id} ${updated.name} -> ${updated.price} => ${updated.sale_price}`);
}

console.log('Done.');
