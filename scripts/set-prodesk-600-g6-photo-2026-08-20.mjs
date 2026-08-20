// Real photo for the HP Prodesk 600 G6, 2026-08-20.
//
//   #123 HP Prodesk 600 G6 - i5-10400T / 8GB RAM / 256GB SSD  (slug hp-prodesk-600-g6)
//
// The row was borrowing /uploads/hp-prodesk-600-g3.webp — the previous-generation
// chassis, which is still shared by five other 600 G3 listings, so the G6 had no
// photo of its own and showed the wrong front panel (G3 silver bar + diagonal
// vents vs. the G6's horizontal louvres and USB-C front port). Eno supplied the
// correct G6 SFF shot, staged as _drive_src/hp-prodesk-600-g6-sff.jpg.
//
// The row gets its own uploads/ filename (hp-prodesk-600-g6.webp) so the G3
// listings keep theirs untouched.
//
// The source is 800x328 with no alpha; flatten onto white matches the rest of
// the catalogue's studio shots and withoutEnlargement avoids upscaling an
// 800px render into a softer 1200px one.
//
// Idempotent: the WebP is regenerated from the committed source every run
// (deterministic output) and the DB write re-asserts the same images value.
// Safe to re-run, including on the server.
//
//   node scripts/set-prodesk-600-g6-photo-2026-08-20.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');
const uploads = path.join(root, 'uploads');
const src = path.join(root, '_drive_src');

const SOURCE = 'hp-prodesk-600-g6-sff.jpg';
const SLUG = 'hp-prodesk-600-g6';
const NAME = 'hp-prodesk-600-g6';

const from = path.join(src, SOURCE);
if (!fs.existsSync(from)) throw new Error(`Missing source image: _drive_src/${SOURCE}`);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log('Backup: products.db.bak-' + stamp + '\n');

console.log('Images');
const out = path.join(uploads, `${NAME}.webp`);
await sharp(from)
  .flatten({ background: '#ffffff' })
  .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 82 })
  .toFile(out);
{
  const { width, height } = await sharp(out).metadata();
  console.log(`  ${NAME}.webp written (${width}x${height}, ${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
}

const db = new Database(dbPath);
const run = db.transaction(() => {
  console.log('\nProducts');
  const row = db.prepare('SELECT id, name, images FROM products WHERE slug = ?').get(SLUG);
  if (!row) { console.log(`  ! ${SLUG} missing — skipped`); return; }
  const images = JSON.stringify([`/uploads/${NAME}.webp`]);
  if (row.images === images) { console.log(`  #${row.id} already points at ${NAME}.webp`); return; }
  db.prepare("UPDATE products SET images = ?, updated_at = datetime('now') WHERE id = ?").run(images, row.id);
  console.log(`  #${row.id} images: ${row.images} -> ${images}`);
});

run();
db.close();
console.log('\nDone.');
