// Adds 3 refurbished network switches (TP-Link + 3Com) to the store, in the
// Switch category (id 18). Attributes use the switch-filter keys (Ports / SFP /
// Layer / PoE) so the Switch-category sidebar filters in shop.html work. Price
// is left at 0 ("çmimi sipas kërkesës"), SKUs come from the supplier table
// (SW0018..SW0020), photos live in uploads/ as WebP.
//
// Note: the supplier sheet listed the TP-Link as "T16000G-28TS" — the real
// model is T1600G-28TS (an extra 0 typo); named correctly here.
//
// Idempotent: keyed by slug. A re-run updates the existing row instead of
// inserting a duplicate. Run on the server too after a deploy (products.db is
// git-ignored):  node scripts/add-network-switches.mjs
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const CATEGORY_ID = 18; // Switch

const PRODUCTS = [
  {
    slug: 'tplink-t1600g-28ts',
    name: 'TP-Link T1600G-28TS JetStream 24-Port Gigabit Smart Switch',
    brand: 'TP-Link',
    sku: 'SW0019',
    price: 3000,
    image: '/uploads/tplink-t1600g-28ts.webp',
    short_description:
      'TP-Link T1600G-28TS (JetStream, alias TL-SG2424) – switch smart-managed me 24 porta Gigabit dhe 4 slote SFP combo, rackmount, pa fan.',
    description:
      'TP-Link T1600G-28TS (seria JetStream, i njohur edhe si TL-SG2424) është një switch smart-managed Layer 2+ për biznese të vogla dhe të mesme. Ofron 24 porta 10/100/1000 Mbps RJ45 dhe 4 slote SFP combo Gigabit për uplink me fibër, në një kasë metalike rackmount 1U pa fan (fanless). Mbështet VLAN 802.1Q, STP/RSTP/MSTP, Link Aggregation, IGMP Snooping, QoS L2–L4, ACL, IPv6 dhe static routing, të menaxhueshme nga interfejsi web (GUI), CLI dhe SNMP. Kapacitet ndërrimi 56 Gbps. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
    attributes: {
      'Type': 'Smart Managed Switch (Layer 2+)',
      'Ports': '24x 10/100/1000 RJ45',
      'SFP': '4x Combo Gigabit SFP',
      'Layer': 'Layer 2+',
      'PoE': 'Jo',
      'Switching Capacity': '56 Gbps',
      'Management': 'Web GUI / CLI / SNMP',
      'Form Factor': 'Rackmount 1U, fanless',
      'Condition': 'Pre-Owned / Testuar',
    },
  },
  {
    slug: 'tplink-tl-sg1016d',
    name: 'TP-Link TL-SG1016D 16-Port Gigabit Switch (Unmanaged)',
    brand: 'TP-Link',
    sku: 'SW0018',
    price: 2000,
    image: '/uploads/tplink-tl-sg1016d.webp',
    short_description:
      'TP-Link TL-SG1016D – switch Gigabit i pamenaxhuar me 16 porta 10/100/1000, plug & play, kasë metalike desktop/rackmount, pa fan.',
    description:
      'TP-Link TL-SG1016D është një switch Gigabit i pamenaxhuar (unmanaged) me 16 porta 10/100/1000 Mbps, ideal për zgjerimin e shpejtë të rrjetit në zyra të vogla. Plug & play me auto MDI/MDIX dhe auto-negotiation në çdo port, mbështet Green Ethernet për kursim energjie. Kasë metalike e qëndrueshme desktop/rackmount, pa fan (fanless), me punë të heshtur. Nuk kërkon konfigurim. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
    attributes: {
      'Type': 'Unmanaged Switch',
      'Ports': '16x 10/100/1000 RJ45',
      'Layer': 'Unmanaged',
      'PoE': 'Jo',
      'Management': 'Plug & Play (pa menaxhim)',
      'Form Factor': 'Desktop / Rackmount, metalik, fanless',
      'Condition': 'Pre-Owned / Testuar',
    },
  },
  {
    slug: '3com-baseline-2816-sfp-plus',
    name: '3Com Baseline Switch 2816-SFP Plus (3C16485A)',
    brand: '3Com',
    sku: 'SW0020',
    price: 3000,
    image: '/uploads/3com-3c16485a.webp',
    short_description:
      '3Com Baseline Switch 2816-SFP Plus (3C16485A) – switch me 16 porta 10/100 dhe 2 slote SFP për uplink Gigabit me fibër, web-managed.',
    description:
      '3Com Baseline Switch 2816-SFP Plus (P/N 3C16485A) është një switch kompakt Layer 2 me 16 porta 10/100 Mbps RJ45 dhe 2 slote SFP për uplink Gigabit me fibër ose bakër. Ofron ndërrim wire-speed non-blocking, auto MDI/MDIX, mbështetje VLAN dhe monitorim trafiku, me menaxhim bazë nëpërmjet interfejsit web. Mund të përdoret i lirë (freestanding) ose i montuar në rack. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
    attributes: {
      'Type': 'Web-Managed Switch (Layer 2)',
      'Ports': '16x 10/100 RJ45',
      'SFP': '2x SFP (Gigabit uplink)',
      'Layer': 'Layer 2',
      'PoE': 'Jo',
      'Management': 'Web GUI (basic)',
      'Form Factor': 'Desktop / Rackmount',
      'Condition': 'Pre-Owned / Testuar',
    },
  },
];

const db = new Database(dbPath);

const cat = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(CATEGORY_ID);
if (!cat) {
  console.error(`Aborting — category id ${CATEGORY_ID} does not exist.`);
  process.exit(1);
}

for (const p of PRODUCTS) {
  const file = path.join(root, p.image.replace(/^\//, ''));
  if (!fs.existsSync(file)) {
    console.error(`Aborting — image not found for ${p.slug}: ${p.image}`);
    process.exit(1);
  }
}

const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const findBySlug = db.prepare('SELECT id FROM products WHERE slug = ?');
const insert = db.prepare(`
  INSERT INTO products (name, slug, short_description, description, price, sale_price,
    category_id, images, attributes, badge, featured, in_stock, brand, sku)
  VALUES (:name, :slug, :short_description, :description, :price, NULL,
    :category_id, :images, :attributes, NULL, 0, 1, :brand, :sku)
`);
const update = db.prepare(`
  UPDATE products SET
    name = :name, short_description = :short_description, description = :description,
    price = :price, category_id = :category_id, images = :images, attributes = :attributes,
    brand = :brand, sku = :sku, updated_at = datetime('now')
  WHERE slug = :slug
`);

const apply = db.transaction(() => {
  const results = [];
  for (const p of PRODUCTS) {
    const row = {
      name: p.name,
      slug: p.slug,
      short_description: p.short_description,
      description: p.description,
      price: p.price ?? 0,
      category_id: CATEGORY_ID,
      images: JSON.stringify([p.image]),
      attributes: JSON.stringify(p.attributes),
      brand: p.brand,
      sku: p.sku,
    };
    const existing = findBySlug.get(p.slug);
    if (existing) { update.run(row); results.push(['updated', p.sku, p.slug]); }
    else { insert.run(row); results.push(['inserted', p.sku, p.slug]); }
  }
  return results;
});

const results = apply();
console.log(`\nDone — ${results.length} switches in category "${cat.name}" (id ${CATEGORY_ID}):`);
for (const [action, sku, slug] of results) {
  console.log(`  ${action.padEnd(8)} ${sku.padEnd(7)} ${slug}`);
}
