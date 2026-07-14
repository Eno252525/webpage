// Replaces the placeholder photos for three enterprise SSDs with real product
// photos supplied in the project root. Each source is converted to WebP and
// written over the product's existing /uploads/<slug>.webp — the DB already
// points there, so no DB change is needed.
// Idempotent: re-running just re-generates the same WebP files.
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';
import db from '../database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uploadsDir = path.join(root, 'uploads');

// slug -> real source photo in the project root
const updates = [
  { slug: 'dell-toshiba-px02smf020-200gb-sas-ssd', src: 'PX02SMF020-lg.jpg' },
  { slug: 'seagate-1200-st200fm0053-200gb-sas-ssd', src: 'images-1.jpg' },
  { slug: 'micron-realssd-p300-100gb-sata-ssd', src: '65b.jpg' },
];

for (const { slug, src } of updates) {
  const row = db.prepare('SELECT id, name FROM products WHERE slug = ?').get(slug);
  if (!row) {
    console.log(`Skipped (product missing): ${slug}`);
    continue;
  }
  const srcAbs = path.join(root, src);
  if (!fs.existsSync(srcAbs)) throw new Error(`Missing source image: ${src}`);

  const destAbs = path.join(uploadsDir, `${slug}.webp`);
  if (fs.existsSync(destAbs)) {
    fs.copyFileSync(destAbs, `${destAbs}.bak-realimg`);
  }
  await sharp(srcAbs)
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(destAbs);
  console.log(`Updated image #${row.id}: ${row.name} <- ${src}`);
}

console.log('Done.');
