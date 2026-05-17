import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const url = process.argv[2] || 'http://localhost:3000';
const selector = process.argv[3] || 'body';
const label = process.argv[4] ? `-${process.argv[4]}` : '';

const existing = fs.readdirSync(outDir).filter(f => f.startsWith('screenshot-') && f.endsWith('.png'));
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0')).filter(n => !isNaN(n));
const next = nums.length ? Math.max(...nums) + 1 : 1;
const filename = `screenshot-${next}${label}.png`;
const outPath = path.join(outDir, filename);

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2000));

const rect = await page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top + window.scrollY, width: r.width, height: r.height };
}, selector);

if (!rect) { console.error('Element not found:', selector); await browser.close(); process.exit(1); }

await page.screenshot({ path: outPath, clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } });
await browser.close();
console.log(`Saved: temporary screenshots/${filename}`);
