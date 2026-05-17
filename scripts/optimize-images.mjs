// ─────────────────────────────────────────────────────────────────────────────
// optimize-images.mjs — convert uploaded product images to WebP and repoint the
// database at the new files. Originals are kept on disk as a rollback safety net.
//
//   node scripts/optimize-images.mjs
//
// Safe to re-run: already-converted files are skipped.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const UPLOADS = path.join(ROOT, 'uploads');
const DB_PATH = path.join(ROOT, 'products.db');

const MAX_WIDTH = 1600;   // product photos never need more
const QUALITY = 80;       // WebP quality — visually lossless for product shots

// ── 1. Back up the database ──────────────────────────────────────────────────
const backup = `${DB_PATH}.bak-webp`;
fs.copyFileSync(DB_PATH, backup);
console.log(`DB backed up → ${path.basename(backup)}`);

// ── 2. Convert every JPG/PNG in uploads/ to WebP ─────────────────────────────
const convertible = /\.(jpe?g|png)$/i;
const rename = new Map();   // "/uploads/old.jpg" → "/uploads/old.webp"
let bytesBefore = 0, bytesAfter = 0, converted = 0;

for (const file of fs.readdirSync(UPLOADS)) {
  if (!convertible.test(file)) continue;
  const src = path.join(UPLOADS, file);
  const webpName = file.replace(convertible, '.webp');
  const dest = path.join(UPLOADS, webpName);

  rename.set(`/uploads/${file}`, `/uploads/${webpName}`);

  if (fs.existsSync(dest)) continue;   // idempotent — skip already-done

  await sharp(src)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(dest);

  bytesBefore += fs.statSync(src).size;
  bytesAfter += fs.statSync(dest).size;
  converted++;
}

console.log(`Converted ${converted} image(s).`);
if (converted) {
  const pct = ((1 - bytesAfter / bytesBefore) * 100).toFixed(1);
  console.log(`  ${(bytesBefore / 1024).toFixed(0)} KB → ${(bytesAfter / 1024).toFixed(0)} KB  (-${pct}%)`);
}

// ── 3. Repoint product image paths in the database ───────────────────────────
const db = new Database(DB_PATH);
const rows = db.prepare('SELECT id, images FROM products').all();
const update = db.prepare('UPDATE products SET images = ? WHERE id = ?');

let productsUpdated = 0;
const tx = db.transaction(() => {
  for (const row of rows) {
    let imgs;
    try { imgs = JSON.parse(row.images || '[]'); } catch { continue; }
    if (!Array.isArray(imgs)) continue;

    const next = imgs.map(p => rename.get(p) || p);
    if (JSON.stringify(next) !== JSON.stringify(imgs)) {
      update.run(JSON.stringify(next), row.id);
      productsUpdated++;
    }
  }
});
tx();
db.close();

console.log(`Updated image paths on ${productsUpdated} product(s).`);
console.log('Done. Original JPG/PNG files were kept in uploads/ as a fallback.');
