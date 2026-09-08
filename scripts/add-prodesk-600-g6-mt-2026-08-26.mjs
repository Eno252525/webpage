// Adds the HP ProDesk 600 G6 microtower from Eno's 2026-08-26 message, into the
// existing Desktop > PC category:
//
//   HP Prodesk 600 G6 MT  i3-10100 / 16GB RAM / 256GB SSD   25 000 L
//
// NOT a duplicate of #123 `hp-prodesk-600-g6` (i5-10400T, 8GB, listed USFF at
// 30 000 L) — different chassis and different configuration — so this row gets
// its own slug with the form factor and CPU in it, matching the newer house
// naming (`hp-prodesk-400-g6-sff-i5-8500`, `hp-prodesk-600-g5-dm-i5-9500t`).
//
// The CPU attribute is the bare "i3-10100" with no "Intel Core" prefix: the
// shop's sidebar CPU facets match `attributes.CPU LIKE 'i3%'` and
// `LIKE 'i_-10___%'` (database.js), and a prefixed string drops the product out
// of both. Same reason `Form Factor` is the short "MT" the other microtowers
// use — the facet compares it with `=`, not LIKE.
//
// Photo: HP's own 3/4 render of the 600 G6 Micro Tower on white, from the open
// Icecat catalog (SKU 1D2S0EA, gallery 85739951_5296556006). It is the right
// chassis and the right generation — the vertical louvred front panel with the
// USB-C port and the ProDesk stripe — just a different CPU option inside, which
// the picture cannot show. Normalised to the same 1000x1000 white square as the
// rest of the recent catalogue.
//
// The storage is entered as plain "256GB SSD": the message did not say whether
// it is NVMe or 2.5" SATA, and the G6 microtower takes either, so nothing is
// claimed. Worth confirming before a customer asks.
//
// sku is left empty on purpose — Eno assigns those.
//
// Idempotent: keyed by slug (insert-or-update), an existing uploads/<name>.webp
// is left alone, and the DB write re-asserts the same values. Safe to re-run —
// which is required on the server, where products.db and uploads/ are
// git-ignored and never arrive through a deploy:
//   node scripts/add-prodesk-600-g6-mt-2026-08-26.mjs
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
    slug: 'hp-prodesk-600-g6-mt-i3-10100',
    name: 'HP Prodesk 600 G6 MT - i3-10100 / 16GB RAM / 256GB SSD',
    brand: 'HP',
    price: 25000,
    image: 'https://images.icecat.biz/img/gallery/85739951_5296556006.jpg',
    short_description:
      'HP Prodesk 600 G6 në format Micro Tower me Intel Core i3-10100, 16GB RAM DDR4 dhe SSD 256GB — desktop biznesi i gjeneratës së 10-të me hapësirë të bollshme për zgjerim.',
    description:
      'HP ProDesk 600 G6 në format Micro Tower (MT) është desktop-i i biznesit i serisë 600 — një klasë mbi ProDesk 400 — dhe formati tower i jep atë që variantet SFF dhe Mini nuk e kanë: hapësirë. Brenda ka foleza PCI Express për kartë grafike ose kartë rrjeti, vend për disqe shtesë 3.5" dhe 2.5", katër foleza memorie DDR4 që mbajnë deri në 128GB, dhe një sistem ftohjeje që punon i qetë sepse nuk është i ngjeshur. Procesori Intel Core i3-10100 (Comet Lake) ka 4 bërthama dhe 8 threads me Turbo deri në 4.3 GHz dhe 6 MB cache — më i shpejtë se shumë i5 të gjeneratave të mëparshme dhe më se i mjaftueshëm për Office, shfletim me shumë skeda, kontabilitet, programe arke dhe punë të përditshme zyre. Memoria 16GB DDR4 është dyfishi i konfigurimit standard të këtyre makinave dhe do të thotë se sistemi nuk ngec kur mbahen hapur disa programe njëherësh, ndërsa SSD-ja 256GB e ndez kompjuterin në pak sekonda. Grafika Intel UHD 630 e integruar mbështet deri në tre ekrane nga daljet DisplayPort dhe VGA/HDMI sipas konfigurimit. Makina është e rinovuar dhe e testuar.',
    attributes: {
      Brand: 'HP',
      Model: 'ProDesk 600 G6 MT',
      CPU: 'i3-10100 (4 bërthama / 8 threads, 3.6 GHz bazë deri 4.3 GHz)',
      RAM: '16GB DDR4',
      SSD: '256GB',
      GPU: 'Intel UHD Graphics 630 (e integruar)',
      Cache: '6 MB',
      Socket: 'LGA1200',
      Chipset: 'Intel Q470',
      'Form Factor': 'MT',
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

const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('pc')?.id;
if (!catId) throw new Error('category "pc" not found');
console.log(`Category "PC" = #${catId}\n`);

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
