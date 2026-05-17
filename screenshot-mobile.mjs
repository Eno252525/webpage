import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const url = process.argv[2] || 'http://localhost:3000';
const w = parseInt(process.argv[3] || '390');
const h = parseInt(process.argv[4] || '844');
const label = process.argv[5] ? `-${process.argv[5]}` : `-${w}w`;
const scrollY = parseInt(process.argv[6] || '0');
const viewportOnly = process.argv[7] === 'vp';

const existing = fs.readdirSync(outDir).filter(f => f.startsWith('screenshot-') && f.endsWith('.png'));
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0')).filter(n => !isNaN(n));
const next = nums.length ? Math.max(...nums) + 1 : 1;

const filename = `screenshot-${next}${label}.png`;
const outPath = path.join(outDir, filename);

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: w, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1800));
if (scrollY) { await page.evaluate(y => window.scrollTo(0, y), scrollY); await new Promise(r => setTimeout(r, 500)); }
await page.screenshot({ path: outPath, fullPage: !viewportOnly });
await browser.close();

console.log(`Saved: temporary screenshots/${filename}`);
