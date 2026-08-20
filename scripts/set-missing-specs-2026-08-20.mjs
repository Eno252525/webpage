#!/usr/bin/env node
/**
 * set-missing-specs-2026-08-20.mjs
 *
 * Fills in `attributes` (specs) for the products that had none.
 * Every product below uses ONLY the spec keys already used by the other
 * products of its own category, so the spec table looks the same across the
 * category. No condition / "Gjendja" fields — information only.
 *
 * Idempotent: keyed by slug, and it only writes when the product's current
 * attributes are empty. If a product already has specs (e.g. edited later in
 * the admin UI) it is left untouched and reported as SKIP.
 *
 * Safe to re-run, and it MUST also be run on the server after deploy
 * (products.db is git-ignored).
 */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

// --- backup first (house rule) ---------------------------------------------
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `${dbPath}.bak-${stamp}`;
fs.copyFileSync(dbPath, backup);
console.log(`Backup: ${path.basename(backup)}`);

const db = new Database(dbPath);

/**
 * slug -> attributes
 * Key sets mirror the existing products of the same category:
 *   Komponente > Caddy / Karta Rrjeti -> Albanian keys in the same shape as
 *       Komponente > RAID Controller (Brand / Model / P/N / Tipi / Ndërfaqja /
 *       Porta / Bus / Përputhshmëria); those two subcategories had no specs at
 *       all, so they follow their sibling subcategory.
 *   Komponente > RAID Controller      -> exactly the HP Smart Array key set
 *   SAS > SAS HDD                     -> the Seagate / Toshiba / HGST key set
 *   Licensa                           -> new, but identical across all 3
 *   Networking > KVM                  -> Networking key style (Brand / Model /
 *       Type / Ports / Menaxhimi / Rack Units)
 *   Server                            -> Brand / Model / Forma (CPU, RAM and
 *       Storage are per-unit and unknown for these four; left for Eno)
 *   UPS                               -> Capacity / Power / Form Factor
 */
