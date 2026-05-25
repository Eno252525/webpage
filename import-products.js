import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'products.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// â”€â”€ Category map: WooCommerce category â†’ { name, slug, parentSlug } â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const WCAT_MAP = {
  'Laptop':                  { name: 'Laptop',         slug: 'laptop',     parentSlug: null },
  'Laptop > MacBook':        { name: 'MacBook',        slug: 'macbook',    parentSlug: 'laptop' },
  'Desktop':                 { name: 'Desktop',        slug: 'desktop',    parentSlug: null },
  'Desktop > PC':            { name: 'PC',             slug: 'pc',         parentSlug: 'desktop' },
  'Workstation':             { name: 'Workstation',    slug: 'workstation',parentSlug: null },
  'Networking':              { name: 'Networking',     slug: 'networking', parentSlug: null },
  'Networking > Server':     { name: 'Server',         slug: 'server',     parentSlug: null },
  'Networking > Switch':     { name: 'Switch',         slug: 'switch',     parentSlug: 'networking' },
  'Networking > NAS':        { name: 'NAS',            slug: 'nas',        parentSlug: 'networking' },
  'Networking > KVM':        { name: 'KVM',            slug: 'kvm',        parentSlug: 'networking' },
  'Networking > MikroTik':   { name: 'MikroTik',       slug: 'mikrotik',   parentSlug: 'networking' },
  'Komponente':              { name: 'Komponente',     slug: 'komponente', parentSlug: null },
  'Komponente > GPU':        { name: 'GPU',            slug: 'gpu',        parentSlug: 'komponente' },
  'Komponente > RAM':        { name: 'RAM',            slug: 'ram',        parentSlug: 'komponente' },
  'Komponente > SSD':        { name: 'SSD',            slug: 'ssd',        parentSlug: 'komponente' },
  'Komponente > HDD':        { name: 'HDD',            slug: 'hdd',        parentSlug: 'komponente' },
  'Monitor':                { name: 'Monitor',       slug: 'Monitor',   parentSlug: null },
  'UPS':                     { name: 'UPS',            slug: 'ups',        parentSlug: null },
};

// â”€â”€ Insert / get category by slug â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ensureCategory(slug, name, parentSlug) {
  const existing = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (existing) return existing.id;

  const parentId = parentSlug
    ? db.prepare('SELECT id FROM categories WHERE slug = ?').get(parentSlug)?.id || null
    : null;

  const result = db.prepare(
    'INSERT INTO categories (name, slug, parent_id, sort_order) VALUES (?, ?, ?, 0)'
  ).run(name, slug, parentId);
  console.log(`  + Category: ${name} (${slug})`);
  return result.lastInsertRowid;
}

// Insert categories (parents first, then children)
console.log('\nâ”€â”€ Categories â”€â”€');
const sortedEntries = Object.entries(WCAT_MAP).sort((a, b) => {
  const aDepth = a[0].split('>').length;
  const bDepth = b[0].split('>').length;
  return aDepth - bDepth;
});
for (const [, { name, slug, parentSlug }] of sortedEntries) {
  ensureCategory(slug, name, parentSlug);
}

// â”€â”€ Load products from JSON â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const rawProducts = JSON.parse(readFileSync(path.join(__dirname, 'products-final.json'), 'utf-8'));

function makeSlug(name) {
  return name.toLowerCase()
    .replace(/[Ã Ã¡Ã¢Ã£Ã¤Ã¥]/g, 'a').replace(/[Ã¨Ã©ÃªÃ«]/g, 'e').replace(/[Ã¬Ã­Ã®Ã¯]/g, 'i')
    .replace(/[Ã²Ã³Ã´ÃµÃ¶]/g, 'o').replace(/[Ã¹ÃºÃ»Ã¼]/g, 'u').replace(/Ã§/g, 'c')
    .replace(/Ã«/g, 'e').replace(/Ã§/g, 'c').replace(/Ã«/g, 'e')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getSlugUnique(base) {
  let slug = base;
  let n = 1;
  while (db.prepare('SELECT id FROM products WHERE slug = ?').get(slug)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

// Get the most specific category slug from the WooCommerce categories array
function getPrimaryCategorySlug(cats) {
  // Prefer subcategory (contains '>')
  const sub = cats.find(c => c.includes('>'));
  const primary = sub || cats[0];
  const mapped = WCAT_MAP[primary];
  return mapped ? mapped.slug : null;
}

// Insert products
const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO products
    (name, slug, short_description, price, sale_price, category_id, images, in_stock, created_at, updated_at)
  VALUES
    (:name, :slug, :short_desc, :price, :sale_price, :category_id, :images, :in_stock, datetime('now'), datetime('now'))
`);

console.log('\nâ”€â”€ Products â”€â”€');
let inserted = 0, skipped = 0;

db.transaction(() => {
  for (const p of rawProducts) {
    const catSlug = getPrimaryCategorySlug(p.categories || []);
    const catRow = catSlug ? db.prepare('SELECT id FROM categories WHERE slug = ?').get(catSlug) : null;

    const desc = (p.shortDesc || '')
      .replace(/\r/g, '').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);

    const slug = getSlugUnique(makeSlug(p.name).slice(0, 60) || 'product');

    const existing = db.prepare('SELECT id FROM products WHERE name = ? AND price = ?').get(p.name, p.price);
    if (existing) { skipped++; continue; }

    insertStmt.run({
      name: p.name,
      slug,
      short_desc: desc,
      price: p.price,
      sale_price: p.salePrice || null,
      category_id: catRow ? catRow.id : null,
      images: JSON.stringify(p.img ? [p.img] : []),
      in_stock: p.inStock ? 1 : 0,
    });
    inserted++;
    console.log(`  + ${p.name} â†’ ${catSlug || 'no cat'} (${p.price} L)`);
  }
})();

console.log(`\nâœ“ Done: ${inserted} inserted, ${skipped} skipped`);
console.log('Total products in DB:', db.prepare('SELECT COUNT(*) as n FROM products').get().n);
console.log('Total categories in DB:', db.prepare('SELECT COUNT(*) as n FROM categories').get().n);
