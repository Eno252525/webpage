// Adds the three server processors from Eno's 2026-08-21 list, into a new
// "Procesor" subcategory of Komponente (the shop had no standalone CPUs before
// — every Xeon in the catalog was inside a server or workstation):
//
//   Intel Xeon Platinum 8168   24C/48T  2.70 GHz  33 MB  205 W  LGA3647  SR37J
//   Intel Xeon Platinum 8165   24C/48T  2.30 GHz  33 MB  205 W  LGA3647  SR3M8
//   Intel Xeon E5-2698 v4      20C/40T  2.20 GHz  50 MB  135 W  LGA2011-3 SR2JW
//
// Specs are from Intel ARK / technical.city for each SKU. Note the 8165 is an
// off-roadmap OEM/cloud SKU: same Skylake-SP silicon and package as the 8168,
// 400 MHz lower base clock, and it never had retail distribution — which is
// also why almost nobody photographs it (see below).
//
// PRICES ARE 0 ON PURPOSE. Eno did not give prices with the list, and used
// server-CPU pricing swings far too much to guess on a live storefront, so all
// three go in at price 0, which the frontend renders as "Çmim sipas kërkesës"
// (webroot/js/ui.js). Re-run a small set-* script once the prices are decided.
//
// Photos — real photographs of each exact chip, white background, no watermark:
//   8168      techbuyer.com catalogue shot of the SR37J part (1100 px)
//   E5-2698v4 techbuyer.com catalogue shot of the SR2JW part (1100 px)
//   8165      spwindustrial.com (BigCommerce) — the only clean, unwatermarked
//             8165 photo I could find. Techbuyer/Icecat do not carry the SKU,
//             theserverstore's shot is stamped with their logo across the chip,
//             and every Shopify reseller just reuses Intel's generic "Xeon
//             Platinum inside" badge render. It is only 386x513 native, so it
//             is noticeably softer than the other two — swap the URL and delete
//             uploads/intel-xeon-platinum-8165.webp if a better one turns up,
//             or shoot the actual unit in the shop.
//
// sku is left empty on purpose — Eno assigns those.
//
// The Procesor category is created by the migration at the top of database.js,
// which runs on every server start; it is re-asserted here so the script also
// works standalone against a DB the server has not opened yet.
//
// Idempotent: keyed by slug (insert-or-update), an existing uploads/<name>.webp
// is left alone, and the DB write re-asserts the same values. Safe to re-run —
// which is required on the server, where products.db and uploads/ are
// git-ignored and never arrive through a deploy:
//   node scripts/add-processors-2026-08-21.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');
const uploads = path.join(root, 'uploads');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const PRODUCTS = [
  {
    slug: 'intel-xeon-platinum-8168',
    name: 'Intel Xeon Platinum 8168 — 24 Bërthama 2.7 GHz LGA3647 (SR37J)',
    brand: 'Intel',
    price: 0,
    image: 'https://www.techbuyer.com/media/catalog/product/S/R/SR37J_intel_8168_platinum_cpu_01_a9d6.jpg',
    short_description:
      'Procesor server Intel Xeon Platinum 8168 (CPU), 24 bërthama / 48 threads, 2.70 GHz bazë deri 3.70 GHz Turbo, 33 MB cache, 205 W, socket FCLGA3647. P/N SR37J.',
    description:
      'Intel Xeon Platinum 8168 është një nga procesorët më të fuqishëm të gjeneratës së parë Xeon Scalable (Skylake-SP). Me 24 bërthama dhe 48 threads në 2.70 GHz bazë — frekuenca bazë më e lartë e klasës 24-bërthamëshe — dhe Turbo deri në 3.70 GHz, ai mbulon njësoj mirë ngarkesat me shumë procese paralele (virtualizim, kontejnerë, render farm, baza të dhënash) dhe ato ku numërojnë edhe threadet e vetme. Ka 33 MB cache L3, mbështet AVX-512 për llogaritje vektoriale dhe shkencore, dhe kontrollues memorieje me 6 kanale DDR4-2666 ECC deri në 768 GB për procesor. Tre lidhje UPI me 10.4 GT/s lejojnë konfigurime deri në 8 procesorë në të njëjtin sistem, dhe 48 korsi PCIe 3.0 mbulojnë karta rrjeti 100G, NVMe apo disa GPU njëkohësisht. Kërkon socket FCLGA3647 (Socket P0) dhe një sistem ftohjeje të dimensionuar për 205 W — pra platformë server ose workstation si HPE ProLiant Gen10, Dell PowerEdge R640/R740, Lenovo SR630/SR650, HP Z8 G4 apo Dell Precision 7820/7920. Procesori është i përdorur, i testuar dhe funksional.',
    attributes: {
      Brand: 'Intel',
      Model: 'Xeon Platinum 8168',
      'P/N': 'SR37J (CD8067303327701)',
      Familja: 'Xeon Scalable, gjenerata e 1-rë (Skylake-SP)',
      Bërthama: '24 bërthama / 48 threads',
      Frekuenca: '2.70 GHz bazë / 3.70 GHz Turbo',
      Cache: '33 MB L3 (Intel Smart Cache) + 24 MB L2',
      TDP: '205 W',
      Socket: 'FCLGA3647 (Socket P0)',
      Memoria: 'DDR4-2666 ECC, 6 kanale, deri 768 GB',
      PCIe: '48 korsi PCIe 3.0',
      UPI: '3 × 10.4 GT/s',
      Konfigurimi: 'Deri në 8 procesorë (8S)',
      Instruksione: 'AVX-512, AVX2, AES-NI, VT-x, VT-d',
      Teknologjia: '14 nm',
      Gjendja: 'I përdorur / I testuar',
    },
  },
  {
    slug: 'intel-xeon-platinum-8165',
    name: 'Intel Xeon Platinum 8165 — 24 Bërthama 2.3 GHz LGA3647 (SR3M8)',
    brand: 'Intel',
    price: 0,
    image: 'https://cdn11.bigcommerce.com/s-46jufh/images/stencil/1280x1280/products/1099421/1117626/s-l500__96326.1692832275.png',
    short_description:
      'Procesor server Intel Xeon Platinum 8165 (CPU), 24 bërthama / 48 threads, 2.30 GHz bazë deri 3.70 GHz Turbo, 33 MB cache, 205 W, socket FCLGA3647. P/N SR3M8.',
    description:
      'Intel Xeon Platinum 8165 është versioni me çmim më të favorshëm i klasës 24-bërthamëshe të gjeneratës së parë Xeon Scalable (Skylake-SP). Ka të njëjtin silicon, të njëjtat 33 MB cache L3, të njëjtin Turbo 3.70 GHz dhe të njëjtin socket si Platinum 8168 — ndryshon vetëm frekuenca bazë, 2.30 GHz në vend të 2.70 GHz. Kjo e bën një zgjedhje shumë të mirë vlere për servera virtualizimi, nyje llogaritëse dhe workstation-e ku numri i threadeve (48 gjithsej) peshon më shumë se frekuenca. Mbështet AVX-512, memorie DDR4-2666 ECC në 6 kanale deri 768 GB, 48 korsi PCIe 3.0 dhe tre lidhje UPI 10.4 GT/s për sisteme deri në 8 procesorë. Ky është një SKU OEM (i prodhuar për ofruesit e mëdhenj cloud), prandaj qarkullon kryesisht si pjesë e hequr nga qendra të dhënash — punon normalisht në çdo platformë FCLGA3647 me BIOS të përditësuar, si HPE ProLiant Gen10, Dell PowerEdge R640/R740 ose Lenovo ThinkSystem SR630/SR650. Kërkon ftohje të dimensionuar për 205 W. Procesori është i përdorur, i testuar dhe funksional.',
    attributes: {
      Brand: 'Intel',
      Model: 'Xeon Platinum 8165',
      'P/N': 'SR3M8',
      Familja: 'Xeon Scalable, gjenerata e 1-rë (Skylake-SP)',
      Bërthama: '24 bërthama / 48 threads',
      Frekuenca: '2.30 GHz bazë / 3.70 GHz Turbo',
      Cache: '33 MB L3 (Intel Smart Cache) + 24 MB L2',
      TDP: '205 W',
      Socket: 'FCLGA3647 (Socket P0)',
      Memoria: 'DDR4-2666 ECC, 6 kanale, deri 768 GB',
      PCIe: '48 korsi PCIe 3.0',
      UPI: '3 × 10.4 GT/s',
      Konfigurimi: 'Deri në 8 procesorë (8S)',
      Instruksione: 'AVX-512, AVX2, AES-NI, VT-x, VT-d',
      Teknologjia: '14 nm',
      Gjendja: 'I përdorur / I testuar',
    },
  },
  {
    slug: 'intel-xeon-e5-2698-v4',
    name: 'Intel Xeon E5-2698 v4 — 20 Bërthama 2.2 GHz LGA2011-3 (SR2JW)',
    brand: 'Intel',
    price: 0,
    image: 'https://www.techbuyer.com/media/catalog/product/S/R/SR2JW_intel_e5_2698_v4_cpu_01_a791.jpg',
    short_description:
      'Procesor server Intel Xeon E5-2698 v4 (CPU), 20 bërthama / 40 threads, 2.20 GHz bazë deri 3.60 GHz Turbo, 50 MB cache, 135 W, socket FCLGA2011-3. P/N SR2JW.',
    description:
      'Intel Xeon E5-2698 v4 është procesori 20-bërthamësh i gjeneratës Broadwell-EP, me 40 threads, 2.20 GHz bazë dhe Turbo deri në 3.60 GHz. Veçohet për 50 MB cache L3 — nga më të mëdhatë e serisë E5 v4 — dhe për një TDP prej vetëm 135 W, çka do të thotë shumë bërthama për watt dhe ftohje më e thjeshtë se te Xeon Scalable. Punon në dy procesorë për sistem (40 bërthama / 80 threads gjithsej) përmes dy lidhjeve QPI me 9.6 GT/s, mbështet memorie DDR4-2400 ECC në 4 kanale deri në 1.5 TB për procesor dhe ofron 40 korsi PCIe 3.0. Është zgjidhja klasike për të përditësuar një platformë FCLGA2011-3 ekzistuese — HPE ProLiant Gen9 (DL360/DL380), Dell PowerEdge R630/R730, Lenovo x3650 M5, Cisco UCS ose workstation-e si HP Z840 dhe Dell Precision 7910 — pa ndryshuar bordin apo memorien. Ideal për virtualizim, kompilim, render dhe ngarkesa me shumë procese paralele me kosto të ulët për bërthamë. Procesori është i përdorur, i testuar dhe funksional.',
    attributes: {
      Brand: 'Intel',
      Model: 'Xeon E5-2698 v4',
      'P/N': 'SR2JW (CM8066002024000)',
      Familja: 'Xeon E5-2600 v4 (Broadwell-EP)',
      Bërthama: '20 bërthama / 40 threads',
      Frekuenca: '2.20 GHz bazë / 3.60 GHz Turbo',
      Cache: '50 MB L3 (Intel Smart Cache) + 5 MB L2',
      TDP: '135 W',
      Socket: 'FCLGA2011-3 (Socket R3)',
      Memoria: 'DDR4-2400 ECC, 4 kanale, deri 1.5 TB',
      PCIe: '40 korsi PCIe 3.0',
      QPI: '2 × 9.6 GT/s',
      Konfigurimi: 'Deri në 2 procesorë (2S)',
      Instruksione: 'AVX2, AES-NI, VT-x, VT-d',
      Teknologjia: '14 nm',
      Gjendja: 'I përdorur / I testuar',
    },
  },
];

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*;q=0.8' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return resolve(download(new URL(res.headers.location, url).toString()));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dbPath, path.join(root, `products.db.bak-${stamp}`));
console.log(`Backup: products.db.bak-${stamp}\n`);

