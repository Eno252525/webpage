// Adds 10 refurbished network products (Opengear + Cisco) to the store, in the
// Networking > Others category (id 984), alongside the existing Cisco ISR
// routers and ASA firewalls. Price is left at 0 ("çmimi sipas kërkesës"), SKUs
// come from the supplier table (NW0001.. / RU0001..), photos were sourced per
// model and live in uploads/ as WebP.
//
// Idempotent: keyed by slug. A re-run updates the existing row instead of
// inserting a duplicate, so it is safe to run on the server after a deploy
// (products.db is git-ignored, so the rows must be created there too):
//   node scripts/add-network-products.mjs
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const CATEGORY_ID = 984; // Networking > Others (others-networking)

// Each product: photo already present in uploads/ as the given .webp file.
const PRODUCTS = [
  {
    slug: 'opengear-acm7004',
    name: 'Opengear ACM7004 Resilience Gateway (Console Server)',
    brand: 'Opengear',
    sku: 'NW0001',
    image: '/uploads/opengear-acm7004.webp',
    short_description:
      'Opengear ACM7004 Resilience Gateway – console server / menaxhim Out-of-Band me 4 porta seriale dhe 2 porta Gigabit, për akses të sigurt në pajisjet e rrjetit në site-t remote.',
    description:
      'Opengear ACM7004 është një Resilience Gateway (console server) i dedikuar për menaxhim Smart Out-of-Band (OOB) të infrastrukturës së rrjetit në degë, dyqane, ATM dhe site-t remote. Ofron 4 porta seriale RJ45 (RS-232, pinout Cisco Straight) për akses në konsollën e routerëve, switch-eve dhe serverëve, si dhe 2 porta 10/100/1000 Ethernet (NET1/NET2) dhe 4 porta USB për menaxhim të pajisjeve shtesë. Mundëson akses të sigurt nga distanca edhe kur lidhja primare bie, me VPN (IPsec/OpenVPN) dhe integrim me platformën Opengear Lighthouse. Ushqim me 9–30V DC. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
    attributes: {
      'Type': 'Console Server / Smart Out-of-Band Gateway',
      'Serial Ports': '4x RJ45 RS-232 (Cisco Straight pinout)',
      'Network': '2x 10/100/1000 Ethernet (NET1/NET2)',
      'USB': '4x USB 2.0',
      'Cellular': 'Jo (modeli bazë)',
      'Menaxhimi': 'Out-of-Band, IPsec/OpenVPN, Lighthouse',
      'Ushqimi': '9–30V DC',
      'Condition': 'Pre-Owned / Testuar',
    },
  },
  {
    slug: 'opengear-acm7004-2-l',
    name: 'Opengear ACM7004-2-L Resilience Gateway (4G LTE)',
    brand: 'Opengear',
    sku: 'NW0002',
    image: '/uploads/opengear-acm7004-2-l.webp',
    short_description:
      'Opengear ACM7004-2-L – Resilience Gateway me modem të brendshëm 4G LTE, 4 porta seriale dhe 2 Gigabit, për menaxhim Out-of-Band me failover celular.',
    description:
      'Opengear ACM7004-2-L është varianti me lidhje celulare i Resilience Gateway ACM7000, me modem të brendshëm 4G LTE dhe antena SMA për akses Out-of-Band edhe kur rrjeti kryesor (WAN) është jashtë funksionit. Ofron 4 porta seriale RJ45 (RS-232) për konsollën e pajisjeve, 2 porta 10/100/1000 Ethernet dhe 4 porta USB. Ideal për failover automatik dhe menaxhim të sigurt nga distanca në site-t remote (degë, ATM, retail). Mbështet IPsec/OpenVPN dhe platformën Opengear Lighthouse. Ushqim 9–30V DC. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
    attributes: {
      'Type': 'Console Server / Out-of-Band Gateway me celular',
      'Serial Ports': '4x RJ45 RS-232 (Cisco Straight pinout)',
      'Network': '2x 10/100/1000 Ethernet',
      'USB': '4x USB 2.0',
      'Cellular': '4G LTE (modem i brendshëm, antena SMA)',
      'Menaxhimi': 'Out-of-Band + failover celular, IPsec/OpenVPN, Lighthouse',
      'Ushqimi': '9–30V DC',
      'Condition': 'Pre-Owned / Testuar',
    },
  },
  {
    slug: 'opengear-acm7004-2-lmr',
    name: 'Opengear ACM7004-2-LMR Resilience Gateway (4G LTE-A)',
    brand: 'Opengear',
    sku: 'NW0002',
    image: '/uploads/opengear-acm7004-2-lmr.webp',
    short_description:
      'Opengear ACM7004-2-LMR – Resilience Gateway me modem 4G LTE-Advanced multi-band, 4 porta seriale dhe 2 Gigabit, për menaxhim Out-of-Band me failover celular.',
    description:
      'Opengear ACM7004-2-LMR është varianti me modem 4G LTE-Advanced (mbulim më i gjerë brezash / multi-carrier) i Resilience Gateway ACM7000, për akses Out-of-Band të besueshëm nga distanca kur WAN-i primar bie. Ofron 4 porta seriale RJ45 (RS-232) për konsollën e routerëve/switch-eve, 2 porta 10/100/1000 Ethernet dhe 4 porta USB. I përshtatshëm për failover celular dhe menaxhim të sigurt të site-ve remote, me IPsec/OpenVPN dhe integrim me Opengear Lighthouse. Ushqim 9–30V DC. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
    attributes: {
      'Type': 'Console Server / Out-of-Band Gateway me celular',
      'Serial Ports': '4x RJ45 RS-232 (Cisco Straight pinout)',
      'Network': '2x 10/100/1000 Ethernet',
      'USB': '4x USB 2.0',
      'Cellular': '4G LTE-Advanced (multi-band, antena SMA)',
      'Menaxhimi': 'Out-of-Band + failover celular, IPsec/OpenVPN, Lighthouse',
      'Ushqimi': '9–30V DC',
      'Condition': 'Pre-Owned / Testuar',
    },
  },
  {
    slug: 'cisco-fpr-1010',
    name: 'Cisco Firepower 1010 NGFW Firewall (FPR-1010)',
    brand: 'Cisco',
    sku: 'NW0003',
    image: '/uploads/cisco-fpr-1010.webp',
    short_description:
      'Cisco Firepower 1010 (FPR-1010) – Next-Generation Firewall desktop me 8 porta Gigabit, throughput deri 890 Mbps dhe VPN, për zyra të vogla dhe degë.',
    description:
      'Cisco Firepower 1010 (FPR-1010) është një Next-Generation Firewall (NGFW) kompakt desktop, i dedikuar për zyra të vogla dhe degë. Vjen me 8 porta 1GbE RJ45 (me switch të integruar Layer 2) dhe funksionon me softuerin Firepower Threat Defense (FTD) ose ASA, duke ofruar firewall me gjendje (stateful), kontroll aplikacionesh (AVC), IPS, filtrim URL, dekriptim SSL dhe VPN. Ofron deri ~890 Mbps throughput (FTD me AVC), rreth 2 Gbps stateful, 100,000 sesione konkurrente dhe deri 75 peer VPN IPsec. Menaxhohet nëpërmjet Firepower Device Manager (FDM), FMC, Cisco Defense Orchestrator ose ASDM. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
    attributes: {
      'Type': 'Next-Generation Firewall (NGFW / FTD / ASA)',
      'Ports': '8x 1GbE RJ45 (switch L2 i integruar)',
      'Firewall Throughput': 'deri 890 Mbps (FTD, AVC)',
      'Stateful Throughput': 'deri 2 Gbps',
      'Concurrent Sessions': '100,000',
      'VPN Peers': 'deri 75 (IPsec)',
      'Management': 'FDM / FMC / CDO / ASDM',
      'Form Factor': 'Desktop',
      'Condition': 'Pre-Owned / Testuar',
    },
  },
  {
    slug: 'cisco-isr4331',
    name: 'Cisco ISR 4331 Integrated Services Router (ISR4331)',
    brand: 'Cisco',
    sku: 'RU0001',
    image: '/uploads/cisco-isr4331.webp',
    short_description:
      'Cisco ISR 4331 (ISR4331/K9) – router modular i serisë ISR 4000 me 3 porta Gigabit, sllote NIM/SM dhe throughput deri 300 Mbps, për degë të mesme.',
    description:
      'Cisco ISR 4331 (ISR4331/K9) është një router modular i serisë Integrated Services Router 4000, i projektuar për degë të vogla dhe të mesme. Ofron 3 porta 1GbE WAN/LAN (RJ45, njëra me SFP combo), 2 sllote NIM, 1 sllot ISC dhe 1 sllot SM për module shërbimesh (WAN, zë, siguri). Throughput-i default është 100 Mbps dhe mund të rritet deri në 300 Mbps me licencë Performance. Mbështet shërbime të avancuara: VPN/IPsec, QoS, firewall, zë (CUBE) dhe menaxhim me Cisco IOS-XE. Rack 1U me ushqim AC të brendshëm. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
    attributes: {
      'Type': 'Integrated Services Router (ISR 4000)',
      'Ports': '3x 1GbE RJ45 (1 me SFP combo)',
      'Module Slots': '2x NIM, 1x SM, 1x ISC',
      'Throughput': '100 Mbps (deri 300 Mbps me licencë Performance)',
      'Memory': '4GB DRAM / 4GB flash (default)',
      'Rack Units': '1U',
      'OS': 'Cisco IOS-XE',
      'Condition': 'Pre-Owned / Testuar',
    },
  },
  {
    slug: 'cisco-isr4431',
    name: 'Cisco ISR 4431 Integrated Services Router (ISR4431)',
    brand: 'Cisco',
    sku: 'RU0002',
    image: '/uploads/cisco-isr4431.webp',
    short_description:
      'Cisco ISR 4431 (ISR4431/K9) – router modular ISR 4000 me 4 porta Gigabit (RJ45/SFP), throughput deri 1 Gbps dhe sllote NIM, për degë të mëdha.',
    description:
      'Cisco ISR 4431 (ISR4431/K9) është një router modular i serisë ISR 4000 me performancë të lartë, për degë të mëdha dhe agregim WAN. Ofron 4 porta 1GbE WAN/LAN (RJ45, me SFP combo) dhe 3 sllote NIM plus 1 sllot ISC për module WAN, zë dhe siguri. Throughput-i default është 500 Mbps dhe rritet deri në 1 Gbps me licencë Performance. Mbështet VPN/IPsec, QoS, firewall, CUBE dhe Cisco IOS-XE, me opsion për ushqim të dyfishtë (redundant). Rack 1U. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
    attributes: {
      'Type': 'Integrated Services Router (ISR 4000)',
      'Ports': '4x 1GbE WAN/LAN (RJ45 / SFP combo)',
      'Module Slots': '3x NIM, 1x ISC',
      'Throughput': '500 Mbps (deri 1 Gbps me licencë Performance)',
      'Memory': '4GB DRAM (deri 16GB) / 8GB flash',
      'Power': 'AC i brendshëm (opsion dual/redundant)',
      'Rack Units': '1U',
      'OS': 'Cisco IOS-XE',
      'Condition': 'Pre-Owned / Testuar',
    },
  },
  {
    slug: 'cisco-meraki-mx68w',
    name: 'Cisco Meraki MX68W Security Appliance (Wi-Fi)',
    brand: 'Cisco',
    sku: 'NW0004',
    image: '/uploads/cisco-meraki-mx68w.webp',
    short_description:
      'Cisco Meraki MX68W – security appliance cloud-managed me SD-WAN dhe WiFi 802.11ac, 10 porta Gigabit (2 PoE+), për degë të vogla. Kërkon licencë Meraki.',
    description:
      'Cisco Meraki MX68W është një security appliance cloud-managed me SD-WAN dhe WiFi të integruar 802.11ac Wave 2 (Wi-Fi 5), për degë të vogla, dyqane dhe zyra remote. Ofron 10 porta 1GbE RJ45 (përfshirë WAN të dedikuar dhe 2 porta me PoE+), firewall me gjendje deri ~450 Mbps, VPN throughput deri ~200 Mbps dhe rekomandohet për deri 50 përdorues. Përfshin IDS/IPS, filtrim përmbajtjeje, Auto VPN dhe SD-WAN, të menaxhuara plotësisht nga Meraki Dashboard në cloud. Shënim: kërkon licencë Meraki aktive (shitet veçmas). Gjendja: i përdorur, i testuar dhe në gjendje pune.',
    attributes: {
      'Type': 'Cloud-Managed Security Appliance / SD-WAN',
      'Ports': '10x 1GbE RJ45 (WAN i dedikuar + 2 me PoE+)',
      'WiFi': '802.11ac Wave 2 (Wi-Fi 5)',
      'Firewall Throughput': 'deri 450 Mbps',
      'VPN Throughput': 'deri 200 Mbps',
      'Recommended Users': 'deri 50',
      'Management': 'Meraki Dashboard (kërkon licencë)',
      'Licenca': 'Kërkon licencë Meraki (shitet veçmas)',
      'Condition': 'Pre-Owned / Testuar',
    },
  },
  {
    slug: 'cisco-vg202',
    name: 'Cisco VG202 Analog Voice Gateway (2 FXS)',
    brand: 'Cisco',
    sku: 'NW0005',
    image: '/uploads/cisco-vg202.webp',
    short_description:
      'Cisco VG202 – analog voice gateway me 2 porta FXS dhe 2 porta Fast Ethernet, për lidhjen e telefonave/faksave analogë me rrjetin VoIP.',
    description:
      'Cisco VG202 është një analog voice gateway kompakt dhe fanless, që integron pajisjet analoge (telefona, fakse, modem) në një rrjet zëri IP. Ofron 2 porta FXS (RJ11) për pajisje analoge dhe 2 porta 10/100 Fast Ethernet (RJ45) për lidhjen me rrjetin. Mbështet protokollet SIP, H.323, MGCP dhe SCCP, duke u integruar me Cisco Unified Communications Manager ose sisteme të tjera IP-PBX. Ideal për zyra të vogla dhe degë. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
    attributes: {
      'Type': 'Analog Voice Gateway',
      'FXS Ports': '2x RJ11 (FXS)',
      'Network': '2x 10/100 Fast Ethernet (RJ45)',
      'Protocols': 'SIP, H.323, MGCP, SCCP',
      'Console': 'RJ45',
      'Form Factor': 'Desktop, fanless',
      'Condition': 'Pre-Owned / Testuar',
    },
  },
  {
    slug: 'cisco-vg204',
    name: 'Cisco VG204 Analog Voice Gateway (4 FXS)',
    brand: 'Cisco',
    sku: 'NW0006',
    image: '/uploads/cisco-vg204.webp',
    short_description:
      'Cisco VG204 – analog voice gateway me 4 porta FXS dhe 2 porta Fast Ethernet, për lidhjen e telefonave/faksave analogë me rrjetin VoIP.',
    description:
      'Cisco VG204 është një analog voice gateway kompakt dhe fanless me densitet 4 porta, që lidh pajisjet analoge (telefona, fakse, modem) me një rrjet zëri IP. Ofron 4 porta FXS (RJ11) dhe 2 porta 10/100 Fast Ethernet (RJ45). Mbështet protokollet SIP, H.323, MGCP dhe SCCP dhe integrohet me Cisco Unified Communications Manager ose IP-PBX të tjera. I përshtatshëm për zyra të vogla dhe degë me disa linja analoge. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
    attributes: {
      'Type': 'Analog Voice Gateway',
      'FXS Ports': '4x RJ11 (FXS)',
      'Network': '2x 10/100 Fast Ethernet (RJ45)',
      'Protocols': 'SIP, H.323, MGCP, SCCP',
      'Console': 'RJ45',
      'Form Factor': 'Desktop, fanless',
      'Condition': 'Pre-Owned / Testuar',
    },
  },
  {
    slug: 'cisco-vg202xm',
    name: 'Cisco VG202XM Analog Voice Gateway (2 FXS)',
    brand: 'Cisco',
    sku: 'NW0007',
    image: '/uploads/cisco-vg202xm.webp',
    short_description:
      'Cisco VG202XM – analog voice gateway me 2 porta FXS dhe 2 Fast Ethernet, me memorie të zgjeruar (XM) për performancë më të mirë të thirrjeve.',
    description:
      'Cisco VG202XM është versioni me memorie të zgjeruar (XM) i voice gateway-t analog VG202, me DRAM dhe flash më të mëdha për performancë dhe kapacitet më të mirë thirrjesh. Ofron 2 porta FXS (RJ11) për pajisje analoge (telefona, fakse, modem) dhe 2 porta 10/100 Fast Ethernet (RJ45). Mbështet protokollet SIP, H.323, MGCP dhe SCCP dhe integrohet me Cisco Unified Communications Manager ose IP-PBX të tjera. Kompakt dhe fanless. Gjendja: i përdorur, i testuar dhe në gjendje pune.',
    attributes: {
      'Type': 'Analog Voice Gateway (memorie e zgjeruar XM)',
      'FXS Ports': '2x RJ11 (FXS)',
      'Network': '2x 10/100 Fast Ethernet (RJ45)',
      'Protocols': 'SIP, H.323, MGCP, SCCP',
      'Console': 'RJ45',
      'Form Factor': 'Desktop, fanless',
      'Condition': 'Pre-Owned / Testuar',
    },
  },
];

