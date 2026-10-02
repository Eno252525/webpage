// HP ProDesk 400 G6 SFF i5-9500 (id 559) goes to 22 000 L, and the
// ProDesk 600 G5 DM i5-9500T (id 560) no longer claims an NVMe SSD — it is
// listed as a plain 256GB SSD everywhere (name, short/long description, specs).
//
// Idempotent: sets absolute values, so a re-run re-asserts them. products.db is
// git-ignored, so run it on the server after a deploy too:
//   node scripts/set-prodesk-400-g6-price-600-g5-ssd-2026-10-02.mjs
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'products.db');

const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
fs.copyFileSync(dbPath, `${dbPath}.bak-${ts}`);

const db = new Database(dbPath);

db.transaction(() => {
  const sff = db.prepare("SELECT id FROM products WHERE slug = 'hp-prodesk-400-g6-sff-i5-9500'").get();
  if (!sff) throw new Error('ProDesk 400 G6 SFF i5-9500 not found');
  db.prepare('UPDATE products SET price = 22000, sale_price = NULL WHERE id = ?').run(sff.id);

  const mini = db.prepare("SELECT id, attributes FROM products WHERE slug = 'hp-prodesk-600-g5-dm-i5-9500t'").get();
  if (!mini) throw new Error('ProDesk 600 G5 DM i5-9500T not found');
  const attrs = JSON.parse(mini.attributes || '{}');
  attrs.SSD = '256GB';
  db.prepare(`UPDATE products SET
      name = ?, short_description = ?, description = ?, attributes = ?
    WHERE id = ?`).run(
    'HP Prodesk 600 G5 DM - i5-9500T / 8GB RAM / 256GB SSD',
    'HP Prodesk 600 G5 Desktop Mini 35W me Intel Core i5-9500T, 8GB RAM DDR4 (2x4GB) dhe SSD 256GB.',
    'HP ProDesk 600 G5 Desktop Mini (DM) është një kompjuter ultra-kompakt 35W që mund të vendoset mbi tavolinë, pas monitorit ose në një raft. I pajisur me procesor Intel Core i5-9500T (6 bërthama me konsum të ulët), 8GB memorie DDR4 SO-DIMM (2x4GB) dhe SSD 256GB për performancë të shpejtë. Punon i heshtur dhe me konsum të ulët energjie, ndaj është zgjidhje ideale për zyra, recepsione dhe pika pune ku hapësira është e kufizuar.',
    JSON.stringify(attrs),
    mini.id,
  );
})();

for (const r of db.prepare("SELECT id, name, price, attributes FROM products WHERE id IN (559, 560)").all()) console.log(r);
db.close();