const db = new Database(dbPath);

// Procesor subcategory of Komponente — mirrors the migration in database.js.
const komponenteId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('komponente')?.id;
if (!komponenteId) throw new Error('category "komponente" not found');
db.prepare(
  'INSERT OR IGNORE INTO categories (name, slug, parent_id, sort_order) VALUES (?, ?, ?, ?)'
).run('Procesor', 'procesor', komponenteId, 0);
const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('procesor').id;
console.log(`Category "Procesor" = #${catId} (parent Komponente #${komponenteId})\n`);

// The three source shots frame the chip very differently — techbuyer's fill
// most of the canvas, the 8165 one sits in a wide white border — so on a shop
// card the 8165 came out looking half the size of the others. Normalise: trim
// the white surround off each, add back an even 8% margin, then letterbox onto
// one 1000x1000 white square. Every chip then reads at the same scale.
async function normalise(buf) {
  const trimmed = await sharp(buf).trim({ threshold: 12 }).toBuffer();
  const { width, height } = await sharp(trimmed).metadata();
  const margin = Math.round(Math.max(width, height) * 0.08);
  // Separate pass: sharp runs resize before extend within one pipeline, which
  // would put the margin outside the 1000x1000 box instead of inside it.
  const padded = await sharp(trimmed)
    .extend({
      top: margin, bottom: margin, left: margin, right: margin,
      background: { r: 255, g: 255, b: 255 },
    })
    .toBuffer();
  return sharp(padded)
    .resize(1000, 1000, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
    .webp({ quality: 82 })
    .toBuffer();
}

console.log('Images');
for (const p of PRODUCTS) {
  const out = path.join(uploads, `${p.slug}.webp`);
  if (fs.existsSync(out)) {
    console.log(`  ${p.slug}.webp already present — skipped`);
    continue;
  }
  fs.writeFileSync(out, await normalise(await download(p.image)));
  const meta = await sharp(out).metadata();
  console.log(
    `  ${p.slug}.webp written (${meta.width}x${meta.height}, ${(fs.statSync(out).size / 1024).toFixed(0)} KB)`
  );
}

const existing = db.prepare('SELECT id FROM products WHERE slug = ?');
const insert = db.prepare(`
  INSERT INTO products
    (name, slug, short_description, description, price, sale_price, category_id,
     images, attributes, brand, sku, in_stock, featured, created_at, updated_at)
  VALUES
    (@name, @slug, @short_description, @description, @price, NULL, @category_id,
     @images, @attributes, @brand, '', 1, 0, datetime('now'), datetime('now'))
`);
const update = db.prepare(`
  UPDATE products SET
    name = @name, short_description = @short_description, description = @description,
    price = @price, sale_price = NULL, category_id = @category_id, images = @images,
    attributes = @attributes, brand = @brand, in_stock = 1, updated_at = datetime('now')
  WHERE slug = @slug
`);

console.log('\nProducts');
db.transaction(() => {
  for (const p of PRODUCTS) {
    const row = {
      name: p.name,
      slug: p.slug,
      short_description: p.short_description,
      description: p.description,
      price: p.price,
      category_id: catId,
      images: JSON.stringify([`/uploads/${p.slug}.webp`]),
      attributes: JSON.stringify(p.attributes),
      brand: p.brand,
    };
    const found = existing.get(p.slug);
    const priceLabel = p.price > 0 ? `${p.price} L` : 'Çmim sipas kërkesës';
    if (found) {
      update.run(row);
      console.log(`  ~ #${found.id} ${p.name} — ${priceLabel} (updated)`);
    } else {
      const r = insert.run(row);
      console.log(`  + #${r.lastInsertRowid} ${p.name} — ${priceLabel}`);
    }
  }
})();

db.close();
console.log('\nDone.');
