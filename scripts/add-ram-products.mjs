// Adds 6 RAM "configurable" products to the RAM category.
// Each product carries an `attributes.options` map (Kapaciteti / Frekuenca)
// that the product page renders as button groups, plus an `attributes.prices`
// lookup the page consults to display the live variant price.
//
// Price-key conventions (see resolveVariantPrice in product.html):
//   • DDR3 — depends only on Kapaciteti, keys are e.g. "4 GB"
//   • DDR4 — depends on both, keys are "Kapaciteti|Frekuenca" e.g. "8 GB|2133 MHz"
//
// Photos are pulled from Wikimedia Commons (Special:FilePath follows the
// canonical redirect to the file) and converted to WebP into uploads/, or
// from the project root via the "local:" prefix.
// Idempotent: re-running skips products whose slug already exists.
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import sharp from 'sharp';
import { createProduct, getProductBySlug, getCategories } from '../database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uploadsDir = path.join(root, 'uploads');
if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });

async function downloadToWebp(source, destSlug) {
  const destAbs = path.join(uploadsDir, `${destSlug}.webp`);
  // "local:<filename>" pulls from the project root instead of Wikimedia.
  if (source.startsWith('local:')) {
    const srcAbs = path.join(root, source.slice('local:'.length));
    await sharp(srcAbs)
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(destAbs);
    return `/uploads/${destSlug}.webp`;
  }
  const url = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(source);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ITStore/1.0 (https://itstore.al)' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${source}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await sharp(buf)
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(destAbs);
  return `/uploads/${destSlug}.webp`;
}

const ramCat = getCategories().find((c) => c.slug === 'ram');
if (!ramCat) throw new Error('RAM category missing — check database seeding.');

const DDR3_FREQS_LAPTOP = ['1066 MHz', '1333 MHz', '1600 MHz'];
const DDR3_FREQS_DESKTOP = ['1066 MHz', '1333 MHz', '1600 MHz', '1866 MHz'];
const DDR3_PRICES_BY_CAP = { '4 GB': 800, '8 GB': 1500, '16 GB': 3000 };

const DDR4_FREQS = ['2133 MHz', '2400 MHz', '2666 MHz', '2933 MHz', '3200 MHz'];
const DDR4_CAPS = ['8 GB', '16 GB', '32 GB'];
// PC / Laptop pricing table.
const DDR4_PRICES_CONSUMER = {
  '8 GB|2133 MHz': 2500, '8 GB|2400 MHz': 2700, '8 GB|2666 MHz': 2900, '8 GB|2933 MHz': 3000, '8 GB|3200 MHz': 3200,
  '16 GB|2133 MHz': 5500, '16 GB|2400 MHz': 5900, '16 GB|2666 MHz': 6100, '16 GB|2933 MHz': 6200, '16 GB|3200 MHz': 6500,
  '32 GB|2133 MHz': 11000, '32 GB|2400 MHz': 11500, '32 GB|2666 MHz': 12000, '32 GB|2933 MHz': 12500, '32 GB|3200 MHz': 12500,
};
// Workstation (ECC RDIMM) pricing table.
const DDR4_PRICES_WORKSTATION = {
  '8 GB|2133 MHz': 2000, '8 GB|2400 MHz': 2200, '8 GB|2666 MHz': 2400, '8 GB|2933 MHz': 2600, '8 GB|3200 MHz': 3000,
  '16 GB|2133 MHz': 4000, '16 GB|2400 MHz': 4400, '16 GB|2666 MHz': 4800, '16 GB|2933 MHz': 5200, '16 GB|3200 MHz': 6000,
  '32 GB|2133 MHz': 8000, '32 GB|2400 MHz': 8800, '32 GB|2666 MHz': 9600, '32 GB|2933 MHz': 10400, '32 GB|3200 MHz': 12000,
};

function startingPrice(prices) {
  return Math.min(...Object.values(prices).map(Number).filter(Number.isFinite));
}

const products = [
  {
    slug: 'ram-ddr3-laptop-so-dimm',
    name: 'RAM DDR3 Laptop (SO-DIMM)',
    image: '4GB_DDR3_SO-DIMM.jpg',
    short_description:
      'Modul memorie DDR3 SO-DIMM për laptop — i përshtatshëm për shumicën e laptopëve të prodhuar 2008–2015.',
    description:
      'Memorie DDR3 SO-DIMM (Small Outline DIMM) për laptopë. Zgjidh kapacitetin dhe frekuencën më poshtë; çmimi përditësohet automatikisht. Konfirmo porosinë në WhatsApp.',
    attributes: {
      Tipi: 'DDR3 SO-DIMM',
      Përdorimi: 'Laptop',
      Voltazhi: '1.5V (DDR3) / 1.35V (DDR3L)',
      options: {
        Kapaciteti: ['4 GB', '8 GB'],
        Frekuenca: DDR3_FREQS_LAPTOP,
      },
      prices: { '4 GB': DDR3_PRICES_BY_CAP['4 GB'], '8 GB': DDR3_PRICES_BY_CAP['8 GB'] },
    },
  },
  {
    slug: 'ram-ddr4-laptop-so-dimm',
    name: 'RAM DDR4 Laptop (SO-DIMM)',
    image: 'DDR_4_RAM_SO-DIMM_8GB_by_Samsung-top_front_PNr°0838.jpg',
    short_description:
      'Modul memorie DDR4 SO-DIMM për laptop — për laptopë modernë të prodhuar 2016 e më vonë.',
    description:
      'Memorie DDR4 SO-DIMM për laptopë. Zgjidh kapacitetin dhe frekuencën që përputhen me motherboard-in tënd; çmimi përditësohet automatikisht.',
    attributes: {
      Tipi: 'DDR4 SO-DIMM',
      Përdorimi: 'Laptop',
      Voltazhi: '1.2V',
      options: { Kapaciteti: DDR4_CAPS, Frekuenca: DDR4_FREQS },
      prices: DDR4_PRICES_CONSUMER,
    },
  },
  {
    slug: 'ram-ddr3-pc-udimm',
    name: 'RAM DDR3 PC (UDIMM)',
    image: 'local:DDR3-DIMM-2-1.jpg',
    short_description:
      'Modul memorie DDR3 UDIMM për desktop / PC — kompatibël me bord-et kryesore Intel & AMD të epokës DDR3.',
    description:
      'Memorie DDR3 UDIMM për desktop. Zgjidh kapacitetin dhe frekuencën; çmimi përditësohet automatikisht.',
    attributes: {
      Tipi: 'DDR3 UDIMM',
      Përdorimi: 'Desktop / PC',
      Voltazhi: '1.5V (DDR3) / 1.35V (DDR3L)',
      options: {
        Kapaciteti: ['4 GB', '8 GB'],
        Frekuenca: DDR3_FREQS_DESKTOP,
      },
      prices: { '4 GB': DDR3_PRICES_BY_CAP['4 GB'], '8 GB': DDR3_PRICES_BY_CAP['8 GB'] },
    },
  },
  {
    slug: 'ram-ddr4-pc-udimm',
    name: 'RAM DDR4 PC (UDIMM)',
    image: '16_GiB-DDR4-RAM-Riegel_RAM019FIX_Small_Crop_90_PCNT.png',
    short_description:
      'Modul memorie DDR4 UDIMM për desktop / PC — për sisteme moderne Intel & AMD.',
    description:
      'Memorie DDR4 UDIMM për desktop. Zgjidh kapacitetin dhe frekuencën; çmimi përditësohet automatikisht.',
    attributes: {
      Tipi: 'DDR4 UDIMM',
      Përdorimi: 'Desktop / PC',
      Voltazhi: '1.2V',
      options: { Kapaciteti: DDR4_CAPS, Frekuenca: DDR4_FREQS },
      prices: DDR4_PRICES_CONSUMER,
    },
  },
  {
    slug: 'ram-ddr3-workstation-ecc',
    name: 'RAM DDR3 Workstation / Server',
    image: '2013_Transcend_TS512MLK72V6N-(straightened).jpg',
    short_description:
      'Modul memorie DDR3 për workstation — UDIMM për 4 / 8 GB dhe ECC RDIMM për 16 GB.',
    description:
      'Memorie DDR3 për workstation dhe server. Modulet 4 GB dhe 8 GB ofrohen si UDIMM standarde, ndërsa 16 GB vjen si Registered ECC për besueshmëri maksimale në ngarkesa profesionale. Zgjidh kapacitetin dhe frekuencën; çmimi përditësohet automatikisht.',
    attributes: {
      Tipi: 'DDR3 UDIMM (4/8 GB) / ECC RDIMM (16 GB)',
      Përdorimi: 'Workstation / Server',
      Voltazhi: '1.5V (DDR3) / 1.35V (DDR3L)',
      options: {
        Kapaciteti: ['4 GB', '8 GB', '16 GB'],
        Frekuenca: DDR3_FREQS_DESKTOP,
      },
      prices: DDR3_PRICES_BY_CAP,
    },
  },
  {
    slug: 'ram-ddr4-workstation-ecc',
    name: 'RAM DDR4 Workstation / Server (ECC RDIMM)',
    image: 'Two_8_GB_DDR4-2133_ECC_1.2_V_RDIMMs_(straightened).jpg',
    short_description:
      'Modul memorie DDR4 ECC RDIMM për workstation dhe server — me korrigjim gabimesh dhe stabilitet të lartë.',
    description:
      'Memorie DDR4 ECC Registered DIMM për workstation dhe server modernë. E rekomanduar për Xeon, EPYC dhe konfigurime me shumë procesorë. Zgjidh kapacitetin dhe frekuencën; çmimi përditësohet automatikisht.',
    attributes: {
      Tipi: 'DDR4 ECC RDIMM',
      Përdorimi: 'Workstation / Server',
      ECC: 'Po (Registered)',
      Voltazhi: '1.2V',
      options: { Kapaciteti: DDR4_CAPS, Frekuenca: DDR4_FREQS },
      prices: DDR4_PRICES_WORKSTATION,
    },
  },
];

for (const p of products) {
  if (getProductBySlug(p.slug)) {
    console.log(`Skipped (exists): ${p.slug}`);
    continue;
  }
  let imagePath;
  try {
    imagePath = await downloadToWebp(p.image, p.slug);
  } catch (err) {
    console.error(`Image failed for ${p.slug}:`, err.message);
    continue;
  }
  const product = createProduct({
    name: p.name,
    slug: p.slug,
    short_description: p.short_description,
    description: p.description,
    // "From" price shown on shop cards — the cheapest variant in the table.
    price: startingPrice(p.attributes.prices),
    category_id: ramCat.id,
    brand: '',
    images: [imagePath],
    attributes: p.attributes,
    badge: null,
    in_stock: true,
  });
  console.log(`Added #${product.id}: ${product.name} → ${imagePath}`);
}

console.log('Done.');
