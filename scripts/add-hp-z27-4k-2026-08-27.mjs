// Adds the 27" 4K HP Z-display from Eno's 2026-08-27 note ("z27n 4k"):
//
//   HP Z27 — 27" IPS 4K UHD, USB-C 65W        25 000 L
//
// Note on the name: the Z27n / Z27n G2 are 2560x1440 (QHD) panels — there is no
// "Z27n 4K". HP's 27" 4K Z-display is the plain Z27 (part 2TB68A4, 2017), so
// that is what this row describes. The QHD Z27n G2 already exists in the DB as
// slug hp-z27n-g2-27 and is untouched here.
//
// Photo is the official HP product render (white background, front view) from
// the open Icecat catalog — Icecat id 51982647_4260962902 via openIcecat-live.
// Specs are from HP's QuickSpecs / datasheet for the Z27 4K UHD Display.
//
// sku is left empty on purpose — Eno assigns those.
//
// Idempotent: keyed by slug (insert-or-update), an existing uploads/<name>.webp
// is left alone, and the DB write re-asserts the same values. Safe to re-run —
// which is required on the server, where products.db and uploads/ are
// git-ignored and never arrive through a deploy:
//   node scripts/add-hp-z27-4k-2026-08-27.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');
const uploads = path.join(root, 'uploads');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const PRODUCTS = [
  {
    slug: 'hp-z27-4k',
    name: 'HP Z27 — Monitor 27" IPS 4K UHD USB-C',
    brand: 'HP',
    price: 25000,
    image: 'https://images.icecat.biz/img/gallery/51982647_4260962902.jpg',
    short_description:
      'Monitor HP Z27 27" IPS 4K UHD (3840x2160) me USB-C 65W, hub USB 3.0 dhe këmbë me rregullim lartësie, tilt, swivel e pivot.',
    description: '',
    attributes: {
      Brand: 'HP',
      Model: 'Z27 (2TB68A4)',
      'Screen Size': '27"',
      Resolution: '3840 x 2160 (4K UHD)',
      Panel: 'IPS, anti-glare, LED backlight',
      'Refresh Rate': '60 Hz',
      'Response Time': '8 ms (5 ms me overdrive)',
      Brightness: '350 cd/m²',
      Contrast: '1300:1',
      'Viewing Angle': '178° / 178°',
      Color: '99% sRGB, 10-bit (8-bit + FRC)',
      Ports: 'USB-C (65W power delivery), DisplayPort 1.2, mini-DisplayPort 1.2, HDMI 2.0, 3x USB 3.0 (hub)',
      Features: 'Picture-in-Picture, flicker-free, hub USB, VESA 100x100',
      Ergonomia: 'Lartësi, tilt, swivel, pivot 90°',
      Gjendja: 'Pre-Owned / Testuar',
    },
  },
];

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*;q=0.8' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return resolve(download(new URL(res.headers.location, url).toString()));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);

const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('monitore')?.id;
if (!catId) throw new Error('category "monitore" not found');

console.log('Images');
for (const p of PRODUCTS) {
  const out = path.join(uploads, `${p.slug}.webp`);
  if (fs.existsSync(out)) {
    console.log(`  ${p.slug}.webp already present — skipped`);
    continue;
  }
  const buf = await download(p.image);
  await sharp(buf).resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
  console.log(`  ${p.slug}.webp written (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
}

const existing = db.prepare('SELECT id FROM products WHERE slug = ?');
const insert = db.prepare(`
  INSERT INTO products
    (name, slug, short_description, description, price, sale_price, category_id,
     images, attributes, brand, sku, in_stock, featured, created_at, updated_at)
  VALUES
    (@name, @slug, @short_description, @description, @price, NULL, @category_id,
     @images, @attributes, @brand, '', 1, 0, datetime('now'), datetime('now'))
`);
const update = db.prepare(`
  UPDATE products SET
    name = @name, short_description = @short_description, description = @description,
    price = @price, sale_price = NULL, category_id = @category_id, images = @images,
    attributes = @attributes, brand = @brand, in_stock = 1, updated_at = datetime('now')
  WHERE slug = @slug
`);

console.log('\nProducts');
db.transaction(() => {
  for (const p of PRODUCTS) {
    const row = {
      name: p.name,
      slug: p.slug,
      short_description: p.short_description,
      description: p.description,
      price: p.price,
      category_id: catId,
      images: JSON.stringify([`/uploads/${p.slug}.webp`]),
      attributes: JSON.stringify(p.attributes),
      brand: p.brand,
    };
    const found = existing.get(p.slug);
    if (found) {
      update.run(row);
      console.log(`  ~ #${found.id} ${p.name} — ${p.price} L (updated)`);
    } else {
      const r = insert.run(row);
      console.log(`  + #${r.lastInsertRowid} ${p.name} — ${p.price} L`);
    }
  }
})();

db.close();
