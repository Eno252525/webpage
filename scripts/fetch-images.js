import { createWriteStream, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

function normalize(s) {
  return String(s || '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Match brand + model against existing products (from products-final.json)
function matchExisting(brand, model, existingProducts) {
  if (!model && !brand) return null;

  const brandN = normalize(brand);
  const modelN = normalize(model);

  // Exact substring match: both brand and model appear in product name
  for (const p of existingProducts) {
    const nameN = normalize(p.name);
    const brandOk = !brandN || nameN.includes(brandN);
    const modelOk = modelN && nameN.includes(modelN);
    if (brandOk && modelOk) return p;
  }

  // Word-overlap fallback (≥50% overlap required)
  const queryWords = new Set(
    [...normalize(brand).split(' '), ...normalize(model).split(' ')]
      .filter(w => w.length > 2)
  );
  if (queryWords.size === 0) return null;

  let best = null, bestScore = 0;
  for (const p of existingProducts) {
    const pWords = new Set(normalize(p.name).split(' ').filter(w => w.length > 2));
    const overlap = [...queryWords].filter(w => pWords.has(w)).length;
    const score = overlap / queryWords.size;
    if (score > bestScore && score >= 0.5) { best = p; bestScore = score; }
  }
  return best;
}

async function fetchDDGImage(brand, model) {
  try {
    const query = `${brand} ${model} product`.trim();
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ITStore/1.0)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.Image && data.Image.startsWith('http')) return data.Image;
  } catch { /* timeout or network error — fall through */ }
  return null;
}

async function downloadImage(imageUrl, slug) {
  try {
    const ext = (imageUrl.match(/\.(png|jpg|jpeg|webp)/i)?.[1] || 'jpg').toLowerCase();
    const filename = `${slug.slice(0, 40)}-${Date.now()}.${ext}`;
    const destPath = path.join(UPLOADS_DIR, filename);

    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ITStore/1.0)' },
    });
    if (!res.ok) return null;
    if (!res.headers.get('content-type')?.startsWith('image/')) return null;

    await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
    return `/uploads/${filename}`;
  } catch {
    return null;
  }
}

function buildPlaceholder(brand, model) {
  const line1 = (brand || 'IT Store').slice(0, 18);
  const line2 = (model || '').slice(0, 22);
  const text = line2 ? `${line1}%0A${line2}` : line1;
  return `https://placehold.co/600x400/1e293b/94a3b8?text=${text}&font=raleway`;
}

export async function findImage({ brand = '', model = '', slug = '' }, existingProducts = []) {
  // Tier 1: reuse image from existing store product data
  const match = matchExisting(brand, model, existingProducts);
  if (match?.img) {
    return { url: match.img, source: 'matched', matchedName: match.name };
  }

  // Tier 2: DuckDuckGo instant answers API
  const ddgImg = await fetchDDGImage(brand, model);
  if (ddgImg) {
    const localPath = await downloadImage(ddgImg, slug);
    if (localPath) return { url: localPath, source: 'ddg-downloaded' };
    return { url: ddgImg, source: 'ddg-remote' };
  }

  // Tier 3: branded placeholder (always succeeds)
  return { url: buildPlaceholder(brand, model), source: 'placeholder' };
}
