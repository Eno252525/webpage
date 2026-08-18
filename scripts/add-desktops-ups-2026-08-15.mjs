// Adds the 15 August 2026 batch:
//   Desktop > AIO
//     * HP EliteOne 800 G3 AIO            (i3-7100)              17 000 L
//     * Lenovo ThinkCentre M720q + monitor (i3-8100)             17 000 L
//     * Lenovo ThinkCentre M720q + monitor (i3-9100)             20 000 L
//     * Dell Optiplex 7460 AIO 23.8"      (i5-8500)              25 000 L
//   Desktop > PC
//     * HP ProDesk 400 G6 DM / Tiny       (i5-10500T)            28 000 L
//     * Dell Optiplex 5070 Tower          (i7-9700)              30 000 L
//   UPS  (all price 0 -> "Çmim sipas kërkesës", per the owner's instruction)
//     * HP R/T3000 G4, R5000 INTL, R/T2200 G2, R/T3000 G2, R/T3000I
//     * APC SMT1500RMI2UNC, DLA1500I, SMX3000RMHV2UNC, SMX2200HV
//     * APC SBP1500RMI (service bypass panel — accessory, not a UPS itself)
//
// Only the two M720q rows have a source photo (_drive_src/lenovo-thinkcentre-tio3-24-aio.avif,
// the Tiny-in-One 24" set — it replaced the bare-Tiny render on 2026-08-18, see
// scripts/set-m720q-aio-photo-2026-08-18.mjs). The rest are created with an empty
// images array, so the frontend shows its placeholder until real photos are supplied.
//
// Idempotent: keyed by slug — an existing row is re-asserted (price / specs)
// instead of duplicated, so this is safe to re-run on the server after a
// deploy. SKU is deliberately left empty — the owner assigns SKUs, not scripts.
//
//   node scripts/add-desktops-ups-2026-08-15.mjs

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { createProduct, updateProduct, getProductBySlug, getCategories } from '../database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uploadsDir = path.join(root, 'uploads');
const srcDir = path.join(root, '_drive_src');

// Back the DB up before touching it.
const dbFile = path.join(root, 'products.db');
if (fs.existsSync(dbFile)) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(dbFile, path.join(root, `products.db.bak-${stamp}`));
  console.log(`Backed up products.db -> products.db.bak-${stamp}`);
}

const cats = getCategories();
const catId = (slug) => {
  const c = cats.find((x) => x.slug === slug);
  if (!c) throw new Error(`category missing: ${slug}`);
  return c.id;
};
const PC = catId('pc');
const AIO = catId('aio');
const UPS = catId('ups');

async function toWebp(srcFile, destSlug) {
  const srcAbs = path.join(srcDir, srcFile);
  if (!fs.existsSync(srcAbs)) throw new Error(`Missing source image: _drive_src/${srcFile}`);
  const destAbs = path.join(uploadsDir, `${destSlug}.webp`);
  await sharp(srcAbs)
    .flatten({ background: '#ffffff' }) // product renders ship with alpha; cards are white
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(destAbs);
  return `/uploads/${destSlug}.webp`;
}

