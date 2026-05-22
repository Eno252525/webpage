// Adds 5 Thunderbolt docking stations to the "Docking Station" subcategory.
// Idempotent: re-running skips products whose slug already exists.
// Source images live in the project root; they are converted to WebP into uploads/.
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';
import db, { createProduct, getProductBySlug } from '../database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uploadsDir = path.join(root, 'uploads');

async function toWebp(srcFile, destSlug) {
  const srcAbs = path.join(root, srcFile);
  if (!fs.existsSync(srcAbs)) throw new Error(`Missing source image: ${srcFile}`);
  const destAbs = path.join(uploadsDir, `${destSlug}.webp`);
  await sharp(srcAbs)
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(destAbs);
  return `/uploads/${destSlug}.webp`;
}

// Ensure the Docking Station subcategory exists (database.js also creates it on import).
const komponente = db.prepare("SELECT id FROM categories WHERE slug = 'komponente'").get();
if (!komponente) throw new Error('komponente category missing');
db.prepare('INSERT OR IGNORE INTO categories (name, slug, parent_id, sort_order) VALUES (?, ?, ?, ?)')
  .run('Docking Station', 'docking-station', komponente.id, 0);
const cat = db.prepare("SELECT id FROM categories WHERE slug = 'docking-station'").get();

// Each product: first image is the main photo, the rest become gallery slides.
const products = [
  {
    name: 'HP Elite Thunderbolt 3 Dock',
    slug: 'hp-elite-thunderbolt-3-dock',
    brand: 'HP',
    short_description: 'Stacion lidhjeje Thunderbolt 3 për laptopë HP EliteBook dhe ZBook — një kabllo për ekrane, rrjet, USB dhe karikim.',
    description: 'HP Elite Thunderbolt 3 Dock e shndërron laptopin tuaj në një stacion të plotë pune me një lidhje të vetme Thunderbolt 3. Mbështet deri në dy ekrane 4K, ofron rrjet me kabëll, porta USB dhe karikon laptopin njëkohësisht. Ideale për laptopët HP EliteBook dhe ZBook të biznesit.',
    images: [{ src: '51vO8+aELPL.jpg' }],
    attributes: {
      'Lloji': 'Stacion lidhjeje (Docking Station)',
      'Lidhja me laptopin': 'Thunderbolt 3 (kabllo USB-C e integruar)',
      'Dalje video': 'Deri në 2 ekrane 4K @ 60Hz',
      'Karikimi i laptopit': 'Deri në 65W përmes Thunderbolt 3',
      'Rrjeti': 'Gigabit Ethernet (RJ-45)',
      'Audio': 'Jack combo 3.5mm',
      'Portat': '2x Thunderbolt 3 (USB-C), 1x USB-C, 3x USB-A 3.0 (1 me karikim), 1x DisplayPort 1.2, 1x VGA, 1x RJ-45 Gigabit Ethernet, 1x Audio combo 3.5mm, 1x Kyç sigurie',
      'Ushqimi': 'Adaptor 150W',
      'Gjendja': 'I rinovuar',
    },
  },
  {
    name: 'Dell WD19TB Thunderbolt 3 Dock — 180W',
    slug: 'dell-wd19tb-thunderbolt-dock',
    brand: 'Dell',
    short_description: 'Stacion lidhjeje Thunderbolt 3 Dell WD19TB me karikim të fuqishëm deri në 130W për laptop.',
    description: 'Dell WD19TB është një stacion lidhjeje Thunderbolt 3 që lidh laptopin me ekrane, rrjet dhe pajisje USB përmes një kablloje të vetme. Adaptori 180W siguron karikim deri në 130W për laptopin, mjaftueshëm edhe për laptopët me performancë të lartë. Mbështet deri në dy ekrane 4K @ 60Hz.',
    images: [{ src: 'wd19tb-1.png' }],
    attributes: {
      'Lloji': 'Stacion lidhjeje (Docking Station)',
      'Lidhja me laptopin': 'Thunderbolt 3 (kabllo USB-C e integruar)',
      'Dalje video': 'Deri në 2 ekrane 4K @ 60Hz ose 1 ekran 5K',
      'Karikimi i laptopit': 'Deri në 130W',
      'Rrjeti': 'Gigabit Ethernet (RJ-45)',
      'Audio': 'Jack combo 3.5mm',
      'Portat': '1x Thunderbolt 3 (USB-C), 1x USB-C 3.1 Gen 2, 1x USB-C 3.1 Gen 2 (përpara), 2x USB-A 3.1 Gen 1, 1x USB-A 3.1 Gen 1 (përpara, PowerShare), 2x DisplayPort 1.4, 1x HDMI 2.0b, 1x RJ-45 Gigabit Ethernet, 1x Audio combo 3.5mm',
      'Ushqimi': 'Adaptor 180W',
      'Gjendja': 'I rinovuar',
    },
  },
  {
    name: 'HP Thunderbolt Dock G2 — 120W',
    slug: 'hp-thunderbolt-dock-g2-120w',
    brand: 'HP',
    short_description: 'Stacion lidhjeje Thunderbolt 3 HP G2 me ushqim 120W — dizajn kompakt për tavolinë.',
    description: 'HP Thunderbolt Dock G2 (120W) lidh laptopin me ekrane, rrjet dhe pajisje USB përmes një kablloje të vetme Thunderbolt 3. Dizajni kompakt në formë kubi kursen hapësirë në tavolinë. Adaptori 120W karikon laptopin njëkohësisht me deri në 100W.',
    images: [{ src: '31RBxFtZtmL.jpg' }, { src: 'hp-usb-c-thunderbolt-dock-120w-g2-hsn-ix01-refurbished-excellent-condition-regen-computers-69299.webp' }],
    attributes: {
      'Lloji': 'Stacion lidhjeje (Docking Station)',
      'Lidhja me laptopin': 'Thunderbolt 3 (kabllo USB-C e integruar)',
      'Dalje video': 'Deri në 2 ekrane 4K @ 60Hz',
      'Karikimi i laptopit': 'Deri në 100W përmes Thunderbolt 3',
      'Rrjeti': 'Gigabit Ethernet (RJ-45)',
      'Audio': 'Jack combo 3.5mm',
      'Portat': '2x Thunderbolt 3 (USB-C), 1x USB-C, 3x USB-A SuperSpeed 5Gbps (1 me karikim), 2x DisplayPort 1.4, 1x VGA, 1x RJ-45 Gigabit Ethernet, 1x Audio combo 3.5mm',
      'Ushqimi': 'Adaptor 120W',
      'Gjendja': 'I rinovuar',
    },
  },
  {
    name: 'HP Thunderbolt Dock G2 — 230W',
    slug: 'hp-thunderbolt-dock-g2-230w',
    brand: 'HP',
    short_description: 'Stacion lidhjeje Thunderbolt 3 HP G2 me ushqim 230W për laptopë dhe workstation me fuqi të lartë.',
    description: 'HP Thunderbolt Dock G2 (230W) ofron të njëjtin dizajn kompakt si versioni 120W, por me një adaptor 230W më të fuqishëm. Kjo e bën të përshtatshëm për laptopët HP ZBook dhe workstation-ët celularë që kërkojnë më shumë energji. Një lidhje e vetme Thunderbolt 3 mbulon ekrane, rrjet dhe USB.',
    images: [{ src: 'A12UK38AA_2_Supersize.jpg' }, { src: 'hp-usb-c-thunderbolt-dock-120w-g2-hsn-ix01-refurbished-excellent-condition-regen-computers-69299.webp' }],
    attributes: {
      'Lloji': 'Stacion lidhjeje (Docking Station)',
      'Lidhja me laptopin': 'Thunderbolt 3 (kabllo USB-C e integruar)',
      'Dalje video': 'Deri në 2 ekrane 4K @ 60Hz',
      'Karikimi i laptopit': 'Deri në 100W përmes Thunderbolt 3 (më shumë me HP Combo Cable për ZBook)',
      'Rrjeti': 'Gigabit Ethernet (RJ-45)',
      'Audio': 'Jack combo 3.5mm',
      'Portat': '2x Thunderbolt 3 (USB-C), 1x USB-C, 3x USB-A SuperSpeed 5Gbps (1 me karikim), 2x DisplayPort 1.4, 1x VGA, 1x RJ-45 Gigabit Ethernet, 1x Audio combo 3.5mm',
      'Ushqimi': 'Adaptor 230W',
      'Gjendja': 'I rinovuar',
    },
  },
  {
    name: 'HP Thunderbolt Dock G4 — 280W',
    slug: 'hp-thunderbolt-dock-g4-280w',
    brand: 'HP',
    short_description: 'Stacion lidhjeje Thunderbolt 4 HP G4 me ushqim 280W — gjenerata e fundit për workstation.',
    description: 'HP Thunderbolt Dock G4 është gjenerata më e re e stacioneve të lidhjes nga HP, e bazuar në Thunderbolt 4 dhe USB4. Versioni 280W siguron energji të bollshme për laptopët HP ZBook dhe workstation-ët celularë me performancë të lartë. Një kabllo e vetme mbulon ekrane, rrjet dhe pajisje USB.',
    images: [{ src: '1215.avif' }, { src: '102248235827230.jpg' }],
    attributes: {
      'Lloji': 'Stacion lidhjeje (Docking Station)',
      'Lidhja me laptopin': 'Thunderbolt 4 / USB4 (kabllo USB-C e integruar)',
      'Dalje video': 'Deri në 2 ekrane 4K @ 60Hz ose 1 ekran 8K',
      'Karikimi i laptopit': 'Deri në 100W përmes Thunderbolt 4 (adaptor 280W për workstation)',
      'Rrjeti': 'Gigabit Ethernet (RJ-45)',
      'Audio': 'Jack combo 3.5mm',
      'Portat': '2x Thunderbolt 4 (USB-C), 1x USB-C 3.2 Gen 2, 1x USB-C (përpara), 3x USB-A SuperSpeed 5Gbps (1 me karikim), 2x DisplayPort 1.4, 1x VGA, 1x RJ-45 Gigabit Ethernet, 1x Audio combo 3.5mm, 1x Kyç sigurie',
      'Ushqimi': 'Adaptor 280W',
      'Gjendja': 'I rinovuar',
    },
  },
];

for (const p of products) {
  if (getProductBySlug(p.slug)) {
    console.log(`Skipped (exists): ${p.slug}`);
    continue;
  }
  const images = [];
  for (let i = 0; i < p.images.length; i++) {
    const destSlug = i === 0 ? p.slug : `${p.slug}-${i + 1}`;
    images.push(await toWebp(p.images[i].src, destSlug));
  }
  const product = createProduct({
    name: p.name,
    slug: p.slug,
    short_description: p.short_description,
    description: p.description,
    price: 0, // no fixed price — customers inquire via WhatsApp
    category_id: cat.id,
    brand: p.brand,
    images,
    attributes: p.attributes,
    in_stock: true,
  });
  console.log(`Added #${product.id}: ${product.name} -> ${images.join(', ')}`);
}

console.log('Done.');
