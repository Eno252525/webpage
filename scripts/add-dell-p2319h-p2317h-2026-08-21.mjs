// Adds the two Dell P-series monitors from Eno's 2026-08-21 list:
//
//   Dell P2319H — 23" IPS Full HD, thin-bezel (2018 body)   6 500 L
//   Dell P2317H — 23" IPS Full HD, USB hub  (2016 body)     4 500 L
//
// Photos are the official Dell product renders (white background, front view),
// pulled from the open Icecat catalog rather than i.dell.com — both models are
// discontinued and their Dell shop pages (and the scene7 gallery assets behind
// them) are gone. The Icecat ids come from the openIcecat-live lookup:
//   P2319H -> 58511547_1988949351   P2317H -> 32316202_9260377494
//
// Specs are from the Dell datasheets / user's guides for each model — note the
// two differ: the P2319H is 8 ms normal / 5 ms fast with a DP-out (MST) chain
// port, the older P2317H is 6 ms with a mini-DisplayPort in.
//
// sku is left empty on purpose — Eno assigns those.
//
// Idempotent: keyed by slug (insert-or-update), an existing uploads/<name>.webp
// is left alone, and the DB write re-asserts the same values. Safe to re-run —
// which is required on the server, where products.db and uploads/ are
// git-ignored and never arrive through a deploy:
//   node scripts/add-dell-p2319h-p2317h-2026-08-21.mjs
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
    slug: 'dell-p2319h',
    name: 'Dell P2319H — Monitor 23" IPS Full HD',
    brand: 'Dell',
    price: 6500,
    image: 'https://images.icecat.biz/img/gallery/58511547_1988949351.jpg',
    short_description:
      'Monitor Dell P2319H 23" IPS Full HD me korniza ultra të holla nga tre anët, këmbë me rregullim lartësie/pivot dhe hyrje VGA, HDMI e DisplayPort.',
    description:
      'Dell P2319H është monitor profesional 23" me panel IPS Full HD (1920x1080) dhe korniza ultra të holla nga tre anët — ideal për konfigurime me dy ose më shumë monitorë. Paneli IPS me kënde shikimi 178°/178° mban ngjyrat të njëjta nga çdo pozicion, ndërsa ekrani anti-glare me ComfortView dhe pa dridhje (flicker-free) redukton lodhjen e syve gjatë orëve të gjata të punës. Këmba lejon rregullim lartësie, pjerrësie, rrotullimi dhe pivot 90° për punë në format vertikal, dhe hiqet për montim në krah VESA 100x100. Lidhjet përfshijnë VGA, HDMI dhe DisplayPort, plus një dalje DisplayPort (MST) për të lidhur në zinxhir një monitor të dytë, si dhe një hub USB me katër porta.',
    attributes: {
      Brand: 'Dell',
      Model: 'P2319H',
      'Screen Size': '23"',
      Resolution: '1920 x 1080 (Full HD)',
      Panel: 'IPS, anti-glare, LED edgelight',
      'Refresh Rate': '60 Hz',
      'Response Time': '8 ms (normal) / 5 ms (fast)',
      Brightness: '250 cd/m²',
      Contrast: '1000:1',
      'Viewing Angle': '178° / 178°',
      Ports: 'VGA, HDMI 1.4, DisplayPort 1.2, DP out (MST), 2x USB 3.0 + 2x USB 2.0',
      Features: 'Korniza ultra të holla 3-anëshe, ComfortView, flicker-free, VESA 100x100',
      Ergonomia: 'Lartësi, tilt, swivel, pivot 90°',
      Gjendja: 'Pre-Owned / Testuar',
    },
  },
  {
    slug: 'dell-p2317h',
    name: 'Dell P2317H — Monitor 23" IPS Full HD',
    brand: 'Dell',
    price: 4500,
    image: 'https://images.icecat.biz/img/gallery/32316202_9260377494.jpg',
    short_description:
      'Monitor Dell Professional P2317H 23" IPS Full HD me hub USB, këmbë me rregullim lartësie/pivot dhe hyrje VGA, HDMI, DisplayPort e mini-DisplayPort.',
    description:
      'Dell Professional P2317H është monitor 23" me panel IPS Full HD (1920x1080), i ndërtuar për punë të përditshme në zyrë. Paneli IPS ka kënde shikimi 178°/178° dhe sipërfaqe anti-glare, me kohë përgjigjeje 6 ms dhe kontrast 1000:1. Këmba jep rregullim të plotë — lartësi, pjerrësi, rrotullim dhe pivot 90° — dhe hiqet për montim VESA 100x100. Vjen me një gamë të gjerë lidhjesh: VGA, HDMI (me MHL), DisplayPort dhe mini-DisplayPort, plus një dalje DisplayPort për zinxhir MST dhe hub USB me katër porta për tastierë, mouse apo disqe të jashtëm.',
    attributes: {
      Brand: 'Dell',
      Model: 'P2317H',
      'Screen Size': '23"',
      Resolution: '1920 x 1080 (Full HD)',
      Panel: 'IPS, anti-glare, LED backlight',
      'Refresh Rate': '60 Hz',
      'Response Time': '6 ms (GTG)',
      Brightness: '250 cd/m²',
      Contrast: '1000:1',
      'Viewing Angle': '178° / 178°',
      Ports: 'VGA, HDMI (MHL), DisplayPort 1.2, mini-DisplayPort, DP out (MST), 4x USB (hub)',
      Features: 'Flicker-free, hub USB, VESA 100x100',
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
console.log('\nDone.');
