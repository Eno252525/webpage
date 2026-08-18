// Replaces the laptop catalogue with the supplier price list of 2026-08
// (the generation-sorted sheet: Gen 2 -> Gen 11, Ryzen, Apple — 86 rows).
//
// What it does:
//   * upserts all 86 rows, keyed by slug — existing products keep their slug
//     (and therefore their URL and view_count), new ones get a fresh slug;
//   * sets price to the list price and clears sale_price, so what the shop
//     shows is exactly what the list says. Rows with no price on the sheet get
//     price 0, which the frontend renders as "Çmim sipas kërkesës";
//   * marks in_stock = 0 for the laptops in the DB that the list does not
//     contain (see DEACTIVATE) — kept, not deleted, so their URLs survive;
//   * fixes "Dell Latitude 7940 Touch", which is a typo for the 7490 Touch on
//     the sheet — same i7-8650U / 16GB / 256GB / 14" touch unit.
//
// Images come from scripts/fetch-laptop-images-2026-08.mjs. Models that script
// could not source a trustworthy photo for are inserted with no image; they are
// listed under NO_IMAGE and reported at the end of the run.
//
// CPU strings stay bare ("i5-8365U", not "Intel Core i5-8365U") because the shop
// CPU facet matches them with LIKE 'i5%' (database.js).
//
// Idempotent: keyed by slug, insert-or-update, so a re-run re-asserts the same
// state. products.db is git-ignored, so this must also be run on the server
// after deploying:  node scripts/replace-laptops-2026-08.mjs
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const BUSINESS = 27;    // Business Laptops
const WORKSTATION = 28; // Workstation Laptops
const MACBOOK = 15;     // MacBook

// Family blurbs — first sentence of the long description, picked by `family`.
const BLURB = {
  probook: 'HP ProBook është seria e laptopëve të biznesit për përdorim të përditshëm në zyrë: ndërtim i qëndrueshëm, tastierë komode dhe siguri e nivelit profesional me TPM.',
  elitebook: 'HP EliteBook është seria premium e biznesit e HP-së, me trup alumini të hollë, ekran me cilësi të lartë dhe veçori sigurie si lexues gjurmësh gishtash dhe TPM.',
  zbook: 'HP ZBook është stacion pune i lëvizshëm (mobile workstation) me kartë grafike profesionale dhe certifikime ISV, i ndërtuar për CAD, modelim 3D dhe përpunim videoje.',
  thinkpad: 'Lenovo ThinkPad njihet për tastierën më të mirë në treg, ndërtimin e testuar sipas standardit ushtarak MIL-STD-810G dhe besueshmërinë afatgjatë në punë profesionale.',
  thinkpad_yoga: 'Ky ThinkPad është model konvertibël 2-në-1 me menteshë 360°: përdoret si laptop, si tablet ose në modalitet tende, me mbështetje për stilon.',
  thinkpad_ws: 'Ky ThinkPad është stacion pune i lëvizshëm me kartë grafike NVIDIA Quadro dhe procesor me gjashtë bërthama, i certifikuar për programe CAD dhe inxhinierie.',
  latitude: 'Dell Latitude është seria e laptopëve të biznesit e Dell-it: ndërtim i fortë, menaxhim i lehtë në rrjet korporate dhe jetëgjatësi e mirë e baterisë.',
  precision: 'Dell Precision është stacion pune i lëvizshëm me kartë grafike profesionale NVIDIA Quadro, i certifikuar ISV për AutoCAD, SolidWorks dhe Adobe.',
  surface: 'Microsoft Surface është pajisje 2-në-1 me ekran me prekje dhe trup shumë të lehtë — funksionon si tablet dhe, me tastierën, si laptop i plotë.',
  macbook: 'Apple MacBook me trup alumini unibody, ekran Retina dhe trackpad Force Touch — zgjedhje e preferuar për punë krijuese dhe përdorim të përditshëm në macOS.',
  consumer: 'Laptop i përballueshëm për punë zyre, mësim dhe përdorim të përditshëm në shtëpi — i mjaftueshëm për Office, shfletim interneti dhe video.',
};

// slug, name-model, brand, family, cpu, ram, ssd, screen, gpu, price, category, image
// `existing: true` = the slug is already in the DB and is updated in place.
const P = [];
const add = (o) => P.push(o);

// ---------- Gen 2 ----------
add({ slug: 'lenovo-thinkpad-t520', model: 'Lenovo ThinkPad T520', brand: 'Lenovo', family: 'thinkpad', cpu: 'i5-2520', ram: '4GB', ssd: '128GB', screen: '15"', price: 5000, cat: BUSINESS });
add({ slug: 'hp-pavilion-g7', model: 'HP Pavilion g7', brand: 'HP', family: 'consumer', cpu: 'i5-2430M', ram: '8GB', ssd: '128GB', screen: '17.3"', price: 7000, cat: BUSINESS });

