// Adds 3 refurbished servers to the "Server" category.
// Idempotent: re-running skips products whose slug already exists.
// Source images live in the project root; they are converted to WebP into uploads/.
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

// Each product: first image is the main photo, the rest become gallery slides.
const products = [
  {
    name: 'HPE ProLiant ML110 Gen10 — Xeon Gold 5120 / 32GB / 2x 300GB SAS',
    slug: 'hpe-proliant-ml110-gen10-xeon-gold-5120',
    brand: 'HPE',
    price: 35000,
    short_description:
      'Server tower HPE ProLiant ML110 Gen10 me procesor Intel Xeon Gold 5120 (14 bërthama), 32GB RAM ECC dhe 2x 300GB SAS.',
    description:
      'HPE ProLiant ML110 Gen10 është një server tower me një procesor, ideal për biznese të vogla dhe zyra. Procesori Intel Xeon Gold 5120 me 14 bërthama / 28 thread-e ofron fuqi të mjaftueshme për virtualizim, baza të dhënash dhe shërbime rrjeti. Vjen me 32GB memorie DDR4 ECC dhe dy disqe 300GB SAS të konfiguruara për besueshmëri. Dizajni tower funksionon në heshtje dhe nuk kërkon rack.',
    images: [{ src: 'hpe-proliant-ml110-g10-server.jpg' }],
    attributes: {
      CPU: 'Intel Xeon Gold 5120 (14 bërthama / 28 thread-e, deri në 3.2 GHz)',
      RAM: '32GB DDR4 ECC',
      Storage: '2x 300GB SAS HDD',
      Forma: 'Tower (1 procesor)',
      Gjendja: 'I rinovuar',
    },
  },
  {
    name: 'Dell PowerEdge R730xd — 2x E5-2680 v3 / 32GB / 3x 300GB SAS / PERC H730',
    slug: 'dell-poweredge-r730xd-2x-e5-2680-v3',
    brand: 'Dell',
    price: 35000,
    short_description:
      'Server rack 2U Dell PowerEdge R730xd me dy procesorë Xeon E5-2680 v3 (24 bërthama total), 32GB RAM ECC, 3x 300GB SAS dhe kontroller PERC H730.',
    description:
      'Dell PowerEdge R730xd është një server rack 2U me densitet të lartë ruajtjeje, i ndërtuar për ngarkesa serioze. Dy procesorët Intel Xeon E5-2680 v3 japin gjithsej 24 bërthama / 48 thread-e, ideale për virtualizim dhe baza të dhënash. I pajisur me 32GB memorie DDR4 ECC, tre disqe 300GB SAS dhe kontrollerin RAID Dell PERC H730 me cache, që siguron mbrojtje dhe performancë të të dhënave.',
    images: [{ src: 's-l1200.jpg' }],
    attributes: {
      CPU: '2x Intel Xeon E5-2680 v3 (24 bërthama / 48 thread-e gjithsej)',
      RAM: '32GB DDR4 ECC',
      Storage: '3x 300GB SAS HDD',
      'RAID Controller': 'Dell PERC H730',
      Forma: 'Rack 2U (2 procesorë)',
      Gjendja: 'I rinovuar',
    },
  },
  {
    name: 'Dell PowerEdge T440 — Xeon Bronze 3106 / 16GB / 2x 300GB SAS / PERC H730p',
    slug: 'dell-poweredge-t440-bronze-3106',
    brand: 'Dell',
    price: 25000,
    short_description:
      'Server tower Dell PowerEdge T440 me procesor Intel Xeon Bronze 3106 (8 bërthama), 16GB RAM ECC, 2x 300GB SAS HDD dhe kontroller RAID PERC H730p.',
    description:
      'Dell PowerEdge T440 është një server tower fleksibël për biznese në rritje. Procesori Intel Xeon Bronze 3106 me 8 bërthama dhe 16GB memorie DDR4 ECC mbulojnë shërbimet bazë të rrjetit, ruajtjen e skedarëve dhe aplikacione të lehta. Dy disqet 300GB SAS dhe kontrolleri RAID Dell PERC H730p mundësojnë konfigurime të besueshme me redundancë të të dhënave. Shasia tower mbështet zgjerim të mëtejshëm të memories dhe disqeve.',
    images: [{ src: 'dellemc-pet440-8x35-tower-bezel-lf.avif' }],
    attributes: {
      CPU: 'Intel Xeon Bronze 3106 (8 bërthama / 8 thread-e, 1.7 GHz)',
      RAM: '16GB DDR4 ECC',
      Storage: '2x 300GB SAS HDD',
      'RAID Controller': 'Dell PERC H730p',
      Forma: 'Tower (deri në 2 procesorë)',
      Gjendja: 'I rinovuar',
    },
  },
];

for (const p of products) {
  if (getProductBySlug(p.slug)) {
    console.log(`Skipped (exists): ${p.slug}`);
    continue;
  }
  const images = [];
  for (let i = 0; i < p.images.length; i++) {
    const destSlug = i === 0 ? p.slug : `${p.slug}-${i + 1}`;
    images.push(await toWebp(p.images[i].src, destSlug));
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
