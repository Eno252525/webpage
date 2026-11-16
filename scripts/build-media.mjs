// Builds webroot/media/ (site imagery + clips) from the originals in _media_src/.
// Images → WebP at the sizes the pages use; videos → muted H.264 with faststart.
//   FFMPEG=/path/to/ffmpeg node scripts/build-media.mjs
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, '_media_src');
const OUT = path.join(root, 'webroot', 'media');
const FF = process.env.FFMPEG || 'ffmpeg';
fs.mkdirSync(path.join(OUT, 'p'), { recursive: true });

const img = n => path.join(SRC, 'img', `${n}.webp`);
async function make(n, out, { w, h, q = 76, crop, pos = 'centre' }) {
  let s = sharp(img(n));
  if (crop) s = s.extract(crop);
  await s.resize(w, h, { fit: 'cover', position: pos }).webp({ quality: q, effort: 5 }).toFile(path.join(OUT, out));
}

// ── Category tiles (square) ────────────────────────────────────────────────
const CATS = { workstation: 25, pc: 11, laptop: 26, gaming: 13, gpu: 22, monitore: 14, server: 20, ram: 28, storage: 29, aio: 2, nas: 24, aksesore: 15 };
for (const [slug, n] of Object.entries(CATS)) {
  const crop = slug === 'aio' ? { left: 0, top: 440, width: 1116, height: 1116 } : undefined;
  await make(n, `cat-${slug}.webp`, { w: 720, h: 720, crop });
}
await make(25, 'cat-workstation-wide.webp', { w: 1200, h: 720, crop: { left: 0, top: 380, width: 2000, height: 1200 } });

// ── Section imagery (16:9) ─────────────────────────────────────────────────
await make(36, 'hero-poster.webp', { w: 1600, h: 893, q: 70 });
await make(40, 'process-1.webp', { w: 1280, h: 714 });
await make(41, 'process-2.webp', { w: 1280, h: 714 });
await make(42, 'process-3.webp', { w: 1280, h: 714 });
await make(37, 'process-4.webp', { w: 1280, h: 714 });
await make(38, 'whatsapp.webp', { w: 1600, h: 893, q: 72 });
await make(42, 'guide-refurbished.webp', { w: 800, h: 450 });
await make(10, 'guide-laptop.webp', { w: 800, h: 450, crop: { left: 100, top: 330, width: 1800, height: 1012 } });
await make(37, 'guide-tirana.webp', { w: 800, h: 450 });
await make(39, 'gaming-case.webp', { w: 900, h: 900 });
await make(6, 'gpu-tall.webp', { w: 720, h: 1280 });

// ── Product studio shots (square, shown second in the product gallery) ────
const PRODUCTS = {
  'nvidia-rtx-3090-24gb': 22,
  'apple-imac-24-m1-2021': 2,
  'lenovo-thinkpad-t14s': 26,
  'lenovo-thinkpad-t14-gen2': 10,
  'hp-z8-g4': 23,
  'hp-z8-g4-ai-server-2x-xeon-platinum-8168-rtx-3090': 25,
  'msi-msi-infinite-b904': 13,
  'dell-precision-5820': 7, 'dell-precision-5820-2': 7, 'dell-precision-5820-3': 7,
  'acer-kg271b-monitor-27-240hz': 9,
  'cooler-master-assembluar': 12,
  'lg-32ud99-w': 14,
  'humanscale-m8-1-monitor-arm': 15,
  'pc-gaming-ryzen-5-5600-rx-580': 16,
  'fujitsu-esprimo-p910-i5-3220': 17,
  'dell-pro-max-tower-t2-ultra-7-265k': 19,
  'hp-dl380-g10-24sff-gold-6132-32gb': 20, 'hp-dl380-g10-gold-6138': 20,
  'buffalo-nas-ls441d': 24,
  'hp-z2-g5-i7-10700': 27,
  'ram-ddr4-pc-udimm': 28,
  'ram-ddr4-laptop-so-dimm': 8,
  'buffalo-terastation-ws5220dn-2x-2tb-hdd': 29, 'buffalo-nas-ws5220dn08w6eu': 29,
  'nvidia-quadro-rtx-5000-graphics-card': 31,
  'hp-zbook-15-g3': 33,
  'hp-z840': 35, 'hp-z840-e5-2643-v3-gtx-980': 35,
};
const done = new Set();
for (const n of new Set(Object.values(PRODUCTS))) {
  const crop = n === 2 ? { left: 0, top: 440, width: 1116, height: 1116 } : undefined;
  await make(n, `p/studio-${n}.webp`, { w: 1200, h: 1200, q: 80, crop });
  done.add(n);
}

