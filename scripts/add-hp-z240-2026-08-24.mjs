// Adds the HP Z240 Tower from Eno's 2026-08-24 list, into the Workstation
// category:
//
//   HP Z240 Tower  i7-6700 / 16GB DDR4 / 256GB SSD / Quadro K2200 4GB  20 000 L
//
// The catalog had no Z240 at all before this — it slots between the Z2 G4
// (i7-8700, 29 000 L) and the older Z420/Z440 Xeon towers, and is the same
// K2200 generation as dell-precision-5810 and fujitsu-celsius-w550.
//
// Tower, not SFF: the Quadro K2200 is a full-height card, so this is HP's
// Z240 Tower/MT chassis rather than the small-form-factor variant. Say so if a
// customer asks — the two share the model name but not the expansion slots.
//
// Photo: HP's own front render of the Z240 Tower, from the open Icecat catalog
// (SKU Y3Y24ET, "HP Z240 Tower Workstation", 1475x3279). Icecat also carries a
// three-quarter shot on the i7-6700/16GB SKU J9C07EAR, but every other tower in
// the shop is photographed straight on, so the front render keeps the grid
// consistent. Trimmed and letterboxed onto a 1000x1000 white square by the same
// helper as add-workstations-2026-08-24.mjs.
//
// sku is left empty on purpose — Eno assigns those.
//
// Idempotent: keyed by slug (insert-or-update), an existing uploads/<name>.webp
// is left alone, and the DB write re-asserts the same values. Safe to re-run —
// which is required on the server, where products.db and uploads/ are
// git-ignored and never arrive through a deploy:
//   node scripts/add-hp-z240-2026-08-24.mjs
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
    slug: 'hp-z240',
    name: 'HP Z240 — i7-6700 / 16GB RAM / 256GB SSD / Quadro K2200 4GB',
    brand: 'HP',
    price: 20000,
    image: 'https://images.icecat.biz/img/gallery/36686811_9681360988.jpg',
    short_description:
      'Workstation HP Z240 Tower me Intel Core i7-6700 (4 bërthama, deri 4.0 GHz), 16GB DDR4, 256GB SSD dhe NVIDIA Quadro K2200 4GB — CAD, modelim 3D dhe montazh video me kosto të ulët.',
    description:
      'HP Z240 Tower është workstation-i hyrës i serisë Z, i ndërtuar me të njëjtat komponentë dhe të njëjtin testim si modelet e mëdha Z440 e Z840, por me çmimin e një desktopi zyre. Procesori Intel Core i7-6700 (Skylake) ka 4 bërthama dhe 8 threads me Turbo deri në 4.0 GHz dhe 8 MB cache — frekuencë e lartë për bërthamë, çka i shkon për shtat programeve CAD si AutoCAD, SolidWorks apo Revit, ku numëron shpejtësia e një thread-i të vetëm. Konfigurimi ka 16GB memorie DDR4 dhe një SSD prej 256GB për nisje dhe hapje projektesh të shpejta, me foleza të lira për disqe shtesë. Karta NVIDIA Quadro K2200 me 4GB GDDR5 është kartë profesionale me drejtues të certifikuar për aplikacione CAD/CAM dhe mban deri në katër ekrane nga dy dalje DisplayPort dhe një DVI. Shasia tower ka ushqim 400 W, akses pa vegla dhe hapësirë për zgjerim — një zgjidhje e qëndrueshme për studio të vogla projektimi, montazh video dhe punë grafike. Makina është e rinovuar dhe e testuar.',
    attributes: {
      Brand: 'HP',
      Model: 'Z240 Tower',
      CPU: 'Intel Core i7-6700 (4 bërthama / 8 threads, 3.4 GHz bazë deri 4.0 GHz)',
      RAM: '16GB DDR4',
      SSD: '256GB SSD',
      GPU: 'NVIDIA Quadro K2200 4GB GDDR5',
      Cache: '8 MB',
      Socket: 'LGA1151',
      'Form Factor': 'Tower',
      Gjendja: 'I rinovuar / I testuar',
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

const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('workstation')?.id;
if (!catId) throw new Error('category "workstation" not found');
console.log(`Category "Workstation" = #${catId}\n`);

// Same normalisation as add-workstations-2026-08-24.mjs: trim the white
// surround, add back an even 8% margin, then letterbox onto one 1000x1000 white
// square, so every tower reads at the same scale on a shop card.
async function normalise(buf) {
  const trimmed = await sharp(buf).trim({ threshold: 12 }).toBuffer();
  const { width, height } = await sharp(trimmed).metadata();
  const margin = Math.round(Math.max(width, height) * 0.08);
  // Separate pass: sharp runs resize before extend within one pipeline, which
  // would put the margin outside the 1000x1000 box instead of inside it.
  const padded = await sharp(trimmed)
    .extend({
      top: margin, bottom: margin, left: margin, right: margin,
      background: { r: 255, g: 255, b: 255 },
    })
    .toBuffer();
  return sharp(padded)
    .resize(1000, 1000, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
    .webp({ quality: 82 })
    .toBuffer();
}

console.log('Images');
for (const p of PRODUCTS) {
  const out = path.join(uploads, `${p.slug}.webp`);
  if (fs.existsSync(out)) {
    console.log(`  ${p.slug}.webp already present — skipped`);
    continue;
  }
  fs.writeFileSync(out, await normalise(await download(p.image)));
  const meta = await sharp(out).metadata();
  console.log(
    `  ${p.slug}.webp written (${meta.width}x${meta.height}, ${(fs.statSync(out).size / 1024).toFixed(0)} KB)`
  );
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
