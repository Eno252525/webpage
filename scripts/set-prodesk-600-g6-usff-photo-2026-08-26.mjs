// Fixes the photo on #123 hp-prodesk-600-g6, 2026-08-26.
//
//   #123 HP Prodesk 600 G6 - i5-10400T / 8GB RAM / 256GB SSD   Form Factor: USFF
//
// The row was showing the 600 G6 *SFF* desktop — a wide, flat, horizontal box —
// while the row is a USFF (HP calls it Desktop Mini): the small 177x175x34 mm
// unit that fits behind a monitor. The wrong image came in with
// set-prodesk-600-g6-photo-2026-08-20.mjs, whose source was staged as
// `_drive_src/hp-prodesk-600-g6-sff.jpg` — the filename already said SFF. The
// i5-10400T in the row is a 35W T-series part, which is what the Desktop Mini
// ships with, so the USFF attribute is the correct half and the picture was the
// wrong half.
//
// New photo: HP's own front render of the ProDesk 600 G6 Desktop Mini on white,
// from the open Icecat catalog (SKU 1D2E3EA, gallery 91773617_5118450199) —
// the same i5-10500T-class Mini configuration.
//
// It is written to a NEW filename, hp-prodesk-600-g6-usff.webp, rather than
// overwriting hp-prodesk-600-g6.webp. The site is live and the old path is
// already in browser and CDN caches; a new path guarantees visitors see the
// corrected image instead of a cached wrong one. The old file is left on disk
// (harmless, unreferenced) rather than deleted, so this is reversible by
// pointing the row back at it.
//
// The source render is very wide (3092x862 — a Mini is a flat slab), so after
// the usual trim + 8% margin it is letterboxed onto a 1000x1000 white square
// like the rest of the recent catalogue. It will sit as a wide band in the
// middle of the card, which is simply the shape of the product.
//
// Idempotent: the WebP is re-downloaded and regenerated every run (deterministic
// output) and the DB write re-asserts the same images value. Safe to re-run,
// and it must be run on the server, where products.db and uploads/ are
// git-ignored:
//   node scripts/set-prodesk-600-g6-usff-photo-2026-08-26.mjs
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

const SLUG = 'hp-prodesk-600-g6';
const OUT = 'hp-prodesk-600-g6-usff.webp';
const SOURCE = 'https://images.icecat.biz/img/gallery/91773617_5118450199.jpg';

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

// Same normalisation as add-workstations-2026-08-24.mjs.
async function normalise(buf) {
  const trimmed = await sharp(buf).trim({ threshold: 12 }).toBuffer();
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
const row = db.prepare('SELECT id, name, images FROM products WHERE slug = ?').get(SLUG);
if (!row) throw new Error(`product "${SLUG}" not found`);

console.log('Image');
const out = path.join(uploads, OUT);
fs.writeFileSync(out, await normalise(await download(SOURCE)));
const meta = await sharp(out).metadata();
console.log(`  ${OUT} written (${meta.width}x${meta.height}, ${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);

console.log('\nProduct');
console.log(`  was: ${row.images}`);
db.prepare(
  "UPDATE products SET images = ?, updated_at = datetime('now') WHERE id = ?"
).run(JSON.stringify([`/uploads/${OUT}`]), row.id);
console.log(`  now: ["/uploads/${OUT}"]   (#${row.id} ${row.name})`);

db.close();
console.log('\nDone.');
