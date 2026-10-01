// Adds the HP ProDesk 600 G3 Desktop Mini (USFF) — i3-7100T / 8GB / 128GB SSD
// at 8 500 L, and takes the old 256GB listing (slug hp-prodesk-600-g3-13,
// 8 000 L) off the site with hidden = 1, per Eno 2026-10-01. Hidden, not
// deleted: the row and its views stay, and unticking "Fshihe nga faqja" in the
// admin brings it back.
//
// Photo is the official HP render of the ProDesk 600 G3 DM (front view, white
// background) from the open Icecat catalog — HP part 1CB74EA, the same
// i3-7100T configuration — via openIcecat-live. The old listing reused a 500px
// front+back shot; this one is 3032px, padded onto a square white canvas to
// match the other desktop photos.
//
// sku is left empty on purpose — Eno assigns those.
//
// Idempotent: keyed by slug (insert-or-update), an existing uploads/<slug>.webp
// is left alone, and re-running re-asserts the same values. Safe to re-run —
// which is required on the server, where products.db and uploads/ are
// git-ignored and never arrive through a deploy:
//   node scripts/add-hp-prodesk-600-g3-mini-i3-7100t-2026-10-01.mjs
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

const HIDE_SLUG = 'hp-prodesk-600-g3-13'; // i3-7100T / 8GB / 256GB, 8 000 L

const P = {
  slug: 'hp-prodesk-600-g3-mini-i3-7100t',
  name: 'HP Prodesk 600 G3 Mini - i3-7100T / 8GB RAM / 128GB SSD',
  brand: 'HP',
  price: 8500,
  image: 'https://images.icecat.biz/img/gallery/37057ad131497b3a5e8a2f15ea7a9c3ed0699d86.jpg',
  short_description: 'HP ProDesk 600 G3 Mini - i3-7100T / 8GB RAM / 128GB SSD',
  description:
    'HP ProDesk 600 G3 Desktop Mini është kompjuter zyre ultra-kompakt (USFF) që zë shumë pak vend në tavolinë dhe mund të montohet edhe pas monitorit me suport VESA. Procesori Intel Core i3-7100T (gjenerata e 7-të) me 8GB RAM dhe disk SSD 128GB e bëjnë të shpejtë për punë zyre, internet, email, programe kontabiliteti dhe recepsione. Konsumon pak energji dhe punon pothuajse pa zhurmë.',
  attributes: {
    CPU: 'i3-7100T',
    RAM: '8GB',
    SSD: '128GB',
    'Form Factor': 'USFF',
  },
};

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

const out = path.join(uploads, `${P.slug}.webp`);
if (fs.existsSync(out)) {
  console.log(`Image: ${P.slug}.webp already present — skipped`);
} else {
  // The render is a wide 3032x680 strip that touches its edges; centre it on a
  // square white canvas like the other mini-PC photos.
  const strip = await sharp(await download(P.image)).resize({ width: 900 }).toBuffer();
  await sharp({ create: { width: 1000, height: 1000, channels: 3, background: '#ffffff' } })
    .composite([{ input: strip, gravity: 'center' }])
    .webp({ quality: 85 })
    .toFile(out);
  console.log(`Image: ${P.slug}.webp written (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
}

const existing = db.prepare('SELECT id FROM products WHERE slug = ?');
const insert = db.prepare(`
  INSERT INTO products
    (name, slug, short_description, description, price, sale_price, category_id,
     images, attributes, brand, sku, in_stock, featured, hidden, created_at, updated_at)
  VALUES
    (@name, @slug, @short_description, @description, @price, NULL, @category_id,
     @images, @attributes, @brand, '', 1, 0, 0, datetime('now'), datetime('now'))
`);
const update = db.prepare(`
  UPDATE products SET
    name = @name, short_description = @short_description, description = @description,
    price = @price, sale_price = NULL, category_id = @category_id, images = @images,
    attributes = @attributes, brand = @brand, in_stock = 1, hidden = 0,
    updated_at = datetime('now')
  WHERE slug = @slug
`);
const hide = db.prepare(`UPDATE products SET hidden = 1, updated_at = datetime('now') WHERE slug = ?`);

db.transaction(() => {
  const row = {
    name: P.name,
    slug: P.slug,
    short_description: P.short_description,
    description: P.description,
    price: P.price,
    category_id: catId,
    images: JSON.stringify([`/uploads/${P.slug}.webp`]),
    attributes: JSON.stringify(P.attributes),
    brand: P.brand,
  };
  const found = existing.get(P.slug);
  if (found) {
    update.run(row);
    console.log(`~ #${found.id} ${P.name} — ${P.price} L (updated)`);
  } else {
    const r = insert.run(row);
    console.log(`+ #${r.lastInsertRowid} ${P.name} — ${P.price} L`);
  }

  const old = existing.get(HIDE_SLUG);
  if (old) {
    hide.run(HIDE_SLUG);
    console.log(`- #${old.id} ${HIDE_SLUG} hidden (256GB listing)`);
  } else {
    console.log(`  ${HIDE_SLUG} not found — nothing to hide`);
  }
})();

db.close();
console.log('\nDone.');
