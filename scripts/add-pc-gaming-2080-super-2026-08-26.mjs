// Adds the RGB gaming build from Eno's 2026-08-26 message, into the existing
// top-level "Gaming" category:
//
//   PC Gaming  i5-11400F / 32GB DDR4 / 512GB NVMe / RTX 2080 Super 8GB   75 000 L
//
// It sits directly above the shop's other 11th-gen build (#7, i5-11400F /
// RX 7600 / 16GB / 512GB at 65 000 L): same processor, double the memory, and
// a 2080 Super in place of the RX 7600.
//
// PHOTO — needs a human decision. This is a shop-assembled machine, so no
// manufacturer render of *this* PC exists. The image used is the official MSI
// render of the MAG FORGE 100R mid-tower from the open Icecat catalog
// (75767105_7056535481) — a black tempered-glass case with two ARGB front fans,
// shot 3/4 on white, which matches the framing of the existing gaming PC photo
// (#7). It is representative, not the actual unit: the render carries MSI
// badging on the front panel and shows an MSI GeForce card through the glass.
// If the real build uses a different case, drop a photo of the machine over
// uploads/pc-gaming-i5-11400f-rtx-2080-super.webp and re-run — the script
// leaves an existing file alone.
//
// The RTX 2080 Super is Turing (2019): 3072 CUDA cores, 8GB GDDR6 on a 256-bit
// bus, RT and Tensor cores, so DLSS works but not DLSS 3 frame generation
// (Ada-only). Paired with a 6-core i5-11400F it is a 1440p high-refresh card.
// The F suffix means no integrated graphics — the GPU is required, not
// optional, which the copy says out loud.
//
// The CPU attribute deliberately starts with the bare "i5-11400F" and no
// "Intel Core" prefix: the shop sidebar's CPU family/generation filters match
// on `attributes.CPU LIKE 'i5%'` and `LIKE 'i_-11___%'` (database.js), so a
// prefixed string would drop the product out of both facets.
//
// sku is left empty on purpose — Eno assigns those.
//
// Idempotent: keyed by slug (insert-or-update), an existing uploads/<name>.webp
// is left alone, and the DB write re-asserts the same values. Safe to re-run —
// which is required on the server, where products.db and uploads/ are
// git-ignored and never arrive through a deploy:
//   node scripts/add-pc-gaming-2080-super-2026-08-26.mjs
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
    slug: 'pc-gaming-i5-11400f-rtx-2080-super',
    name: 'PC Gaming — i5-11400F / 32GB DDR4 / 512GB NVMe / RTX 2080 Super 8GB',
    brand: 'PC Gaming',
    price: 75000,
    image: 'https://images.icecat.biz/img/gallery/75767105_7056535481.jpg',
    short_description:
      'PC Gaming i asambluar në shasi RGB me xham të temperuar — Intel Core i5-11400F, 32GB DDR4, 512GB SSD NVMe dhe NVIDIA GeForce RTX 2080 Super 8GB. Gati për lojëra në 1440p me cilësi të lartë.',
    description:
      'Kompjuter gaming i asambluar në dyqan, në një shasi mid-tower me ndriçim RGB dhe panel anësor me xham të temperuar — ventilatorët ARGB përpara duken përmes xhamit dhe ngjyrat rregullohen nga programi i motherboard-it. Procesori Intel Core i5-11400F (Rocket Lake) ka 6 bërthama dhe 12 threads me Turbo deri në 4.4 GHz dhe 12 MB cache: mjaftueshëm i shpejtë për të mos e mbajtur pas kartën grafike në lojërat më kërkuese, dhe i qetë në ngarkesë. Memoria është 32GB DDR4 — dyfishi i asaj që kërkon sot çdo lojë, çka do të thotë se mund të luash, të transmetosh në Discord ose Twitch dhe të mbash shfletuesin plot me skeda pa u ndier fare. Sistemi niset nga një SSD NVMe prej 512GB, disa herë më i shpejtë se një SSD SATA, dhe shasia ka vend për disqe shtesë nëse duhet më shumë hapësirë. Karta grafike NVIDIA GeForce RTX 2080 Super me 8GB GDDR6 dhe 3072 bërthama CUDA sjell bërthama RT për ray tracing dhe bërthama Tensor për DLSS: në 1440p luan titujt e sotëm me cilësi të lartë dhe me frame rate të rrjedhshëm, ndërsa në 1080p mbush pa problem një monitor 144 Hz. Kini parasysh se procesorët me shkronjën F nuk kanë grafikë të integruar — karta grafike është pjesë e domosdoshme e sistemit, jo shtesë.',
    attributes: {
      Brand: 'PC Gaming',
      CPU: 'i5-11400F (6 bërthama / 12 threads, 2.6 GHz bazë deri 4.4 GHz)',
      RAM: '32GB DDR4',
      SSD: '512GB NVMe',
      GPU: 'NVIDIA GeForce RTX 2080 Super 8GB GDDR6',
      Cache: '12 MB',
      Socket: 'LGA1200',
      'Form Factor': 'MT',
      Shasia: 'Mid-tower me ndriçim RGB dhe panel anësor me xham të temperuar',
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

const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('gaming')?.id;
if (!catId) throw new Error('category "gaming" not found');
console.log(`Category "Gaming" = #${catId}\n`);

// Same normalisation as add-workstations-2026-08-24.mjs: trim the white
// surround, add back an even 8% margin, then letterbox onto one 1000x1000 white
// square, so the tower reads at the same scale as the other shop cards.
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
    const priceLabel = p.price > 0 ? `${p.price} L` : 'Çmim sipas kërkesës';
    if (found) {
      update.run(row);
      console.log(`  ~ #${found.id} ${p.name} — ${priceLabel} (updated)`);
    } else {
      const r = insert.run(row);
      console.log(`  + #${r.lastInsertRowid} ${p.name} — ${priceLabel}`);
    }
  }
})();

db.close();
console.log('\nDone.');
