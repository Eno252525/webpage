// Adds the LG 32UP550-W 4K UHD monitor to the "monitore" category, and updates
// the existing LG 32UD99-W: sale_price -> 18000 and back in stock.
// Idempotent: skips the add if the slug exists; the update is safe to re-run.
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

const cat = getCategories().find((c) => c.slug === 'monitore');
if (!cat) throw new Error('monitore category missing');

const p = {
  name: 'LG 32UP550-W — 31.5" 4K UHD VA / HDR10 / USB-C',
  slug: 'lg-32up550-w',
  brand: 'LG',
  price: 20000,
  src: '71y9W2y3EEL.jpg',
  short_description:
    'Monitor LG 32UP550-W 31.5" 4K UHD (3840x2160) me panel VA, HDR10, DCI-P3 90%, USB-C dhe AMD FreeSync.',
  description:
    'LG 32UP550-W është një monitor 31.5" me rezolucion 4K UHD (3840x2160) dhe panel VA me kontrast të lartë 3000:1, ideal për punë profesionale, montim fotografie/videoje dhe përdorim të përditshëm. Mbulon 90% të gamut-it DCI-P3 me mbështetje HDR10 për ngjyra të gjalla dhe të thella. Vjen me lidhje USB-C (deri në 96W Power Delivery për të karikuar laptopin me një kabull të vetëm), HDMI dhe DisplayPort. Teknologjia AMD FreeSync redukton grisjen e imazhit, ndërsa dizajni pothuajse pa korniza në 3 anët dhe këmba me rregullim lartësie/pivot/anim e bëjnë të rehatshme për çdo tavolinë pune. Përfshin altoparlantë stereo 5W me Maxx Audio.',
  attributes: {
    Brand: 'LG',
    Model: '32UP550-W',
    'Screen Size': '31.5"',
    Resolution: '3840 x 2160 (4K UHD)',
    Panel: 'VA',
    'Refresh Rate': '60 Hz',
    'Response Time': '4 ms (GTG)',
    Contrast: '3000:1',
    Brightness: '350 cd/m²',
    Color: 'HDR10, DCI-P3 90%',
    Ports: 'USB-C (96W PD), HDMI, DisplayPort',
    Features: 'AMD FreeSync, altoparlantë 5W stereo, tilt/height/pivot',
    Gjendja: 'I ri',
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

// Update the existing LG 32UD99-W: sale 18000 + back in stock.
const ud99 = getProductBySlug('lg-32ud99-w');
if (!ud99) {
  console.log('WARN: lg-32ud99-w not found — sale/stock not applied');
} else {
  const updated = updateProduct(ud99.id, { sale_price: 18000, in_stock: 1 });
  console.log(`Updated #${updated.id} ${updated.name} -> price ${updated.price}, sale ${updated.sale_price}, in_stock ${updated.in_stock}`);
}

console.log('Done.');
