// Idempotent seed: creates (or updates) the Cisco switch models from the SKU
// list that were missing from the store, and assigns each its SKU. Upserts by
// slug, so re-running is safe (updates in place instead of duplicating).
//
//   node scripts/add-cisco-switches-sku.mjs
//
// Switches live in the `switch` category (id 18). Images reuse the closest
// same-family photo already in uploads/ when one exists; models without a
// family photo are left imageless (the page shows a placeholder) until a real
// picture is added via the admin.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getProductBySlug, createProduct, updateProduct, getCategories } from '../database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(__dirname, '..', 'uploads');

const cats = getCategories();
const SWITCH_CAT = cats.find(c => c.slug === 'switch')?.id;
if (!SWITCH_CAT) { console.error('Switch category not found'); process.exit(1); }

const COND = 'Pre-Owned / Testuar';

// [sku, model, image-basename|null, short-desc, attributes]
const SWITCHES = [
  ['SW0001', 'C3750X-48P-L', 'cisco-ws-c3750x-48.webp',
    'Cisco Catalyst 3750X-48P-L — 48-port Gigabit PoE+ (715W), stackable, uplink modular.',
    { Ports: '48x 10/100/1000 PoE+ RJ45', Uplink: 'Network module slot: 4x SFP, 4x SFP+, ose 2x 10G', 'PoE Budget': '715W (PoE+ 802.3at)', 'Max PoE per Port': '30W', 'Switching Capacity': '160 Gbps', 'Forwarding Rate': '101.2 Mpps', Stacking: 'StackWise Plus 64 Gbps / StackPower', Layer: 'Layer 2+ (LAN Base)', 'Rack Units': '1U', Condition: COND }],
  ['SW0002', 'C3750X-48T-S', 'cisco-ws-c3750x-48.webp',
    'Cisco Catalyst 3750X-48T-S — 48-port Gigabit (data), stackable Layer 3 (IP Base).',
    { Ports: '48x 10/100/1000 RJ45', Uplink: 'Network module slot: 4x SFP, 4x SFP+, ose 2x 10G', 'Switching Capacity': '160 Gbps', 'Forwarding Rate': '101.2 Mpps', Stacking: 'StackWise Plus 64 Gbps / StackPower', Layer: 'Layer 3 (IP Base)', 'Rack Units': '1U', PoE: 'Jo', Condition: COND }],
  ['SW0003', 'C3650-48TQ-S', null,
    'Cisco Catalyst 3650-48TQ-S — 48-port Gigabit me 4x 10G SFP+, Layer 3 (IP Base).',
    { Ports: '48x 10/100/1000 RJ45', Uplink: '4x 10G SFP+', 'Switching Capacity': '176 Gbps', 'Forwarding Rate': '130.9 Mpps', Stacking: 'StackWise-160 (160 Gbps)', Layer: 'Layer 3 (IP Base)', 'Rack Units': '1U', PoE: 'Jo', Condition: COND }],
  ['SW0004', 'C2960X-48FPS-L', 'cisco-ws-c2960x-48ts-l.webp',
    'Cisco Catalyst 2960X-48FPS-L — 48-port Gigabit Full PoE+ (740W) me 4 SFP, FlexStack-Plus.',
    { Ports: '48x 10/100/1000 PoE+ RJ45', Uplink: '4x SFP (1G)', 'PoE Budget': '740W (PoE+ 802.3at)', 'Max PoE per Port': '30W', 'Switching Capacity': '108 Gbps', 'Forwarding Rate': '77.38 Mpps', Stacking: 'FlexStack-Plus 80 Gbps', Layer: 'Layer 2 (LAN Base)', 'Rack Units': '1U', Condition: COND }],
  ['SW0006', 'C2960X-48TS-LL', 'cisco-ws-c2960x-48ts-l.webp',
    'Cisco Catalyst 2960X-48TS-LL — 48-port Gigabit me 2 SFP, LAN Lite (Layer 2).',
    { Ports: '48x 10/100/1000 RJ45', Uplink: '2x SFP (1G)', 'Switching Capacity': '108 Gbps', 'Forwarding Rate': '77.38 Mpps', Layer: 'Layer 2 (LAN Lite)', 'Rack Units': '1U', PoE: 'Jo', Condition: COND }],
  ['SW0007', 'C3560X-24P-L', null,
    'Cisco Catalyst 3560X-24P-L — 24-port Gigabit PoE+ (435W), standalone, uplink modular.',
    { Ports: '24x 10/100/1000 PoE+ RJ45', Uplink: 'Network module slot: 4x SFP ose 2x 10G SFP+', 'PoE Budget': '435W (PoE+ 802.3at)', 'Max PoE per Port': '30W', 'Switching Capacity': '160 Gbps', 'Forwarding Rate': '101.2 Mpps', Stacking: 'Standalone (pa stack)', Layer: 'Layer 2+ (LAN Base)', 'Rack Units': '1U', Condition: COND }],
  ['SW0008', 'C3750X-24T-S', 'cisco-ws-c3750x-24.webp',
    'Cisco Catalyst 3750X-24T-S — 24-port Gigabit (data), stackable Layer 3 (IP Base).',
    { Ports: '24x 10/100/1000 RJ45', Uplink: 'Network module slot: 4x SFP, 4x SFP+, ose 2x 10G', 'Switching Capacity': '160 Gbps', 'Forwarding Rate': '65.5 Mpps', Stacking: 'StackWise Plus 64 Gbps / StackPower', Layer: 'Layer 3 (IP Base)', 'Rack Units': '1U', PoE: 'Jo', Condition: COND }],
  ['SW0009', 'C3750X-48P-S', 'cisco-ws-c3750x-48.webp',
    'Cisco Catalyst 3750X-48P-S — 48-port Gigabit PoE+ (715W), stackable Layer 3 (IP Base).',
    { Ports: '48x 10/100/1000 PoE+ RJ45', Uplink: 'Network module slot: 4x SFP, 4x SFP+, ose 2x 10G', 'PoE Budget': '715W (PoE+ 802.3at)', 'Max PoE per Port': '30W', 'Switching Capacity': '160 Gbps', 'Forwarding Rate': '101.2 Mpps', Stacking: 'StackWise Plus 64 Gbps / StackPower', Layer: 'Layer 3 (IP Base)', 'Rack Units': '1U', Condition: COND }],
  ['SW0010', 'C3650-24TS-S', null,
    'Cisco Catalyst 3650-24TS-S — 24-port Gigabit me 4 SFP, Layer 3 (IP Base).',
    { Ports: '24x 10/100/1000 RJ45', Uplink: '4x SFP (1G)', 'Switching Capacity': '88 Gbps', 'Forwarding Rate': '65.5 Mpps', Stacking: 'StackWise-160 (160 Gbps)', Layer: 'Layer 3 (IP Base)', 'Rack Units': '1U', PoE: 'Jo', Condition: COND }],
  ['SW0011', 'C2960XR-48TS-I', 'cisco-ws-c2960xr-48td-i.webp',
    'Cisco Catalyst 2960XR-48TS-I — 48-port Gigabit me 4 SFP, Layer 3 lite (IP Lite, dual PSU).',
    { Ports: '48x 10/100/1000 RJ45', Uplink: '4x SFP (1G)', 'Switching Capacity': '108 Gbps', 'Forwarding Rate': '77.38 Mpps', Stacking: 'FlexStack-Plus 80 Gbps', Layer: 'Layer 3 lite (IP Lite, dual PSU)', 'Rack Units': '1U', PoE: 'Jo', Condition: COND }],
  ['SW0012', 'C2960X-48TD-L', 'cisco-ws-c2960x-48ts-l.webp',
    'Cisco Catalyst 2960X-48TD-L — 48-port Gigabit me 2 SFP+ 10G, FlexStack-Plus (Layer 2).',
    { Ports: '48x 10/100/1000 RJ45', Uplink: '2x SFP+ (10G)', 'Switching Capacity': '108 Gbps', 'Forwarding Rate': '77.38 Mpps', Stacking: 'FlexStack-Plus 80 Gbps', Layer: 'Layer 2 (LAN Base)', 'Rack Units': '1U', PoE: 'Jo', Condition: COND }],
  ['SW0013', 'C3850-48F-E', null,
    'Cisco Catalyst 3850-48F-E — 48-port Gigabit Full PoE+ (1100W), Layer 3 (IP Services), uplink modular.',
    { Ports: '48x 10/100/1000 Full PoE+ RJ45', Uplink: 'Network module slot: 4x 1G / 2x 10G / 4x 10G / 2x 40G', 'PoE Budget': '1100W (PoE+ 802.3at)', 'Max PoE per Port': '30W', 'Switching Capacity': '176 Gbps', 'Forwarding Rate': '130.9 Mpps', Stacking: 'StackWise-480 (480 Gbps) / StackPower', Layer: 'Layer 3 (IP Services)', 'Rack Units': '1U', Condition: COND }],
  ['SW0014', 'C2960X-24PS-L', 'cisco-ws-c2960x-24ts-l.webp',
    'Cisco Catalyst 2960X-24PS-L — 24-port Gigabit PoE+ (370W) me 4 SFP, FlexStack-Plus.',
    { Ports: '24x 10/100/1000 PoE+ RJ45', Uplink: '4x SFP (1G)', 'PoE Budget': '370W (PoE+ 802.3at)', 'Max PoE per Port': '30W', 'Switching Capacity': '108 Gbps', 'Forwarding Rate': '77.38 Mpps', Stacking: 'FlexStack-Plus 80 Gbps', Layer: 'Layer 2 (LAN Base)', 'Rack Units': '1U', Condition: COND }],
  ['SW0015', 'C3850-48P-S', null,
    'Cisco Catalyst 3850-48P-S — 48-port Gigabit PoE+ (715W), Layer 3 (IP Base), uplink modular.',
    { Ports: '48x 10/100/1000 PoE+ RJ45', Uplink: 'Network module slot: 4x 1G / 2x 10G / 4x 10G / 2x 40G', 'PoE Budget': '715W (PoE+ 802.3at)', 'Max PoE per Port': '30W', 'Switching Capacity': '176 Gbps', 'Forwarding Rate': '130.9 Mpps', Stacking: 'StackWise-480 (480 Gbps) / StackPower', Layer: 'Layer 3 (IP Base)', 'Rack Units': '1U', Condition: COND }],
  ['SW0016', 'C3850-12S-S', 'ws-c3850-12xs-e.webp',
    'Cisco Catalyst 3850-12S-S — 12x 1G SFP, Layer 3 (IP Base), StackWise-480, uplink modular.',
    { Ports: '12x 1G SFP', Uplink: 'Network module slot: 4x 1G / 2x 10G / 4x 10G / 2x 40G', 'Switching Capacity': '176 Gbps', 'Forwarding Rate': '130.9 Mpps', Stacking: 'StackWise-480 (480 Gbps) / StackPower', Layer: 'Layer 3 (IP Base)', 'Rack Units': '1U', PoE: 'Jo', Condition: COND }],
];

