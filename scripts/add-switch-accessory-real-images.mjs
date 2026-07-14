// Replaces the placeholder / shared-family photos on the newly-seeded Cisco
// switches and the two HP accessories with the real product photos supplied in
// the project root. Each source is converted to WebP and written to a per-slug
// file at /uploads/<slug>.webp, then the product's images array is repointed
// there (so every product owns a unique image instead of a shared stock photo).
// Idempotent: re-running just re-generates the same WebP files and re-sets the
// same DB pointer.
//
//   node scripts/add-switch-accessory-real-images.mjs

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';
import { getProductBySlug, updateProduct } from '../database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uploadsDir = path.join(root, 'uploads');

// slug -> real source photo in the project root. Two 2960X 48-port models share
// one stock photo (their front panels are identical); each still gets its own
// /uploads/<slug>.webp so the DB rows stay independent.
const updates = [
  { slug: 'hp-dl380-gen9-gen10-2u-rail-kit', src: 'images-1.jpg' },
  { slug: 'hp-tft7600-g2-rack-console',      src: 'hp-tft7600g2-kvm-console-ra.jpg' },
  { slug: 'cisco-ws-c3650-48tq-s',           src: 'images.jpg' },
  { slug: 'cisco-ws-c2960x-48fps-l',         src: 'cisco-WS-C2960X-48FPS-L.jpg' },
  { slug: 'cisco-ws-c2960x-48ts-ll',         src: 'cisco-WS-C2960X-48FPS-L.jpg' },
  { slug: 'cisco-ws-c3560x-24p-l',           src: '273209.jpg' },
  { slug: 'cisco-ws-c3650-24ts-s',           src: 'WS-C3650-24TS-S.jpg' },
  { slug: 'cisco-ws-c2960x-48td-l',          src: 'WS-C2960X-48TD-L__17801_1200x1200.webp' },
  { slug: 'cisco-ws-c3850-48f-e',            src: 'cisco-WS-C3850-48F.jpg' },
  { slug: 'cisco-ws-c2960x-24ps-l',          src: '71unVVvTAiL.jpg' },
  { slug: 'cisco-ws-c3850-48p-s',            src: '51hJ4PRQ0DL._AC_SL1100_.jpg' },
];

let updated = 0, skipped = 0;
for (const { slug, src } of updates) {
  const row = getProductBySlug(slug);
  if (!row) {
    console.log(`  skipped (product missing): ${slug}`);
    skipped++;
    continue;
  }
  const srcAbs = path.join(root, src);
  if (!fs.existsSync(srcAbs)) throw new Error(`Missing source image: ${src}`);

  const rel = `/uploads/${slug}.webp`;
  const destAbs = path.join(uploadsDir, `${slug}.webp`);
  await sharp(srcAbs)
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(destAbs);
  updateProduct(row.id, { images: [rel] });
  updated++;
  console.log(`  updated  #${row.id}  ${row.sku}  ${slug}  <- ${src}`);
}

console.log(`\nDone. Updated ${updated}, skipped ${skipped}.`);
