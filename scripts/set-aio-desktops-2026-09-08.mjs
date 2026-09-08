// Eno's 2026-09-08 list — three rows, all of which already existed in the
// catalogue, so this script only re-asserts / corrects them:
//
//   #619 dell-optiplex-7460-aio-i5-8500   i5-8500 / 8GB / 256GB, AIO 23.8"
//        Already at 25 000 L with the right specs — re-asserted, not changed.
//        (Eno's note said 24"; the panel is 23.8", which is how Dell markets
//        this as a 24" class AIO. The stored "Screen" attribute stays 23.8".)
//
//   #616 hp-eliteone-800-g3-aio-i3-7100   17 000 L -> on sale at 15 000 L
//        price stays 17 000 so the card shows the old price struck through
//        plus the SALE sticker (webroot/js/ui.js reads sale_price this way).
//        Also gets a better photo — see below.
//
//   #620 dell-optiplex-5070-tower-i7-9700 33 000 L -> 30 000 L
//        Straight price cut. This is the Tower; the near-identical #89
//        dell-optiplex-7070 (also i7-9700 / 8GB / 256GB) stays at 33 000 L.
//
// EliteOne photo: the old uploads/hp-eliteone-800-g3-aio-i3-7100.webp was a
// 4.9 KB, ~250px web thumbnail — visibly soft next to the rest of the AIO
// listings. Replaced with HP's own main product render (2614x2173) from the
// open Icecat catalog, SKU 1KB01EA (EliteOne 800 G3 23.8" AIO — same chassis,
// different CPU/GPU trim, so the body is identical to the i3-7100 row).
//
// Every HP render of this machine ships with a keyboard and mouse in frame,
// which the rest of the catalogue's AIO shots do not have (cf. the Optiplex
// 7460 above it), so the source is cropped to the top 84% of its height. That
// cut lands just under the stand base and above the keyboard — verified
// visually, not guessed — leaving the unit alone on white.
//
// The result is written to a NEW filename, hp-eliteone-800-g3-aio.webp,
// instead of overwriting the old path: the site is live and the old URL is in
// browser/CDN caches, so a new path guarantees visitors get the sharp image.
// The old file is left on disk, unreferenced, so this is reversible.
//
// Idempotent: the photo is re-downloaded and regenerated deterministically and
// every DB write re-asserts a fixed value, so re-running changes nothing. It
// MUST be run on the server too — products.db and uploads/ are git-ignored and
// never arrive through a deploy:
//   node scripts/set-aio-desktops-2026-09-08.mjs
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

const PHOTO = {
  slug: 'hp-eliteone-800-g3-aio-i3-7100',
  out: 'hp-eliteone-800-g3-aio.webp',
  source: 'https://images.icecat.biz/img/gallery/73b933ad7423ed16f651227ba7104e6b294f2aa9.jpg',
  keepTopFraction: 0.84, // crops the bundled keyboard + mouse out of frame
};

// slug -> { price, sale_price } exactly as they should end up.
const PRICES = [
  { slug: 'dell-optiplex-7460-aio-i5-8500', price: 25000, sale_price: null },
  { slug: 'hp-eliteone-800-g3-aio-i3-7100', price: 17000, sale_price: 15000 },
  { slug: 'dell-optiplex-5070-tower-i7-9700', price: 30000, sale_price: null },
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

// Same normalisation as set-prodesk-600-g6-usff-photo-2026-08-26.mjs:
// trim the white surround, re-pad 8%, letterbox onto a 1000x1000 white square.
async function normalise(buf, keepTopFraction) {
  let input = buf;
  if (keepTopFraction && keepTopFraction < 1) {
    const { width, height } = await sharp(buf).metadata();
    input = await sharp(buf)
      .extract({ left: 0, top: 0, width, height: Math.round(height * keepTopFraction) })
      .toBuffer();
  }
  const trimmed = await sharp(input).trim({ threshold: 12 }).toBuffer();
  const { width, height } = await sharp(trimmed).metadata();
  const margin = Math.round(Math.max(width, height) * 0.08);
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

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);

console.log('Photo');
const photoRow = db.prepare('SELECT id, name, images FROM products WHERE slug = ?').get(PHOTO.slug);
if (!photoRow) throw new Error(`product "${PHOTO.slug}" not found`);
const outPath = path.join(uploads, PHOTO.out);
fs.writeFileSync(outPath, await normalise(await download(PHOTO.source), PHOTO.keepTopFraction));
const meta = await sharp(outPath).metadata();
console.log(`  ${PHOTO.out} written (${meta.width}x${meta.height}, ${(fs.statSync(outPath).size / 1024).toFixed(0)} KB)`);
console.log(`  was: ${photoRow.images}`);
console.log(`  now: ["/uploads/${PHOTO.out}"]   (#${photoRow.id} ${photoRow.name})`);

const setImages = db.prepare("UPDATE products SET images = ?, updated_at = datetime('now') WHERE id = ?");
const setPrice = db.prepare("UPDATE products SET price = ?, sale_price = ?, updated_at = datetime('now') WHERE id = ?");

console.log('\nPrices');
db.transaction(() => {
  setImages.run(JSON.stringify([`/uploads/${PHOTO.out}`]), photoRow.id);
  for (const p of PRICES) {
    const row = db.prepare('SELECT id, name, price, sale_price FROM products WHERE slug = ?').get(p.slug);
    if (!row) throw new Error(`product "${p.slug}" not found`);
    const before = row.sale_price ? `${row.price} (sale ${row.sale_price})` : `${row.price}`;
    const after = p.sale_price ? `${p.price} (sale ${p.sale_price})` : `${p.price}`;
    setPrice.run(p.price, p.sale_price, row.id);
    const mark = before === after ? '=' : '->';
    console.log(`  #${row.id} ${row.name}\n      ${before} ${mark} ${after}`);
  }
})();

db.close();
console.log('\nDone.');