// ── Videos ─────────────────────────────────────────────────────────────────
const vid = n => path.join(SRC, 'vid', `${n}.mp4`);
const enc = ['-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
const ff = (args) => execFileSync(FF, ['-v', 'error', '-y', ...args]);
const one = (n, out) => ff(['-i', vid(n), ...enc, path.join(OUT, out)]);
one('hero_loop_seamless', 'hero.mp4');
one('showroom_flythrough', 'showroom.mp4');
one('whatsapp_clip', 'whatsapp.mp4');
one('morph1_gpu_to_msi', 'morph.mp4');
ff(['-i', vid('process_1to2'), '-i', vid('process_2to3'), '-i', vid('process_3to4'),
  '-filter_complex', '[0:v][1:v][2:v]concat=n=3:v=1:a=0[v]', '-map', '[v]', ...enc, path.join(OUT, 'process.mp4')]);
const PVID = {
  'nvidia-rtx-3090-24gb': '001_nvidia-rtx-3090-24gb',
  'hp-z8-g4-ai-server-2x-xeon-platinum-8168-rtx-3090': '002_hp-z8-g4-ai-server-2x-xeon-platinum-8168-128gb-ddr4-1tb-nvme',
  'buffalo-nas-ls441d': '004_buffalo-nas-ls441d',
  'lenovo-thinkpad-t14s': '006_lenovo-thinkpad-t14s-i7-10610u-16gb-ram-256gb-ssd',
  'hp-z840': '007_hp-z840-e5-2698-v4-16gb-ram-256gb-ssd-p2000',
  'pc-gaming-ryzen-5-5600-rx-580': '014_pc-gaming-ryzen-5-5600-16gb-ddr4-256gb-ssd-rx-580-8gb',
  'nvidia-quadro-rtx-5000-graphics-card': '016_nvidia-quadro-rtx-5000-graphics-card',
  'hp-zbook-15-g3': '019_hp-zbook-15-g3-e3-1505m-v5-32gb-ram-512gb-ssd-quadro-m2000m',
  'dell-pro-max-tower-t2-ultra-7-265k': '020_dell-pro-max-tower-t2-ultra-7-265k-32gb-ddr5-512gb-nvme-rtx-',
  'acer-kg271b-monitor-27-240hz': '022_acer-kg271b-monitor-27-240hz',
  'hp-dl380-g10-24sff-gold-6132-32gb': '023_hp-proliant-dl380-gen10-24x-sff-2x-xeon-gold-6132-32gb',
  'lenovo-thinkpad-t14-gen2': '024_lenovo-thinkpad-t14-gen-2-i5-1145g7-16gb-ram-256gb-ssd',
  'msi-msi-infinite-b904': '028_msi-infinite-b904-i7-14700kf-32gb-ram-1tb-nvme-ssd',
};
const vnum = {};
for (const [slug, f] of Object.entries(PVID)) { const k = f.slice(0, 3); vnum[slug] = k; one(f, `p/spin-${k}.mp4`); }

// ── Manifest the server reads (media-map.js) ───────────────────────────────
const map = {};
for (const [slug, n] of Object.entries(PRODUCTS)) map[slug] = { studio: `/media/p/studio-${n}.webp` };
for (const [slug, k] of Object.entries(vnum)) (map[slug] ||= {}).video = `/media/p/spin-${k}.mp4`;
// Same machine, other configurations: share the clip.
map['hp-z8-g4'].video = map['hp-z8-g4-ai-server-2x-xeon-platinum-8168-rtx-3090'].video;
map['hp-z840-e5-2643-v3-gtx-980'].video = map['hp-z840'].video;
map['hp-dl380-g10-gold-6138'].video = map['hp-dl380-g10-24sff-gold-6132-32gb'].video;
fs.writeFileSync(path.join(root, 'media-map.json'), JSON.stringify(map, null, 2) + '\n');
console.log('media built:', fs.readdirSync(OUT).length, 'files +', fs.readdirSync(path.join(OUT, 'p')).length, 'product files');
