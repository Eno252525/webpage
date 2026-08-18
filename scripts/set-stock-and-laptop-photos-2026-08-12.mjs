// Catalog corrections of 2026-08-12:
//   * iiyama ProLite PL2492H 24" IPS  -> out of stock (row kept, just in_stock=0)
//   * Photos for sixteen laptop rows out of the 2026-08 supplier import:
//       Lenovo ThinkPad T520, HP Pavilion g7, HP ProBook 450, HP ProBook 950,
//       HP 240 G4, Lenovo ThinkPad L440, Lenovo ThinkPad L540, HP G62,
//       HP ProBook 850 G2 (both the 128GB and 256GB row), HP ProBook 430 G2,
//       MacBook Pro 13" Late 2015, MacBook Pro i5-2410M,
//       MacBook Pro 15" 2019 i7-9750H, MacBook Pro 15" 2018 i7-8850H,
//       MacBook Pro 15" 2018 i9-8950HK
//
// Source photos are the tracked files in _drive_src/. Several rows share a chassis
// photo with a near model from the same brand (the HP ProBook bodies on one, L440 /
// L540 on the other), but each still gets its own /uploads/<slug>.webp so the DB
// rows stay independent.
//
// Every entry in PHOTOS names its own source file. Do not point two different
// models at one generic filename that gets re-downloaded between runs (images.jpg,
// images-1.jpg and the like) — an earlier revision of this script did, and the
// three 15" MacBook rows ended up with an HP ProBook / ThinkPad body as a result.
// _drive_src/ holds one stable, model-named copy per photo for exactly that reason.
//
// The three 15" rows (#606, #613, #615) previously shared the stock
// /uploads/apple-macbook-pro-15-touchbar.webp; it is left untouched on disk (now
// unreferenced), so re-pointing the rows at it restores the pre-2026-08-12 state.
//
// Idempotent: keyed by slug, re-asserts in_stock / images instead of duplicating,
// and the WebP files are simply rewritten. products.db and uploads/ are
// git-ignored, so this must also be run on the server after the deploy:
//
//   node scripts/set-stock-and-laptop-photos-2026-08-12.mjs

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { getProductBySlug, updateProduct } from '../database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uploadsDir = path.join(root, 'uploads');
const srcDir = path.join(root, '_drive_src');

// Back the DB up before touching it.
const dbFile = path.join(root, 'products.db');
if (fs.existsSync(dbFile)) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(dbFile, path.join(root, `products.db.bak-${stamp}`));
  console.log(`Backed up products.db -> products.db.bak-${stamp}`);
}

const OUT_OF_STOCK = ['iiyama-pl2492h'];

// product slug -> source file in _drive_src/
const PHOTOS = {
  'lenovo-thinkpad-t520': 'lenovo-thinkpad-t520.jpg',
  'hp-pavilion-g7': 'hp-pavilion-g7.jpg',
  'hp-probook-450': 'hp-probook-450.jpg',
  'hp-probook-950': 'hp-probook-450.jpg',
  'hp-240-g4': 'hp-probook-450.jpg',
  'lenovo-thinkpad-l440': 'lenovo-thinkpad-l440.jpg',
  'lenovo-thinkpad-l540': 'lenovo-thinkpad-l440.jpg',
  'hp-g62': 'hp-probook-450.jpg',
  'hp-probook-850-g2': 'hp-probook-450.jpg',
  'hp-probook-850-g2-256': 'hp-probook-450.jpg',
  'hp-probook-430-g2': 'hp-probook-450.jpg',
  'apple-macbook-pro-late-2015': 'apple-macbook-pro-13-late-2015.jpg',
  'apple-macbook-pro-2019-i7': 'apple-macbook-pro-15-2018-spacegrey.jpg',
  'apple-macbook-pro-2018-i7-8850h': 'apple-macbook-pro-15-2018-spacegrey.jpg',
  'apple-macbook-pro-2018-i9': 'apple-macbook-pro-15-2018-silver.jpg',
  'apple-macbook-pro-i5-2410m': 'apple-macbook-pro-i5-2410m.jpg',
};

// Rows whose image is reset to none.
const CLEAR_IMAGES = [];

async function toWebp(srcFile, destSlug) {
  const srcAbs = path.join(srcDir, srcFile);
  if (!fs.existsSync(srcAbs)) throw new Error(`Missing source image: _drive_src/${srcFile}`);
  const destAbs = path.join(uploadsDir, `${destSlug}.webp`);
  await sharp(srcAbs)
    .flatten({ background: '#ffffff' }) // product renders ship with alpha; cards are white
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(destAbs);
  return `/uploads/${destSlug}.webp`;
}

let missing = 0;

for (const slug of OUT_OF_STOCK) {
  const p = getProductBySlug(slug);
  if (!p) { console.warn(`SKIP (no such product): ${slug}`); missing++; continue; }
  updateProduct(p.id, { in_stock: 0 });
  console.log(`#${p.id} ${p.name}: in_stock -> 0`);
}

for (const [slug, srcFile] of Object.entries(PHOTOS)) {
  const p = getProductBySlug(slug);
  if (!p) { console.warn(`SKIP (no such product): ${slug}`); missing++; continue; }
  const url = await toWebp(srcFile, slug);
  updateProduct(p.id, { images: [url] });
  console.log(`#${p.id} ${p.name}: image -> ${url}`);
}

for (const slug of CLEAR_IMAGES) {
  const p = getProductBySlug(slug);
  if (!p) { console.warn(`SKIP (no such product): ${slug}`); missing++; continue; }
  updateProduct(p.id, { images: [] });
  console.log(`#${p.id} ${p.name}: image -> (none)`);
}

console.log(missing ? `Done with ${missing} missing product(s).` : 'Done.');