// ---------- Gen 3 ----------
add({ slug: 'hp-probook-450', model: 'HP ProBook 450', brand: 'HP', family: 'probook', cpu: 'i5-3220M', ram: '8GB', ssd: '128GB', screen: '15.6"', price: 8000, cat: BUSINESS });
add({ slug: 'dell-e5530', model: 'Dell Latitude E5530', brand: 'Dell', family: 'latitude', cpu: 'i5-3230M', ram: '8GB', ssd: '128GB', screen: '15.6"', price: 8000, cat: BUSINESS, existing: true });
add({ slug: 'hp-probook-950', model: 'HP ProBook 950', brand: 'HP', family: 'probook', cpu: 'i5-3230M', ram: '8GB', ssd: '128GB', screen: '15.6"', price: 8000, cat: BUSINESS });
add({ slug: 'hp-probook-4540s', model: 'HP ProBook 4540s', brand: 'HP', family: 'probook', cpu: 'i3-3110M', ram: '8GB', ssd: '128GB', screen: '15.6"', price: 6000, cat: BUSINESS, img: 'hp-probook-4540s' });

// ---------- Gen 4 ----------
add({ slug: 'hp-240-g4', model: 'HP 240 G4', brand: 'HP', family: 'consumer', cpu: 'i3-4005U', ram: '8GB', ssd: '128GB', screen: '14"', price: 7000, cat: BUSINESS });
add({ slug: 'hp-probook-640-g1', model: 'HP ProBook 640 G1', brand: 'HP', family: 'probook', cpu: 'i3-4210M', ram: '8GB', ssd: '128GB', screen: '14"', price: 7000, cat: BUSINESS, img: 'hp-probook-640-g1' });
add({ slug: 'hp-pro-x2-612-g1', model: 'HP Pro x2 612 G1', brand: 'HP', family: 'probook', cpu: 'i3-4012Y', ram: '4GB', ssd: '128GB', screen: '12"', price: 7000, cat: BUSINESS, img: 'hp-pro-x2-612-g1', touch: true });
add({ slug: 'dell-latitude-3540', model: 'Dell Latitude 3540', brand: 'Dell', family: 'latitude', cpu: 'i3-4010U', ram: '8GB', ssd: '128GB', screen: '15.6"', price: 7000, cat: BUSINESS, existing: true });
add({ slug: 'dell-e6440-i5-4310u', model: 'Dell Latitude E6440', brand: 'Dell', family: 'latitude', cpu: 'i5-4310U', ram: '8GB', ssd: '128GB', screen: '14"', price: 10000, cat: BUSINESS, img: 'dell-e6440' });
add({ slug: 'lenovo-thinkpad-l440', model: 'Lenovo ThinkPad L440', brand: 'Lenovo', family: 'thinkpad', cpu: 'i5-4300M', ram: '8GB', ssd: '128GB', screen: '14"', price: 10000, cat: BUSINESS });
add({ slug: 'dell-latitude-e6440', model: 'Dell Latitude E6440', brand: 'Dell', family: 'latitude', cpu: 'i5-4310M', ram: '8GB', ssd: '128GB', screen: '14"', price: 10000, cat: BUSINESS, existing: true, img: 'dell-e6440' });
add({ slug: 'lenovo-thinkpad-l540', model: 'Lenovo ThinkPad L540', brand: 'Lenovo', family: 'thinkpad', cpu: 'i5-4210M', ram: '8GB', ssd: '128GB', screen: '15.6"', price: 10000, cat: BUSINESS });
add({ slug: 'lenovo-thinkpad-x240', model: 'Lenovo ThinkPad X240', brand: 'Lenovo', family: 'thinkpad', cpu: 'i5-4300U', ram: '8GB', ssd: '128GB', screen: '12.5"', price: 10000, cat: BUSINESS, img: 'lenovo-thinkpad-x240' });
add({ slug: 'hp-g62', model: 'HP G62 Notebook', brand: 'HP', family: 'consumer', cpu: 'i5-4210M', ram: '8GB', ssd: '128GB', screen: '15.6"', price: 10000, cat: BUSINESS });