function imgPath(basename) {
  if (!basename) return null;
  return fs.existsSync(path.join(UPLOADS, basename)) ? `/uploads/${basename}` : null;
}

let created = 0, updated = 0, noImg = 0;
for (const [sku, model, imgBase, short, attrs] of SWITCHES) {
  const slug = `cisco-ws-${model.toLowerCase()}`;
  const img = imgPath(imgBase);
  if (!img) noImg++;
  const data = {
    name: `Cisco Catalyst ${model.replace(/^C/, '')} (WS-${model})`,
    slug,
    short_description: short,
    description: '',
    price: 0,
    category_id: SWITCH_CAT,
    brand: 'Cisco',
    sku,
    attributes: attrs,
    images: img ? [img] : [],
    in_stock: 1,
  };
  const existing = getProductBySlug(slug);
  if (existing) {
    updateProduct(existing.id, data);
    updated++;
    console.log(`  updated  #${existing.id}  ${sku}  ${data.name}${img ? '' : '  (no image)'}`);
  } else {
    const p = createProduct(data);
    created++;
    console.log(`  created  #${p.id}  ${sku}  ${data.name}${img ? '' : '  (no image)'}`);
  }
}

console.log(`\nDone. Created ${created}, updated ${updated}, ${noImg} without image (placeholder shown).`);
