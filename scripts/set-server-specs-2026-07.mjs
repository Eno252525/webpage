// Fills in configuration + price for the server placeholders once specs arrived
// (see [[project_server_placeholders]]). Five existing placeholders get their
// real name/specs/price; one new server (HP DL580 Gen9, SR0008) is created with
// its own photo.
//
// Specs/prices are transcribed verbatim from the shop's own spec cards. A few
// look like card typos (flagged to the owner separately) but are entered as
// given — the owner is the authority on their own listing.
//
// Idempotent: existing rows keyed on SKU are updated; the DL580 is inserted only
// if absent (else updated). Backs the DB up first. Run on the server too, after
// a deploy, since products.db is git-ignored:
//   node scripts/set-server-specs-2026-07.mjs
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');
const SERVER_CATEGORY_ID = 17;

// Existing placeholders → real spec + price (keyed on SKU).
const UPDATES = [
  {
    sku: 'SR0001',
    name: 'HP ProLiant DL120 Gen9 — 2x Xeon E5-2620 v3 / 16GB / 2x 300GB SAS',
    price: 14900,
    short_description:
      'Server HP ProLiant DL120 Gen9 rack 1U me 2x Intel Xeon E5-2620 v3, 16GB DDR4 ECC dhe 2x 300GB SAS HDD (8x SFF).',
    description:
      'HP ProLiant DL120 Gen9 është një server rack 1U i besueshëm për ngarkesa të përgjithshme, virtualizim dhe shërbime rrjeti. Vjen me 2x Intel Xeon E5-2620 v3, 16GB memorie DDR4 ECC dhe 2x 300GB SAS HDD, me kapacitet deri në 8 disqe SFF (2.5"). Gjendja: i rinovuar, i testuar dhe në gjendje pune.',
    attributes: {
      'Brand': 'HP', 'Model': 'ProLiant DL120 Gen9',
      'CPU': '2x Intel Xeon E5-2620 v3 (12 bërthama / 24 thread-e gjithsej, 2.4 GHz)',
      'RAM': '16GB DDR4 ECC', 'Storage': '2x 300GB SAS HDD',
      'Foletë e disqeve': '8x SFF (2.5")', 'Forma': 'Rack 1U', 'Gjendja': 'I rinovuar',
    },
  },
  {
    sku: 'SR0002',
    name: 'HP ProLiant DL360 G7 — 2x Xeon E5645 / 32GB',
    price: 9900,
    short_description:
      'Server HP ProLiant DL360 G7 rack 1U me 2x Intel Xeon E5645 dhe 32GB DDR3 ECC.',
    description:
      'HP ProLiant DL360 G7 është një server rack 1U kompakt dhe ekonomik, i përshtatshëm për virtualizim të lehtë, shërbime skedarësh dhe aplikacione biznesi. Vjen me 2x Intel Xeon E5645 (12 bërthama / 24 thread-e gjithsej) dhe 32GB memorie DDR3 ECC. Gjendja: i rinovuar, i testuar dhe në gjendje pune.',
    attributes: {
      'Brand': 'HP', 'Model': 'ProLiant DL360 G7',
      'CPU': '2x Intel Xeon E5645 (12 bërthama / 24 thread-e gjithsej, 2.4 GHz)',
      'RAM': '32GB DDR3 ECC', 'Forma': 'Rack 1U (2 procesorë)', 'Gjendja': 'I rinovuar',
    },
  },
  {
    sku: 'SR0005',
    name: 'HP ProLiant DL380p Gen8 — 2x Xeon E5-2690 v2 / 128GB / 2x 300GB SAS',
    price: 19900,
    short_description:
      'Server HP ProLiant DL380p Gen8 rack 2U me 2x Intel Xeon E5-2690 v2, 128GB DDR3 ECC dhe 2x 300GB SAS HDD (25x SFF).',
    description:
      'HP ProLiant DL380p Gen8 është një server rack 2U me performancë të lartë për virtualizim, baza të dhënash dhe ngarkesa intensive. Vjen me 2x Intel Xeon E5-2690 v2 (20 bërthama / 40 thread-e), 128GB memorie DDR3 ECC dhe 2x 300GB SAS HDD, me kapacitet deri në 25 disqe SFF (2.5"). Gjendja: i rinovuar, i testuar dhe në gjendje pune.',
    attributes: {
      'Brand': 'HP', 'Model': 'ProLiant DL380p Gen8',
      'CPU': '2x Intel Xeon E5-2690 v2 (20 bërthama / 40 thread-e gjithsej, 3.0 GHz)',
      'RAM': '128GB DDR3 ECC', 'Storage': '2x 300GB SAS HDD',
      'Foletë e disqeve': '25x SFF (2.5")', 'Forma': 'Rack 2U (2 procesorë)', 'Gjendja': 'I rinovuar',
    },
  },
  {
    sku: 'SR0011',
    name: 'Dell PowerEdge R330 — Xeon E3-1240 v6 / 32GB',
    price: 14900,
    short_description:
      'Server Dell PowerEdge R330 rack 1U me Intel Xeon E3-1240 v6 dhe 32GB DDR3 ECC.',
    description:
      'Dell PowerEdge R330 është një server rack 1U me një procesor, ideal për biznese të vogla, zyra dega dhe aplikacione të përgjithshme. Vjen me Intel Xeon E3-1240 v6 (4 bërthama / 8 thread-e) dhe 32GB memorie DDR3 ECC. Gjendja: i rinovuar, i testuar dhe në gjendje pune.',
    attributes: {
      'Brand': 'Dell', 'Model': 'PowerEdge R330',
      'CPU': 'Intel Xeon E3-1240 v6 (4 bërthama / 8 thread-e, 3.7 GHz)',
      'RAM': '32GB DDR3 ECC', 'Forma': 'Rack 1U (1 procesor)', 'Gjendja': 'I rinovuar',
    },
  },
  {
    sku: 'SR0010',
    name: 'Dell PowerEdge R210 II — Xeon E3-1220 / 16GB',
    price: 6900,
    short_description:
      'Server Dell PowerEdge R210 II rack 1U kompakt dhe ekonomik me Intel Xeon E3-1220 dhe 16GB DDR3.',
    description:
      'Dell PowerEdge R210 II është një server rack 1U kompakt dhe me çmim shumë ekonomik — zgjidhje ideale për projekte bazë, routing, mjedise testuese (homelab) apo shërbime rrjeti. Vjen me Intel Xeon E3-1220 (4 bërthama / 4 thread-e) dhe 16GB memorie DDR3. Gjendja: i përdorur, i testuar dhe në gjendje pune. Dërgesë e shpejtë në të gjithë Shqipërinë.',
    attributes: {
      'Brand': 'Dell', 'Model': 'PowerEdge R210 II',
      'CPU': 'Intel Xeon E3-1220 (4 bërthama / 4 thread-e, 3.1 GHz)',
      'RAM': '16GB DDR3', 'Forma': 'Rack 1U (1 procesor)', 'Gjendja': 'I përdorur / I testuar',
    },
  },
  {
    sku: 'SR0012',
    name: 'Fujitsu PRIMERGY RX200 S8 — Xeon E5-2620 v2 / 32GB',
    price: 14900,
    short_description:
      'Server Fujitsu PRIMERGY RX200 S8 rack 1U me Intel Xeon E5-2620 v2 dhe 32GB DDR3 ECC.',
    description:
      'Fujitsu PRIMERGY RX200 S8 është një server rack 1U i besueshëm për virtualizim, baza të dhënash të vogla dhe ngarkesa të përgjithshme. Vjen me Intel Xeon E5-2620 v2 (6 bërthama / 12 thread-e) dhe 32GB memorie DDR3 ECC. Gjendja: i rinovuar, i testuar dhe në gjendje pune.',
    attributes: {
      'Brand': 'Fujitsu', 'Model': 'PRIMERGY RX200 S8',
      'CPU': 'Intel Xeon E5-2620 v2 (6 bërthama / 12 thread-e, 2.1 GHz)',
      'RAM': '32GB DDR3 ECC', 'Forma': 'Rack 1U (1 procesor)', 'Gjendja': 'I rinovuar',
    },
  },
];

