// Adds the Ryzen gaming build from Eno's 2026-10-16 photos, into the existing
// top-level "Gaming" category:
//
//   PC Gaming  Ryzen 5 5600 / 16GB DDR4 / 256GB SSD / RX 580 8GB   35 000 L
//
// The shop's case label reads "MSI B550M Pro / Ryzen 5 5600 / RAM 32GB / RX 580
// 8GB", but Eno set this unit at 16GB DDR4 and 256GB, so the listing uses those.
// Price 35 000 L (Eno, same day; first added at 0 = "Çmim sipas kërkesës").
//
// PHOTO — the machine is built in an Aerocool Hexform (hexagon-mesh front, logo
// bottom right, glass side panel), identified from the shop photo. The shop photo
// itself shows the "32GB" label, so the image is Aerocool's official Hexform
// render (aerocool.io gallery 1042x589-02, 3/4 view with the glass side), with
// its #F6F6F6 backdrop lifted to white and cut out by ai-ads/stories/cutout.py.
// It is shipped in scripts/assets/ and copied into uploads/ when missing.
//
// The CPU attribute is the bare "Ryzen 5 5600". The sidebar's CPU family/gen
// filters are Intel-only (i3/i5/i7/i9 LIKE patterns in database.js), so this
// product is reached through the Gaming category and search, not those facets.
//
// sku is left empty on purpose — Eno assigns those.
//
// Idempotent: keyed by slug (insert-or-update), an existing uploads/<name>.webp
// is left alone. products.db and uploads/ are git-ignored, so run it on the
// server copy too:
//   node scripts/add-pc-gaming-ryzen-5-5600-rx-580-2026-10-16.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dbPath = path.join(root, 'products.db');

const SLUG = 'pc-gaming-ryzen-5-5600-rx-580';
const ASSET = `${SLUG}.webp`;

const PRODUCT = {
  slug: SLUG,
  name: 'PC Gaming — Ryzen 5 5600 / 16GB DDR4 / 256GB SSD / RX 580 8GB',
  brand: 'PC Gaming',
  price: 35000,
  short_description:
    'PC Gaming i asambluar në shasi Aerocool Hexform me xham anësor — AMD Ryzen 5 5600, 16GB DDR4, SSD 256GB dhe AMD Radeon RX 580 8GB mbi motherboard MSI B550M Pro. Për lojëra në 1080p, punë dhe studime.',
  description:
    'Kompjuter gaming i asambluar në dyqan, në shasinë kompakte Aerocool Hexform: panel i përparmë me rrjetë gjashtëkëndore për ajrim të mirë dhe panel anësor me xham të temperuar. Procesori AMD Ryzen 5 5600 (Zen 3) ka 6 bërthama dhe 12 threads, deri në 4.4 GHz dhe 32 MB cache — një nga procesorët më të mirë për raportin çmim/performancë në lojëra, i shpejtë edhe për montazh video, programim dhe multitasking. Memoria është 16GB DDR4, mjaftueshëm për lojërat e sotme dhe për shumë programe të hapura njëkohësisht, dhe sistemi niset nga një SSD 256GB, ndaj Windows-i dhe programet hapen shpejt. Karta grafike AMD Radeon RX 580 me 8GB memorie luan lojërat popullore si CS2, Valorant, Fortnite, GTA V dhe League of Legends në 1080p, ndërsa titujt më të rëndë shkojnë mirë me cilësi mesatare. Motherboard-i MSI B550M Pro mbështet PCIe 4.0, ka slot M.2 për SSD NVMe dhe lejon shtimin e RAM-it ose një karte grafike më të fuqishme më vonë. Kini parasysh se Ryzen 5 5600 nuk ka grafikë të integruar — monitori lidhet te karta grafike.',
  attributes: {
    Brand: 'PC Gaming',
    CPU: 'Ryzen 5 5600 (6 bërthama / 12 threads, 3.5 GHz bazë deri 4.4 GHz)',
    RAM: '16GB DDR4',
    SSD: '256GB',
    GPU: 'AMD Radeon RX 580 8GB',
    Motherboard: 'MSI B550M Pro',
    Cache: '32 MB',
    Socket: 'AM4',
    'Form Factor': 'MT',
    Shasia: 'Aerocool Hexform me panel anësor xhami',
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
const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('gaming')?.id;
if (!catId) throw new Error('category "gaming" not found');

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
