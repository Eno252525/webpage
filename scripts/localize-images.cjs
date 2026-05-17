/**
 * One-time migration: download every EXTERNAL product image already referenced
 * in products.db into ./uploads/, then repoint the DB at the local copies.
 *
 * Does NOT pull any new images — only the ones the catalog currently uses.
 * Products whose images fail to download are left untouched and reported.
 *
 * Run:  node scripts/localize-images.cjs
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'products.db');
const UPLOADS_DIR = path.join(ROOT, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Sanitise a URL into a safe, readable local filename.
function fileNameFor(url) {
  let base = '';
  try {
    base = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
  } catch { /* fall through */ }
  base = base.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  let name = base || `img-${Date.now()}`;
  if (!/\.(png|jpe?g|webp|avif|gif)$/i.test(name)) name += '.jpg';
  return name;
}

const EXT_BY_MIME = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp',
  'image/avif': '.avif', 'image/gif': '.gif',
};

async function download(url, fileName) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': BROWSER_UA, 'Accept': 'image/*,*/*' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = (res.headers.get('content-type') || '').split(';')[0].trim();
  if (!ct.startsWith('image/')) throw new Error(`not an image (${ct || 'unknown'})`);

  // Correct the extension if the server's content-type disagrees with the URL.
  let finalName = fileName;
  const wantExt = EXT_BY_MIME[ct];
  if (wantExt && !finalName.toLowerCase().endsWith(wantExt)) {
    finalName = finalName.replace(/\.[^.]+$/, '') + wantExt;
  }

  // Avoid clobbering an unrelated existing file.
  let dest = path.join(UPLOADS_DIR, finalName);
  let n = 1;
  while (fs.existsSync(dest)) {
    const ext = path.extname(finalName);
    dest = path.join(UPLOADS_DIR, finalName.slice(0, -ext.length) + `-${n}` + ext);
    n++;
  }
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
  return '/uploads/' + path.basename(dest);
}

(async () => {
  const db = new Database(DB_PATH);
  const rows = db.prepare('SELECT id, slug, images FROM products').all();

  // Collect every unique external URL across all products.
  const urlSet = new Set();
  for (const r of rows) {
    for (const u of JSON.parse(r.images || '[]')) {
      if (typeof u === 'string' && /^https?:\/\//i.test(u)) urlSet.add(u);
    }
  }
  const urls = [...urlSet];
  console.log(`${rows.length} products | ${urls.length} unique external images to download\n`);

  // Download each unique URL once → map remote URL to local path.
  const map = new Map();
  const failed = [];
  let i = 0;
  for (const url of urls) {
    i++;
    try {
      const local = await download(url, fileNameFor(url));
      map.set(url, local);
      console.log(`  [${i}/${urls.length}] ok   ${local}`);
    } catch (e) {
      failed.push({ url, reason: e.message });
      console.log(`  [${i}/${urls.length}] FAIL ${e.message}  ${url}`);
    }
  }

  // Rewrite each product's images array, swapping in local paths where available.
  const update = db.prepare('UPDATE products SET images = ? WHERE id = ?');
  let changedProducts = 0;
  const tx = db.transaction(() => {
    for (const r of rows) {
      const imgs = JSON.parse(r.images || '[]');
      let changed = false;
      const next = imgs.map((u) => {
        if (typeof u === 'string' && map.has(u)) { changed = true; return map.get(u); }
        return u;
      });
      if (changed) { update.run(JSON.stringify(next), r.id); changedProducts++; }
    }
  });
  tx();
  db.close();

  console.log(`\nDone.`);
  console.log(`  downloaded : ${map.size}/${urls.length} images`);
  console.log(`  updated    : ${changedProducts} products now use local /uploads/ paths`);
  if (failed.length) {
    console.log(`\n  ${failed.length} image(s) FAILED — these products keep their external URL:`);
    for (const f of failed) console.log(`    - ${f.reason}: ${f.url}`);
  }
})();