// New server — not part of the earlier placeholder batch.
const NEW = {
  sku: 'SR0008', brand: 'HP', slug: 'hp-proliant-dl580-gen9',
  name: 'HP ProLiant DL580 Gen9 — 4x Xeon E7-8870 v3 / 128GB / 2x 300GB SAS',
  price: 70000,
  short_description:
    'Server HP ProLiant DL580 Gen9 rack 4U me 4x Intel Xeon E7-8870 v3, 128GB DDR4 ECC dhe 2x 300GB SAS HDD.',
  description:
    'HP ProLiant DL580 Gen9 është një server rack 4U me katër procesorë, i ndërtuar për ngarkesa kritike, virtualizim në shkallë të gjerë dhe baza të dhënash të mëdha. Vjen me 4x Intel Xeon E7-8870 v3 (72 bërthama / 144 thread-e gjithsej), 128GB memorie DDR4 ECC dhe 2x 300GB SAS HDD. Gjendja: i rinovuar, i testuar dhe në gjendje pune.',
  attributes: {
    'Brand': 'HP', 'Model': 'ProLiant DL580 Gen9',
    'CPU': '4x Intel Xeon E7-8870 v3 (72 bërthama / 144 thread-e gjithsej, 2.1 GHz)',
    'RAM': '128GB DDR4 ECC', 'Storage': '2x 300GB SAS HDD',
    'Forma': 'Rack 4U (4 procesorë)', 'Gjendja': 'I rinovuar',
  },
};

