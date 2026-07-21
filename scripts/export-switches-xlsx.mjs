import Database from 'better-sqlite3';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const db = new Database(path.join(root, 'products.db'), { readonly: true });

const rows = db.prepare('SELECT id,name,price,attributes FROM products WHERE category_id=18').all();

// --- helpers ---------------------------------------------------------------

function portCount(portsStr) {
  if (!portsStr) return 0;
  // handles "24/48x" -> take the larger, "12x", "48x"
  const m = portsStr.match(/(\d+)(?:\/(\d+))?\s*x/i);
  if (!m) return 0;
  return Math.max(Number(m[1]), m[2] ? Number(m[2]) : 0);
}

// per-port gigabit speed of the ACCESS ports, and a readable label
function portSpeed(portsStr) {
  const s = (portsStr || '').toLowerCase();
  if (/sfp\+|10g|10gbps/.test(s)) return { gbps: 10, label: '10G (SFP+)' };
  if (/10\/100\/1000/.test(s))    return { gbps: 1,   label: '1G (10/100/1000)' };
  if (/1g sfp|1g\b/.test(s))      return { gbps: 1,   label: '1G (SFP)' };
  if (/10\/100/.test(s))          return { gbps: 0.1, label: '100M (10/100)' };
  return { gbps: 1, label: portsStr || '—' };
}

// uplink number + speed from either "SFP" or "Uplink" attribute
function uplink(attr) {
  const raw = attr['Uplink'] || attr['SFP'] || '';
  if (!raw) return { text: '—', gbps: 0, count: 0 };
  let gbps = 0;
  if (/40g|qsfp/i.test(raw)) gbps = 40;
  else if (/sfp\+|10g/i.test(raw)) gbps = 10;
  else if (/1g|gigabit|10\/100\/1000|sfp/i.test(raw)) gbps = 1;
  const cm = raw.match(/(\d+)\s*x/i);
  const count = cm ? Number(cm[1]) : 0;
  return { text: raw, gbps, count };
}

function poe(attr, portsStr) {
  const p = (attr['PoE'] || '').toLowerCase();
  const ports = (portsStr || '').toLowerCase();
  if (p.includes('poe+') || ports.includes('poe+')) return 'PoE+';
  if (attr['PoE Budget'] || attr['Max PoE per Port']) {
    // infer from budget/per-port
    if (/30w|802\.3at|poe\+/i.test(attr['Max PoE per Port'] + attr['PoE Budget'])) return 'PoE+';
    return 'PoE';
  }
  if (p === 'yes' || ports.includes(' poe ')) return 'PoE';
  return 'No';
}

function switchingCapacity(attr, ports, ps, up) {
  // use stated capacity when present
  const cap = attr['Switching Capacity'];
  if (cap) {
    const m = cap.match(/([\d.]+)\s*(tbps|gbps)/i);
    if (m) {
      let v = Number(m[1]);
      if (/tbps/i.test(m[2])) v *= 1000;
      return { gbps: v, stated: true };
    }
  }
  // estimate: access ports (full-duplex) + uplinks
  const est = ports * ps.gbps * 2 + up.count * up.gbps * 2;
  return { gbps: Math.round(est * 10) / 10, stated: false };
}

function layerRank(attr) {
  const l = (attr['Layer'] || '').toLowerCase();
  if (/layer 3|l3/.test(l) && !/lite/.test(l)) return { r: 3, label: attr['Layer'] };
  if (/lite|layer 2\+|l2\+|static layer 3/.test(l)) return { r: 2, label: attr['Layer'] };
  if (/layer 2/.test(l)) return { r: 1, label: attr['Layer'] };
  return { r: 0, label: attr['Layer'] || '—' };
}

// --- build rows ------------------------------------------------------------

const data = rows.map(r => {
  let attr = {};
  try { attr = JSON.parse(r.attributes || '{}'); } catch {}
  const portsStr = attr['Ports'] || '';
  const ports = portCount(portsStr);
  const ps = portSpeed(portsStr);
  const up = uplink(attr);
  const poeVal = poe(attr, portsStr);
  const cap = switchingCapacity(attr, ports, ps, up);
  const layer = layerRank(attr);
  const hasPrice = Number(r.price) > 0;

  // ---- composite score (higher = better) ----
  let score = cap.gbps;                    // primary: raw switching capacity
  score += up.gbps === 40 ? 150 : up.gbps === 10 ? 60 : up.gbps === 1 ? 8 : 0;
  score += ps.gbps === 10 ? 100 : ps.gbps === 1 ? 20 : 0; // access-port generation
  score += layer.r * 15;                   // L3 > L2+ > L2
  score += poeVal === 'PoE+' ? 20 : poeVal === 'PoE' ? 10 : 0;
  score += ports * 0.2;                    // mild density factor

  return {
    name: r.name,
    ports,
    portSpeed: ps.label,
    uplink: up.text,
    poe: poeVal,
    capGbps: cap.gbps,
    capStated: cap.stated,
    layer: layer.label,
    price: r.price,
    hasPrice,
    score: Math.round(score * 10) / 10,
  };
});

// worst -> best
data.sort((a, b) => a.score - b.score);

// --- worksheet -------------------------------------------------------------

const header = [
  'Rank (Worst→Best)', 'Model', 'Port Count', 'Port Speed',
  'Uplink (number & speed)', 'PoE', 'Switching Capacity (Gbps)',
  'Layer', 'Price (Lekë)', 'Has Price?', 'Score',
];

const aoa = [header];
data.forEach((d, i) => {
  aoa.push([
    i + 1,
    d.name,
    d.ports || '',
    d.portSpeed,
    d.uplink,
    d.poe,
    d.capStated ? d.capGbps : `~${d.capGbps} (est.)`,
    d.layer,
    d.hasPrice ? d.price : '',
    d.hasPrice ? 'Yes' : 'No',
    d.score,
  ]);
});

const ws = xlsx.utils.aoa_to_sheet(aoa);
ws['!cols'] = [
  { wch: 16 }, { wch: 42 }, { wch: 10 }, { wch: 18 }, { wch: 40 },
  { wch: 7 }, { wch: 24 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
];
ws['!autofilter'] = { ref: xlsx.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }) };

const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Switches');

const out = path.join(root, 'Switches-worst-to-best.xlsx');
xlsx.writeFile(wb, out);
console.log('Wrote', out, 'with', data.length, 'switches');
