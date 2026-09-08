// Adds the four workstations from Eno's 2026-08-24 list, into the existing
// top-level "Workstation" category:
//
//   Dell Pro Max Tower T2  Ultra 7 265K / 32GB DDR5 / 512GB NVMe / RTX 4000 Ada  çmim sipas kërkesës
//   HP Z2 G9               i7-12700K    / 32GB DDR5 / 1TB NVMe   / RTX A2000 12GB      180 000 L
//   HP Z1 G8               i7-11700     / 32GB DDR4 / 1TB NVMe   / RTX 3070 LHR        100 000 L
//   HP Z1 G9               i7-13700     / 16GB DDR4 / 1TB NVMe   / RTX 4070 Ti         160 000 L
//
// The Dell goes in at price 0 — no price was given with the list — which the
// frontend renders as "Çmim sipas kërkesës" (webroot/js/ui.js). Re-run a small
// set-* script once the price is decided. Its `Gjendja` is left out for the
// same reason: the T2 is a current-generation machine and the list does not say
// whether it is sold new or refurbished, while the three HP Z rows are the
// shop's usual refurbished stock.
//
// Two things from the list worth a human look — entered as given, not "fixed":
//   * HP Z1 G9 / "16 GB DDR4". The Z1 G9 is an LGA1700 Alder/Raptor Lake
//     machine and every HP configuration of it ships DDR5-4800 (Icecat lists no
//     DDR4 Z1 G9 SKU at all). Very likely the list means 16GB DDR5. The Z1 G8
//     (11th gen, DDR4) and the Z2 G9 (12th gen, DDR5) in the same list are both
//     internally consistent.
//   * The RTX 4070 Ti in that same Z1 G9 is a consumer GeForce card rather than
//     one of HP's own Z1 G9 graphics options, so it was presumably fitted after
//     the fact — worth saying out loud if a customer asks about ISV
//     certification or the HP warranty.
//
// Photos — official manufacturer front renders on white, from the open Icecat
// catalog (the same route used for the Dell P2319H/P2317H monitors):
//   Dell Pro Max T2  210-BPSQ  fb152bb71085bbe2d51dd5a619292f89e5b6136a  (5000x5000)
//   HP Z2 G9         5F0G7EA   99135072_1940997652                       (1360x2470)
//   HP Z1 G8         2N2F6EA   91720851_9825206090                       (1189x2532)
//   HP Z1 G9         5F161EA   b148a9351093e48bc91c8c6a8466cab48d64da10  (3300x2805)
// Each is the chassis of that exact generation, and where Icecat had a SKU
// matching our configuration it was preferred (the Z1 G8 shot is the i7-11700 +
// RTX 3070 SKU, the Z2 G9 shot the RTX A2000 SKU). They arrive framed very
// differently — two tall portraits, one square, one wide landscape — so each is
// trimmed and letterboxed onto one 1000x1000 white square; otherwise the towers
// read at wildly different sizes in the shop grid.
//
// sku is left empty on purpose — Eno assigns those.
//
// Idempotent: keyed by slug (insert-or-update), an existing uploads/<name>.webp
// is left alone, and the DB write re-asserts the same values. Safe to re-run —
// which is required on the server, where products.db and uploads/ are
// git-ignored and never arrive through a deploy:
//   node scripts/add-workstations-2026-08-24.mjs
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
    slug: 'dell-pro-max-tower-t2-ultra-7-265k',
    name: 'Dell Pro Max Tower T2 — Ultra 7 265K / 32GB DDR5 / 512GB NVMe / RTX 4000 Ada 20GB',
    brand: 'Dell',
    price: 0,
    image: 'https://images.icecat.biz/img/gallery/fb152bb71085bbe2d51dd5a619292f89e5b6136a.jpg',
    short_description:
      'Workstation Dell Pro Max Tower T2 me Intel Core Ultra 7 265K (20 bërthama, deri 5.5 GHz), 32GB DDR5, 512GB NVMe dhe NVIDIA RTX 4000 Ada 20GB — për CAD, render 3D, montazh video dhe ngarkesa AI.',
    description:
      'Dell Pro Max Tower T2 është gjenerata e re e workstation-eve të Dell, pasardhësi i drejtpërdrejtë i serisë Precision 3000 Tower, i ndërtuar mbi platformën Intel Arrow Lake. Procesori Intel Core Ultra 7 265K ka 20 bërthama — 8 performance dhe 12 efficiency — me frekuencë deri në 5.5 GHz dhe 30 MB cache, plus një NPU të integruar që përshpejton ngarkesat AI drejtpërdrejt në makinë. Konfigurimi vjen me 32GB memorie DDR5 (bordi mban deri në 128GB në katër foleza) dhe 512GB SSD NVMe, ndërsa karta grafike NVIDIA RTX 4000 Ada Generation me 20GB GDDR6 ECC dhe 6144 bërthama CUDA mbulon render me ray tracing, skena të mëdha 3D, simulime dhe deri në katër ekrane 4K nga katër dalje DisplayPort. Shasia tower jep hapësirë për disqe e karta shtesë dhe hapet për mirëmbajtje pa vegla. Zgjidhje për studio arkitekture e inxhinierie, montazh video, punë me modele AI lokale dhe çdo aplikacion profesional të certifikuar ISV.',
    attributes: {
      Brand: 'Dell',
      Model: 'Pro Max Tower T2 (FCT2250)',
      CPU: 'Intel Core Ultra 7 265K (20 bërthama / 20 threads, 3.9 GHz bazë deri 5.5 GHz)',
      RAM: '32GB DDR5',
      SSD: '512GB NVMe',
      GPU: 'NVIDIA RTX 4000 Ada Generation 20GB GDDR6 ECC',
      Cache: '30 MB',
      Socket: 'LGA1851',
      'Form Factor': 'Tower',
    },
  },
  {
    slug: 'hp-z2-g9-i7-12700k',
    name: 'HP Z2 G9 — i7-12700K / 32GB DDR5 / 1TB NVMe / RTX A2000 12GB',
    brand: 'HP',
    price: 180000,
    image: 'https://images.icecat.biz/img/gallery/99135072_1940997652.jpg',
    short_description:
      'Workstation HP Z2 Tower G9 me Intel Core i7-12700K (12 bërthama, deri 5.0 GHz), 32GB DDR5, 1TB NVMe dhe NVIDIA RTX A2000 12GB — i certifikuar për aplikacione profesionale CAD dhe 3D.',
    description:
      'HP Z2 Tower G9 është workstation-i i klasit të mesëm i serisë Z, i certifikuar nga HP për aplikacionet kryesore profesionale si SolidWorks, AutoCAD, Revit dhe paketa Adobe. Procesori Intel Core i7-12700K ka 12 bërthama — 8 performance dhe 4 efficiency — me 20 threads dhe Turbo deri në 5.0 GHz, i shoqëruar nga 32GB memorie DDR5 dhe një SSD NVMe prej 1TB, çka do të thotë hapje projektesh dhe kompilim shumë të shpejtë. Karta NVIDIA RTX A2000 me 12GB GDDR6 ECC është kartë profesionale kompakte me konsum vetëm 70 W: jep bërthama RT dhe Tensor për ray tracing e përshpejtim AI, drejtues të certifikuar për aplikacione profesionale, dhe katër dalje mini-DisplayPort për deri në katër ekrane 4K. Shasia Z2 G9 punon në nivele zhurme shumë të ulëta për fuqinë që ka dhe hapet pa vegla për shtim disqesh apo memorieje. Makina është e rinovuar dhe e testuar.',
    attributes: {
      Brand: 'HP',
      Model: 'Z2 Tower G9',
      CPU: 'Intel Core i7-12700K (12 bërthama / 20 threads, deri 5.0 GHz)',
      RAM: '32GB DDR5',
      SSD: '1TB NVMe',
      GPU: 'NVIDIA RTX A2000 12GB GDDR6 ECC',
      Cache: '25 MB',
      Socket: 'LGA1700',
      'Form Factor': 'Tower',
      Gjendja: 'I rinovuar / I testuar',
    },
  },
  {
    slug: 'hp-z1-g8-i7-11700-rtx-3070',
    name: 'HP Z1 G8 — i7-11700 / 32GB DDR4 / 1TB NVMe / RTX 3070 LHR 8GB',
    brand: 'HP',
    price: 100000,
    image: 'https://images.icecat.biz/img/gallery/91720851_9825206090.jpg',
    short_description:
      'Workstation HP Z1 Tower G8 me Intel Core i7-11700 (8 bërthama, deri 4.9 GHz), 32GB DDR4, 1TB NVMe dhe NVIDIA GeForce RTX 3070 LHR 8GB — punë profesionale dhe lojëra në të njëjtën makinë.',
    description:
      'HP Z1 Tower G8 është hyrja në serinë Z të HP: një workstation i certifikuar profesionalisht në shasi tower standarde, me çmim shumë më të afrueshëm se Z2 apo Z4. Procesori Intel Core i7-11700 (Rocket Lake) ka 8 bërthama dhe 16 threads me Turbo deri në 4.9 GHz, me 32GB memorie DDR4-3200 dhe një SSD NVMe prej 1TB. Karta NVIDIA GeForce RTX 3070 me 8GB GDDR6 dhe 5888 bërthama CUDA e bën këtë konfigurim po aq të përdorshëm për render 3D, montazh video 4K dhe punë me GPU në Blender, DaVinci Resolve apo Premiere, sa edhe për lojëra në 1440p me cilësi maksimale. Kjo është varianta LHR (Lite Hash Rate), pra me kufizim fabrike vetëm për minim kriptomonedhash — performanca në lojëra, render dhe aplikacione profesionale nuk preket aspak. Makina është e rinovuar dhe e testuar.',
    attributes: {
      Brand: 'HP',
      Model: 'Z1 Tower G8',
      CPU: 'Intel Core i7-11700 (8 bërthama / 16 threads, deri 4.9 GHz)',
      RAM: '32GB DDR4',
      SSD: '1TB NVMe',
      GPU: 'NVIDIA GeForce RTX 3070 LHR 8GB GDDR6',
      Cache: '16 MB',
      Socket: 'LGA1200',
      'Form Factor': 'Tower',
      Gjendja: 'I rinovuar / I testuar',
    },
  },
  {
    slug: 'hp-z1-g9-i7-13700-rtx-4070-ti',
    name: 'HP Z1 G9 — i7-13700 / 16GB DDR4 / 1TB NVMe / RTX 4070 Ti 12GB',
    brand: 'HP',
    price: 160000,
    image: 'https://images.icecat.biz/img/gallery/b148a9351093e48bc91c8c6a8466cab48d64da10.jpg',
    short_description:
      'Workstation HP Z1 Tower G9 me Intel Core i7-13700 (16 bërthama, deri 5.2 GHz), 16GB RAM, 1TB NVMe dhe NVIDIA GeForce RTX 4070 Ti 12GB — fuqi për render, montazh video dhe lojëra 4K.',
    description:
      'HP Z1 Tower G9 është gjenerata e re e workstation-it hyrës të serisë Z, me platformë Intel të gjeneratës së 13-të. Procesori Intel Core i7-13700 ka 16 bërthama — 8 performance dhe 8 efficiency — me 24 threads, Turbo deri në 5.2 GHz dhe 30 MB cache, çka e bën shumë të shpejtë në kompilim, simulime dhe eksportim video. Konfigurimi ka 16GB memorie dhe një SSD NVMe prej 1TB, me foleza të lira për zgjerim të mëtejshëm. Karta NVIDIA GeForce RTX 4070 Ti me 12GB GDDR6X dhe 7680 bërthama CUDA sjell arkitekturën Ada Lovelace me bërthama RT të gjeneratës së tretë dhe DLSS 3 — render me ray tracing, punë me AI dhe lojëra 4K pa kompromis. Shasia Z1 G9 mban ftohje të qetë dhe hapet pa vegla për mirëmbajtje. Makina është e rinovuar dhe e testuar.',
    attributes: {
      Brand: 'HP',
      Model: 'Z1 Tower G9',
      CPU: 'Intel Core i7-13700 (16 bërthama / 24 threads, deri 5.2 GHz)',
      RAM: '16GB DDR4',
      SSD: '1TB NVMe',
      GPU: 'NVIDIA GeForce RTX 4070 Ti 12GB GDDR6X',
      Cache: '30 MB',
      Socket: 'LGA1700',
      'Form Factor': 'Tower',
      Gjendja: 'I rinovuar / I testuar',
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

const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('workstation')?.id;
if (!catId) throw new Error('category "workstation" not found');
console.log(`Category "Workstation" = #${catId}\n`);

// Same normalisation as add-processors-2026-08-21.mjs: trim the white surround,
// add back an even 8% margin, then letterbox onto one 1000x1000 white square,
// so every tower reads at the same scale on a shop card.
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
