// Catalog consistency pass #2, 2026-08-18.
//
//  A. HP Z2 G5 duplicate pricing — both listings to 55,000.
//  B. Dell Latitude 5500 duplicate — drop the sold-out row, put the survivor
//     on sale at 20,000 (was 25,000).
//  C. sale_price: collapse the two spellings of "no sale" (0 and NULL) onto
//     NULL. This is not cosmetic — see the comment on the step.
//  D. uploads/: rename the misspelled fujitsu-celcius-* image files to
//     -celsius- and repoint the DB at them.
//  E. #411 is not a switch: it is an ATTO/NetApp FibreBridge 7500N FC-to-SAS
//     storage bridge. Corrected and moved out of the Switch category.
//
// Idempotent: keyed by id, re-asserts target values, and the file renames check
// for the destination first — safe to re-run, including on the server, which is
// required because products.db and uploads/ are both git-ignored.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');
const uploads = path.join(root, 'uploads');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = path.join(root, `products.db.bak-${stamp}`);
fs.copyFileSync(dbPath, backup);
console.log('Backup:', path.basename(backup), '\n');

const db = new Database(dbPath);
const get = db.prepare('SELECT * FROM products WHERE id = ?');
const note = (s) => console.log(s);

function setFields(id, fields) {
  const row = get.get(id);
  if (!row) { note(`  ! #${id} missing — skipped`); return; }
  const changed = Object.entries(fields).filter(([k, v]) => row[k] !== v);
  if (!changed.length) return;
  db.prepare(`UPDATE products SET ${changed.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ?`)
    .run(...changed.map(([, v]) => v), id);
  for (const [k, v] of changed) note(`  #${id} ${k}: ${JSON.stringify(row[k])} -> ${JSON.stringify(v)}`);
}

const run = db.transaction(() => {
  // ── A. HP Z2 G5 ────────────────────────────────────────────────────────────
  // #198 and #478 are the same machine (i7-10700 / 32GB / 512GB) at two prices.
  note('A. HP Z2 G5 price alignment');
  setFields(198, { price: 55000 });

  // ── B. Dell Latitude 5500 ──────────────────────────────────────────────────
  // #241 (sold out, 25,000) duplicated #220 (in stock, 20,000). Keep #220, and
  // present it as a 25,000 -> 20,000 sale.
  note('\nB. Dell Latitude 5500 duplicate');
  setFields(220, { price: 25000, sale_price: 20000 });
  {
    const dup = get.get(241);
    if (!dup) note('  #241 already removed');
    else {
      db.prepare('DELETE FROM products WHERE id = ?').run(241);
      note(`  deleted #241 ${dup.slug} (sold out) -> 301 to /product/dell-latitude-5500`);
    }
  }

  // ── C. sale_price "no sale" -> NULL ────────────────────────────────────────
  // Not cosmetic: webroot/js/basket.js builds the WhatsApp line with
  //     price: product.sale_price ?? product.price
  // and `??` only falls through on null/undefined. A stored 0 therefore reaches
  // the basket as a literal 0 L. Every other read path already normalises via
  // COALESCE(NULLIF(sale_price, 0), price) or `> 0`, so NULL is the value the
  // codebase actually treats as "no sale".
  note('\nC. sale_price 0 -> NULL (no-sale marker)');
  const zeroed = db.prepare('SELECT COUNT(*) c FROM products WHERE sale_price = 0').get().c;
  if (zeroed) {
    db.prepare('UPDATE products SET sale_price = NULL WHERE sale_price = 0').run();
    note(`  ${zeroed} products normalised`);
  } else {
    note('  already normalised');
  }

  // ── D. misspelled image filenames ──────────────────────────────────────────
  note('\nD. uploads/: fujitsu-celcius-* -> fujitsu-celsius-*');
  let renamed = 0, repointed = 0;
  for (const file of fs.existsSync(uploads) ? fs.readdirSync(uploads) : []) {
    if (!file.includes('celcius')) continue;
    const to = file.replace(/celcius/g, 'celsius');
    const src = path.join(uploads, file);
    const dst = path.join(uploads, to);
    if (fs.existsSync(dst)) { fs.rmSync(src); note(`  ${file} -> ${to} (destination existed; removed duplicate)`); }
    else { fs.renameSync(src, dst); note(`  ${file} -> ${to}`); }
    renamed++;
  }
  if (!renamed) note('  no files left to rename');

  for (const row of db.prepare("SELECT id, images FROM products WHERE images LIKE '%celcius%'").all()) {
    const fixed = row.images.replace(/celcius/g, 'celsius');
    db.prepare('UPDATE products SET images = ? WHERE id = ?').run(fixed, row.id);
    note(`  #${row.id} images -> ${fixed}`);
    repointed++;
  }
  if (!repointed) note('  no DB references left to repoint');

  // ── E. #411 is a storage bridge, not a switch ──────────────────────────────
  // The product photo reads "ATTO / NetApp — FibreBridge 7500N", and the model
  // number FCBR-7500-DN1 is ATTO's: a 1U appliance that bridges 16Gb Fibre
  // Channel to 12Gb SAS JBOD shelves. It has no Ethernet switching function, so
  // a "Layer" value would be fiction — instead it moves out of Switch (where
  // the sidebar expects Ports/Layer) into Networking > Others, and gets the
  // ports it actually has. "Firebridge" was a misreading of "FibreBridge".
  note('\nE. #411 ATTO FibreBridge 7500N (was filed as a switch)');
  {
    const OTHERS_NETWORKING = db.prepare("SELECT id FROM categories WHERE slug = 'others-networking'").get();
    const row = get.get(411);
    if (!row) note('  ! #411 missing — skipped');
    else {
      setFields(411, {
        name: 'ATTO FibreBridge 7500N (NetApp) — 16Gb FC në 12Gb SAS Storage Bridge',
        slug: 'atto-fibrebridge-7500n',
        short_description:
          'Storage bridge ATTO FibreBridge 7500N (NetApp, FCBR-7500-DN1) — lidh shelfa SAS/SATA JBOD me një SAN Fibre Channel. Rack 1U, dy ushqyes.',
        attributes: JSON.stringify({
          Brand: 'ATTO / NetApp',
          Model: 'FibreBridge 7500N (FCBR-7500-DN1)',
          Ports: '2x 16Gb Fibre Channel (SFP+)',
          SAS: '4x 12Gb SAS/SATA (Mini-SAS HD)',
          Menaxhimi: '2x 100/1000BASE-T RJ45 + RS-232 serial',
          Ushqimi: '2x power supply (redundant)',
          'Form Factor': '1U Rackmount',
          Gjendja: 'I përdorur / Testuar',
        }),
        ...(OTHERS_NETWORKING ? { category_id: OTHERS_NETWORKING.id } : {}),
      });
    }
  }

  db.prepare("UPDATE products SET updated_at = datetime('now') WHERE id IN (198,220,411)").run();
});

run();
db.close();
console.log('\nDone.');