// ---------- Gen 5 ----------
add({ slug: 'lenovo-l450', model: 'Lenovo ThinkPad L450', brand: 'Lenovo', family: 'thinkpad', cpu: 'i3-5005U', ram: '8GB', ssd: '128GB', screen: '14"', price: 8000, cat: BUSINESS, existing: true });
add({ slug: 'hp-probook-850-g2-256', model: 'HP ProBook 850 G2', brand: 'HP', family: 'probook', cpu: 'i5-5200U', ram: '8GB', ssd: '256GB', screen: '15.6"', price: 11000, cat: BUSINESS });
add({ slug: 'dell-vostro-3558', model: 'Dell Vostro 3558', brand: 'Dell', family: 'consumer', cpu: 'i3-5005U', ram: '8GB', ssd: '256GB', screen: '15.6"', price: 9000, cat: BUSINESS, existing: true });
add({ slug: 'hp-elitebook-840-g2', model: 'HP EliteBook 840 G2', brand: 'HP', family: 'elitebook', cpu: 'i5-5300U', ram: '8GB', ssd: '128GB', screen: '14"', price: 11000, cat: BUSINESS, img: 'hp-elitebook-840-g2' });
add({ slug: 'hp-probook-450-g2', model: 'HP ProBook 450 G2', brand: 'HP', family: 'probook', cpu: 'i5-5200U', ram: '8GB', ssd: '128GB', screen: '15.6"', price: 11000, cat: BUSINESS, img: 'hp-probook-450-g2' });
add({ slug: 'hp-probook-850-g2', model: 'HP ProBook 850 G2', brand: 'HP', family: 'probook', cpu: 'i5-5200U', ram: '8GB', ssd: '128GB', screen: '15.6"', price: 11000, cat: BUSINESS });
add({ slug: 'dell-latitude-e5550', model: 'Dell Latitude E5550', brand: 'Dell', family: 'latitude', cpu: 'i5-5200U', ram: '8GB', ssd: '128GB', screen: '15.6"', price: 11000, cat: BUSINESS, existing: true });
add({ slug: 'lenovo-l460', model: 'Lenovo ThinkPad L460', brand: 'Lenovo', family: 'thinkpad', cpu: 'i3-5005U', ram: '8GB', ssd: '128GB', screen: '14"', price: 8000, cat: BUSINESS, img: 'lenovo-thinkpad-l460' });
add({ slug: 'hp-probook-450-g2-i3-5010u', model: 'HP ProBook 450 G2', brand: 'HP', family: 'probook', cpu: 'i3-5010U', ram: '8GB', ssd: '128GB', screen: '15.6"', price: 8000, cat: BUSINESS, img: 'hp-probook-450-g2' });
add({ slug: 'dell-e7450', model: 'Dell Latitude E7450', brand: 'Dell', family: 'latitude', cpu: 'i7-5600U', ram: '8GB', ssd: '128GB', screen: '14"', price: 15000, cat: BUSINESS, existing: true });

// ---------- Gen 6 ----------
add({ slug: 'lenovo-thinkpad-x1-yoga', model: 'Lenovo ThinkPad X1 Yoga', brand: 'Lenovo', family: 'thinkpad_yoga', cpu: 'i5-6300U', ram: '8GB', ssd: '256GB', screen: '14"', price: 15000, cat: BUSINESS, img: 'lenovo-thinkpad-x1-yoga', touch: true });
add({ slug: 'microsoft-surface-4-pro', model: 'Microsoft Surface Pro 4', brand: 'Microsoft', family: 'surface', cpu: 'i5-6300U', ram: '4GB', ssd: '128GB', screen: '12.3"', price: 15000, cat: BUSINESS, existing: true, touch: true });
add({ slug: 'lenovo-thinkpad-l560', model: 'Lenovo ThinkPad L560', brand: 'Lenovo', family: 'thinkpad', cpu: 'i5-6200U', ram: '16GB', ssd: '128GB', screen: '15.6"', price: 14000, cat: BUSINESS, img: 'lenovo-thinkpad-l560' });
add({ slug: 'hp-probook-470-g3', model: 'HP ProBook 470 G3', brand: 'HP', family: 'probook', cpu: 'i3-6100U', ram: '8GB', ssd: '128GB', screen: '17.3"', price: 10000, cat: BUSINESS, img: 'hp-probook-470-g3' });
add({ slug: 'lenovo-thinkpad-yoga-460', model: 'Lenovo ThinkPad Yoga 460', brand: 'Lenovo', family: 'thinkpad_yoga', cpu: 'i5-6300U', ram: '8GB', ssd: '128GB', screen: '14"', price: 14000, cat: BUSINESS, img: 'lenovo-thinkpad-yoga-460', touch: true });
add({ slug: 'dell-latitude-3380', model: 'Dell Latitude 3380', brand: 'Dell', family: 'latitude', cpu: 'i3-6006U', ram: '8GB', ssd: '128GB', screen: '13.3"', price: 10000, cat: BUSINESS, existing: true });
add({ slug: 'hp-probook-430-g2', model: 'HP ProBook 430 G2', brand: 'HP', family: 'probook', cpu: 'i3-6100U', ram: '8GB', ssd: '128GB', screen: '13.3"', price: 10000, cat: BUSINESS });
add({ slug: 'lenovo-thinkpad-t460', model: 'Lenovo ThinkPad T460', brand: 'Lenovo', family: 'thinkpad', cpu: 'i7-6600U', ram: '8GB', ssd: '128GB', screen: '14"', price: 18000, cat: BUSINESS, img: 'lenovo-thinkpad-t460' });
add({ slug: 'hp-zbook-15-g3', model: 'HP ZBook 15 G3', brand: 'HP', family: 'zbook', cpu: 'i7-6820HQ', ram: '32GB', ssd: '512GB + 1TB', screen: '15.6"', gpu: 'Quadro M2000M', price: 27000, cat: WORKSTATION, img: 'hp-zbook-15-g3' });

