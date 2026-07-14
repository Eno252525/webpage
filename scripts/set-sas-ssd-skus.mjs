// Assigns the SASSSD00x SKU codes (from the shop's SKU List) to the six 800GB
// SAS SSD 2.5" products already in the DB. Mapping is by product id:
//   SASSSD001 -> #386 Dell KPM5XMUG800G 800GB
//   SASSSD002 -> #390 HPE MO000800JWTBR 800GB
//   SASSSD003 -> #381 Dell EMC PM1645a 800GB
//   SASSSD004 -> #387 HPE KPM5XMUG800G 800GB
//   SASSSD005 -> #388 HPE ST800FM0403 800GB
//   SASSSD006 -> #389 HPE MO000800JWDKV 800GB
// Idempotent: re-running just re-sets the same SKUs.
import db, { updateProduct } from '../database.js';

// [product id, SKU]
const rows = [
  [386, 'SASSSD001'],
  [390, 'SASSSD002'],
  [381, 'SASSSD003'],
  [387, 'SASSSD004'],
  [388, 'SASSSD005'],
  [389, 'SASSSD006'],
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
