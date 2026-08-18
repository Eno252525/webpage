// Downloads product photos for the laptop catalog refresh of 2026-08 and stores
// them in uploads/ as WebP (max 1000px wide, q82) — the same format the rest of
// the catalog uses after scripts/optimize-images.mjs.
//
// Sources, in order of preference:
//   1. laptopmedia.com/series/<slug>/  — og:image hero shot; covers most of the
//      business/workstation models in the supplier list.
//   2. Wikimedia Commons — used only where LaptopMedia has no page for the model
//      (ThinkPad T520, HP Pavilion g7, and the Apple bodies).
//
// Models the supplier list contains that NEITHER source covers are listed in
// UNSOURCED below and are deliberately left without a photo rather than being
// given a look-alike from another model/generation.
//
// Idempotent: a file that already exists in uploads/ is skipped, so this is safe
// to re-run — including on the server after a deploy, which is required because
// uploads/ is git-ignored:  node scripts/fetch-laptop-images-2026-08.mjs
import fs from 'fs';
import path from 'path';
import https from 'https';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const uploads = path.join(root, 'uploads');

const UA_HTML = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const UA_WIKI = 'ITStoreCatalogBot/1.0 (https://itstore.al; eno.tomcini1@gmail.com)';

// target webp filename (without extension) -> laptopmedia series slug
const LAPTOPMEDIA = {
  'hp-probook-640-g5': 'hp-probook-640-g5',
  'hp-probook-640-g4': 'hp-probook-640-g4',
  'hp-probook-650-g4': 'hp-probook-650-g4',
  'hp-probook-650-g5': 'hp-probook-650-g5',
  'hp-probook-440-g4': 'hp-probook-440-g4',
  'hp-probook-470-g3': 'hp-probook-470-g3',
  'hp-probook-450-g2': 'hp-probook-450-g2',
  'hp-probook-455-g7': 'hp-probook-455-g7',
  'hp-probook-4540s': 'hp-probook-4540s',
  'hp-probook-640-g1': 'hp-probook-640-g1',
  'hp-elitebook-850-g5': 'hp-elitebook-850-g5',
  'hp-elitebook-850-g6': 'hp-elitebook-850-g6',
  'hp-elitebook-840-g2': 'hp-elitebook-840-g2',
  'hp-zbook-15-g3': 'hp-zbook-15-g3',
  'hp-zbook-firefly-15-g7': 'hp-zbook-firefly-15-g7',
  'hp-pro-x2-612-g1': 'hp-pro-x2-612-g1',
  'lenovo-thinkpad-l580': 'lenovo-thinkpad-l580',
  'lenovo-thinkpad-l560': 'lenovo-thinkpad-l560',
  'lenovo-thinkpad-l460': 'lenovo-thinkpad-l460',
  'lenovo-thinkpad-t460': 'lenovo-thinkpad-t460',
  'lenovo-thinkpad-t460s': 'lenovo-thinkpad-t460s',
  'lenovo-thinkpad-x240': 'lenovo-thinkpad-x240',
  'lenovo-thinkpad-x1-yoga': 'lenovo-thinkpad-x1-yoga',
  'lenovo-thinkpad-yoga-370': 'lenovo-thinkpad-yoga-370',
  'lenovo-thinkpad-yoga-460': 'lenovo-thinkpad-yoga-460',
  'lenovo-thinkpad-p15-gen-1': 'lenovo-thinkpad-p15-gen-1',
  'lenovo-thinkpad-x13-gen-2': 'lenovo-thinkpad-x13-gen-2-intel',
  'lenovo-v130-15': 'lenovo-v130-15',
  'lenovo-miix-520': 'lenovo-miix-520',
  'dell-latitude-7490': 'dell-latitude-14-7490',
};

// target webp filename -> Wikimedia Commons File: title
// The 13" MacBook Pro and the Retina MacBook Air bodies are NOT fetched here:
// uploads/apple-macbook-pro-2020.webp and uploads/apple-macbook-air-2020.webp
// are already clean shots of those exact bodies (unchanged 2018–2020) and look
// far better than the amateur photos Commons has.
const COMMONS = {
  'apple-macbook-pro-15-touchbar': 'MacBook Pro 15 inch (2017) Touch Bar.jpg',
};

