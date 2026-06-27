// Adds Lenovo ThinkPad X13 Gen 1 (Business Laptops) and HP Z8 G4 AI workstation
// (Workstation). Idempotent: skips slugs that already exist. Source images in
// project root are converted to WebP into uploads/.
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

const cats = getCategories();
const businessLaptops = cats.find((c) => c.slug === 'business-laptops');
const workstation = cats.find((c) => c.slug === 'workstation');
if (!businessLaptops) throw new Error('business-laptops category missing');
if (!workstation) throw new Error('workstation category missing');

const products = [
  {
    name: 'Lenovo ThinkPad X13 Gen 1 — i5-10210U / 16GB DDR4 / 512GB NVMe',
    slug: 'lenovo-thinkpad-x13-gen-1-i5-10210u',
    brand: 'Lenovo',
    price: 22000,
    category_id: businessLaptops.id,
    short_description:
      'Lenovo ThinkPad X13 Gen 1 13.3" me Intel Core i5-10210U, 16GB DDR4 dhe 512GB SSD NVMe.',
    description:
      'Lenovo ThinkPad X13 Gen 1 është një laptop biznesi kompakt 13.3" me ndërtim të fortë në standardin ushtarak MIL-STD-810G dhe tastierë legjendare ThinkPad. Vjen me procesor Intel Core i5-10210U (4 bërthama / 8 thread-e, deri në 4.2 GHz Turbo), 16GB memorie DDR4 për multitasking pa probleme dhe një SSD NVMe 512GB për ngarkim të shpejtë të sistemit dhe aplikacioneve. Ideal për përdorim profesional gjatë udhëtimeve falë madhësisë së lehtë dhe autonomisë së mirë të baterisë.',
    images: [{ src: 'd50pCE9mOGW9T4hC.jpg' }],
    attributes: {
      CPU: 'i5-10210U',
      RAM: '16GB DDR4',
      SSD: '512GB NVMe',
      Display: '13.3"',
      Gjendja: 'I përdorur',
    },
  },
  {
    name: 'HP Z8 G4 AI Server — 2x Xeon Platinum 8160 / 128GB DDR4 / 1TB NVMe / RTX 3090 24GB',
    slug: 'hp-z8-g4-ai-server-2x-xeon-platinum-8160-rtx-3090',
    brand: 'HP',
    price: 149000,
    category_id: workstation.id,
    short_description:
      'HP Z8 G4 me 2x Intel Xeon Platinum 8160, 128GB DDR4, 1TB SSD NVMe dhe NVIDIA RTX 3090 24GB — ideal për AI dhe ngarkesa të rënda kompjutimi.',
    description:
      'HP Z8 G4 është një workstation i klasit të lartë i konfiguruar si server AI, me dy procesorë Intel Xeon Platinum 8160 (gjithsej 48 bërthama / 96 thread-e), 128GB memorie DDR4 ECC dhe ruajtje të shpejtë në SSD NVMe 1TB. Karta grafike NVIDIA GeForce RTX 3090 me 24GB GDDR6X ofron fuqi të jashtëzakonshme për trajnim modelesh AI, inferencë, deep learning, renderim 3D dhe simulim shkencor. Shasi me ftohje të avancuar dhe ushqim të fuqishëm e bëjnë të përshtatshme për ngarkesa 24/7. Gjendja: i përdorur dhe i testuar.',
    images: [{ src: 'hp-workstation-z8-g4-1661764551.jpg' }],
    attributes: {
      CPU: '2x Intel Xeon Platinum 8160 (48 bërthama / 96 thread-e gjithsej)',
      RAM: '128GB DDR4',
      SSD: '1TB NVMe',
      GPU: 'NVIDIA RTX 3090 24GB',
      Gjendja: 'I përdorur / Testuar',
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
    category_id: p.category_id,
    brand: p.brand,
    images,
    attributes: p.attributes,
    in_stock: true,
  });
  console.log(`Added #${product.id}: ${product.name} -> ${images.join(', ')}`);
}

console.log('Done.');
