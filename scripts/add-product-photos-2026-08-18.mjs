// Product photos supplied by Eno, 2026-08-18:
//
//   #616 HP EliteOne 800 G3 AIO   (i3-7100)     — had no photo
//   #631 HP ProDesk 400 G6 DM Tiny (i5-10500T)  — had no photo
//   #632 Apple Magic Mouse 2                    — had no photo
//   #633 Apple Mac mini Late 2018 (i3-8100B)    — replaces the Wikimedia shot
//
// The originals are staged in _drive_src/ rather than at the project root,
// because .gitignore drops /*.jpg and /*.png — keeping them here means they
// travel with the repo, so this script can regenerate the WebP on the server
// (uploads/ is git-ignored and never deploys).
//
// The Mac mini source is Eno's own product shot; scripts/add-magic-mouse-mac-mini-2026-08-18.mjs
// no longer downloads the Wikimedia image, so this script is the only producer
// of apple-mac-mini-2018.webp and the two can run in either order on the server.
//
// The sources are small (the EliteOne one is only 259px wide), so the resize is
// capped with withoutEnlargement — upscaling a thumbnail only softens it.
// The Mac mini PNG carries an alpha channel; it is flattened onto white so it
// matches the rest of the catalogue's studio shots.
//
// Idempotent: the WebP is regenerated from the committed source every run
// (deterministic output, so re-running changes nothing) and the DB write
// re-asserts the same images value. Safe to re-run, including on the server.
//
//   node scripts/add-product-photos-2026-08-18.mjs
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
  { id: 616, file: 'hp-eliteone-800-g3-aio.jpg', name: 'hp-eliteone-800-g3-aio-i3-7100' },
  { id: 631, file: 'hp-prodesk-400-g6-dm.jpg', name: 'hp-prodesk-400-g6-dm-i5-10500t' },
  { id: 632, file: 'apple-magic-mouse-2.jpg', name: 'apple-magic-mouse-2' },
  { id: 633, file: 'apple-mac-mini-late-2018.png', name: 'apple-mac-mini-2018' },
];

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log('Backup: products.db.bak-' + stamp + '\n');

console.log('Images');
for (const p of PHOTOS) {
  const from = path.join(src, p.file);
  if (!fs.existsSync(from)) { console.log(`  ! _drive_src/${p.file} missing — skipped`); continue; }
  const out = path.join(uploads, `${p.name}.webp`);
  await sharp(from)
    .flatten({ background: '#ffffff' })          // drop alpha onto white
    .resize({ width: 1000, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(out);
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