// ---------- Gen 7 ----------
add({ slug: 'microsoft-surface-5', model: 'Microsoft Surface Pro 5', brand: 'Microsoft', family: 'surface', cpu: 'i5-7300U', ram: '4GB', ssd: '128GB', screen: '12.3"', price: 17000, cat: BUSINESS, existing: true, touch: true });
add({ slug: 'hp-probook-640-g4', model: 'HP ProBook 640 G4', brand: 'HP', family: 'probook', cpu: 'i5-7300U', ram: '8GB', ssd: '256GB', screen: '14"', price: 17000, cat: BUSINESS, img: 'hp-probook-640-g4' });
add({ slug: 'lenovo-thinkpad-l580', model: 'Lenovo ThinkPad L580', brand: 'Lenovo', family: 'thinkpad', cpu: 'i5-7300U', ram: '8GB', ssd: '256GB', screen: '15.6"', price: 18000, cat: BUSINESS, img: 'lenovo-thinkpad-l580' });
add({ slug: 'hp-probook-440-g4', model: 'HP ProBook 440 G4', brand: 'HP', family: 'probook', cpu: 'i5-7200U', ram: '8GB', ssd: '256GB', screen: '14"', price: 18000, cat: BUSINESS, img: 'hp-probook-440-g4' });
add({ slug: 'lenovo-thinkpad-yoga-370', model: 'Lenovo ThinkPad Yoga 370', brand: 'Lenovo', family: 'thinkpad_yoga', cpu: 'i5-7300U', ram: '8GB', ssd: '256GB', screen: '13.3"', price: 20000, cat: BUSINESS, img: 'lenovo-thinkpad-yoga-370', touch: true });
add({ slug: 'lenovo-thinkpad-t470s', model: 'Lenovo ThinkPad T470s', brand: 'Lenovo', family: 'thinkpad', cpu: 'i7-7600U', ram: '8GB', ssd: '256GB', screen: '14"', price: 20000, cat: BUSINESS, existing: true, touch: true });
add({ slug: 'lenovo-thinkpad-t460s', model: 'Lenovo ThinkPad T460s', brand: 'Lenovo', family: 'thinkpad', cpu: 'i7-7600U', ram: '8GB', ssd: '256GB', screen: '14"', price: 20000, cat: BUSINESS, img: 'lenovo-thinkpad-t460s' });

// ---------- Gen 8 ----------
add({ slug: 'hp-probook-640-g5', model: 'HP ProBook 640 G5', brand: 'HP', family: 'probook', cpu: 'i5-8365U', ram: '8GB', ssd: '256GB', screen: '14"', price: 17000, cat: BUSINESS, img: 'hp-probook-640-g5' });
add({ slug: 'dell-latitude-5400', model: 'Dell Latitude 5400', brand: 'Dell', family: 'latitude', cpu: 'i5-8365U', ram: '8GB', ssd: '256GB', screen: '14"', price: 17000, cat: BUSINESS, existing: true });
add({ slug: 'dell-precision-7530', model: 'Dell Precision 7530', brand: 'Dell', family: 'precision', cpu: 'i5-8400H', ram: '16GB', ssd: '512GB', screen: '15.6"', gpu: 'Quadro P1000', price: 33000, cat: WORKSTATION, existing: true });
add({ slug: 'dell-latitude-5500', model: 'Dell Latitude 5500', brand: 'Dell', family: 'latitude', cpu: 'i5-8365U', ram: '8GB', ssd: '256GB', screen: '15.6"', price: 20000, cat: BUSINESS, existing: true });
add({ slug: 'hp-elitebook-850-g5', model: 'HP EliteBook 850 G5', brand: 'HP', family: 'elitebook', cpu: 'i5-8250U', ram: '8GB', ssd: '256GB', screen: '15.6"', price: 20000, cat: BUSINESS, img: 'hp-elitebook-850-g5' });
add({ slug: 'hp-probook-650-g4', model: 'HP ProBook 650 G4', brand: 'HP', family: 'probook', cpu: 'i5-8350U', ram: '8GB', ssd: '256GB', screen: '15.6"', price: 19000, cat: BUSINESS, img: 'hp-probook-650-g4' });
add({ slug: 'hp-elitebook-850-g6', model: 'HP EliteBook 850 G6', brand: 'HP', family: 'elitebook', cpu: 'i5-8365U', ram: '8GB', ssd: '256GB', screen: '15.6"', price: 22000, cat: BUSINESS, img: 'hp-elitebook-850-g6' });
add({ slug: 'dell-latitude-5590', model: 'Dell Latitude 5590', brand: 'Dell', family: 'latitude', cpu: 'i5-8350U', ram: '8GB', ssd: '256GB', screen: '15.6"', price: 18000, cat: BUSINESS, existing: true });
add({ slug: 'hp-probook-640-g4-i5-8350u', model: 'HP ProBook 640 G4', brand: 'HP', family: 'probook', cpu: 'i5-8350U', ram: '8GB', ssd: '256GB', screen: '14"', price: 18000, cat: BUSINESS, img: 'hp-probook-640-g4' });
add({ slug: 'dell-latitude-5580', model: 'Dell Latitude 5580', brand: 'Dell', family: 'latitude', cpu: 'i5-8500U', ram: '8GB', ssd: '256GB', screen: '15.6"', price: 18000, cat: BUSINESS, existing: true });
add({ slug: 'lenovo-v130-15ikb', model: 'Lenovo V130-15IKB', brand: 'Lenovo', family: 'consumer', cpu: 'i5-8250U', ram: '8GB', ssd: '256GB', screen: '15.6"', price: 18000, cat: BUSINESS, img: 'lenovo-v130-15' });
add({ slug: 'dell-latitude-7390', model: 'Dell Latitude 7390', brand: 'Dell', family: 'latitude', cpu: 'i5-8350U', ram: '8GB', ssd: '256GB', screen: '13.3"', price: 15000, cat: BUSINESS, existing: true });
add({ slug: 'lenovo-miix-520-12ikb', model: 'Lenovo ideapad Miix 520-12IKB', brand: 'Lenovo', family: 'surface', cpu: 'i5-8250U', ram: '8GB', ssd: '256GB', screen: '12.2"', price: 20000, cat: BUSINESS, img: 'lenovo-miix-520', touch: true });
add({ slug: 'hp-elitebook-650-g6', model: 'HP EliteBook 650 G6', brand: 'HP', family: 'elitebook', cpu: 'i5-8365U', ram: '8GB', ssd: '256GB', screen: '15.6"', price: 19000, cat: BUSINESS, img: 'hp-probook-650-g5' });
add({ slug: 'microsoft-surface', model: 'Microsoft Surface', brand: 'Microsoft', family: 'surface', cpu: 'i5-8350U', ram: '8GB', ssd: '128GB', screen: '12.3"', price: 20000, cat: BUSINESS, existing: true, touch: true });
add({ slug: 'dell-latitude-7940-touch', model: 'Dell Latitude 7490 Touch', brand: 'Dell', family: 'latitude', cpu: 'i7-8650U', ram: '16GB', ssd: '256GB', screen: '14"', price: 25000, cat: BUSINESS, existing: true, img: 'dell-latitude-7490', touch: true });

