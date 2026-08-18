// Adds a batch of refurbished servers to the Server category (id 17) as
// placeholders: price 0 (configuration/spec to be filled in later) with a
// clean product photo already imported into uploads/ as WebP.
//
// SKUs are the shop's internal "artikull" codes (SR00xx). The 3Com 3C16485A
// (SW0020) from the same source list is intentionally omitted — it already
// exists as a Switch product. The two IBM x3550 M4 rows (machine type
// 7914K7G) collapse into one server.
//
// Idempotent: keyed on SKU. Re-running re-asserts name/brand/category/image
// and never duplicates. Existing price / description are left untouched so a
// later spec+price update is not clobbered. Backs the DB up first.
// Run on the server too, after a deploy, since products.db is git-ignored:
//   node scripts/add-server-placeholders.mjs
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const SERVER_CATEGORY_ID = 17;

const SERVERS = [
  { sku: 'SR0001', brand: 'HP',      name: 'HP ProLiant DL120 Gen9',   slug: 'hp-proliant-dl120-gen9' },
  { sku: 'SR0002', brand: 'HP',      name: 'HP ProLiant DL360 G7',     slug: 'hp-proliant-dl360-g7' },
  { sku: 'SR0003', brand: 'HP',      name: 'HP ProLiant DL360 Gen9',   slug: 'hp-proliant-dl360-gen9' },
  { sku: 'SR0004', brand: 'HP',      name: 'HP ProLiant DL360p Gen8',  slug: 'hp-proliant-dl360p-gen8' },
  { sku: 'SR0005', brand: 'HP',      name: 'HP ProLiant DL380p Gen8',  slug: 'hp-proliant-dl380p-gen8' },
  { sku: 'SR0006', brand: 'IBM',     name: 'IBM System x3550 M4',      slug: 'ibm-system-x3550-m4' },
  { sku: 'SR0007', brand: 'IBM',     name: 'IBM System x3650 M4',      slug: 'ibm-system-x3650-m4' },
  { sku: 'SR0010', brand: 'Dell',    name: 'Dell PowerEdge R210 II',   slug: 'dell-poweredge-r210-ii' },
  { sku: 'SR0011', brand: 'Dell',    name: 'Dell PowerEdge R330',      slug: 'dell-poweredge-r330' },
  { sku: 'SR0012', brand: 'Fujitsu', name: 'Fujitsu PRIMERGY RX200 S8', slug: 'fujitsu-primergy-rx200-s8' },
];

const db = new Database(dbPath);

// sanity: category exists, and every image file is present in uploads/
const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(SERVER_CATEGORY_ID);
if (!cat) {
  console.error(`Aborting — Server category id ${SERVER_CATEGORY_ID} does not exist.`);
  process.exit(1);
}
for (const s of SERVERS) {
  const img = path.join(root, 'uploads', `${s.slug}.webp`);
  if (!fs.existsSync(img)) {
    console.error(`Aborting — missing image uploads/${s.slug}.webp for ${s.sku}.`);
    process.exit(1);
  }
}

const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const findBySku  = db.prepare('SELECT id FROM products WHERE sku = ?');
const findBySlug = db.prepare('SELECT id FROM products WHERE slug = ?');
const insert = db.prepare(`
  INSERT INTO products (name, slug, price, sale_price, category_id, images, attributes,
                        brand, sku, in_stock, featured)
  VALUES (:name, :slug, 0, NULL, :category_id, :images, '{}', :brand, :sku, 1, 0)
`);
const update = db.prepare(`
  UPDATE products
  SET name = :name, slug = :slug, category_id = :category_id, images = :images,
      brand = :brand, updated_at = datetime('now')
  WHERE id = :id
`);

let inserted = 0, updated = 0;
const apply = db.transaction(() => {
  for (const s of SERVERS) {
    const images = JSON.stringify([`/uploads/${s.slug}.webp`]);
    const existing = findBySku.get(s.sku);
    if (existing) {
      update.run({ id: existing.id, name: s.name, slug: s.slug,
        category_id: SERVER_CATEGORY_ID, images, brand: s.brand });
      updated++;
    } else {
      // guard against a slug collision with an unrelated product
      if (findBySlug.get(s.slug)) {
        throw new Error(`slug "${s.slug}" already used by another product — aborting.`);
      }
      insert.run({ name: s.name, slug: s.slug, category_id: SERVER_CATEGORY_ID,
        images, brand: s.brand, sku: s.sku });
      inserted++;
    }
  }
});
apply();

console.log(`Done — ${inserted} inserted, ${updated} updated.`);
for (const s of SERVERS) {
  const r = db.prepare('SELECT id, sku, price, name FROM products WHERE sku = ?').get(s.sku);
  console.log(`  #${r.id} | ${r.sku} | ${r.price} Lekë | ${r.name}`);
}
