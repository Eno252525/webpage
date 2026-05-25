// Download images listed in _switch-images.json into /uploads, then update
// the matching product rows in products.db so each gets its hero image.
//
// Run: node download-switch-images.mjs
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import https from 'https';
import http from 'http';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imageMap = JSON.parse(readFileSync(path.join(__dirname, '_switch-images.json'), 'utf8'));
const db = new Database(path.join(__dirname, 'products.db'));

function normalizeUrl(u) {
  if (u.startsWith('//')) return 'https:' + u;
  return u;
}

function pickExt(url) {
  const clean = url.split(/[?#]/)[0].toLowerCase();
  const m = clean.match(/\.(jpe?g|png|webp|avif|gif)$/);
  return m ? '.' + m[1].replace('jpeg', 'jpg') : '.jpg';
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return download(new URL(res.headers.location, url).href, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        writeFileSync(dest, Buffer.concat(chunks));
        resolve();
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('timeout')));
  });
}

const updateImages = db.prepare('UPDATE products SET images = ? WHERE slug = ?');
const getProduct = db.prepare('SELECT id, slug, images FROM products WHERE slug = ?');

const results = { ok: [], fail: [], skipped: [] };

for (const [slug, url] of Object.entries(imageMap)) {
  const product = getProduct.get(slug);
  if (!product) { results.skipped.push(`${slug} (no product)`); continue; }

  const ext = pickExt(url);
  const filename = `${slug}${ext}`;
  const dest = path.join(__dirname, 'uploads', filename);

  try {
    if (!existsSync(dest)) {
      await download(normalizeUrl(url), dest);
    }
    updateImages.run(JSON.stringify([`/uploads/${filename}`]), slug);
    results.ok.push(slug);
  } catch (e) {
    results.fail.push(`${slug}: ${e.message}`);
  }
}

console.log(`Downloaded + linked: ${results.ok.length}`);
console.log(`Failed: ${results.fail.length}`);
results.fail.forEach(f => console.log('  ✗', f));
if (results.skipped.length) console.log('Skipped:', results.skipped);