// ---------- Gen 9 ----------
add({ slug: 'dell-precision-7540', model: 'Dell Precision 7540', brand: 'Dell', family: 'precision', cpu: 'i5-9400H', ram: '16GB', ssd: '512GB', screen: '15.6"', gpu: 'Quadro T1000', price: 44000, cat: WORKSTATION, existing: true });
add({ slug: 'lenovo-thinkpad-p53', model: 'Lenovo ThinkPad P53', brand: 'Lenovo', family: 'thinkpad_ws', cpu: 'i5-9400H', ram: '8GB', ssd: '256GB', screen: '15.6"', gpu: 'Quadro T1000', price: 33000, cat: WORKSTATION, existing: true });

// ---------- Gen 10 ----------
add({ slug: 'lenovo-ideapad-s145-15iil', model: 'Lenovo IdeaPad S145-15IIL', brand: 'Lenovo', family: 'consumer', cpu: 'i5-1035G1', ram: '8GB', ssd: '512GB', screen: '15.6"', price: 25000, cat: BUSINESS, existing: true });
add({ slug: 'dell-latitude-5511', model: 'Dell Latitude 5511', brand: 'Dell', family: 'latitude', cpu: 'i7-10850H', ram: '16GB', ssd: '512GB', screen: '15.6"', price: 28000, cat: BUSINESS, existing: true });
add({ slug: 'dell-latitude-5510', model: 'Dell Latitude 5510', brand: 'Dell', family: 'latitude', cpu: 'i5-10310U', ram: '8GB', ssd: '256GB', screen: '15.6"', price: 25000, cat: BUSINESS, existing: true });
add({ slug: 'lenovo-thinkpad-x13-gen-1-i5-10210u', model: 'Lenovo ThinkPad X13 Gen 1', brand: 'Lenovo', family: 'thinkpad', cpu: 'i5-10210U', ram: '16GB', ssd: '256GB', screen: '13.3"', price: 22000, cat: BUSINESS, existing: true });
add({ slug: 'dell-latitude-5511-2', model: 'Dell Latitude 5511', brand: 'Dell', family: 'latitude', cpu: 'i7-10850H', ram: '16GB', ssd: '256GB', screen: '15.6"', gpu: 'GeForce MX250', price: 32500, cat: BUSINESS, existing: true });
add({ slug: 'hp-zbook-firefly-15-g7', model: 'HP ZBook Firefly 15 G7', brand: 'HP', family: 'zbook', cpu: 'i7-10850H', ram: '16GB', ssd: '512GB', screen: '15.6"', gpu: 'Quadro T2000', price: 45000, cat: WORKSTATION, img: 'hp-zbook-firefly-15-g7' });
add({ slug: 'microsoft-surface-3-13', model: 'Microsoft Surface Laptop 3 13.5"', brand: 'Microsoft', family: 'surface', cpu: 'i5-1035G7', ram: '8GB', ssd: '256GB', screen: '13.5"', price: 30000, cat: BUSINESS, existing: true, touch: true });
add({ slug: 'lenovo-thinkpad-p15-gen-1', model: 'Lenovo ThinkPad P15 Gen 1', brand: 'Lenovo', family: 'thinkpad_ws', cpu: 'i7-10750H', ram: '16GB', ssd: '512GB', screen: '15.6"', price: 30000, cat: WORKSTATION, img: 'lenovo-thinkpad-p15-gen-1' });

