import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';
import db, { createProduct, getProductBySlug } from '../database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uploadsDir = path.join(root, 'uploads');

async function toWebp(srcAbs, destSlug) {
  const destAbs = path.join(uploadsDir, `${destSlug}.webp`);
  await sharp(srcAbs)
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(destAbs);
  return `/uploads/${destSlug}.webp`;
}

function uniqueSlug(base) {
  let slug = base;
  let i = 2;
  while (getProductBySlug(slug)) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

const businessLaptopsCat = db.prepare("SELECT id FROM categories WHERE slug = 'business-laptops'").get();
if (!businessLaptopsCat) throw new Error('business-laptops category missing');

const items = [
  {
    src: path.join(root, 'thinkpad-t14-gen-2-1.jpg'),
    baseSlug: 'lenovo-thinkpad-t14-gen2',
    name: 'Lenovo Thinkpad T14 Gen2 - i5-1145G7 / 16GB RAM / 256GB SSD',
    price: 30000,
    attributes: { CPU: 'i5-1145G7', RAM: '16GB', SSD: '256GB' },
  },
  {
    src: path.join(root, '815qLCjKiML-1.jpg'),
    baseSlug: 'lenovo-thinkpad-t14s',
    name: 'Lenovo Thinkpad T14s - i7-10610U / 16GB RAM / 256GB SSD',
    price: 30000,
    attributes: { CPU: 'i7-10610U', RAM: '16GB', SSD: '256GB' },
  },
];

for (const it of items) {
  if (!fs.existsSync(it.src)) {
    console.error(`Missing source: ${it.src}`);
    continue;
  }
  const slug = uniqueSlug(it.baseSlug);
  const imageUrl = await toWebp(it.src, slug);
  const product = createProduct({
    name: it.name,
    slug,
    short_description: it.name,
    description: '',
    price: it.price,
    category_id: businessLaptopsCat.id,
    brand: 'Lenovo',
    images: [imageUrl],
    attributes: it.attributes,
    in_stock: true,
  });
  console.log(`Added #${product.id}: ${product.name} -> ${imageUrl}`);
}
