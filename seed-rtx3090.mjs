import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'products.db'));
db.pragma('foreign_keys = ON');

// Find or create Gaming category
let cat = db.prepare("SELECT id FROM categories WHERE slug = 'gaming'").get();
if (!cat) {
  const r = db.prepare("INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, ?)").run('Gaming', 'gaming', 7);
  cat = { id: r.lastInsertRowid };
}

const attributes = {
  "GPU": "NVIDIA GeForce RTX 3090",
  "VRAM": "24GB GDDR6X",
  "Memory Bus": "384-bit",
  "Boost Clock": "1860 MHz",
  "CUDA Cores": "10496",
  "Power Connector": "3x 8-pin",
  "TDP": "350W",
  "Outputs": "3x DisplayPort 1.4a, 1x HDMI 2.1",
  "Dimensions": "336 x 140 x 56 mm",
  "Cooling": "TORX Fan 4.0 Triple Fan",
  "RGB": "Mystic Light RGB",
};

const existing = db.prepare("SELECT id FROM products WHERE slug = 'msi-geforce-rtx-3090-suprim-x-24g'").get();
if (existing) {
  console.log('Product already exists, id:', existing.id);
  process.exit(0);
}

const stmt = db.prepare(`
  INSERT INTO products (name, slug, short_description, description, price, sale_price,
    category_id, images, attributes, badge, featured, in_stock, brand)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const result = stmt.run(
  'MSI GeForce RTX 3090 SUPRIM X 24G',
  'msi-geforce-rtx-3090-suprim-x-24g',
  'Karta grafike flagship me 24GB GDDR6X, triple fan TORX 4.0 dhe RGB Mystic Light.',
  `Karta grafike MSI GeForce RTX 3090 SUPRIM X 24G ofron performancën ultimate për gaming 4K dhe krijim të përmbajtjes profesionale. E pajisur me 24GB memorie GDDR6X 384-bit, motorin SUPRIM me 10496 CUDA Cores dhe sistemin e ftohjes me tre fanave TORX Fan 4.0 me teknologgjinë Zero Frozr. RGB Mystic Light e bën të dukshme në çdo build.`,
  1299,
  null,
  cat.id,
  JSON.stringify(['/uploads/msi-rtx3090-suprim-x.jpg']),
  JSON.stringify(attributes),
  'FLAGSHIP',
  1,
  1,
  'MSI'
);

console.log('Product inserted, id:', result.lastInsertRowid);