const products = [
  // ── Desktop > AIO ──────────────────────────────────────────────────────────
  {
    name: 'HP EliteOne 800 G3 AIO - i3-7100 / 8GB RAM / 256GB SSD',
    slug: 'hp-eliteone-800-g3-aio-i3-7100',
    brand: 'HP',
    price: 17000,
    category_id: AIO,
    short_description: 'HP EliteOne 800 G3 All-in-One me Intel Core i3-7100, 8GB RAM DDR4 dhe SSD 256GB.',
    description:
      'HP EliteOne 800 G3 është një kompjuter All-in-One biznesi ku i gjithë sistemi ndodhet brenda ekranit — pa kuti të veçantë dhe pa kabllo të shumta mbi tavolinë. Vjen me procesor Intel Core i3-7100 (2 bërthama, 4 threads, 3.9 GHz), 8GB memorie DDR4 dhe SSD 256GB për ndezje të shpejtë dhe punë të rrjedhshme me dokumente, email dhe shfletim. Ekrani Full HD me korniza të holla, kamera dhe mikrofoni i integruar e bëjnë të përshtatshëm për zyra, recepsione dhe videokonferenca. Bazamenti rregullohet në lartësi dhe pjesa e pasme mbështet montim VESA.',
    attributes: { CPU: 'i3-7100', RAM: '8GB DDR4', SSD: '256GB' },
  },
  {
    name: 'Lenovo ThinkCentre M720q Tiny + Monitor AIO - i3-8100 / 8GB RAM / 256GB SSD',
    slug: 'lenovo-thinkcentre-m720q-aio-i3-8100',
    brand: 'Lenovo',
    price: 17000,
    category_id: AIO,
    image: 'lenovo-thinkcentre-tio3-24-aio.avif',
    short_description: 'Lenovo ThinkCentre M720q Tiny i montuar pas monitorit si All-in-One, me Intel Core i3-8100, 8GB RAM DDR4 dhe SSD 256GB.',
    description:
      'Set i plotë All-in-One: kompjuteri Lenovo ThinkCentre M720q Tiny montohet pas monitorit, duke funksionuar si një AIO i vetëm, por me avantazhin që PC-ja dhe ekrani mund të zëvendësohen veç e veç. Konfigurimi ka procesor Intel Core i3-8100 të gjeneratës së 8-të, 8GB memorie DDR4 dhe SSD 256GB. Trupi Tiny me shasi metalike punon i heshtur dhe me konsum të ulët energjie, ndërsa portat USB 3.1, DisplayPort dhe rrjeti Gigabit mbulojnë të gjitha nevojat e një pike pune në zyrë. Zgjidhje e pastër për tavolina ku hapësira ka rëndësi.',
    attributes: { CPU: 'i3-8100', RAM: '8GB DDR4', SSD: '256GB' },
  },
  {
    name: 'Lenovo ThinkCentre M720q Tiny + Monitor AIO - i3-9100 / 8GB RAM / 256GB SSD',
    slug: 'lenovo-thinkcentre-m720q-aio-i3-9100',
    brand: 'Lenovo',
    price: 20000,
    category_id: AIO,
    image: 'lenovo-thinkcentre-tio3-24-aio.avif',
    short_description: 'Lenovo ThinkCentre M720q Tiny i montuar pas monitorit si All-in-One, me Intel Core i3-9100, 8GB RAM DDR4 dhe SSD 256GB.',
    description:
      'I njëjti set All-in-One me Lenovo ThinkCentre M720q Tiny të montuar pas monitorit, por me procesor më të fuqishëm Intel Core i3-9100 të gjeneratës së 9-të me 4 bërthama (deri në 4.2 GHz). Shoqërohet me 8GB memorie DDR4 dhe SSD 256GB, çka e bën më të rehatshëm për punë me shumë aplikacione njëkohësisht, tabela të mëdha Excel dhe shfletim me shumë tabs. Kompjuteri Tiny fshihet plotësisht pas ekranit, duke lënë tavolinën të lirë, dhe mund të hiqet ose zëvendësohet pa prekur monitorin.',
    attributes: { CPU: 'i3-9100', RAM: '8GB DDR4', SSD: '256GB' },
  },
  {
    name: 'Dell Optiplex 7460 AIO 23.8" - i5-8500 / 8GB RAM / 256GB SSD',
    slug: 'dell-optiplex-7460-aio-i5-8500',
    brand: 'Dell',
    price: 25000,
    category_id: AIO,
    short_description: 'Dell Optiplex 7460 All-in-One 23.8" Full HD me Intel Core i5-8500, 8GB RAM DDR4 dhe SSD 256GB.',
    description:
      'Dell OptiPlex 7460 All-in-One bashkon një ekran 23.8" Full HD me korniza shumë të holla dhe një kompjuter të plotë biznesi brenda të njëjtit trup. Është i pajisur me procesor Intel Core i5-8500 me 6 bërthama (deri në 4.1 GHz Turbo), 8GB memorie DDR4 dhe SSD 256GB, konfigurim që përballon lehtësisht punën e përditshme të zyrës, aplikacionet e kontabilitetit dhe videokonferencat. Ka kamerë të integruar, altoparlantë, WiFi dhe një set të pasur portash USB, DisplayPort e HDMI. Bazamenti rregullohet në lartësi dhe ul ndjeshëm rrëmujën e kabllove.',
    attributes: { CPU: 'i5-8500', RAM: '8GB DDR4', SSD: '256GB', Screen: '23.8"' },
  },

  // ── Desktop > PC ───────────────────────────────────────────────────────────
  {
    name: 'HP Prodesk 400 G6 DM Tiny - i5-10500T / 8GB RAM / 256GB SSD',
    slug: 'hp-prodesk-400-g6-dm-i5-10500t',
    brand: 'HP',
    price: 28000,
    category_id: PC,
    short_description: 'HP Prodesk 400 G6 Desktop Mini (Tiny) me Intel Core i5-10500T, 8GB RAM DDR4 dhe SSD 256GB.',
    description:
      'HP ProDesk 400 G6 Desktop Mini (formati Tiny) është një kompjuter ultra-kompakt që zë sa një libër, por punon si një desktop i plotë zyre. Vjen me procesor Intel Core i5-10500T të gjeneratës së 10-të me 6 bërthama dhe konsum të ulët (35W), 8GB memorie DDR4 SO-DIMM dhe SSD 256GB për ndezje në pak sekonda. Mund të montohet pas monitorit me mbajtëse VESA, të vendoset vertikalisht mbi tavolinë ose të fshihet në një raft. Punon i heshtur, harxhon pak energji dhe ka porta USB 3.2, DisplayPort, HDMI dhe rrjet Gigabit për një pikë pune të plotë.',
    attributes: { CPU: 'i5-10500T', RAM: '8GB DDR4', SSD: '256GB', 'Form Factor': 'USFF' },
  },
  {
    name: 'Dell Optiplex 5070 Tower - i7-9700 / 8GB RAM / 256GB SSD',
    slug: 'dell-optiplex-5070-tower-i7-9700',
    brand: 'Dell',
    price: 30000,
    category_id: PC,
    short_description: 'Dell Optiplex 5070 Tower me Intel Core i7-9700, 8GB RAM DDR4 dhe SSD 256GB.',
    description:
      'Dell OptiPlex 5070 në format Tower është zgjedhja për punë më të rënda se sa ato të një desktop-i standard zyre. Procesori Intel Core i7-9700 me 8 bërthama (deri në 4.7 GHz Turbo) shoqërohet me 8GB memorie DDR4 dhe SSD 256GB, ndërsa trupi Tower lë hapësirë të bollshme për zgjerim: slot-e shtesë RAM, disqe të tjerë dhe kartë grafike të dedikuar. I përshtatshëm për projektim, kontabilitet me baza të dhëna të mëdha, punë me shumë monitorë ose si stacion pune që do të përmirësohet me kalimin e kohës.',
    attributes: { CPU: 'i7-9700', RAM: '8GB DDR4', SSD: '256GB', 'Form Factor': 'MT' },
  },

  // ── UPS — çmim sipas kërkesës (price 0) ────────────────────────────────────
  {
    name: 'HP R/T3000 G4 UPS 3000VA / 2700W Rack-Tower 2U',
    slug: 'hp-rt3000-g4-ups',
    brand: 'HP',
    price: 0,
    category_id: UPS,
    short_description: 'UPS HP R/T3000 G4, 3000VA / 2700W, i instalueshëm në rack 2U ose si tower.',
    description:
      'HP R/T3000 G4 është një UPS line-interactive me kapacitet 3000VA / 2700W, i projektuar për serverë dhe pajisje rrjeti në dhoma serverësh të vogla e të mesme. Mund të montohet në rack me lartësi 2U ose të përdoret vertikalisht si tower, sipas hapësirës që keni. Ka ekran LCD për monitorim, mbrojtje nga mbitensioni dhe menaxhim inteligjent të baterive që zgjat jetëgjatësinë e tyre. Baterite janë të zëvendësueshme dhe mbështeten module shtesë për autonomi më të gjatë.',
    attributes: { Capacity: '3000VA', Power: '2700W', 'Form Factor': 'Rack/Tower 2U' },
  },
  {
    name: 'HP R5000 INTL UPS 5000VA / 4500W Rack 3U',
    slug: 'hp-r5000-intl-ups',
    brand: 'HP',
    price: 0,
    category_id: UPS,
    short_description: 'UPS HP R5000 INTL, 5000VA / 4500W, montim në rack 3U për ngarkesa serverësh.',
    description:
      'HP R5000 INTL UPS ofron 5000VA / 4500W mbrojtje energjie për rack-e serverësh me ngarkesë të lartë. Montohet në rack me lartësi 3U dhe siguron ushqim të pandërprerë për disa serverë, switch-e dhe pajisje storage njëkohësisht. Ka ekran informacioni, mbrojtje nga mbitensioni dhe mundësi menaxhimi në rrjet me kartë të dedikuar, që lejon fikjen e kontrolluar të sistemeve kur bateria është duke u shterur. Zgjidhje për dhoma serverësh, qendra të vogla të dhënash dhe infrastrukturë kritike biznesi.',
    attributes: { Capacity: '5000VA', Power: '4500W', 'Form Factor': 'Rack 3U' },
  },
  {
    name: 'HP R/T2200 G2 UPS 2200VA / 1980W Rack-Tower 2U',
    slug: 'hp-rt2200-g2-ups',
    brand: 'HP',
    price: 0,
    category_id: UPS,
    short_description: 'UPS HP R/T2200 G2, 2200VA / 1980W, rack 2U ose tower.',
    description:
      'HP R/T2200 G2 është një UPS line-interactive me kapacitet 2200VA / 1980W për serverë, pajisje rrjeti dhe stacione pune kritike. Instalohet në rack 2U ose përdoret si tower. Ekrani LCD tregon ngarkesën, gjendjen e baterisë dhe kohën e mbetur të autonomisë, ndërsa rregullimi automatik i tensionit (AVR) korrigjon luhatjet e rrjetit pa e kaluar UPS-in në bateri, duke ruajtur jetëgjatësinë e saj. Baterite janë të zëvendësueshme nga përdoruesi.',
    attributes: { Capacity: '2200VA', Power: '1980W', 'Form Factor': 'Rack/Tower 2U' },
  },
  {
    name: 'HP R/T3000 G2 UPS 3000VA / 2700W Rack-Tower 2U',
    slug: 'hp-rt3000-g2-ups',
    brand: 'HP',
    price: 0,
    category_id: UPS,
    short_description: 'UPS HP R/T3000 G2, 3000VA / 2700W, rack 2U ose tower.',
    description:
      'HP R/T3000 G2 mbron infrastrukturën tuaj IT me 3000VA / 2700W energji rezervë. Formati i dyfishtë rack 2U / tower e bën të përshtatshëm si për rack-e serverësh ashtu edhe për dhoma teknike pa rack. Ofron rregullim automatik të tensionit, ekran LCD me informacion për ngarkesën dhe autonominë, si dhe porta komunikimi për fikje të kontrolluar të serverëve. Bateritë janë të zëvendësueshme dhe mund të shtohen module për kohë më të gjatë pune pa energji.',
    attributes: { Capacity: '3000VA', Power: '2700W', 'Form Factor': 'Rack/Tower 2U' },
  },
  {
    name: 'HP R/T3000I UPS 3000VA / 2700W Rack-Tower',
    slug: 'hp-rt3000i-ups',
    brand: 'HP',
    price: 0,
    category_id: UPS,
    short_description: 'UPS HP R/T3000I, 3000VA / 2700W, versioni international, rack ose tower.',
    description:
      'HP R/T3000I është versioni international (230V) i UPS-it R/T3000 me kapacitet 3000VA / 2700W. Përdoret për të mbajtur në punë serverë, switch-e dhe pajisje rrjeti gjatë ndërprerjeve të energjisë, si dhe për t\'i mbrojtur ato nga luhatjet e tensionit. Instalohet në rack ose përdoret si tower dhe ka porta komunikimi për fikje automatike të sistemeve kur bateria po mbaron. Bateritë janë të zëvendësueshme.',
    attributes: { Capacity: '3000VA', Power: '2700W', 'Form Factor': 'Rack/Tower' },
  },
  {
    name: 'APC Smart-UPS SMT1500RMI2UNC 1500VA / 1000W Rack 2U me Network Card',
    slug: 'apc-smart-ups-smt1500rmi2unc',
    brand: 'APC',
    price: 0,
    category_id: UPS,
    short_description: 'APC Smart-UPS SMT1500RMI2UNC, 1500VA / 1000W, rack 2U, me kartë rrjeti për menaxhim.',
    description:
      'APC Smart-UPS SMT1500RMI2UNC është një UPS line-interactive 1500VA / 1000W në format rack 2U, me ekran LCD dhe kartë rrjeti AP9631 të përfshirë. Karta e rrjetit lejon monitorim dhe menaxhim nga distanca përmes web-it ose SNMP, si dhe fikje të kontrolluar të serverëve kur bateria shkon në nivel kritik. Ofron rregullim automatik të tensionit (AVR), prizat IEC të kontrollueshme në grupe dhe bateri të zëvendësueshme pa e fikur pajisjen. Standard i njohur për rack-et e serverëve.',
    attributes: { Capacity: '1500VA', Power: '1000W', 'Form Factor': 'Rack 2U', 'Network Card': 'Po' },
  },
  {
    name: 'APC Smart-UPS DLA1500I 1500VA / 980W Tower',
    slug: 'apc-smart-ups-dla1500i',
    brand: 'APC',
    price: 0,
    category_id: UPS,
    short_description: 'APC Smart-UPS DLA1500I, 1500VA / 980W, format tower, 230V.',
    description:
      'APC Smart-UPS DLA1500I është një UPS line-interactive 1500VA / 980W në format tower, i përshtatshëm për serverë të vegjël, stacione pune, pajisje rrjeti dhe sisteme sigurie. Ekrani LCD tregon gjendjen e ngarkesës dhe autonominë e mbetur, ndërsa rregullimi automatik i tensionit korrigjon luhatjet e rrjetit pa përdorur baterinë. Bateria zëvendësohet lehtë dhe pajisja komunikon me serverin përmes portës për fikje të sigurt automatike.',
    attributes: { Capacity: '1500VA', Power: '980W', 'Form Factor': 'Tower' },
  },
  {
    name: 'APC Smart-UPS X SMX3000RMHV2UNC 3000VA / 2700W Rack-Tower 2U me Network Card',
    slug: 'apc-smart-ups-x-smx3000rmhv2unc',
    brand: 'APC',
    price: 0,
    category_id: UPS,
    short_description: 'APC Smart-UPS X SMX3000RMHV2UNC, 3000VA / 2700W, rack 2U ose tower, me kartë rrjeti.',
    description:
      'APC Smart-UPS X SMX3000RMHV2UNC ofron 3000VA / 2700W mbrojtje për serverë dhe pajisje rrjeti, në një trup që montohet në rack 2U ose përdoret si tower. Vjen me kartë rrjeti të përfshirë për monitorim dhe menaxhim nga distanca (web, SNMP) dhe për fikje të kontrolluar të sistemeve. Ka ekran LCD me informacion të detajuar, efikasitet të lartë në modalitetin Green dhe mundësi lidhjeje me paketa baterish shtesë për autonomi më të gjatë. Zgjidhje për infrastrukturë kritike biznesi.',
    attributes: { Capacity: '3000VA', Power: '2700W', 'Form Factor': 'Rack/Tower 2U', 'Network Card': 'Po' },
  },
  {
    name: 'APC Smart-UPS X SMX2200HV 2200VA / 1980W Rack-Tower',
    slug: 'apc-smart-ups-x-smx2200hv',
    brand: 'APC',
    price: 0,
    category_id: UPS,
    short_description: 'APC Smart-UPS X SMX2200HV, 2200VA / 1980W, rack ose tower, 230V.',
    description:
      'APC Smart-UPS X SMX2200HV është një UPS 2200VA / 1980W nga seria Smart-UPS X, i përdorshëm si në rack ashtu edhe si tower. Është ndërtuar për serverë, pajisje rrjeti dhe sisteme storage që kërkojnë energji të pandërprerë dhe të pastër. Ekrani LCD me ndriçim tregon ngarkesën, autonominë dhe gjendjen e baterisë, ndërsa modaliteti me efikasitet të lartë ul konsumin e energjisë. Mbështet paketa baterish shtesë dhe karta menaxhimi opsionale për monitorim në rrjet.',
    attributes: { Capacity: '2200VA', Power: '1980W', 'Form Factor': 'Rack/Tower' },
  },
  {
    name: 'APC Service Bypass Panel SBP1500RMI 1U',
    slug: 'apc-service-bypass-panel-sbp1500rmi',
    brand: 'APC',
    price: 0,
    category_id: UPS,
    short_description: 'APC Service Bypass Panel SBP1500RMI, 1U rack, 230V — mirëmbajtje e UPS-it pa ndërprerë ngarkesën.',
    description:
      'APC SBP1500RMI është një panel bypass shërbimi (Service Bypass Panel) 1U për rack, i cili lejon që UPS-i të fiket, të mirëmbahet ose të zëvendësohet pa ndërprerë ushqimin e pajisjeve të lidhura. Energjia kalon manualisht në rrugën bypass, ndërsa serverët dhe pajisjet e rrjetit vazhdojnë të punojnë normalisht. Është aksesor për UPS-e deri në 1500VA me lidhje IEC dhe rekomandohet për çdo instalim ku ndërprerja e shërbimit nuk është e pranueshme. Nuk është vetë UPS dhe nuk ofron autonomi me bateri.',
    attributes: { Type: 'Service Bypass Panel', 'Form Factor': 'Rack 1U' },
  },
];

let added = 0;
let updated = 0;

for (const p of products) {
  const fields = {
    name: p.name,
    slug: p.slug,
    short_description: p.short_description,
    description: p.description,
    price: p.price,
    category_id: p.category_id,
    brand: p.brand,
    sku: '', // SKUs are assigned by the owner, not by this script
    attributes: p.attributes,
    in_stock: 1, // numeric: updateProduct binds this straight through to SQLite
  };
  // Only rows with a source photo get an image; the rest keep whatever they
  // already have (so a photo added later through the admin UI isn't wiped).
  if (p.image) fields.images = [await toWebp(p.image, p.slug)];

  const existing = getProductBySlug(p.slug);
  if (existing) {
    updateProduct(existing.id, fields);
    updated++;
    console.log(`  updated #${existing.id}  ${p.slug}  ${p.price} L`);
  } else {
    createProduct({ ...fields, images: fields.images || [] });
    added++;
    console.log(`  added   ${p.slug}  ${p.price} L`);
  }
}

console.log(`\nDone. Added ${added}, updated ${updated}.`);
