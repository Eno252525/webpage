import db from '../database.js';

// Map: product id -> screen size string (or null to skip)
// Based on model number lookups. Insertion order rebuilt: CPU, RAM, SSD, Screen, ...rest.
const SCREEN_BY_ID = {
  212: '14"',    // Dell Latitude 5420
  213: '14"',    // Dell Latitude 5420
  214: '14"',    // Lenovo L450
  215: '15.6"',  // Lenovo Ideapad S145-15IIL
  216: '14"',    // Dell Latitude 5400
  217: '14"',    // Lenovo Thinkpad T470s
  218: '15.6"',  // Dell Latitude 5511
  219: '15.6"',  // Dell Precision 7530
  220: '15.6"',  // Dell Latitude 5500
  221: '15.6"',  // Dell Precision 7540
  222: '15.6"',  // Dell Latitude 5510
  223: '15.6"',  // Dell Latitude 5590
  224: '15"',    // Dell Latitude 9520
  225: '15.6"',  // Dell Latitude 5520
  226: '15.6"',  // Dell Precision 7560
  227: '15.6"',  // Dell Latitude 5511
  228: '14"',    // Dell E7450
  229: '15.6"',  // Dell Latitude 3540
  230: '14"',    // Dell E6440
  231: '15.6"',  // Dell E5530
  233: '15.6"',  // Dell Latitude E5550
  234: '15.6"',  // Dell Latitude E5590
  235: '14"',    // Dell Latitude E6440
  236: '13.3"',  // Dell Latitude 3380
  237: '15.6"',  // Dell Vostro 3558
  238: '13.3"',  // Dell Latitude 7390
  239: '14"',    // Dell Latitude 7940 Touch (assumed 7490 typo)
  240: '15.6"',  // Dell Latitude 5590
  241: '15.6"',  // Dell Latitude 5500
  243: '15.6"',  // Dell Latitude 5580
  245: '12.3"',  // Microsoft Surface Pro 5
  246: '12.3"',  // Microsoft Surface Pro 4
  247: '12.3"',  // Microsoft Surface Pro 5
  248: '12.3"',  // Microsoft Surface Pro 5
  249: '13.5"',  // Microsoft Surface Laptop 3 13.5"
  250: '12.3"',  // Microsoft Surface (Pro 6, i5-8350U)
  251: '13.3"',  // Apple MacBook Air 2020
  252: '13.3"',  // Apple MacBook Pro 2020
  253: '13.3"',  // Apple MacBook Pro 2020
  254: '13.3"',  // Apple MacBook Pro 2020
  364: '14"',    // Lenovo Thinkpad T14 Gen2
  365: '14"',    // Lenovo Thinkpad T14s
};

const rows = db.prepare(
  "SELECT id, name, attributes FROM products WHERE category_id IN (9, 15, 27, 28) ORDER BY id"
).all();

const update = db.prepare(
  "UPDATE products SET attributes = ?, updated_at = datetime('now') WHERE id = ?"
);

let updated = 0;
let skipped = [];

for (const row of rows) {
  const screen = SCREEN_BY_ID[row.id];
  if (!screen) {
    skipped.push(`#${row.id} ${row.name} (no mapping)`);
    continue;
  }
  const attrs = JSON.parse(row.attributes || '{}');

  // Rebuild with Screen right after SSD; if SSD missing, insert after RAM; otherwise append.
  const rebuilt = {};
  const keys = Object.keys(attrs);
  const anchor = keys.includes('SSD') ? 'SSD'
               : keys.includes('RAM') ? 'RAM'
               : keys.includes('CPU') ? 'CPU'
               : null;

  if (anchor === null) {
    // Empty attributes — just set Screen.
    rebuilt.Screen = screen;
  } else {
    for (const k of keys) {
      if (k === 'Screen') continue; // drop any existing, we'll re-insert in correct position
      rebuilt[k] = attrs[k];
      if (k === anchor) rebuilt.Screen = screen;
    }
  }

  update.run(JSON.stringify(rebuilt), row.id);
  updated++;
  console.log(`#${row.id} ${row.name} -> Screen ${screen}`);
}

console.log(`\nUpdated ${updated} of ${rows.length} laptops.`);
if (skipped.length) {
  console.log('Skipped:');
  for (const s of skipped) console.log('  ' + s);
}