const SPECS = {
  // ---------- Komponente > Caddy ----------
  '651314-001-caddy-hp-3-5': {
    Brand: 'HP',
    Model: 'Caddy 3.5" LFF hot-swap',
    'P/N': '651314-001',
    Tipi: 'Mbajtëse disku hot-swap (caddy)',
    Ndërfaqja: 'SAS / SATA',
    Forma: '3.5" LFF',
    'Përputhshmëria': 'HP ProLiant Gen8 / Gen9 / Gen10 (seritë DL, ML, SL)'
  },
  'hp-caddy-2-5-651687-001': {
    Brand: 'HP',
    Model: 'Caddy 2.5" SFF hot-swap',
    'P/N': '651687-001',
    Tipi: 'Mbajtëse disku hot-swap (caddy)',
    Ndërfaqja: 'SAS / SATA',
    Forma: '2.5" SFF',
    'Përputhshmëria': 'HP ProLiant Gen8 / Gen9 / Gen10 (seritë DL, ML, SL)'
  },
  'fujitsu-caddy-2-5-c26361-k666-b330': {
    Brand: 'Fujitsu',
    Model: 'Caddy 2.5" SFF hot-swap',
    'P/N': 'C26361-K666-B330',
    Tipi: 'Mbajtëse disku hot-swap (caddy)',
    Ndërfaqja: 'SAS / SATA',
    Forma: '2.5" SFF',
    'Përputhshmëria': 'Fujitsu PRIMERGY (seritë RX dhe TX)'
  },
  'dell-caddy-2-5-0f238f': {
    Brand: 'Dell',
    Model: 'Caddy 2.5" SFF hot-swap',
    'P/N': '0F238F',
    Tipi: 'Mbajtëse disku hot-swap (caddy)',
    Ndërfaqja: 'SAS / SATA',
    Forma: '2.5" SFF',
    'Përputhshmëria': 'Dell PowerEdge (seritë R dhe T)'
  },

  // ---------- Komponente > Karta Rrjeti ----------
  'hp-infiniband-544-qsfp-764284-b21': {
    Brand: 'HP',
    Model: 'InfiniBand 544+QSFP (2 porta)',
    'P/N': '764284-B21 (alt. 764736-001)',
    Tipi: 'Adaptues rrjeti PCIe',
    Ndërfaqja: 'InfiniBand FDR / Ethernet 10Gb dhe 40Gb',
    Porta: '2 × QSFP',
    Bus: 'PCIe 3.0 x8',
    'Përputhshmëria': 'HP ProLiant Gen8 / Gen9'
  },
  'dell-mellanox-connectx-3-qdr-8kp6w': {
    Brand: 'Dell / Mellanox',
    Model: 'ConnectX-3 QDR (2 porta)',
    'P/N': '8KP6W',
    Tipi: 'Adaptues rrjeti PCIe',
    Ndërfaqja: 'InfiniBand QDR / Ethernet 40Gb',
    Porta: '2 × QSFP+',
    Bus: 'PCIe 3.0 x8',
    'Përputhshmëria': 'Dell PowerEdge'
  },
  'hp-560flr-sfp-665243-b21': {
    Brand: 'HP',
    Model: 'Ethernet 10Gb 560FLR-SFP+ (2 porta)',
    'P/N': '665243-B21 (alt. 669281-001)',
    Tipi: 'Adaptues rrjeti FlexibleLOM',
    Ndërfaqja: 'Ethernet 10Gb',
    Porta: '2 × SFP+ (pa module GBIC)',
    Bus: 'PCIe 3.0 x8',
    'Përputhshmëria': 'HP ProLiant Gen8 / Gen9'
  },

  // ---------- Komponente > RAID Controller ----------
  'dell-boss-s1-7hyy4': {
    Brand: 'Dell',
    Model: 'BOSS-S1 (Boot Optimized Storage Solution)',
    'P/N': '7HYY4',
    Tipi: 'Kartë PCIe për boot nga disqe M.2',
    Ndërfaqja: 'SATA 6 Gb/s (M.2)',
    Porta: '2 × slot M.2 të brendshëm',
    Bus: 'PCIe 2.0 x2 (konektor x8)',
    Cache: 'Pa cache',
    RAID: '0 / 1',
    'Përputhshmëria': 'Dell PowerEdge (gjenerata e 14-të)'
  },
  'lsi-sas-9217-4i4e-hba-03-25597-00d': {
    Brand: 'LSI / Avago',
    Model: 'SAS 9217-4i4e',
    'P/N': '03-25597-00D',
    Tipi: 'Kontrollues HBA (IT / IR)',
    Ndërfaqja: '6 Gb/s SAS / SATA',
    Porta: '4 të brendshme (Mini-SAS SFF-8087) + 4 të jashtme (Mini-SAS SFF-8088)',
    Bus: 'PCIe 3.0 x8',
    Cache: 'Pa cache',
    RAID: '0 / 1 / 1E / 10 (IR mode) ose HBA (IT mode)',
    'Përputhshmëria': 'Serverë dhe workstation-e standardë'
  },

  // ---------- SAS > SAS HDD ----------
  'hgst-ultrastar-c10k1800-1-8tb-10k-sas': {
    Type: 'HDD',
    Series: 'HGST Ultrastar C10K1800',
    Interface: 'SAS 12Gbps',
    'Form Factor': '2.5-inch (SFF)',
    Capacity: '1.8 TB',
    'Rotational Speed': '10,000 RPM',
    Cache: '128 MB',
    Class: 'Enterprise / Mission-Critical',
    Features: 'Dual-port SAS, hot-plug',
    'Model Number': 'HUC101818CS4204'
  },
  'dell-ultrastar-c10k1800-1-8tb-10k-sas-caddy': {
    Type: 'HDD',
    Series: 'HGST Ultrastar C10K1800 (Dell-certified)',
    Interface: 'SAS 12Gbps',
    'Form Factor': '2.5-inch (SFF)',
    Capacity: '1.8 TB',
    'Rotational Speed': '10,000 RPM',
    Cache: '128 MB',
    Class: 'Enterprise / Mission-Critical',
    Compatibility: 'Dell PowerEdge',
    Features: 'Dual-port SAS, hot-plug (512e)',
    'Model Number': 'HUC101818CS4204',
    'Part Number': 'Dell DP/N RF9T8'
  },

  // ---------- Licensa ----------
  'windows-10-pro-oem': {
    'Tipi i licensës': 'OEM',
    'Kohëzgjatja': 'E përhershme (lifetime)',
    Pajisje: '1 pajisje',
    Platforma: 'Windows 10 Pro (64-bit)'
  },
  'windows-11-pro-oem': {
    'Tipi i licensës': 'OEM',
    'Kohëzgjatja': 'E përhershme (lifetime)',
    Pajisje: '1 pajisje',
    Platforma: 'Windows 11 Pro (64-bit)'
  },
  'kaspersky-total-security-3-pajisje': {
    'Tipi i licensës': 'Abonim',
    'Kohëzgjatja': '1 vit',
    Pajisje: '3 pajisje',
    Platforma: 'Windows, macOS, Android'
  },

  // ---------- Networking > KVM ----------
  'kvm-raritan-kx2-116': {
    Brand: 'Raritan',
    Model: 'Dominion KX II (KX2-116)',
    Type: 'KVM-over-IP switch',
    Ports: '16 porta server (Cat5, me CIM)',
    Menaxhimi: '1 përdorues remote (web) + 1 port lokal',
    'Rack Units': '1U'
  },

  // ---------- Server (shasia; CPU/RAM/Storage varen nga konfigurimi) --------
  'hp-proliant-dl360-gen9': {
    Brand: 'HP',
    Model: 'ProLiant DL360 Gen9',
    Forma: 'Rack 1U (deri në 2 procesorë)'
  },
  'hp-proliant-dl360p-gen8': {
    Brand: 'HP',
    Model: 'ProLiant DL360p Gen8',
    Forma: 'Rack 1U (deri në 2 procesorë)'
  },
  'ibm-system-x3550-m4': {
    Brand: 'IBM',
    Model: 'System x3550 M4',
    Forma: 'Rack 1U (deri në 2 procesorë)'
  },
  'ibm-system-x3650-m4': {
    Brand: 'IBM',
    Model: 'System x3650 M4',
    Forma: 'Rack 2U (deri në 2 procesorë)'
  },

  // ---------- UPS ----------
  'apc-smart-ups-1400va-bx1400u-gr': {
    Capacity: '1400VA',
    Power: '700W',
    'Form Factor': 'Tower'
  },
  'apc-ups-br900gi-pro-900-900va': {
    Capacity: '900VA',
    Power: '540W',
    'Form Factor': 'Tower'
  },
  'apc-ups-smt750ic-750va': {
    Capacity: '750VA',
    Power: '500W',
    'Form Factor': 'Tower'
  }
};

const select = db.prepare('SELECT id, name, attributes FROM products WHERE slug = ?');
const update = db.prepare('UPDATE products SET attributes = ? WHERE id = ?');

let set = 0, skipped = 0, missing = 0;

db.transaction(() => {
  for (const [slug, attrs] of Object.entries(SPECS)) {
    const row = select.get(slug);
    if (!row) {
      console.log(`MISSING  ${slug} — nuk u gjet`);
      missing++;
      continue;
    }
    let current = {};
    try { current = JSON.parse(row.attributes || '{}') || {}; } catch { current = {}; }
    const filled = Object.keys(current).filter(k => String(current[k]).trim() !== '');
    if (filled.length) {
      console.log(`SKIP     ${row.name} — ka tashmë specifikime (${filled.join(', ')})`);
      skipped++;
      continue;
    }
    update.run(JSON.stringify(attrs), row.id);
    console.log(`SET      ${row.name} — ${Object.keys(attrs).length} specifikime`);
    set++;
  }
})();

console.log(`\nDone. set=${set} skip=${skipped} missing=${missing}`);
db.close();