// ---------- Gen 11 ----------
add({ slug: 'dell-latitude-9520', model: 'Dell Latitude 9520', brand: 'Dell', family: 'latitude', cpu: 'i7-1185G7', ram: '8GB', ssd: '256GB', screen: '15.6"', price: 35000, cat: BUSINESS, existing: true });
add({ slug: 'dell-latitude-5520', model: 'Dell Latitude 5520', brand: 'Dell', family: 'latitude', cpu: 'i7-1185G7', ram: '8GB', ssd: '256GB', screen: '15.6"', price: 30000, cat: BUSINESS, existing: true });
add({ slug: 'dell-latitude-5420-2', model: 'Dell Latitude 5420', brand: 'Dell', family: 'latitude', cpu: 'i5-1145G7', ram: '16GB', ssd: '256GB', screen: '14"', price: 25000, cat: BUSINESS, existing: true, grade: 'Grada A' });
add({ slug: 'dell-latitude-5420', model: 'Dell Latitude 5420', brand: 'Dell', family: 'latitude', cpu: 'i5-1145G7', ram: '16GB', ssd: '256GB', screen: '14"', price: 22000, cat: BUSINESS, existing: true, grade: 'Grada B' });
add({ slug: 'lenovo-thinkpad-t14-gen2', model: 'Lenovo ThinkPad T14 Gen 2', brand: 'Lenovo', family: 'thinkpad', cpu: 'i5-1145G7', ram: '16GB', ssd: '256GB', screen: '14"', price: 28000, cat: BUSINESS, existing: true });
add({ slug: 'lenovo-thinkpad-x13-gen-2', model: 'Lenovo ThinkPad X13 Gen 2', brand: 'Lenovo', family: 'thinkpad', cpu: 'i5-1145G7', ram: '16GB', ssd: '512GB', screen: '13.3"', price: 27900, cat: BUSINESS, img: 'lenovo-thinkpad-x13-gen-2' });

// ---------- Ryzen ----------
add({ slug: 'hp-probook-455-g7', model: 'HP ProBook 455 G7', brand: 'HP', family: 'probook', cpu: 'Ryzen 5 4500U', ram: '8GB', ssd: '256GB', screen: '15.6"', price: 30000, cat: BUSINESS, img: 'hp-probook-455-g7' });

// ---------- Apple ----------
add({ slug: 'apple-macbook-pro-2018-i9', model: 'Apple MacBook Pro 15" 2018', brand: 'Apple', family: 'macbook', cpu: 'i9-8950HK', ram: '32GB', ssd: '256GB', screen: '15.4"', gpu: 'Radeon Pro', price: 65000, cat: MACBOOK, img: 'apple-macbook-pro-15-touchbar' });
add({ slug: 'apple-macbook-pro-2018-13-i8-8295u', model: 'Apple MacBook Pro 13" 2018', brand: 'Apple', family: 'macbook', cpu: 'i8-8295U', ram: '8GB', ssd: '256GB', screen: '13"', gpu: 'Radeon Pro', price: 37000, cat: MACBOOK, img: 'apple-macbook-pro-2020' });
add({ slug: 'apple-macbook-pro-2018-13-i5-8259u', model: 'Apple MacBook Pro 13" 2018', brand: 'Apple', family: 'macbook', cpu: 'i5-8259U', ram: '8GB', ssd: '256GB', screen: '13.3"', price: 37000, cat: MACBOOK, img: 'apple-macbook-pro-2020' });
add({ slug: 'apple-macbook-pro-i5-2410m', model: 'Apple MacBook Pro', brand: 'Apple', family: 'macbook', cpu: 'i5-2410M', ram: '8GB', ssd: '256GB', screen: '13.3"', price: 0, cat: MACBOOK });
add({ slug: 'apple-macbook-pro-late-2015', model: 'Apple MacBook Pro 13" Late 2015', brand: 'Apple', family: 'macbook', cpu: 'i5-6267U', ram: '8GB', ssd: '512GB', screen: '13.3"', price: 0, cat: MACBOOK });
add({ slug: 'apple-macbook-air-2019-i7', model: 'Apple MacBook Air 2019', brand: 'Apple', family: 'macbook', cpu: 'i7-10750H', ram: '8GB', ssd: '256GB', screen: '13.3"', price: 0, cat: MACBOOK, img: 'apple-macbook-air-2020' });
add({ slug: 'apple-macbook-pro-i5-8257u', model: 'Apple MacBook Pro 13"', brand: 'Apple', family: 'macbook', cpu: 'i5-8257U', ram: '8GB', ssd: '256GB', screen: '13.3"', price: 37000, cat: MACBOOK, img: 'apple-macbook-pro-2020' });
add({ slug: 'apple-macbook-pro-2019-i7', model: 'Apple MacBook Pro 15" 2019', brand: 'Apple', family: 'macbook', cpu: 'i7-9750H', ram: '16GB', ssd: '250GB', screen: '15"', gpu: 'Radeon Pro', price: 60000, cat: MACBOOK, img: 'apple-macbook-pro-15-touchbar' });
add({ slug: 'apple-macbook-air-2019', model: 'Apple MacBook Air Late 2019', brand: 'Apple', family: 'macbook', cpu: 'i5-8210Y', ram: '8GB', ssd: '256GB', screen: '13.3"', price: 30000, cat: MACBOOK, existing: true, img: 'apple-macbook-air-2020' });
add({ slug: 'apple-macbook-pro-2020-i5-1038ng7', model: 'Apple MacBook Pro 13" 2020', brand: 'Apple', family: 'macbook', cpu: 'i5-1038NG7', ram: '32GB', ssd: '256GB', screen: '13.3"', price: 47000, cat: MACBOOK, img: 'apple-macbook-pro-2020' });
add({ slug: 'apple-macbook-pro-2018-i7-8850h', model: 'Apple MacBook Pro 15" 2018', brand: 'Apple', family: 'macbook', cpu: 'i7-8850H', ram: '32GB', ssd: '512GB', screen: '15.4"', gpu: 'Radeon Pro', price: 60000, cat: MACBOOK, img: 'apple-macbook-pro-15-touchbar' });