const db = new Database(dbPath);

// sanity checks before touching anything
for (const u of UPDATES) {
  const row = db.prepare('SELECT id FROM products WHERE sku = ?').get(u.sku);
  if (!row) { console.error(`Aborting — no product with SKU ${u.sku}.`); process.exit(1); }
}
const newImg = path.join(root, 'uploads', `${NEW.slug}.webp`);
if (!fs.existsSync(newImg)) {
  console.error(`Aborting — missing image uploads/${NEW.slug}.webp for ${NEW.sku}.`); process.exit(1);
}

const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const upd = db.prepare(`
  UPDATE products
  SET name = :name, price = :price, short_description = :short_description,
      description = :description, attributes = :attributes, updated_at = datetime('now')
  WHERE sku = :sku
`);
const insertNew = db.prepare(`
  INSERT INTO products (name, slug, short_description, description, price, sale_price,
    category_id, images, attributes, brand, sku, in_stock, featured)
  VALUES (:name, :slug, :short_description, :description, :price, NULL,
    :category_id, :images, :attributes, :brand, :sku, 1, 0)
`);
const updNew = db.prepare(`
  UPDATE products
  SET name = :name, price = :price, short_description = :short_description,
      description = :description, attributes = :attributes, images = :images,
      brand = :brand, category_id = :category_id, updated_at = datetime('now')
  WHERE sku = :sku
`);

const apply = db.transaction(() => {
  for (const u of UPDATES) {
    upd.run({ sku: u.sku, name: u.name, price: u.price,
      short_description: u.short_description, description: u.description,
      attributes: JSON.stringify(u.attributes) });
  }
  const images = JSON.stringify([`/uploads/${NEW.slug}.webp`]);
  const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(NEW.sku);
  const slugClash = db.prepare('SELECT id FROM products WHERE slug = ? AND sku != ?').get(NEW.slug, NEW.sku);
  if (slugClash) throw new Error(`slug "${NEW.slug}" already used by another product — aborting.`);
  if (existing) {
    updNew.run({ sku: NEW.sku, name: NEW.name, price: NEW.price,
      short_description: NEW.short_description, description: NEW.description,
      attributes: JSON.stringify(NEW.attributes), images, brand: NEW.brand,
      category_id: SERVER_CATEGORY_ID });
  } else {
    insertNew.run({ name: NEW.name, slug: NEW.slug,
      short_description: NEW.short_description, description: NEW.description,
      price: NEW.price, category_id: SERVER_CATEGORY_ID, images,
      attributes: JSON.stringify(NEW.attributes), brand: NEW.brand, sku: NEW.sku });
  }
});
apply();

console.log('Done.');
for (const sku of [...UPDATES.map(u => u.sku), NEW.sku]) {
  const r = db.prepare('SELECT id, sku, price, name FROM products WHERE sku = ?').get(sku);
  console.log(`  #${r.id} | ${r.sku} | ${r.price} Lekë | ${r.name}`);
}
