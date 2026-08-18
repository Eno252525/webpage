// Product photos for the two G2 UPS units that still had none, 2026-08-18.
//
//   #623 HP R/T2200 G2 UPS 2200VA / 1980W Rack-Tower 2U
//   #624 HP R/T3000 G2 UPS 3000VA / 2700W Rack-Tower 2U
//
// Photos supplied by Eno. The originals are staged in _drive_src/ rather than at
// the project root, because .gitignore drops /*.jpg — keeping them here means
// they travel with the repo, so this script can regenerate the WebP on the
// server (uploads/ is git-ignored and never deploys).
//
// The sources are small (roughly 400px square), so the resize is capped with
// withoutEnlargement: upscaling a 400px product shot only softens it.
//
// Idempotent: an existing uploads/<name>.webp is left alone, and the DB write
// re-asserts the same images value. Safe to re-run, including on the server.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');
const uploads = path.join(root, 'uploads');
const src = path.join(root, '_drive_src');

// product id -> source file in _drive_src / target basename in uploads
const PHOTOS = [
  { id: 623, file: 'hp-rt2200-g2-ups.jpg', name: 'hp-rt2200-g2-ups' },
  { id: 624, file: 'hp-rt3000-g2-ups.jpg', name: 'hp-rt3000-g2-ups' },
];

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log('Backup: products.db.bak-' + stamp + '\n');

console.log('Images');
for (const p of PHOTOS) {
  const out = path.join(uploads, `${p.name}.webp`);
  if (fs.existsSync(out)) { console.log(`  ${p.name}.webp already present — skipped`); continue; }
  const from = path.join(src, p.file);
  if (!fs.existsSync(from)) { console.log(`  ! _drive_src/${p.file} missing — skipped`); continue; }
  await sharp(from).resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
  const { width, height } = await sharp(out).metadata();
  console.log(`  ${p.name}.webp written (${width}x${height}, ${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
}

const db = new Database(dbPath);
const run = db.transaction(() => {
  console.log('\nProducts');
  for (const p of PHOTOS) {
    const row = db.prepare('SELECT id, name, images FROM products WHERE id = ?').get(p.id);
    if (!row) { console.log(`  ! #${p.id} missing — skipped`); continue; }
    if (!fs.existsSync(path.join(uploads, `${p.name}.webp`))) {
      console.log(`  ! #${p.id} has no image file to point at — skipped`);
      continue;
    }
    const images = JSON.stringify([`/uploads/${p.name}.webp`]);
    if (row.images === images) { console.log(`  #${p.id} already points at ${p.name}.webp`); continue; }
    db.prepare("UPDATE products SET images = ?, updated_at = datetime('now') WHERE id = ?").run(images, p.id);
    console.log(`  #${p.id} images: ${row.images} -> ${images}`);
  }
});

run();
db.close();
console.log('\nDone.');
