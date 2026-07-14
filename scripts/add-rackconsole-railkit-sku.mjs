// Idempotent seed: creates (or updates) the two accessories from the SKU list
// that were missing from the store — an HP rack-console monitor and an HP DL380
// rail kit — and assigns each its SKU. Upserts by slug, so re-running is safe.
//
//   node scripts/add-rackconsole-railkit-sku.mjs
//
// No product photos exist yet, so both are created imageless (the page shows a
// placeholder) until a real picture is added via the admin.

import { getProductBySlug, createProduct, updateProduct, getCategories } from '../database.js';

const cats = getCategories();
const catId = slug => cats.find(c => c.slug === slug)?.id ?? null;
const MONITOR_CAT = catId('monitore');
const SERVER_CAT = catId('server');
if (!MONITOR_CAT || !SERVER_CAT) { console.error('Category missing'); process.exit(1); }

const COND = 'Pre-Owned / Testuar';

const ITEMS = [
  {
    sku: 'MON0023',
    slug: 'hp-tft7600-g2-rack-console',
    name: 'HP TFT7600 G2 Rack Console — Monitor 17" për Server',
    category_id: MONITOR_CAT,
    brand: 'HP',
    short_description: 'HP TFT7600 G2 — konsolë rack 1U me monitor 17" që lidhet direkt me server-in.',
    attributes: {
      Tipi: 'Konsolë rack (rackmount) 1U',
      Ekrani: '17" TFT LCD',
      Rezolucioni: '1280x1024',
      Lidhja: 'VGA / KVM (lidhet me server)',
      'Rack Units': '1U',
      Condition: COND,
    },
  },
  {
    sku: '733662-B21',
    slug: 'hp-dl380-gen9-gen10-2u-rail-kit',
    name: 'HP 2U Rail Kit për ProLiant DL380 Gen9/Gen10 (733662-B21)',
    category_id: SERVER_CAT,
    brand: 'HP',
    short_description: 'Shina (rail kit) 2U për HP ProLiant DL380 Gen9/Gen10 — montim në rack. HP P/N 733662-B21.',
    attributes: {
      Tipi: 'Rack Rail Kit (shina 2U)',
      'Përputhshmëria': 'HP ProLiant DL380 Gen9 / Gen10 (2U)',
      'Part Number': '733662-B21',
      Condition: COND,
    },
  },
];

let created = 0, updated = 0;
for (const it of ITEMS) {
  const data = { ...it, description: '', price: 0, images: [], in_stock: 1 };
  const existing = getProductBySlug(it.slug);
  if (existing) {
    updateProduct(existing.id, data);
    updated++;
    console.log(`  updated  #${existing.id}  ${it.sku}  ${it.name}`);
  } else {
    const p = createProduct(data);
    created++;
    console.log(`  created  #${p.id}  ${it.sku}  ${it.name}`);
  }
}
console.log(`\nDone. Created ${created}, updated ${updated}. (Both imageless — add photos via admin.)`);
