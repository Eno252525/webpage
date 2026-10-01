// Adds the Humanscale M8.1 monitor arm (polished aluminium with white trim,
// two-piece desk clamp — Humanscale part M81CMWBTB) to Aksesorë at 1 500 L,
// on sale for 1 000 L, per Eno 2026-10-01.
//
// Photo is Humanscale's official render (via Icecat), cut out onto white; it
// ships in the repo as scripts/assets/humanscale-m8-1-monitor-arm.webp and is
// copied into uploads/ here.
//
// sku left empty, like the other accessories — Eno assigns those.
//
// Idempotent: keyed by slug (insert-or-update); the photo is only copied if
// missing. Safe to re-run — required on the server, where products.db and
// uploads/ are git-ignored:
//   node scripts/add-humanscale-m8-1-monitor-arm-2026-10-01.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dbPath = path.join(root, 'products.db');

const P = {
  slug: 'humanscale-m8-1-monitor-arm',
  name: 'Humanscale M8.1 — Krah Monitori (Monitor Arm)',
  brand: 'Humanscale',
  price: 1500,
  sale_price: 1000,
  asset: 'humanscale-m8-1-monitor-arm.webp',
  short_description:
    'Krah monitori premium Humanscale M8.1 me mbërthim në tavolinë, montim VESA 75/100, alumin i lëmuar me detaje të bardha.',
  description:
    'Humanscale M8.1 është krah monitori ergonomik i nivelit premium, që e ngre monitorin në lartësinë e duhur të syve dhe liron hapësirë në tavolinë. Monitori lëviz lehtë lart-poshtë, para-mbrapa dhe anash me një prekje, dhe qëndron aty ku e lini. Montohet në tavolinë me mbërthim (clamp) me dy pjesë dhe pranon monitorë me montim VESA 75 ose 100. Ndërtim nga alumini i lëmuar me detaje të bardha. Gjendja: i përdorur.',
  attributes: {
    Brand: 'Humanscale',
    Model: 'M8.1',
    Montimi: 'Mbërthim në tavolinë (clamp me dy pjesë)',
    VESA: '75 x 75 / 100 x 100',
    Ngjyra: 'Alumin i lëmuar me detaje të bardha',
    Gjendja: 'I përdorur',
  },
};

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const out = path.join(root, 'uploads', P.asset);
if (fs.existsSync(out)) {
  console.log(`Image: ${P.asset} already present — skipped`);
} else {
  fs.copyFileSync(path.join(here, 'assets', P.asset), out);
  console.log(`Image: ${P.asset} copied into uploads/`);
}

const db = new Database(dbPath);
const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('aksesore')?.id;
if (!catId) throw new Error('category "aksesore" not found');

const row = {
  name: P.name, slug: P.slug, short_description: P.short_description, description: P.description,
  price: P.price, sale_price: P.sale_price, category_id: catId,
  images: JSON.stringify([`/uploads/${P.asset}`]), attributes: JSON.stringify(P.attributes),
  brand: P.brand,
};

const found = db.prepare('SELECT id FROM products WHERE slug = ?').get(P.slug);
db.transaction(() => {
  if (found) {
    db.prepare(`
      UPDATE products SET
        name = @name, short_description = @short_description, description = @description,
        price = @price, sale_price = @sale_price, category_id = @category_id, images = @images,
        attributes = @attributes, brand = @brand, in_stock = 1, hidden = 0,
        updated_at = datetime('now')
      WHERE slug = @slug
    `).run(row);
    console.log(`~ #${found.id} ${P.name} — ${P.sale_price} L (updated)`);
  } else {
    const r = db.prepare(`
      INSERT INTO products
        (name, slug, short_description, description, price, sale_price, category_id,
         images, attributes, brand, sku, in_stock, featured, hidden, created_at, updated_at)
      VALUES
        (@name, @slug, @short_description, @description, @price, @sale_price, @category_id,
         @images, @attributes, @brand, '', 1, 0, 0, datetime('now'), datetime('now'))
    `).run(row);
    console.log(`+ #${r.lastInsertRowid} ${P.name} — ${P.sale_price} L (from ${P.price} L)`);
  }
})();

db.close();
console.log('\nDone.');
