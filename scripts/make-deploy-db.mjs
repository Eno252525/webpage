// Builds a server-ready copy of the catalog at deploy-db/products.db.
//
// Why this exists: products.db runs in WAL mode, so at any moment part of the
// data lives in products.db and part in products.db-wal. Uploading the .db on
// its own therefore ships half a database — and it lands next to whatever
// stale products.db-wal the server still has, which SQLite then replays over
// it. That is what produced "SQLITE_CORRUPT: database disk image is malformed"
// and took itstore.al down on 2026-09-08.
//
// VACUUM INTO is the fix: it always writes a single, fully self-contained,
// defragmented database with no journal to pair with. The output is named
// products.db exactly, so it uploads as-is — no renaming on the server, which
// is the other way this went wrong (a products-clean.db sitting next to the
// real products.db does nothing, because the app only ever opens products.db).
//
// The output is verified before it is offered: integrity_check must return ok
// and the product count must match the source, or the script fails loudly and
// writes nothing. It also reports any image the catalog references that is
// missing from uploads/, since photos are files on disk and do NOT travel
// inside the database.
//
// Read-only with respect to products.db, apart from a WAL checkpoint (which
// only folds pending writes into the main file). Safe to run any time:
//   node scripts/make-deploy-db.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'products.db');
const outDir = path.join(root, 'deploy-db');
const out = path.join(outDir, 'products.db');

if (!fs.existsSync(src)) throw new Error(`no products.db at ${src}`);
fs.mkdirSync(outDir, { recursive: true });
// VACUUM INTO refuses to overwrite, so clear any previous build first.
for (const f of [out, `${out}-wal`, `${out}-shm`]) if (fs.existsSync(f)) fs.unlinkSync(f);

const db = new Database(src);

// Fold any pending WAL writes into the main file so nothing is left behind.
const cp = db.pragma('wal_checkpoint(TRUNCATE)')[0];
console.log(`Checkpoint: ${cp.busy === 0 ? 'clean' : 'BUSY — close other processes and re-run'}`);

const srcCount = db.prepare('SELECT COUNT(*) c FROM products').get().c;
const srcIntegrity = db.prepare('PRAGMA integrity_check').get().integrity_check;
console.log(`Source:     ${srcCount} products, integrity ${srcIntegrity}`);
if (srcIntegrity !== 'ok') throw new Error('source products.db is damaged — do not deploy it');

const outSql = out.split(path.sep).join('/').replace(/'/g, "''");
db.exec(`VACUUM INTO '${outSql}'`);
db.close();

// Verify the artifact itself, not the source it came from.
const check = new Database(out, { readonly: true });
const outCount = check.prepare('SELECT COUNT(*) c FROM products').get().c;
const outIntegrity = check.prepare('PRAGMA integrity_check').get().integrity_check;
const rows = check.prepare('SELECT images FROM products').all();
check.close();

if (outIntegrity !== 'ok') throw new Error(`built file failed integrity_check: ${outIntegrity}`);
if (outCount !== srcCount) throw new Error(`product count mismatch: ${srcCount} -> ${outCount}`);
for (const suffix of ['-wal', '-shm']) {
  if (fs.existsSync(out + suffix)) throw new Error(`built file is not self-contained: ${out}${suffix} exists`);
}

console.log(`Built:      ${outCount} products, integrity ok, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);

// Photos live in uploads/, not in the DB — flag any the catalog points at but
// that are not on disk, so they can be uploaded alongside.
const missing = [];
for (const r of rows) {
  for (const img of JSON.parse(r.images || '[]')) {
    if (img.startsWith('/uploads/') && !fs.existsSync(path.join(root, img))) missing.push(img);
  }
}
console.log(`Images:     ${missing.length === 0 ? 'all referenced files present in uploads/' : `${missing.length} MISSING:`}`);
for (const m of missing.slice(0, 10)) console.log(`              ${m}`);

console.log(`
Ready: deploy-db/products.db

  1. Application Manager -> stop the app
  2. Upload deploy-db/products.db into /home/itstore/webpage/, replacing the
     one there. Do not rename it, and do not upload any -wal or -shm file.
  3. Delete products.db-wal and products.db-shm on the server if present.
  4. Keep view-counts.json — it restores the live view counts on startup.
  5. Application Manager -> restart. The app holds the old file open until
     you do, so without this the site keeps serving the previous catalog.

  Photos are separate: zip uploads/ and extract it into
  /home/itstore/webpage/uploads/ if any product shows a broken image.`);
