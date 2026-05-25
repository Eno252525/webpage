import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import https from 'https';
import sharp from 'sharp';
import db, { createProduct, getProductBySlug } from '../database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uploadsDir = path.join(root, 'uploads');

function download(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/png,image/*,*/*;q=0.8',
      },
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = new URL(res.headers.location, url).toString();
        res.resume();
        download(next).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('timeout')));
  });
}

async function toWebp(buf, destSlug) {
  const destAbs = path.join(uploadsDir, `${destSlug}.webp`);
  await sharp(buf)
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

const aioCat = db.prepare("SELECT id FROM categories WHERE slug = 'aio'").get();
if (!aioCat) throw new Error('aio category missing');

// Photo per model (shared across products that use the same chassis)
const photos = {
  'hp-proone-600-g2': 'https://www.tech-bazaar.com/wp-content/uploads/2021/11/hp-proone-600-g2-main.jpg',
  'hp-proone-600-g1': 'https://www.compeve.com/Products/Desktops/HP/Proone_600/L5M61US/L5M61US_compeve__1.jpg',
  'hp-proone-400-g5': 'https://www.tradeinn.com/f/13734/137343972/hp-proone-400-g5-20-i5-9500t-8gb-256gb-ssd-all-in-one-pc.webp',
  'hp-proone-400-g2': 'https://coretekcomputers.com/cdn/shop/products/ProOne400G21_1024x1024.jpg',
  'dell-optiplex-5250-aio': 'https://comptechdirect.com/cdn/shop/products/DELL_AO5250AIO_INT_2_c7f39c52-c85c-4246-a336-f07c68940b2c_1024x1024.jpg',
  'dell-optiplex-3030-aio': 'https://coretekcomputers.com/cdn/shop/products/3030_01_1b3ee704-ea73-4159-b4a6-103274ff7731_1024x1024.jpg',
  'lenovo-thinkcentre-m70a': 'https://comptechdirect.com/cdn/shop/products/Lenovo_11VL0040CA_INT_1_f9d6f263-4eb0-462b-98bf-c4ec068ed7b5_1024x1024.jpg',
  'hp-proone-200-g4': 'https://microless.com/cdn/products/f1cc2330084f76391cb9bc3e34bc3cdb-hi.jpg',
  'hp-proone-600-g4': 'https://comptechdirect.com/cdn/shop/products/HP_ProOne_600-G4_f30a3fec-8d6a-438d-b4c4-13c188fd76ec_1024x1024.jpg',
  'hp-proone-600-g3': 'https://comptechdirect.com/cdn/shop/products/DH4SW60U8RREF_1024x1024.jpg',
};

// Deduplicated product list (originally 16 rows in the user's table → 12 unique specs)
const items = [
  { photoKey: 'hp-proone-600-g2', baseSlug: 'hp-proone-600-g2-aio-i5-gen6', name: 'HP ProOne 600 G2 AIO 22" - i5 Gen 6 / 8GB RAM / 128GB SSD', brand: 'HP', attrs: { CPU: 'i5 Gen 6', RAM: '8GB', SSD: '128GB', Screen: '22"' } },
  { photoKey: 'hp-proone-600-g1', baseSlug: 'hp-proone-600-g1-aio-i3-4130', name: 'HP ProOne 600 G1 AIO 22" - i3-4130 / 8GB RAM / 128GB SSD', brand: 'HP', attrs: { CPU: 'i3-4130', RAM: '8GB', SSD: '128GB', Screen: '22"' } },
  { photoKey: 'hp-proone-400-g5', baseSlug: 'hp-proone-400-g5-aio-i5-9500t', name: 'HP ProOne 400 G5 AIO 20" - i5-9500T / 8GB RAM / 256GB SSD', brand: 'HP', attrs: { CPU: 'i5-9500T', RAM: '8GB', SSD: '256GB', Screen: '20"' } },
  { photoKey: 'hp-proone-400-g2', baseSlug: 'hp-proone-400-g2-aio-i5-6500', name: 'HP ProOne 400 G2 AIO 20" - i5-6500 / 8GB RAM / 128GB SSD', brand: 'HP', attrs: { CPU: 'i5-6500', RAM: '8GB', SSD: '128GB', Screen: '20"' } },
  { photoKey: 'dell-optiplex-5250-aio', baseSlug: 'dell-optiplex-5250-aio-i5-7500', name: 'Dell Optiplex 5250 AIO 22" - i5-7500 / 8GB RAM / 256GB SSD', brand: 'Dell', attrs: { CPU: 'i5-7500', RAM: '8GB', SSD: '256GB', Screen: '22"' } },
  { photoKey: 'dell-optiplex-3030-aio', baseSlug: 'dell-optiplex-3030-aio-i5-4290s', name: 'Dell Optiplex 3030 AIO - i5-4290S / 8GB RAM / 128GB SSD', brand: 'Dell', attrs: { CPU: 'i5-4290S', RAM: '8GB', SSD: '128GB' } },
  { photoKey: 'lenovo-thinkcentre-m70a', baseSlug: 'lenovo-thinkcentre-m70a-aio-i5-10500', name: 'Lenovo ThinkCentre M70a AIO - i5-10500 / 8GB RAM / 256GB SSD', brand: 'Lenovo', attrs: { CPU: 'i5-10500', RAM: '8GB', SSD: '256GB' } },
  { photoKey: 'hp-proone-600-g2', baseSlug: 'hp-proone-600-g2-aio-i3-6100', name: 'HP ProOne 600 G2 AIO 22" - i3-6100 / 8GB RAM / 128GB SSD', brand: 'HP', attrs: { CPU: 'i3-6100', RAM: '8GB', SSD: '128GB', Screen: '22"' } },
  { photoKey: 'hp-proone-200-g4', baseSlug: 'hp-proone-200-g4-aio-i3-10110u', name: 'HP ProOne 200 G4 AIO 22" - i3-10110U / 8GB RAM / 256GB SSD', brand: 'HP', attrs: { CPU: 'i3-10110U', RAM: '8GB', SSD: '256GB', Screen: '22"' } },
  { photoKey: 'hp-proone-600-g4', baseSlug: 'hp-proone-600-g4-aio-i3-8100', name: 'HP ProOne 600 G4 AIO 22" - i3-8100 / 8GB RAM / 256GB SSD', brand: 'HP', attrs: { CPU: 'i3-8100', RAM: '8GB', SSD: '256GB', Screen: '22"' } },
  { photoKey: 'hp-proone-400-g5', baseSlug: 'hp-proone-400-g5-aio-i3-8100', name: 'HP ProOne 400 G5 AIO 20" - i3-8100 / 8GB RAM / 256GB SSD', brand: 'HP', attrs: { CPU: 'i3-8100', RAM: '8GB', SSD: '256GB', Screen: '20"' } },
  { photoKey: 'hp-proone-600-g3', baseSlug: 'hp-proone-600-g3-aio-i3-6100', name: 'HP ProOne 600 G3 AIO 22" - i3-6100 / 8GB RAM / 128GB SSD', brand: 'HP', attrs: { CPU: 'i3-6100', RAM: '8GB', SSD: '128GB', Screen: '22"' } },
];

// Download each unique photo once and cache the result as a Buffer.
const photoBufs = {};
for (const [key, url] of Object.entries(photos)) {
  try {
    process.stdout.write(`Downloading ${key} ... `);
    photoBufs[key] = await download(url);
    console.log(`${photoBufs[key].length} bytes`);
  } catch (e) {
    console.log(`FAILED (${e.message})`);
  }
}

let added = 0, skipped = 0;
for (const it of items) {
  const slug = uniqueSlug(it.baseSlug);
  const buf = photoBufs[it.photoKey];
  let imageUrl = null;
  if (buf) {
    try {
      imageUrl = await toWebp(buf, slug);
    } catch (e) {
      console.error(`Image convert failed for ${slug}: ${e.message}`);
    }
  }
  const product = createProduct({
    name: it.name,
    slug,
    short_description: it.name,
    description: '',
    price: 0,
    category_id: aioCat.id,
    brand: it.brand,
    images: imageUrl ? [imageUrl] : [],
    attributes: it.attrs,
    in_stock: true,
  });
  console.log(`Added #${product.id}: ${product.name} -> ${imageUrl || '(no image)'}`);
  added++;
}
console.log(`\nDone. Added: ${added}, Skipped: ${skipped}`);
