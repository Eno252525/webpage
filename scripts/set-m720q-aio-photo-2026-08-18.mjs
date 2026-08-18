// Real photo for the two "M720q Tiny + Monitor AIO" bundles, 2026-08-18.
//
//   #617 Lenovo ThinkCentre M720q Tiny + Monitor AIO - i3-8100
//   #618 Lenovo ThinkCentre M720q Tiny + Monitor AIO - i3-9100
//
// Both were created by scripts/add-desktops-ups-2026-08-15.mjs from
// _drive_src/lenovo-thinkcentre-m720q-tiny.png — the bare Tiny unit, which sold
// the bundle short: the listing is the Tiny mounted behind a Tiny-in-One 24"
// monitor. Eno supplied the correct hero shot (monitor + Tiny + keyboard and
// mouse), staged as _drive_src/lenovo-thinkcentre-tio3-24-aio.avif.
//
// The add-* script's `image:` for those two rows now names the same source, so
// re-running it on the server re-asserts this photo instead of reverting it.
//
// The source is 725x515 with alpha, so it is flattened onto white to match the
// rest of the catalogue's studio shots and capped with withoutEnlargement —
// upscaling a 725px render only softens it. Both products keep their own
// uploads/ filename (same bytes) so the DB rows are unchanged and a distinct
// per-variant photo can drop in later.
//
// Idempotent: the WebP is regenerated from the committed source every run
// (deterministic output) and the DB write re-asserts the same images value.
// Safe to re-run, including on the server.
//
//   node scripts/set-m720q-aio-photo-2026-08-18.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');
const uploads = path.join(root, 'uploads');
const src = path.join(root, '_drive_src');

const SOURCE = 'lenovo-thinkcentre-tio3-24-aio.avif';

// slug -> target basename in uploads (kept identical to what the rows already use)
const PHOTOS = [
  { slug: 'lenovo-thinkcentre-m720q-aio-i3-8100', name: 'lenovo-thinkcentre-m720q-aio-i3-8100' },
  { slug: 'lenovo-thinkcentre-m720q-aio-i3-9100', name: 'lenovo-thinkcentre-m720q-aio-i3-9100' },
];

const from = path.join(src, SOURCE);
if (!fs.existsSync(from)) throw new Error(`Missing source image: _drive_src/${SOURCE}`);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log('Backup: products.db.bak-' + stamp + '\n');

console.log('Images');
for (const p of PHOTOS) {
  const out = path.join(uploads, `${p.name}.webp`);
  await sharp(from)
    .flatten({ background: '#ffffff' })
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(out);
  const { width, height } = await sharp(out).metadata();
  console.log(`  ${p.name}.webp written (${width}x${height}, ${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
}

const db = new Database(dbPath);
const run = db.transaction(() => {
  console.log('\nProducts');
  for (const p of PHOTOS) {
    const row = db.prepare('SELECT id, name, images FROM products WHERE slug = ?').get(p.slug);
    if (!row) { console.log(`  ! ${p.slug} missing — skipped`); continue; }
    const images = JSON.stringify([`/uploads/${p.name}.webp`]);
    if (row.images === images) { console.log(`  #${row.id} already points at ${p.name}.webp`); continue; }
    db.prepare("UPDATE products SET images = ?, updated_at = datetime('now') WHERE id = ?").run(images, row.id);
    console.log(`  #${row.id} images: ${row.images} -> ${images}`);
  }
});

run();
db.close();
console.log('\nDone.');