// Models in the supplier list left without a photo on purpose. Either no source
// has the model at all, or the only candidate was rejected on inspection — a
// look-alike from another generation, or a cluttered/badly-lit snapshot, is
// worse on a product page than no image. Reason in brackets.
const UNSOURCED = [
  'HP ProBook 850 G2          [no source has it]',
  'HP ProBook 950             [no source; model name itself looks wrong]',
  'HP ProBook 450 (i5-3220M)  [only a current-gen ProBook 450 photo exists]',
  'HP ProBook 430 G2          [only the G3 exists — different design generation]',
  'HP 240 G4                  [only the 250 G4, its 15.6" sibling, exists]',
  'HP G62 Notebook            [no source has it]',
  'HP Pavilion g7             [only a dark, glare-heavy user snapshot]',
  'Lenovo ThinkPad L440       [no source has it]',
  'Lenovo ThinkPad L540       [no source has it]',
  'Lenovo ThinkPad T520       [only a desk photo with two laptops in frame]',
  'Apple MacBook Pro (i5-2410M, 2011) [no usable source]',
  'Apple MacBook Pro Late 2015        [no usable source]',
];

function fetch(url, { ua = UA_HTML, binary = false, depth = 0 } = {}) {
  return new Promise((resolve, reject) => {
    if (depth > 5) return reject(new Error('too many redirects'));
    const req = https.get(url, {
      headers: { 'User-Agent': ua, 'Accept-Language': 'en-US,en;q=0.9', 'Accept': binary ? 'image/*' : 'text/html' },
      timeout: 30000,
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.destroy();
        return fetch(new URL(res.headers.location, url).href, { ua, binary, depth: depth + 1 }).then(resolve, reject);
      }
      if (res.statusCode !== 200) { res.destroy(); return reject(new Error(`HTTP ${res.statusCode} for ${url}`)); }
      if (binary) {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      } else {
        let d = '';
        res.setEncoding('utf8');
        res.on('data', c => d += c);
        res.on('end', () => resolve(d));
      }
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function laptopmediaImage(slug) {
  const html = await fetch(`https://laptopmedia.com/series/${slug}/`);
  const og = (html.match(/og:image["'][^>]+content=["']([^"']+)/i) || [])[1];
  if (!og) throw new Error(`no og:image on /series/${slug}/`);
  return og;
}

async function commonsImage(title) {
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=1000&titles='
    + encodeURIComponent('File:' + title);
  const json = JSON.parse(await fetch(api, { ua: UA_WIKI }));
  const page = Object.values(json.query.pages)[0];
  const url = page && page.imageinfo && page.imageinfo[0] && (page.imageinfo[0].thumburl || page.imageinfo[0].url);
  if (!url) throw new Error(`no imageinfo for ${title}`);
  return url;
}

async function save(name, imageUrl, ua) {
  const out = path.join(uploads, `${name}.webp`);
  if (fs.existsSync(out)) return 'skipped';
  const buf = await fetch(imageUrl, { ua, binary: true });
  await sharp(buf)
    .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(out);
  return 'saved';
}

const results = { saved: [], skipped: [], failed: [] };

for (const [name, slug] of Object.entries(LAPTOPMEDIA)) {
  try {
    const url = await laptopmediaImage(slug);
    const r = await save(name, url, UA_HTML);
    results[r].push(name);
    console.log(`${r.padEnd(7)} ${name}  <- laptopmedia/${slug}`);
  } catch (e) {
    results.failed.push(`${name}: ${e.message}`);
    console.log(`FAILED  ${name}  (${e.message})`);
  }
}

for (const [name, title] of Object.entries(COMMONS)) {
  try {
    const url = await commonsImage(title);
    const r = await save(name, url, UA_WIKI);
    results[r].push(name);
    console.log(`${r.padEnd(7)} ${name}  <- commons/${title}`);
  } catch (e) {
    results.failed.push(`${name}: ${e.message}`);
    console.log(`FAILED  ${name}  (${e.message})`);
  }
}

console.log(`\nSaved ${results.saved.length}, skipped ${results.skipped.length}, failed ${results.failed.length}.`);
if (results.failed.length) console.log('Failures:\n  ' + results.failed.join('\n  '));
console.log(`\nNo photo source found for ${UNSOURCED.length} models (left without an image):\n  ` + UNSOURCED.join('\n  '));
