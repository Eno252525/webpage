// Third photo batch of 2026-08-18: the two new Dell Optiplex desktops and the
// five APC UPS / bypass-panel rows that were still imageless, plus the HP
// R/T3000I which reuses the R/T3000 G2 shot.
//
//   #619 Dell Optiplex 7460 AIO 23.8"                    -> new WebP
//   #620 Dell Optiplex 5070 Tower                        -> new WebP
//   #625 HP R/T3000I UPS 3000VA                          -> reuses hp-rt3000-g2-ups.webp
//   #626 APC Smart-UPS SMT1500RMI2UNC                    -> new WebP
//   #627 APC Smart-UPS DLA1500I                          -> new WebP
//   #628 APC Smart-UPS X SMX3000RMHV2UNC                 -> new WebP
//   #629 APC Smart-UPS X SMX2200HV                       -> new WebP
//   #630 APC Service Bypass Panel SBP1500RMI 1U          -> new WebP
//
// Photos supplied by Eno. Originals are staged in _drive_src/ (the project root
// is .gitignore'd for /*.jpg) so this script can regenerate the WebP on the
// server, where uploads/ is git-ignored and never arrives through a deploy.
//
// Several sources are small or heavily cropped rack shots, so the resize uses
// withoutEnlargement — upscaling a 447px thumbnail only softens it.
//
// Idempotent: an existing uploads/<name>.webp is left alone and the DB write
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
  { id: 619, file: 'dell-optiplex-7460-aio.jpg', name: 'dell-optiplex-7460-aio' },
  { id: 620, file: 'dell-optiplex-5070-tower.jpg', name: 'dell-optiplex-5070-tower' },
  { id: 626, file: 'apc-smart-ups-smt1500rmi2unc.jpg', name: 'apc-smart-ups-smt1500rmi2unc' },
  { id: 627, file: 'apc-smart-ups-dla1500i.jpg', name: 'apc-smart-ups-dla1500i' },
  { id: 628, file: 'apc-smart-ups-x-smx3000rmhv2unc.jpg', name: 'apc-smart-ups-x-smx3000rmhv2unc' },
  { id: 629, file: 'apc-smart-ups-x-smx2200hv.jpg', name: 'apc-smart-ups-x-smx2200hv' },
  { id: 630, file: 'apc-service-bypass-panel-sbp1500rmi.jpg', name: 'apc-service-bypass-panel-sbp1500rmi' },
];

// products that point at an image another product already owns
const REUSED = [
  { id: 625, name: 'hp-rt3000-g2-ups' }, // same R/T3000 rack-tower chassis
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
  for (const p of [...PHOTOS, ...REUSED]) {
    const row = db.prepare('SELECT id, name, images FROM products WHERE id = ?').get(p.id);
    if (!row) { console.log(`  ! #${p.id} missing — skipped`); continue; }
    if (!fs.existsSync(path.join(uploads, `${p.name}.webp`))) {
      console.log(`  ! #${p.id} has no image file to point at — skipped`);
      continue;
    }
    const images = JSON.stringify([`/uploads/${p.name}.webp`]);
    if (row.images === images) { console.log(`  #${p.id} already points at ${p.name}.webp`); continue; }
    db.prepare("UPDATE products SET images = ?, updated_at = datetime('now') WHERE id = ?").run(images, p.id);
    console.log(`  #${p.id} ${row.name}\n      ${row.images} -> ${images}`);
  }
});

run();
db.close();
console.log('\nDone.');
