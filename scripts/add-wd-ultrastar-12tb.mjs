// Adds the Western Digital Ultrastar DC HC520 12TB SATA HDD to the "hdd" category.
// Idempotent: skips if the slug already exists. Source image (project root) is
// normalized to WebP into uploads/.
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

const cat = getCategories().find((c) => c.slug === 'hdd');
if (!cat) throw new Error('hdd category missing');

const p = {
  name: 'Western Digital Ultrastar DC HC520 12TB — HUH721212ALE604 / SATA 6Gb/s',
  slug: 'wd-ultrastar-dc-hc520-12tb',
  brand: 'Western Digital',
  price: 20900,
  src: 'HUH721212ALE604-0F30146-2_740x800.webp',
  short_description:
    'Disk i fortë Western Digital Ultrastar DC HC520 12TB (HUH721212ALE604), ndërfaqe SATA 6Gb/s, i ndërtuar për servera dhe data center.',
  description:
    'Western Digital Ultrastar DC HC520 është një disk i fortë enterprise me kapacitet 12TB, i projektuar për servera, NAS dhe data center ku kërkohet besueshmëri e lartë dhe punë 24/7. Modeli HUH721212ALE604 përdor teknologjinë HelioSeal (mbushje me helium) për konsum më të ulët energjie dhe temperatura më të ulëta pune, me ndërfaqe SATA 6Gb/s dhe shpejtësi rrotullimi 7200 RPM. Ideal për ruajtje masive të dhënash, backup dhe ngarkesa enterprise. Gjendja: i përdorur dhe i testuar.',
  attributes: {
    Brand: 'Western Digital',
    Model: 'HUH721212ALE604 (Ultrastar DC HC520)',
    Capacity: '12TB',
    Interface: 'SATA 6Gb/s',
    'RPM': '7200 RPM',
    'Form Factor': '3.5"',
    Type: 'HDD Enterprise',
    Gjendja: 'I përdorur',
  },
};

if (getProductBySlug(p.slug)) {
  console.log(`Skipped (exists): ${p.slug}`);
} else {
  const images = [await toWebp(p.src, p.slug)];
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
