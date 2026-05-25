// Replace switch product images with locally-supplied files from project root.
// Idempotent: re-running copies again and re-writes the DB pointer to the same path.
//
// Run: node scripts/replace-switch-images.mjs
import { copyFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const UPLOADS = path.join(ROOT, 'uploads');

// slug -> source filename (relative to project root)
const mapping = {
  'hp-v1910-48g-je009a': 'images-1.jpg',
  'hp-procurve-2810-48g-j9022a': 'J9022A-1.jpg',
  'hp-1810-48g-j9660a': '61FHEtqBUtL._AC_UF1000,1000_QL80_.jpg',
  'hp-1920-48g-jg927a': 'cef15853547683c57a3c4b13200a07ab-hi.jpg',
  'hp-procurve-2910al-48g-j9147a': 'Untitled.jpg',
  'hp-procurve-2650-j4899a': 'J4899A-ABA-lg.jpg',
  'hp-2920-48g-poe-plus': '6839637e338f59498200abc2-hp-j9729a-2920-48g-poe-48-port-poe-1.jpg',
  'lblink-l-s8024': 'LB-Link_BL-S8024.webp',
  'firebridge-fcbr-7500-dn1': '135225-2.jpg',
  'linksys-srw2048': '33-124-055-06.webp',
  'datto-e48': 'images.jpg',
  'datto-e24-v3': '360000372026-1025971660.png',
  'cisco-ws-c3750g-24ts-s1u': 'cisco-catalyst-3750-24-port-switch-poe-ws-c3750-24ps-e-746320812496-3576902254662.webp',
  'cisco-ws-c3750g-24ts-s': 'WS-C3750G-24T-S.png',
  'cisco-ws-c3750g-24t-s': 'WS-C3750G-24T-S_1.jpg',
  'cisco-ws-c3750g-48ts-s1u': 'CISCO-WS-C3750G-24TS-S1U.jpg',
  'cisco-ws-c3750e-48pd': 'cisco-catalyst-3750-v2-48-port-poe-switch-ws-c3750v2-48ps-s-882658269103-1050098880.webp',
  'cisco-ws-c3750x-48': 'cisco-catalyst-c3750x-48-port-poe-switch-ws-c3750x-48p-e-882658517150-437598297.webp',
  'cisco-ws-c3750x-24': 'WS-C3750X-24P-S.webp',
  'cisco-ws-c3750x-48pf-s': 'WS-C3750X-48PF-L.webp',
  'cisco-ws-c2960-48pst-l': '518+81P5wDL._AC_UF1000,1000_QL80_.jpg',
  'cisco-ws-c2960s-48td-l': 'cisco-catalyst-2960s-48-port-gigabit-switch-ws-c2960s-48td-l-882658337413-905367769.webp',
  'cisco-ws-c2960-48pt-s': '518+81P5wDL.jpg',
  'cisco-ws-c2960-24tc-s': 'WS-C2960-24TC-L_1.800x800-1000x800.webp',
  'cisco-ws-c2960-48tt-l': 'cisco_ws-c2960_48tt-l_vl.webp',
  'cisco-ws-c2960s-48ts-l': 'WS-C2960S-48TS-L_1.jpg',
  'cisco-ws-c2960xs': 'cisco-catalyst-2960x-24-port-poe-switch-ws-c2960x-24ps-l-refurbished-refurbished-877135475917-28293159256134.jpg',
  'cisco-ws-c2960-24-s': 'WS-C2960S-24PS-L_1.jpg',
  'cisco-ws-c2960x-lps-l': 'ws_c2960x_48fpd_lb_50179_g.jpg',
  'cisco-ws-c2960xr-48td-i': 'switches-catalyst-2960x-48td-l-switch.webp',
  'cisco-ws-c2960x-24ts-l': '41zOKJZGPcL.jpg',
  'cisco-ws-c2960x-48ts-l': '51RmgiB8VoL.jpg',
  'cisco-ws-c2960s-f48lps-l': 'catalyst-2960-sf-48-fe-4-x-sfp-lan-base-ws-c2960s-f48ts-l.jpg',
  'cisco-ws-c2960s-f48fps-l': 'catalyst-2960-sf-48-fe-4-x-sfp-lan-base-ws-c2960s-f48ts-l.jpg',
  'cisco-ws-c2950g-24-ei': 'WS-C2950G-24-EI.png',
  'cisco-ws-c2950g-48-ei': 'WS-C2950G-48-EI-lg.jpg',
  'cisco-ws-c2950t-48-si': 'WS-C2950G-48-EI-lg.jpg',
  'cisco-ws-c3560e-48pd-f': 'WS-C3560-48TS-S-2.png',
  'cisco-me-3400-24ts-a': 'ME-3400-24TS-A.jpg',
  'dell-s4048-on': 'dell-networking-s5048f-on-ff-pdp.avif',
};

const db = new Database(path.join(ROOT, 'products.db'));
const getProduct = db.prepare('SELECT id, slug FROM products WHERE slug = ?');
const updateImages = db.prepare('UPDATE products SET images = ? WHERE slug = ?');

const results = { copied: 0, dbUpdated: 0, missingSrc: [], missingProduct: [] };

for (const [slug, srcFile] of Object.entries(mapping)) {
  const src = path.join(ROOT, srcFile);
  if (!existsSync(src)) { results.missingSrc.push(`${slug} <- ${srcFile}`); continue; }

  const product = getProduct.get(slug);
  if (!product) { results.missingProduct.push(slug); continue; }

  const ext = path.extname(srcFile).toLowerCase();
  const destName = `${slug}${ext}`;
  const dest = path.join(UPLOADS, destName);

  copyFileSync(src, dest);
  results.copied++;

  updateImages.run(JSON.stringify([`/uploads/${destName}`]), slug);
  results.dbUpdated++;
}

console.log(`Copied: ${results.copied}`);
console.log(`DB rows updated: ${results.dbUpdated}`);
if (results.missingSrc.length) {
  console.log(`Missing source files (${results.missingSrc.length}):`);
  results.missingSrc.forEach(s => console.log('  -', s));
}
if (results.missingProduct.length) {
  console.log(`Missing products (${results.missingProduct.length}):`, results.missingProduct);
}
