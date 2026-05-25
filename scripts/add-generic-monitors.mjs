import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'products.db'));

const MONITOR_CAT_ID = 3;

const products = [
  {
    name: 'Monitor 22"',
    slug: 'monitor-22-mix',
    short_description: 'Monitor 22 inch, modele të ndryshme. Full HD, i përshtatshëm për zyrë dhe shtëpi.',
    price: 2000,
    attributes: {
      'Screen Size': '22"',
      'Resolution': '1920 x 1080 (Full HD)',
      'Refresh Rate': '60 Hz',
      'Panel': 'TN / IPS (varion sipas modelit)',
      'Ports': 'VGA, DVI / HDMI (varion sipas modelit)',
      'Features': 'Modele të përziera nga prodhues të ndryshëm.',
    },
  },
  {
    name: 'Monitor 23"',
    slug: 'monitor-23-mix',
    short_description: 'Monitor 23 inch, modele të ndryshme. Full HD, i përshtatshëm për zyrë dhe shtëpi.',
    price: 2500,
    attributes: {
      'Screen Size': '23"',
      'Resolution': '1920 x 1080 (Full HD)',
      'Refresh Rate': '60 Hz',
      'Panel': 'TN / IPS (varion sipas modelit)',
      'Ports': 'VGA, DVI / HDMI / DisplayPort (varion sipas modelit)',
      'Features': 'Modele të përziera nga prodhues të ndryshëm.',
    },
  },
  {
    name: 'Monitor 24"',
    slug: 'monitor-24-mix',
    short_description: 'Monitor 24 inch, modele të ndryshme. Full HD, i përshtatshëm për zyrë dhe shtëpi.',
    price: 3000,
    attributes: {
      'Screen Size': '24"',
      'Resolution': '1920 x 1080 (Full HD)',
      'Refresh Rate': '60 Hz',
      'Panel': 'TN / IPS (varion sipas modelit)',
      'Ports': 'VGA, DVI / HDMI / DisplayPort (varion sipas modelit)',
      'Features': 'Modele të përziera nga prodhues të ndryshëm.',
    },
  },
];

const insert = db.prepare(`
  INSERT INTO products
    (name, slug, short_description, description, price, sale_price, category_id,
     images, attributes, brand, in_stock, featured, created_at, updated_at)
  VALUES
    (:name, :slug, :short_description, '', :price, NULL, :category_id,
     '[]', :attributes, '', 1, 0, datetime('now'), datetime('now'))
`);

const exists = db.prepare('SELECT id FROM products WHERE slug = ?');

const tx = db.transaction(() => {
  for (const p of products) {
    if (exists.get(p.slug)) {
      console.log(`= exists, skipping: ${p.slug}`);
      continue;
    }
    const r = insert.run({
      name: p.name,
      slug: p.slug,
      short_description: p.short_description,
      price: p.price,
      category_id: MONITOR_CAT_ID,
      attributes: JSON.stringify(p.attributes),
    });
    console.log(`+ #${r.lastInsertRowid} ${p.name} — ${p.price} L`);
  }
});

tx();

const rows = db
  .prepare(
    `SELECT id, name, price, sale_price, in_stock
     FROM products WHERE category_id = ? ORDER BY id DESC LIMIT 10`
  )
  .all(MONITOR_CAT_ID);
console.log('\n— Latest monitors —');
for (const r of rows) {
  console.log(`#${r.id} ${r.name}  price=${r.price} sale=${r.sale_price ?? '-'} stock=${r.in_stock}`);
}