// Laptops present in the DB but absent from the 2026-08 list: kept but hidden
// from the shop (in_stock = 0) rather than deleted, so their URLs keep working.
const DEACTIVATE = [
  ['dell-precision-7560', 'i5-11500H / 32GB / 1TB / T1200 — not on the list'],
  ['lenovo-thinkpad-t14s', 'i7-10610U — the list has the AMD 4650U T14s instead'],
  ['dell-latitude-5500-2', 'second Latitude 5500 i5-8365U 8/256; the list has one'],
  ['dell-latitude-5590-2', 'Latitude 5590 with i5-8500U; the list has only the i5-8350U'],
  ['dell-latitude-e5590', 'duplicate of Latitude 5590 i5-8350U'],
  ['microsoft-surface-5-2', 'Surface 5 4GB/256GB; the list has only 4GB/128GB'],
  ['microsoft-surface-5-3', 'Surface 5 8GB/256GB; the list has only 4GB/128GB'],
  ['apple-macbook-pro-2019', 'MacBook Pro i9-9880H 32GB/1TB — not on the list'],
  ['apple-macbook-pro-2020', 'MacBook Pro i7-1068NG7 32GB/1TB — not on the list'],
  ['apple-macbook-air-2020', 'listed in the DB as an Air but i5-1038NG7 is the 13" Pro; the list prices that as a Pro with 32GB (added as its own product)'],
];

// Discrepancies in the supplier sheet worth a human look — reported, not fixed.
const DATA_ISSUES = [
  'Apple "i8-8295U" is not an Intel part number (likely i5-8259U or i7-8559U).',
  'Apple "MacBook Air 2019 / i7-10750H" is impossible — the i7-10750H is a 45W 6-core H chip, never used in an Air.',
  '3 Apple rows have no price on the sheet (i5-2410M Pro, Late 2015 Pro, Air 2019) — inserted as "Çmim sipas kërkesës".',
  'HP "EliteBook 650 G6" does not exist as a model; the i5-8365U 15.6" HP 650 is the ProBook 650 G5 (its photo is used).',
  'HP "ProBook 950" is not an HP model name.',
  'HP "ProBook 640 G4 / i5-7300U" mixes a G4 chassis with a 7th-gen CPU (that is the 640 G3).',
  'Lenovo "ThinkPad T460s / i7-7600U" mixes a T460s with a 7th-gen CPU (that is the T470s).',
  'Lenovo "ThinkPad L580 / i5-7300U" — the L580 shipped with 8th-gen CPUs.',
  'HP "ProBook 430 G2 / i3-6100U" — the G2 is Broadwell; an i3-6100U is the 430 G3.',
  'HP "ZBook FireFly / i7-10850H + T2000" — the Firefly 15 G7 uses U-series CPUs; this spec is a ZBook Power/Fury 15 G7.',
];

// Models with no trustworthy photo — inserted without an image on purpose.
const NO_IMAGE_EXPECTED = [
  'lenovo-thinkpad-t520', 'hp-pavilion-g7', 'hp-probook-450', 'hp-probook-950',
  'hp-240-g4', 'lenovo-thinkpad-l440', 'lenovo-thinkpad-l540', 'hp-g62',
  'hp-probook-850-g2-256', 'hp-probook-850-g2', 'hp-probook-430-g2',
  'apple-macbook-pro-i5-2410m', 'apple-macbook-pro-late-2015',
];

function buildName(p) {
  const parts = [`${p.model} - ${p.cpu}`, `${p.ram} RAM`, `${p.ssd} SSD`];
  if (p.gpu) parts.push(p.gpu);
  if (p.grade) parts.push(p.grade);
  return parts.join(' / ');
}

function buildShort(p) {
  const bits = [`${p.ram} RAM`, `${p.ssd} SSD`];
  if (p.gpu) bits.push(`grafikë ${p.gpu}`);
  const tail = bits.join(', ').replace(/,([^,]*)$/, ' dhe$1');
  return `${p.model} ${p.screen} me ${p.cpu}, ${tail}.`;
}

