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

const cat = db.prepare("SELECT id FROM categories WHERE slug = 'workstation-laptops'").get();
if (!cat) throw new Error('workstation-laptops category missing');

const src = path.join(root, 'P8110563-2.jpg');
if (!fs.existsSync(src)) throw new Error(`Missing source: ${src}`);

const name = 'Lenovo Thinkpad P53 - i5-9400H / 8GB RAM / 256GB SSD / T1000';
const slug = uniqueSlug('lenovo-thinkpad-p53');
const imageUrl = await toWebp(src, 'lenovo-thinkpad-p53-i5-9400h-8gb-256gb-t1000');

const product = createProduct({
  name,
  slug,
  short_description: name,
  description: '',
  price: 33000,
  category_id: cat.id,
  brand: 'Lenovo',
  images: [imageUrl],
  attributes: { CPU: 'i5-9400H', RAM: '8GB', SSD: '256GB', GPU: 'T1000' },
  in_stock: true,
});
console.log(`Added #${product.id}: ${product.name} -> ${imageUrl}`);
