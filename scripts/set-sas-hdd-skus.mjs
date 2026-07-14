// Assigns the SASHDD00x SKU codes (from the shop's SKU List) to the five 1.2TB
// 10K SAS 2.5" HDD products already in the DB. Mapping is by product id, taken
// from the SKU List spreadsheet:
//   SASHDD001 -> #378 Dell Toshiba AL15SEB120NY 1.2TB
//   SASHDD002 -> #376 Toshiba AL15SEB120N 1.2TB
//   SASHDD003 -> #374 Seagate Exos 10E2400 1.2TB
//   SASHDD004 -> #377 HGST Ultrastar C10K1800 1.2TB
//   SASHDD005 -> #379 HPE EG1200JEMDA 1.2TB
// Idempotent: re-running just re-sets the same SKUs.
import db, { updateProduct } from '../database.js';

// [product id, SKU]
const rows = [
  [378, 'SASHDD001'],
  [376, 'SASHDD002'],
  [374, 'SASHDD003'],
  [377, 'SASHDD004'],
  [379, 'SASHDD005'],
];

for (const [id, sku] of rows) {
  const existing = db.prepare('SELECT id, name FROM products WHERE id = ?').get(id);
  if (!existing) {
    console.warn(`Skipped: product #${id} not found (SKU ${sku})`);
    continue;
  }
  updateProduct(id, { sku });
  console.log(`#${id} -> ${sku}  |  ${existing.name}`);
}

console.log('Done.');
