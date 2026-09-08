// Adds the four used gaming mice from Eno's 2026-08-21 list. The list gave only
// the model/regulatory numbers stamped on the underside of each mouse, so the
// first job was identifying them:
//
//   SteelSeries M-00011   -> Rival 110              (Oct 2017, $39.99 MSRP)
//   Corsair RGP0086       -> M55 RGB PRO            (Jun 2019, $39.99 MSRP)
//   Razer RZ01-03850      -> DeathAdder Essential   (2021 rev., $29.99 MSRP)
//   Razer RZ01-0321       -> DeathAdder V2          (Jan 2020, $69.99 MSRP)
//
// Prices are used-market retail for Tirana, set from the launch MSRP discounted
// for age plus the current international second-hand street price, converted at
// roughly 1 EUR = 93 L (Aug 2026) and rounded to a shop-friendly number:
//
//   Rival 110            1 500 L   (~€16 — discontinued since ~2020, used ~$14)
//   M55 RGB PRO          2 000 L   (~€21 — still sold new ~$30, used ~$18-25)
//   DeathAdder Essential 1 500 L   (~€16 — new is only ~$18-20, so used caps low)
//   DeathAdder V2        2 800 L   (~€30 — $69.99 flagship, used ~$25-35)
//
// Photos are the official manufacturer renders (white background, matching the
// rest of the catalog):
//   Rival 110            media.steelseriescdn.com, matte-black catalogue render
//                        recovered from the archived steelseries.com product
//                        page — the model is discontinued and off the live site
//   M55 RGB PRO          assets.corsair.com gallery image for CH-9308011-NA
//   DeathAdder Essential medias-p1.phoenix.razer.com product render
//   DeathAdder V2        Razer's own render as hosted on Amazon's CDN; razer.com
//                        retired the V2 page and press.razer.com only has dark
//                        lifestyle shots, which look wrong next to the rest
//
// NOTE: the Rival 110 also shipped in white and slate grey. The render here is
// matte black — swap the URL and delete uploads/steelseries-rival-110.webp if
// the unit in the shop is another colour.
//
// sku is left empty on purpose — Eno assigns those.
// badge is left empty on purpose — conditionTag() in webroot/js/ui.js prints
// "Të Përdorur" for anything whose badge is not exactly "I RI".
//
// Idempotent: keyed by slug (insert-or-update), an existing uploads/<name>.webp
// is left alone, and the DB write re-asserts the same values. Safe to re-run —
// which is required on the server, where products.db and uploads/ are
// git-ignored and never arrive through a deploy:
//   node scripts/add-gaming-mice-2026-08-21.mjs
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
    slug: 'steelseries-rival-110',
    name: 'SteelSeries Rival 110 — Mouse Gaming Optik',
    brand: 'SteelSeries',
    price: 1500,
    image:
      'https://media.steelseriescdn.com/thumbs/catalogue/products/00896-rival-110-matte-black/719a8b73b79746bc90e49fdd096bf81c.png.1000x575_q100_crop-smart_optimize.png',
    short_description:
      'Mouse gaming SteelSeries Rival 110 (M-00011) me sensor optik TrueMove1 7.200 CPI, 6 butona, çelësa mekanikë 30 milionë klikime dhe ndriçim RGB Prism. I përdorur, i testuar.',
    description:
      'SteelSeries Rival 110 është mouse gaming i lehtë me trup ergonomik për dorë të djathtë dhe peshë vetëm 87.5 g, i ndërtuar rreth sensorit optik TrueMove1 me gjurmim 1-me-1 të vërtetë deri në 7.200 CPI. Gjurmimi 1-me-1 do të thotë që lëvizja e dorës përkthehet pa përshpejtim dhe pa zbutje në lëvizje të kursorit — pikërisht ajo që kërkohet në lojërat FPS. Butonat kryesorë përdorin çelësa mekanikë SteelSeries të vlerësuar për 30 milionë klikime, ndërsa anët me shtresë silikoni mbajnë kapjen edhe pas orësh lojë. Logoja ndriçohet me RGB Prism dhe konfigurohet nga SteelSeries Engine, ku ruhen edhe profilet e CPI-së dhe të butonave direkt në kujtesën e mouse-it. Lidhja bëhet me kabllo USB 2 m me frekuencë raportimi 1.000 Hz. Modeli u nxor në treg në tetor 2017 me çmim zyrtar 39.99 USD dhe sot nuk prodhohet më.',
    attributes: {
      Brand: 'SteelSeries',
      Model: 'Rival 110 (M-00011)',
      Tipi: 'Mouse gaming me kabllo',
      Sensori: 'TrueMove1 optik',
      DPI: 'Deri në 7.200 CPI',
      Shpejtësia: '240 IPS, 30 G përshpejtim',
      Butona: '6 të programueshëm',
      Çelësat: 'Mekanikë SteelSeries, 30 milionë klikime',
      Ndriçimi: 'RGB Prism (1 zonë)',
      Lidhja: 'USB, kabllo 2 m',
      'Polling Rate': '1.000 Hz',
      Pesha: '87.5 g',
      Ergonomia: 'Për dorë të djathtë, anë me shtresë silikoni',
      Gjendja: 'Pre-Owned / Testuar',
    },
  },
  {
    slug: 'corsair-m55-rgb-pro',
    name: 'Corsair M55 RGB PRO — Mouse Gaming Ambidekstër',
    brand: 'Corsair',
    price: 2000,
    image:
      'https://assets.corsair.com/image/upload/c_pad,q_85,h_1100,w_1100,f_auto/products/Gaming-Mice/CH-9308011-NA/Gallery/M55_RGB_PRO_BLACK_01.webp',
    short_description:
      'Mouse gaming Corsair M55 RGB PRO (RGP0086) me formë ambidekstre, sensor optik 12.400 DPI, 8 butona të programueshëm dhe çelësa Omron 50 milionë klikime. I përdorur, i testuar.',
    description:
      'Corsair M55 RGB PRO është mouse gaming me formë krejtësisht simetrike — punon njësoj në dorën e djathtë dhe në atë të majtë, dhe ka butona anësorë në të dyja anët që mund të çaktivizohen nga softueri nëse pengojnë. Sensori optik shkon deri në 12.400 DPI dhe rregullohet në hapa nga 1 DPI, ndërsa çelësat Omron nën butonat kryesorë janë të vlerësuar për 50 milionë klikime. Në total ka 8 butona të programueshëm, të gjithë të konfigurueshëm nga Corsair iCUE, ku ruhen edhe profilet dhe ndriçimi RGB me dy zona. Trupi peshon 86 g dhe kabllua e thurur 1.8 m e mban peshën larg dorës. Modeli u prezantua në qershor 2019 me çmim zyrtar 39.99 USD.',
    attributes: {
      Brand: 'Corsair',
      Model: 'M55 RGB PRO (RGP0086 / CH-9308011)',
      Tipi: 'Mouse gaming me kabllo',
      Sensori: 'Optik PixArt',
      DPI: 'Deri në 12.400 DPI (hapa nga 1 DPI)',
      Butona: '8 të programueshëm, ambidekstër',
      Çelësat: 'Omron, 50 milionë klikime',
      Ndriçimi: 'RGB me 2 zona (iCUE)',
      Lidhja: 'USB, kabllo e thurur 1.8 m',
      'Polling Rate': '1.000 Hz',
      Pesha: '86 g',
      Ergonomia: 'Ambidekstre — dorë e djathtë dhe e majtë',
      Softueri: 'Corsair iCUE',
      Gjendja: 'Pre-Owned / Testuar',
    },
  },
  {
    slug: 'razer-deathadder-essential',
    name: 'Razer DeathAdder Essential — Mouse Gaming Optik',
    brand: 'Razer',
    price: 1500,
    image:
      'https://medias-p1.phoenix.razer.com/sys-master-phoenix-images-container/h95/h52/9198280966174/Deathadder-Essential-500x500.png',
    short_description:
      'Mouse gaming Razer DeathAdder Essential (RZ01-03850) me sensor optik 6.400 DPI, 5 butona të programueshëm, çelësa mekanikë dhe anë gome. I përdorur, i testuar.',
    description:
      'Razer DeathAdder Essential mban formën ergonomike klasike të serisë DeathAdder — një nga trupat më të kopjuar në historinë e mouse-ve gaming — në versionin bazë dhe më të lehtë për portofolin. Sensori optik arrin 6.400 DPI, mjaftueshëm për çdo lojë në rezolucion Full HD, dhe rregullohet me hapa nga softueri Razer Synapse. Ka 5 butona të programueshëm me çelësa mekanikë të vlerësuar për 10 milionë klikime, anë me shtresë gome që nuk rrëshqet, dhe ndriçim jeshil me një ngjyrë (jo Chroma) te logoja dhe rrota. Lidhja është me kabllo USB dhe frekuencë raportimi 1.000 Hz. Ky variant, me kodin e modelit RZ01-03850, është rishikimi i vitit 2021 me çmim zyrtar 29.99 USD.',
    attributes: {
      Brand: 'Razer',
      Model: 'DeathAdder Essential (RZ01-03850)',
      Tipi: 'Mouse gaming me kabllo',
      Sensori: 'Optik',
      DPI: 'Deri në 6.400 DPI',
      Butona: '5 të programueshëm',
      Çelësat: 'Mekanikë Razer, 10 milionë klikime',
      Ndriçimi: 'Jeshil me një ngjyrë (jo Chroma)',
      Lidhja: 'USB',
      'Polling Rate': '1.000 Hz',
      Pesha: '~96 g',
      Ergonomia: 'Për dorë të djathtë, anë gome',
      Softueri: 'Razer Synapse',
      Gjendja: 'Pre-Owned / Testuar',
    },
  },
  {
    slug: 'razer-deathadder-v2',
    name: 'Razer DeathAdder V2 — Mouse Gaming 20K DPI',
    brand: 'Razer',
    price: 2800,
    image: 'https://m.media-amazon.com/images/I/41iLtLRTsZL._AC_SL1000_.jpg',
    short_description:
      'Mouse gaming Razer DeathAdder V2 (RZ01-0321) me sensor Focus+ 20.000 DPI, çelësa optikë 70 milionë klikime, 8 butona, Chroma RGB dhe kabllo Speedflex. I përdorur, i testuar.',
    description:
      'Razer DeathAdder V2 është versioni i plotë i serisë DeathAdder dhe kur doli, në janar 2020, ishte mouse-i kryesor i Razer-it me çmim zyrtar 69.99 USD. Në brendësi ka sensorin optik Focus+ me rezolucion 20.000 DPI, shpejtësi 650 IPS dhe përshpejtim 50 G, me kalibrim automatik sipas sipërfaqes së tapetit për të shmangur zhvendosjen e kursorit. Butonat kryesorë përdorin çelësa optikë Razer, ku aktivizimi bëhet me rreze drite në vend të kontaktit metalik — pa dridhje kontakti dhe të vlerësuar për 70 milionë klikime. Ka 8 butona të programueshëm, kujtesë të brendshme për 5 profile, këmbë 100% PTFE dhe ndriçim Chroma RGB me 16.8 milionë ngjyra. Trupi peshon vetëm 82 g dhe kablloja Speedflex e thurur është aq e butë sa ndihet gati sikur mouse-i të ishte pa tel. Modeli është zëvendësuar nga seria V3 dhe nuk prodhohet më.',
    attributes: {
      Brand: 'Razer',
      Model: 'DeathAdder V2 (RZ01-0321)',
      Tipi: 'Mouse gaming me kabllo',
      Sensori: 'Razer Focus+ optik',
      DPI: 'Deri në 20.000 DPI',
      Shpejtësia: '650 IPS, 50 G përshpejtim',
      Butona: '8 të programueshëm',
      Çelësat: 'Optikë Razer, 70 milionë klikime',
      Ndriçimi: 'Razer Chroma RGB (16.8 milionë ngjyra)',
      Lidhja: 'USB, kabllo Speedflex 2.1 m',
      'Polling Rate': '1.000 Hz',
      Pesha: '82 g',
      Ergonomia: 'Për dorë të djathtë, anë gome',
      Features: 'Kujtesë e brendshme për 5 profile, këmbë 100% PTFE',
      Softueri: 'Razer Synapse 3',
      Gjendja: 'Pre-Owned / Testuar',
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

const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get('aksesore')?.id;
if (!catId) throw new Error('category "aksesore" not found');

console.log('Images');
for (const p of PRODUCTS) {
  const out = path.join(uploads, `${p.slug}.webp`);
  if (fs.existsSync(out)) {
    console.log(`  ${p.slug}.webp already present — skipped`);
    continue;
  }
  const buf = await download(p.image);
  // flatten onto white: the SteelSeries and Razer renders are transparent PNGs
  await sharp(buf)
    .flatten({ background: '#ffffff' })
    .resize({ width: 1000, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(out);
  console.log(`  ${p.slug}.webp written (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
}

const existing = db.prepare('SELECT id FROM products WHERE slug = ?');
const insert = db.prepare(`
  INSERT INTO products
    (name, slug, short_description, description, price, sale_price, category_id,
     images, attributes, brand, sku, badge, in_stock, featured, created_at, updated_at)
  VALUES
    (@name, @slug, @short_description, @description, @price, NULL, @category_id,
     @images, @attributes, @brand, '', '', 1, 0, datetime('now'), datetime('now'))
`);
const update = db.prepare(`
  UPDATE products SET
    name = @name, short_description = @short_description, description = @description,
    price = @price, sale_price = NULL, category_id = @category_id, images = @images,
    attributes = @attributes, brand = @brand, badge = '', in_stock = 1,
    updated_at = datetime('now')
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
    if (found) {
      update.run(row);
      console.log(`  ~ #${found.id} ${p.name} — ${p.price} L (updated)`);
    } else {
      const r = insert.run(row);
      console.log(`  + #${r.lastInsertRowid} ${p.name} — ${p.price} L`);
    }
  }
})();

db.close();
console.log('\nDone.');
