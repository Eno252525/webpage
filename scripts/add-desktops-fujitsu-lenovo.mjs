// Adds three refurbished desktop PCs (Fujitsu Esprimo E920, Fujitsu Esprimo P910,
// Lenovo ThinkCentre M73) into the "PC" subcategory of Desktop. Idempotent:
// skips any slug that already exists. Source images live in the project root
// and are converted to WebP into uploads/.
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';
import { createProduct, getProductBySlug, getCategories } from '../database.js';

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

const cat = getCategories().find((c) => c.slug === 'pc');
if (!cat) throw new Error('pc category missing');

const products = [
  {
    name: 'Fujitsu Esprimo E920 — i5-4570 / 16GB DDR3 / 128GB SSD',
    slug: 'fujitsu-esprimo-e920-i5-4570',
    brand: 'Fujitsu',
    price: 7000,
    short_description: 'Fujitsu Esprimo E920 SFF me Intel Core i5-4570, 16GB RAM DDR3 dhe 128GB SSD.',
    description:
      'Fujitsu Esprimo E920 është një desktop biznesi në format SFF (Small Form Factor), ideal për zyrë dhe punë të përditshme. Vjen me procesor Intel Core i5-4570 (4 bërthama, deri në 3.6 GHz Turbo), 16GB memorie DDR3 për multitasking pa probleme dhe një SSD 128GB për ndezje dhe hapje të shpejtë të programeve. Trupi kompakt SFF kursen hapësirë në tavolinë dhe është i përshtatshëm për mjedise pune ku stabiliteti dhe efiçenca kanë rëndësi.',
    images: [{ src: 'fujitsu-esprimo-e920-0-watt-sff-ohne-cardreader-2.jpg' }],
    attributes: {
      CPU: 'i5-4570',
      RAM: '16GB DDR3',
      SSD: '128GB',
      'Form Factor': 'SFF',
      Gjendja: 'I përdorur',
    },
  },
  {
    name: 'Fujitsu Esprimo P910 — i5-3220 / 8GB DDR3 / 128GB SSD',
    slug: 'fujitsu-esprimo-p910-i5-3220',
    brand: 'Fujitsu',
    price: 5000,
    short_description: 'Fujitsu Esprimo P910 MT me Intel Core i5-3220, 8GB RAM DDR3 dhe 128GB SSD.',
    description:
      'Fujitsu Esprimo P910 është një desktop biznesi në format Mini Tower (MT), që ofron hapësirë të mjaftueshme për zgjerime. I pajisur me procesor Intel Core i5-3220, 8GB memorie DDR3 dhe SSD 128GB për një eksperiencë të shpejtë e të qëndrueshme në punë e studim. Format-i MT mundëson shtim të lehtë të disqeve dhe komponentëve, duke e bërë këtë model të përshtatshëm si për zyrë ashtu edhe për shtëpi.',
    images: [{ src: '61+kwgIehkS._AC_UF1000,1000_QL80_.jpg' }],
    attributes: {
      CPU: 'i5-3220',
      RAM: '8GB DDR3',
      SSD: '128GB',
      'Form Factor': 'MT',
      Gjendja: 'I përdorur',
    },
  },
  {
    name: 'Lenovo ThinkCentre M73 SFF — G3220 / 8GB DDR3 / 128GB SSD',
    slug: 'lenovo-thinkcentre-m73-sff-g3220',
    brand: 'Lenovo',
    price: 4500,
    short_description: 'Lenovo ThinkCentre M73 SFF me Intel Pentium G3220, 8GB RAM DDR3 dhe 128GB SSD.',
    description:
      'Lenovo ThinkCentre M73 në format SFF është një desktop biznesi i besueshëm për përdorim të përditshëm: navigim, dokumente, email dhe aplikacione zyre. Vjen me procesor Intel Pentium G3220 (2 bërthama, 3.0 GHz), 8GB memorie DDR3 dhe SSD 128GB për nisje të shpejtë e përgjigje të menjëhershme. Formati kompakt SFF e bën të lehtë për ta vendosur edhe në tavolina të vogla apo në mjedise me hapësirë të kufizuar.',
    images: [{ src: 'y99u03q2dh4msbwxmb87ga3qyq5w3w948101.avif' }],
    attributes: {
      CPU: 'G3220',
      RAM: '8GB DDR3',
      SSD: '128GB',
      'Form Factor': 'SFF',
      Gjendja: 'I përdorur',
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
    price: p.price,
    category_id: cat.id,
    brand: p.brand,
    images,
    attributes: p.attributes,
    in_stock: true,
  });
  console.log(`Added #${product.id}: ${product.name} -> ${images.join(', ')}`);
}

console.log('Done.');
