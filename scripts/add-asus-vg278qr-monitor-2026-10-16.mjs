// Adds the ASUS VG278QR 27" 165 Hz gaming monitor from Eno's 2026-10-16 photo of
// its back label (Model VG278 / Version VG278QR, 19V 2.1A, made June 2019),
// into the "Monitor" category:
//
//   ASUS VG278QR 27" 165Hz   price on request (0) — no price was given
//
// Specs are ASUS's: 27" TN, 1920×1080, 165 Hz, 0.5 ms (MPRT), FreeSync and
// NVIDIA G-SYNC Compatible, DisplayPort 1.2 / HDMI 1.4 / dual-link DVI-D,
// 2×2 W speakers, stand with height / tilt / swivel / pivot.
//
// Photo: ASUS's official front render (asus.com gallery), already cut out on a
// transparent background, flattened on white with an 8% margin at 1000×1000.
// It is shipped in scripts/assets/ and copied into uploads/ when missing.
//
// The attribute keys mirror the other monitors (Screen Size / Resolution /
// Refresh Rate / Panel / Response Time / Ports / Features), which the shop's
// monitor filters read. sku is left empty on purpose — Eno assigns those.
//
// Idempotent: keyed by slug (insert-or-update), an existing uploads/<name>.webp
// is left alone. products.db and uploads/ are git-ignored, so run it on the
// server copy too:
//   node scripts/add-asus-vg278qr-monitor-2026-10-16.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dbPath = path.join(root, 'products.db');

const SLUG = 'asus-vg278qr-27-165hz';
const ASSET = 'asus-vg278qr.webp';

const PRODUCT = {
  slug: SLUG,
  name: 'ASUS VG278QR — Monitor Gaming 27" 165Hz',
  brand: 'Asus',
  price: 0,
  short_description:
    'ASUS VG278QR — monitor gaming 27" Full HD me 165 Hz dhe 0.5 ms, FreeSync dhe G-SYNC Compatible, këmbë e rregullueshme dhe altoparlantë.',
  description:
    'ASUS VG278QR është një monitor gaming 27" me rezolucion Full HD (1920×1080), 165 Hz dhe kohë reagimi 0.5 ms – lëvizje shumë të qarta dhe pa vonesë në lojëra të shpejta si CS2, Valorant, Fortnite, Apex dhe Call of Duty. Mbështet AMD FreeSync dhe është i certifikuar NVIDIA G-SYNC Compatible, kështu figura nuk ndërpritet ("tearing") me asnjë kartë grafike moderne. Këmba rregullohet në lartësi, anon, rrotullohet dhe kthehet vertikalisht (pivot), për një qëndrim të rehatshëm gjatë orëve të gjata. Lidhjet: DisplayPort 1.2, HDMI 1.4 dhe DVI-D, me dalje kufjesh dhe dy altoparlantë 2W të integruar. Pajisje e përdorur, e testuar nga IT Store.',
  attributes: {
    'Screen Size': '27"',
    Resolution: '1920 x 1080 (Full HD)',
    'Refresh Rate': '165 Hz',
    Panel: 'TN',
    'Response Time': '0.5 ms (MPRT)',
    Ports: 'DisplayPort 1.2, HDMI 1.4, DVI-D, audio',
    Features: 'AMD FreeSync, NVIDIA G-SYNC Compatible, Height/tilt/swivel/pivot adjustable, 2x 2W speakers',
  },
};

const img = path.join(root, 'uploads', ASSET);
if (!fs.existsSync(img)) {
  fs.copyFileSync(path.join(here, 'assets', ASSET), img);
  console.log(`Image: copied to uploads/${ASSET}`);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);
const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('monitore')?.id;
if (!catId) throw new Error('category "monitore" not found');

const row = {
  ...PRODUCT,
  category_id: catId,
  images: JSON.stringify([`/uploads/${ASSET}`]),
  attributes: JSON.stringify(PRODUCT.attributes),
};

db.transaction(() => {
  const found = db.prepare('SELECT id FROM products WHERE slug = ?').get(SLUG);
  if (found) {
    db.prepare(`
      UPDATE products SET
        name = @name, short_description = @short_description, description = @description,
        price = @price, sale_price = NULL, category_id = @category_id, images = @images,
        attributes = @attributes, brand = @brand, in_stock = 1, updated_at = datetime('now')
      WHERE slug = @slug
    `).run(row);
    console.log(`~ #${found.id} ${PRODUCT.name} (updated)`);
  } else {
    const r = db.prepare(`
      INSERT INTO products
        (name, slug, short_description, description, price, sale_price, category_id,
         images, attributes, brand, sku, in_stock, featured, created_at, updated_at)
      VALUES
        (@name, @slug, @short_description, @description, @price, NULL, @category_id,
         @images, @attributes, @brand, '', 1, 0, datetime('now'), datetime('now'))
    `).run(row);
    console.log(`+ #${r.lastInsertRowid} ${PRODUCT.name}`);
  }
})();

db.close();
console.log('\nDone.');
