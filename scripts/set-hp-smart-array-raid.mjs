// Sets price + full description + spec table for the two HP Smart Array Gen10
// RAID controllers (RAID Controller subcategory under Komponente):
//   357  HP Smart Array E208i-a SR Gen10 804326-B21  ->  6000 Lekë
//   356  HP Smart Array P408i-a SR Gen10 869081-B21  -> 11000 Lekë
// Idempotent: re-running re-asserts the same values. Backs the DB up first.
// Run on the server too, after a deploy, since products.db is git-ignored:
//   node scripts/set-hp-smart-array-raid.mjs
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const UPDATES = [
  {
    id: 357,
    price: 6000,
    sku: '804326-B21',
    short_description:
      'Kontrollues HP Smart Array E208i-a SR Gen10, 12G SAS modular, për serverët HP ProLiant Gen10. P/N 804326-B21 (alt. 836259-001).',
    description:
      'Kontrollues HP Smart Array E208i-a SR Gen10 është një kartë RAID modulare 12G SAS e klasit entry-level, e dedikuar për serverët HP ProLiant Gen10. Instalohet direkt në slotin e dedikuar të pllakës amë (modular tip “-a”), duke lënë të lira slotet PCIe standarde. Ofron 8 porta të brendshme SAS/SATA përmes dy konektorëve mini-SAS x4, me ndërfaqe 12 Gb/s SAS dhe 6 Gb/s SATA. Mbështet nivelet RAID 0, 1 dhe 10, si dhe HBA mode për lidhje direkte me disqet (JBOD/pass-through). Pa modul cache, i përshtatshëm për boot, konfigurime RAID bazë dhe zgjidhje ruajtjeje me kosto të ulët. Kodi alternativ: 836259-001. Gjendja: i testuar, në gjendje pune.',
    attributes: {
      'Brand': 'HPE',
      'Model': 'Smart Array E208i-a SR Gen10',
      'P/N': '804326-B21 (alt. 836259-001)',
      'Tipi': 'Kontrollues RAID modular (entry-level)',
      'Ndërfaqja': '12 Gb/s SAS / 6 Gb/s SATA',
      'Porta': '8 të brendshme (2 × Mini-SAS x4)',
      'Bus': 'PCIe 3.0 x8',
      'Cache': 'Pa cache',
      'RAID': '0 / 1 / 10 (+ HBA mode)',
      'Përputhshmëria': 'HP ProLiant Gen10',
      'Gjendja': 'I testuar',
    },
  },
  {
    id: 356,
    price: 11000,
    sku: '869081-B21',
    short_description:
      'Kontrollues RAID HP Smart Array P408i-a SR Gen10, 12G SAS me 2GB cache, për serverët HP ProLiant Gen10. P/N 869081-B21 (alt. 871040-002).',
    description:
      'Kontrollues HP Smart Array P408i-a SR Gen10 është një kartë RAID modulare 12G SAS e klasit performancë, e dedikuar për serverët HP ProLiant Gen10. Instalohet në slotin e dedikuar të pllakës amë (modular tip “-a”), duke lënë të lira slotet PCIe standarde. Ofron 8 porta të brendshme SAS/SATA përmes dy konektorëve mini-SAS x4, me ndërfaqe 12 Gb/s SAS dhe 6 Gb/s SATA. Vjen me 2GB Flash-Backed Write Cache (FBWC) për performancë dhe siguri të lartë të të dhënave gjatë ndërprerjeve të energjisë. Mbështet nivelet RAID 0, 1, 5, 6, 10, 50, 60, 1 ADM dhe 10 ADM, si dhe HBA mode. Zgjidhja ideale për ngarkesa serveri me performancë dhe mbrojtje maksimale të të dhënave. Kodi alternativ: 871040-002. Gjendja: i testuar, në gjendje pune.',
    attributes: {
      'Brand': 'HPE',
      'Model': 'Smart Array P408i-a SR Gen10',
      'P/N': '869081-B21 (alt. 871040-002)',
      'Tipi': 'Kontrollues RAID modular (performancë)',
      'Ndërfaqja': '12 Gb/s SAS / 6 Gb/s SATA',
      'Porta': '8 të brendshme (2 × Mini-SAS x4)',
      'Bus': 'PCIe 3.0 x8',
      'Cache': '2 GB Flash-Backed Write Cache (FBWC)',
      'RAID': '0 / 1 / 5 / 6 / 10 / 50 / 60 / 1 ADM / 10 ADM (+ HBA mode)',
      'Përputhshmëria': 'HP ProLiant Gen10',
      'Gjendja': 'I testuar',
    },
  },
];

const db = new Database(dbPath);

// sanity: every id must exist and match the expected part number in its name
const check = db.prepare('SELECT id, name FROM products WHERE id = ?');
for (const u of UPDATES) {
  const row = check.get(u.id);
  if (!row) {
    console.error(`Aborting — product id ${u.id} does not exist.`);
    process.exit(1);
  }
  if (!row.name.includes(u.sku)) {
    console.error(`Aborting — product id ${u.id} name "${row.name}" does not contain ${u.sku}.`);
    process.exit(1);
  }
}

// backup first
const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const upd = db.prepare(`
  UPDATE products
  SET price = :price,
      sku = :sku,
      short_description = :short_description,
      description = :description,
      attributes = :attributes,
      updated_at = datetime('now')
  WHERE id = :id
`);

const apply = db.transaction(() => {
  for (const u of UPDATES) {
    upd.run({
      id: u.id,
      price: u.price,
      sku: u.sku,
      short_description: u.short_description,
      description: u.description,
      attributes: JSON.stringify(u.attributes),
    });
  }
});
apply();

console.log(`Updated ${UPDATES.length} HP Smart Array RAID controllers.`);
for (const u of UPDATES) {
  const r = db.prepare('SELECT id, price, sku, name FROM products WHERE id = ?').get(u.id);
  console.log(`  ${r.id} | ${r.price} Lekë | ${r.sku} | ${r.name}`);
}