const db = new Database(dbPath);

// sanity: target category must exist
const cat = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(CATEGORY_ID);
if (!cat) {
  console.error(`Aborting — category id ${CATEGORY_ID} does not exist.`);
  process.exit(1);
}

// sanity: every referenced image file must already be present in uploads/
for (const p of PRODUCTS) {
  const file = path.join(root, p.image.replace(/^\//, ''));
  if (!fs.existsSync(file)) {
    console.error(`Aborting — image not found for ${p.slug}: ${p.image}`);
    process.exit(1);
  }
}

// backup first
const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const findBySlug = db.prepare('SELECT id FROM products WHERE slug = ?');
const insert = db.prepare(`
  INSERT INTO products (name, slug, short_description, description, price, sale_price,
    category_id, images, attributes, badge, featured, in_stock, brand, sku)
  VALUES (:name, :slug, :short_description, :description, 0, NULL,
    :category_id, :images, :attributes, NULL, 0, 1, :brand, :sku)
`);
const update = db.prepare(`
  UPDATE products SET
    name = :name, short_description = :short_description, description = :description,
    category_id = :category_id, images = :images, attributes = :attributes,
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
      category_id: CATEGORY_ID,
      images: JSON.stringify([p.image]),
      attributes: JSON.stringify(p.attributes),
      brand: p.brand,
      sku: p.sku,
    };
    const existing = findBySlug.get(p.slug);
    if (existing) {
      update.run(row);
      results.push(['updated', p.sku, p.slug]);
    } else {
      insert.run(row);
      results.push(['inserted', p.sku, p.slug]);
    }
  }
  return results;
});

const results = apply();
console.log(`\nDone — ${results.length} products in category "${cat.name}" (id ${CATEGORY_ID}):`);
for (const [action, sku, slug] of results) {
  console.log(`  ${action.padEnd(8)} ${sku.padEnd(7)} ${slug}`);
}
