import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'products.db'));
const uploadsDir = path.join(__dirname, 'uploads');

// Copy source file to uploads with a clean name (if not already there)
function ensureUploaded(srcName, destName) {
  const src = path.join(__dirname, srcName);
  const dest = path.join(uploadsDir, destName);
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
    console.log(`  Copied ${srcName} → uploads/${destName}`);
  } else {
    console.log(`  Already exists: uploads/${destName}`);
  }
  return `/uploads/${destName}`;
}

// Update product images by name pattern (LIKE search)
function updateByName(pattern, imgPath) {
  const rows = db.prepare("SELECT id, name FROM products WHERE name LIKE ?").all(`%${pattern}%`);
  if (rows.length === 0) {
    console.log(`  ⚠ No products matching: ${pattern}`);
    return;
  }
  for (const row of rows) {
    db.prepare("UPDATE products SET images = ?, updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify([imgPath]), row.id);
    console.log(`  ✓ ID ${row.id}: ${row.name}`);
  }
}

// Update product images by exact ID
function updateById(id, imgPath) {
  const row = db.prepare("SELECT id, name FROM products WHERE id = ?").get(id);
  if (!row) { console.log(`  ⚠ ID ${id} not found`); return; }
  db.prepare("UPDATE products SET images = ?, updated_at = datetime('now') WHERE id = ?")
    .run(JSON.stringify([imgPath]), id);
  console.log(`  ✓ ID ${row.id}: ${row.name}`);
}

console.log('\n=== Copying images to uploads/ ===');
const img3620   = ensureUploaded('Untitled.jpg',                                              'precision-3620.jpg');
const img3630   = ensureUploaded('3630-front.jpg',                                            'precision-3630.jpg');
const img3650   = ensureUploaded('precision-3650-tower-black-480x440.avif',                   'precision-3650.avif');
const img5810   = ensureUploaded('dell_462_8799_precision_t5810_workstation_1094988-1.jpg',   'precision-5810.jpg');
const img5820   = ensureUploaded('prt5820-lsy-10015rf-bk.avif',                               'precision-5820.avif');
const imgT1650  = ensureUploaded('51NqYAswd+L._AC_UF1000,1000_QL80_.jpg',                    'precision-t1650.jpg');
const imgT3600  = ensureUploaded('dell-t3600-workstation-1000x1000_cfd4ba79-c705-4150-90b7-6f1e2b61246c.webp', 'precision-t3600.webp');
const imgT3640  = ensureUploaded('4420489__63976.png',                                        'precision-t3640.png');
const imgT5600  = ensureUploaded('Dell5600TXeon2-r.jpg',                                      'precision-t5600.jpg');
const imgT5510  = ensureUploaded('3589935__05930.png',                                        'precision-t5510.png');
const imgThink  = ensureUploaded('d2428e28-81b6-4a22-b1c6-f699c7ba043d.jpg',                 'thinkcentre-s20.jpg');
const imgP920   = '/uploads/P920.webp';  // Already used; copy if missing
if (!fs.existsSync(path.join(uploadsDir, 'P920.webp'))) {
  fs.copyFileSync(path.join(__dirname, 'P920.webp'), path.join(uploadsDir, 'P920.webp'));
  console.log('  Copied P920.webp → uploads/P920.webp');
}
const imgHPZ6   = ensureUploaded('hp-workstation-z6-g4-1640075549.jpg',                      'hp-z6-g4.jpg');
const imgL450   = ensureUploaded('162613t550.jpg',                                            'lenovo-l450.jpg');
const img7540   = ensureUploaded('notebook-precision-15-7540-campaign-hero-504x350-ng.avif',  'precision-7540.avif');
const img7530   = ensureUploaded('Dell-Precision-7530-Intel-Core-i7-8th-Gen-32GB-RAM-512GB-SSD-15.6-Inch-FHD-WVA-Display-Laptop-2.jpg', 'precision-7530.jpg');
const img7560   = ensureUploaded('laptop-precision-7560-pdp-mod-laptop365-2-jpeg.webp',       'precision-7560.webp');

console.log('\n=== Updating product images ===');

console.log('\n-- Dell Precision 3620 --');
updateByName('Precision 3620', img3620);

console.log('\n-- Dell Precision 3630 --');
updateByName('Precision 3630', img3630);

console.log('\n-- Dell Precision 3050 --');
updateByName('Precision 3050', img3650);

console.log('\n-- Dell Precision 5810 --');
updateByName('Precision 5810', img5810);

console.log('\n-- Dell Precision 5820 --');
updateByName('Precision 5820', img5820);

console.log('\n-- Dell Precision 7820 --');
updateByName('Precision 7820', img5820);

console.log('\n-- Dell Precision T1650 --');
updateByName('Precision T1650', imgT1650);

console.log('\n-- Dell Precision T1700 --');
updateByName('Precision T1700', imgT1650);

console.log('\n-- Dell Precision T3600 --');
updateByName('Precision T3600', imgT3600);

console.log('\n-- Dell Precision T3610 --');
updateByName('Precision T3610', imgT3600);

console.log('\n-- Dell Precision T3640 --');
updateByName('Precision T3640', imgT3640);

console.log('\n-- Dell Precision T5600 --');
updateByName('Precision T5600', imgT5600);

console.log('\n-- Dell Precision T5510 --');
updateByName('Precision T5510', imgT5510);

console.log('\n-- Lenovo Thinkcentre S20 --');
updateByName('Thinkcentre S20', imgThink);
updateByName('ThinkCentre S20', imgThink);

console.log('\n-- Lenovo Thinkcentre E20 --');
updateByName('Thinkcentre E20', imgThink);
updateByName('ThinkCentre E20', imgThink);

console.log('\n-- Lenovo Thinkstation P920 --');
updateByName('Thinkstation P920', imgP920);
updateByName('ThinkStation P920', imgP920);

console.log('\n-- HP Z6 G4 --');
updateByName('Z6 G4', imgHPZ6);

console.log('\n-- Lenovo L450 --');
updateByName('L450', imgL450);

console.log('\n-- Dell Precision 7540 --');
updateByName('Precision 7540', img7540);

console.log('\n-- Dell Precision 7530 --');
updateByName('Precision 7530', img7530);

console.log('\n-- Dell Precision 7560 --');
updateByName('Precision 7560', img7560);

console.log('\n✅ All done!');
db.close();
