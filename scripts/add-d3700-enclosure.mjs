// Adds the HP StorageWorks D3700 SAS disk enclosure (JBOD disk shelf) to the
// Server category (id 17), SKU SR0009. It's storage, not a server, but there is
// no dedicated storage category and the owner chose to list it under Server.
// See [[project_server_placeholders]].
//
// Idempotent: keyed on SKU (insert if absent, else update). Backs the DB up
// first. Run on the server too, after a deploy, since products.db is git-ignored:
//   node scripts/add-d3700-enclosure.mjs
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');
const SERVER_CATEGORY_ID = 17;

const P = {
  sku: 'SR0009', brand: 'HP', slug: 'hp-storageworks-d3700',
  name: 'HP StorageWorks D3700 Disk Enclosure — 25x SFF / 12G SAS',
  price: 9900,
  short_description:
    'Kabinet disqesh HP StorageWorks D3700 rack 2U me 25 foletë SFF dhe ndërfaqe 12 Gb/s SAS — zgjerim kapaciteti për serverët HP ProLiant.',
  description:
    'HP StorageWorks D3700 është një kabinet disqesh (disk enclosure / JBOD) rack 2U që zgjeron kapacitetin e ruajtjes së serverëve HP ProLiant pa kaluar në SAN. Ofron 25 foletë SFF (2.5") me ndërfaqe deri në 12 Gb/s SAS, i lidhur me një kontrollues Smart Array (p.sh. P4xx/P8xx). Disqet nuk përfshihen. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
  attributes: {
    'Brand': 'HP', 'Model': 'StorageWorks D3700',
    'Tipi': 'Kabinet disqesh (Disk Enclosure / JBOD)',
    'Foletë e disqeve': '25x SFF (2.5")',
    'Ndërfaqja': 'Deri në 12 Gb/s SAS',
    'Forma': 'Rack 2U', 'Gjendja': 'I përdorur / I testuar',
  },
};

const db = new Database(dbPath);
if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(SERVER_CATEGORY_ID)) {
  console.error(`Aborting — category ${SERVER_CATEGORY_ID} does not exist.`); process.exit(1);
}
if (!fs.existsSync(path.join(root, 'uploads', `${P.slug}.webp`))) {
  console.error(`Aborting — missing image uploads/${P.slug}.webp.`); process.exit(1);
}
const slugClash = db.prepare('SELECT id FROM products WHERE slug = ? AND sku != ?').get(P.slug, P.sku);
if (slugClash) { console.error(`Aborting — slug "${P.slug}" already used by another product.`); process.exit(1); }

const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const images = JSON.stringify([`/uploads/${P.slug}.webp`]);
const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(P.sku);
if (existing) {
  db.prepare(`
    UPDATE products SET name=:name, slug=:slug, price=:price, short_description=:short_description,
      description=:description, attributes=:attributes, images=:images, brand=:brand,
      category_id=:category_id, updated_at=datetime('now') WHERE sku=:sku
  `).run({ ...P, attributes: JSON.stringify(P.attributes), images, category_id: SERVER_CATEGORY_ID });
  console.log('Updated existing SR0009.');
} else {
  db.prepare(`
    INSERT INTO products (name, slug, short_description, description, price, sale_price,
      category_id, images, attributes, brand, sku, in_stock, featured)
    VALUES (:name, :slug, :short_description, :description, :price, NULL,
      :category_id, :images, :attributes, :brand, :sku, 1, 0)
  `).run({ ...P, attributes: JSON.stringify(P.attributes), images, category_id: SERVER_CATEGORY_ID });
  console.log('Inserted new SR0009.');
}

const r = db.prepare('SELECT id, sku, price, name FROM products WHERE sku = ?').get(P.sku);
console.log(`  #${r.id} | ${r.sku} | ${r.price} Lekë | ${r.name}`);
