// Adds the Dell PowerEdge R940 (4x Xeon Gold 6262 / 256GB / 3x 800GB SAS SSD)
// to the "Server" category. Idempotent: skips if the slug already exists.
// Source image lives in the project root; it is converted to WebP into uploads/.
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
    name: 'Dell PowerEdge R940 — 4x Xeon Gold 6262 / 256GB / 3x 800GB SAS SSD',
    slug: 'dell-poweredge-r940-4x-xeon-gold-6262',
    brand: 'Dell',
    price: 0,
    short_description:
      'Server rack 3U Dell PowerEdge R940 me 4 procesorë Intel Xeon Gold 6262 (96 bërthama / 192 thread-e gjithsej), 256GB RAM DDR4 ECC, 3x 800GB SAS SSD, dy ushqyes 2000W dhe shasi 24x 2.5" SFF.',
    description:
      'Dell PowerEdge R940 është një server rack 3U me 4 sokete, i ndërtuar për ngarkesa kritike biznesi: virtualizim në shkallë të gjerë, baza të dhënash në memorie (SAP HANA, Oracle), ERP dhe analitikë. Katër procesorët Intel Xeon Gold 6262 japin gjithsej 96 bërthama / 192 thread-e, me 256GB memorie DDR4 ECC për ngarkesa shumë të mëdha. Ruajtja vjen me 3x 800GB SAS SSD për performancë të shpejtë I/O, ndërsa shasia mbështet deri në 24 disqe 2.5" SFF për zgjerim të mëtejshëm. Dy ushqyesit redundantë 2000W sigurojnë qëndrueshmëri dhe disponueshmëri të lartë.',
    images: [{ src: 'dell_poweredge_r940_1x24_24xhdd_front_zoom_2_19_2.avif' }],
    attributes: {
      CPU: '4x Intel Xeon Gold 6262 (96 bërthama / 192 thread-e gjithsej, 1.9 GHz, 33MB cache)',
      RAM: '256GB DDR4 ECC',
      Storage: '3x 800GB SAS SSD',
      Chassis: '24x 2.5" SFF Bay',
      PSU: '2x 2000W (redundant)',
      Forma: 'Rack 3U (4 procesorë)',
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