function buildDescription(p) {
  const spec = `Konfigurimi: procesor ${p.cpu}, ${p.ram} memorie RAM, disk SSD ${p.ssd}`
    + (p.gpu ? `, kartë grafike ${p.gpu}` : '')
    + `, ekran ${p.screen}${p.touch ? ' me prekje (touchscreen)' : ''}.`;
  const grade = p.grade === 'Grada A'
    ? ' Njësi në Gradën A — gjendje estetike shumë e mirë, pa gërvishtje të dukshme.'
    : p.grade === 'Grada B'
      ? ' Njësi në Gradën B — shenja të lehta përdorimi në trup, funksionon plotësisht.'
      : '';
  return `${BLURB[p.family]} ${spec}${grade} Gjendja: i përdorur, i testuar dhe në gjendje pune, me garanci nga IT Store.`;
}

const db = new Database(dbPath);

for (const id of [BUSINESS, WORKSTATION, MACBOOK]) {
  if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(id)) {
    console.error(`Aborting — category id ${id} does not exist.`);
    process.exit(1);
  }
}

const findBySlugCheck = db.prepare('SELECT id FROM products WHERE slug = ?');

console.log(`Rows in the supplier list: ${P.length}`);

// Fail fast if a referenced image file is missing.
const missingFiles = [];
for (const p of P) {
  if (!p.img) continue;
  if (!fs.existsSync(path.join(root, 'uploads', `${p.img}.webp`))) missingFiles.push(`${p.slug} -> ${p.img}.webp`);
}
if (missingFiles.length) {
  console.error('Aborting — referenced images not found in uploads/:\n  ' + missingFiles.join('\n  '));
  console.error('\nRun: node scripts/fetch-laptop-images-2026-08.mjs');
  process.exit(1);
}

// `existing: true` marks the slugs that were already in the catalogue before
// this migration. If one of those is missing, the slug is mistyped and the row
// would be inserted as a duplicate instead of updating the intended product —
// so refuse to run. (The reverse is not an error: after the first successful
// run every slug exists, and this script has to stay re-runnable.)
const slugProblems = P.filter(p => p.existing && !findBySlugCheck.get(p.slug)).map(p => p.slug);
if (slugProblems.length) {
  console.error('Aborting — marked as existing but not in the DB:\n  ' + slugProblems.join('\n  '));
  process.exit(1);
}

const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup));

const findBySlug = db.prepare('SELECT id, images FROM products WHERE slug = ?');
const insert = db.prepare(`
  INSERT INTO products (name, slug, short_description, description, price, sale_price,
    category_id, images, attributes, badge, featured, in_stock, brand, sku)
  VALUES (:name, :slug, :short_description, :description, :price, NULL,
    :category_id, :images, :attributes, NULL, 0, 1, :brand, '')
`);
const update = db.prepare(`
  UPDATE products SET
    name = :name, short_description = :short_description, description = :description,
    price = :price, sale_price = NULL, category_id = :category_id, images = :images,
    attributes = :attributes, in_stock = 1, brand = :brand, updated_at = datetime('now')
  WHERE slug = :slug
`);
const deactivate = db.prepare(`UPDATE products SET in_stock = 0, updated_at = datetime('now') WHERE slug = ?`);

const apply = db.transaction(() => {
  const log = { inserted: [], updated: [], deactivated: [], missing: [] };

  for (const p of P) {
    const existing = findBySlug.get(p.slug);
    // keep whatever image the product already had unless this run supplies one
    let images = '[]';
    if (p.img) images = JSON.stringify([`/uploads/${p.img}.webp`]);
    else if (existing && existing.images) images = existing.images;

    const attributes = { CPU: p.cpu, RAM: p.ram, SSD: p.ssd, Screen: p.screen };
    if (p.gpu) attributes.GPU = p.gpu;
    if (p.touch) attributes.Touch = 'Po';
    if (p.grade) attributes.Grade = p.grade;
    attributes.Gjendja = 'I përdorur';

    const row = {
      name: buildName(p),
      slug: p.slug,
      short_description: buildShort(p),
      description: buildDescription(p),
      price: p.price,
      category_id: p.cat,
      images,
      attributes: JSON.stringify(attributes),
      brand: p.brand,
    };

    if (existing) { update.run(row); log.updated.push(p.slug); }
    else { insert.run(row); log.inserted.push(p.slug); }
  }

  for (const [slug, why] of DEACTIVATE) {
    const row = findBySlug.get(slug);
    if (!row) { log.missing.push(slug); continue; }
    deactivate.run(slug);
    log.deactivated.push([slug, why]);
  }
  return log;
});

const log = apply();

console.log(`\nInserted ${log.inserted.length}, updated ${log.updated.length}, deactivated ${log.deactivated.length}.`);
if (log.missing.length) console.log('Not found (nothing to deactivate): ' + log.missing.join(', '));

const noImage = P.filter(p => {
  const row = findBySlug.get(p.slug);
  return !row || !JSON.parse(row.images || '[]').length;
}).map(p => p.slug);
console.log(`\n${noImage.length} products have no photo:\n  ` + (noImage.join('\n  ') || '(none)'));

console.log('\nSupplier-sheet discrepancies (not changed — please confirm):');
for (const d of DATA_ISSUES) console.log('  - ' + d);
