import db, { getAllProductsAdmin, updateProduct } from '../database.js';

const all = getAllProductsAdmin();
const servers = all.filter(p => p.category_name === 'Server');

// Brand/Model lookup keyed by product id
const meta = {
  273: { brand: 'Fujitsu', model: 'Celsius C740' },
  274: { brand: 'HP',      model: 'ProLiant DL360 Gen10' },
  275: { brand: 'HP',      model: 'ProLiant DL380 Gen9' },
  276: { brand: 'HP',      model: 'ProLiant DL360 Gen10' },
  383: { brand: 'HPE',     model: 'ProLiant ML110 Gen10' },
  384: { brand: 'Dell',    model: 'PowerEdge R730xd' },
  385: { brand: 'Dell',    model: 'PowerEdge T440' },
};

// Pre-pend Brand + Model to every server's attributes (preserve order: Brand, Model first).
for (const p of servers) {
  const m = meta[p.id];
  if (!m) { console.warn(`No brand/model meta for id=${p.id} (${p.name})`); continue; }
  const merged = { Brand: m.brand, Model: m.model, ...p.attributes };
  // Drop any later duplicate Brand/Model keys with different casing
  delete merged.brand; delete merged.model;
  updateProduct(p.id, { attributes: merged });
}

// Full re-spec: HP DL360 G10 LFF (id 274)
updateProduct(274, {
  name: 'HP DL360 G10 - 2 x Gold 5118 / 128GB RAM / 2 x 1.2TB SAS',
  short_description: 'HP DL360 G10 - 2 x Gold 5118 / 128GB RAM / 2 x 1.2TB SAS',
  price: 64000,
  attributes: {
    Brand: 'HP',
    Model: 'ProLiant DL360 Gen10',
    CPU: '2 x Intel Xeon Gold 5118',
    RAM: '128GB DDR4 ECC',
    Storage: '2 x 1.2TB SAS HDD 12Gbps',
    'RAID Controller': 'HPE Smart Array E208i-p (RAID 0, 1, 5, 10)',
    Forma: 'Rack 1U — 4 x LFF (3.5")',
    PSU: '2 x 500W',
    Gjendja: 'I rinovuar',
  },
});

// Full re-spec: HP DL360 G10 SFF (id 276)
updateProduct(276, {
  name: 'HP DL360 G10 - 2 x Gold 6134 / 128GB RAM / 2 x 800GB SAS SSD',
  short_description: 'HP DL360 G10 - 2 x Gold 6134 / 128GB RAM / 2 x 800GB SAS SSD',
  price: 90000,
  attributes: {
    Brand: 'HP',
    Model: 'ProLiant DL360 Gen10',
    CPU: '2 x Intel Xeon Gold 6134',
    RAM: '128GB DDR4 ECC',
    Storage: '2 x 800GB SAS SSD 12Gbps',
    'RAID Controller': 'HPE Smart Array E408i-p (RAID 0, 1, 5, 6, 10, 50, 60, 1 ADM, 10 ADM)',
    Forma: 'Rack 1U — 8 x SFF (2.5")',
    PSU: '2 x 500W',
    Gjendja: 'I rinovuar',
  },
});

// Re-print to confirm
const after = getAllProductsAdmin().filter(p => p.category_name === 'Server');
for (const p of after) {
  console.log(`\n#${p.id}  ${p.name}`);
  console.log(`  price: ${p.price}`);
  console.log(`  attrs:`, p.attributes);
}
