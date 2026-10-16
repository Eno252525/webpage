// ── Spec filters ("facets") per product family ──────────────────────────────
// The shop sidebar shows only the filters that fit what the visitor is looking
// at: CPU / RAM / storage for computers, size / resolution for monitors, VRAM
// for graphics cards, and so on. Each facet turns a product's free-text
// `attributes` into a short, comparable value ("16GB DDR4 ECC" → "16GB",
// "i5-8500T" → "Intel Core i5" / "Gen 8"), so counts group cleanly.
//
// Facet ids are global (the URL carries them as f_<id>=<value>), and a group
// lists which facets it shows. Category slugs map to a group; a parent slug
// (desktop, laptop) maps to the group its children share. Switches keep their
// own SQL filters in database.js (sw_*), so the "switch" group has no facets
// here — shop.html renders those sections when the group is "switch".

const num = s => {
  const m = String(s ?? '').replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
};

// "1TB NVMe" → 1000, "512GB" → 512, "3.84TB" → 3840 (decimal, as drives are sold)
function sizeGB(s) {
  const m = String(s ?? '').replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(TB|GB)/i);
  if (!m) return null;
  return Number(m[1]) * (m[2].toUpperCase() === 'TB' ? 1000 : 1);
}


function cpuFamily(cpu) {
  const s = String(cpu ?? '').toLowerCase();
  if (!s) return null;
  if (/ultra\s*[579]\b/.test(s)) return 'Intel Core Ultra';
  const core = s.match(/(?:^|[^a-z])i([3579])(?:[-\s]|$)/);
  if (core) return `Intel Core i${core[1]}`;
  if (/ryzen/.test(s)) return 'AMD Ryzen';
  if (/\bapple\b|\bm[1-4]\b/.test(s)) return 'Apple M';
  if (/xeon|^(?:\d\s*x\s*)?(?:e[357]-|e-2\d|w-\d|w3\d|x3\d|e5\d{3}|gold|silver|platinum|bronze)/.test(s)) return 'Intel Xeon';
  if (/pentium|celeron|atom|^g\d{4}|core 2|q\d{4}/.test(s)) return 'Pentium / Celeron';
  if (/amd|a\d{1,2}-/.test(s)) return 'AMD';
  return null;
}

// Intel Core generation from the model number: i5-8500 → 8, i5-10500 → 10,
// i5-1145G7 → 11, plus the explicit "i5 Gen 9" wording.
function cpuGen(cpu) {
  const s = String(cpu ?? '');
  const g = s.match(/\bi[3579]\s*Gen\s*(\d{1,2})/i);
  if (g) return `Gen ${g[1]}`;
  const m = s.match(/\bi[3579]-(\d{3,5})/i);
  if (!m) return null;
  const d = m[1];
  let gen;
  if (d.length === 5) gen = d.slice(0, 2);
  else if (d.length === 4) gen = /^1[0-4]/.test(d) && /\d{4}[A-Z]/i.test(s.slice(m.index + 3)) ? d.slice(0, 2) : d.slice(0, 1);
  else gen = '1';
  return `Gen ${Number(gen)}`;
}

function ramLabel(v) {
  const gb = sizeGB(v);
  if (!gb) return null;
  return gb >= 256 ? '256GB+' : `${gb}GB`;
}

function storageBucket(v) {
  const gb = sizeGB(v);
  if (!gb) return null;
  if (gb <= 160) return '128GB';
  if (gb <= 300) return '256GB';
  if (gb <= 600) return '512GB';
  if (gb <= 1100) return '1TB';
  return '2TB+';
}

function gpuKind(v) {
  const s = String(v ?? '').toLowerCase();
  if (!s || /integr|intel|uhd|hd graphics/.test(s)) return 'E integruar';
  if (/radeon|\brx\b|rx\s?\d|amd|firepro|\bw\d{4}\b|wx\d/.test(s)) return 'AMD';
  return 'NVIDIA';
}

function screenBucket(v) {
  const n = num(v);
  if (!n) return null;
  if (n < 13.6) return '13" e poshtë';
  if (n < 14.6) return '14"';
  if (n < 16.5) return '15–16"';
  if (n < 18) return '17"';
  return `${Math.round(n)}"`;
}

function resolution(v) {
  const s = String(v ?? '').toLowerCase();
  if (!s) return null;
  if (/3840|4k|uhd|2160/.test(s)) return '4K UHD';
  if (/2560|1440p|qhd|wqhd|2k/.test(s)) return '2K QHD';
  if (/1920|1080|fhd|full hd/.test(s)) return 'Full HD';
  if (/1680|1600|1440\s*x\s*900|1366|1280/.test(s)) return 'HD';
  return null;
}

function panel(v) {
  const s = String(v ?? '').toLowerCase();
  if (/oled/.test(s)) return 'OLED';
  if (/ips/.test(s)) return 'IPS';
  if (/\bva\b/.test(s)) return 'VA';
  if (/\btn\b/.test(s)) return 'TN';
  return null;
}

function driveInterface(a) {
  const s = `${a.Interface ?? ''} ${a.Type ?? ''} ${a['Ndërfaqja'] ?? ''}`.toLowerCase();
  if (/nvme|pcie|m\.2/.test(s)) return 'NVMe / M.2';
  if (/\bsas\b|sas[-\s]/.test(s)) return 'SAS';
  if (/sata/.test(s)) return 'SATA';
  return null;
}

const CAPACITY_BUCKETS = ['Deri 256GB', '400–512GB', '600–960GB', '1–2TB', '3–4TB', '6TB+'];
function capacityBucket(gb) {
  if (!gb) return null;
  if (gb <= 260) return CAPACITY_BUCKETS[0];
  if (gb < 600) return CAPACITY_BUCKETS[1];
  if (gb < 1000) return CAPACITY_BUCKETS[2];
  if (gb <= 2000) return CAPACITY_BUCKETS[3];
  if (gb <= 4000) return CAPACITY_BUCKETS[4];
  return CAPACITY_BUCKETS[5];
}

// UPS rating in VA; a PDU rated only in kW has no VA and is left unfiltered.
function upsBucket(v) {
  const m = String(v ?? '').replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(k?VA)\b/i);
  if (!m) return null;
  const va = Number(m[1]) * (/^k/i.test(m[2]) ? 1000 : 1);
  if (va <= 1000) return 'Deri 1000VA';
  if (va < 3000) return '1000–2200VA';
  if (va < 5000) return '3000VA';
  return '5000VA+';
}

function netKind(v) {
  const s = String(v ?? '').toLowerCase();
  if (!s) return null;
  if (/firewall|security|ngfw/.test(s)) return 'Firewall';
  if (/router|isr/.test(s)) return 'Router';
  if (/console/.test(s)) return 'Console server';
  if (/voice/.test(s)) return 'Voice gateway';
  if (/fabric|fex/.test(s)) return 'Fabric extender';
  if (/wireless|wlc/.test(s)) return 'Wireless controller';
  return 'Module / Tjetër';
}

const raw = key => a => {
  const v = a[key];
  if (v == null || v === '') return null;
  return String(v).trim().slice(0, 40);
};

// id → { label, get(attrs) → value | null, order?(a, b) }
const byNumber = (a, b) => (num(a) ?? 1e9) - (num(b) ?? 1e9);
const bySize = (a, b) => (sizeGB(a) ?? 1e9) - (sizeGB(b) ?? 1e9) || a.localeCompare(b);
const fixed = list => (a, b) => (list.indexOf(a) + 1 || 99) - (list.indexOf(b) + 1 || 99);

export const FACET_DEFS = {
  cpu: {
    label: 'Procesori', get: a => cpuFamily(a.CPU),
    order: fixed(['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'Intel Core Ultra', 'Intel Xeon', 'AMD Ryzen', 'AMD', 'Apple M', 'Pentium / Celeron']),
  },
  gen: {
    label: 'Gjenerata (Intel Core)', get: a => (/^Intel Core i/.test(cpuFamily(a.CPU) || '') ? cpuGen(a.CPU) : null),
    order: (a, b) => num(b) - num(a),
  },
  ram: { label: 'RAM', get: a => ramLabel(a.RAM), order: bySize },
  storage: { label: 'Hapësira (SSD)', get: a => storageBucket(a.SSD ?? a.Storage ?? a.HDD), order: fixed(['128GB', '256GB', '512GB', '1TB', '2TB+']) },
  gpu: { label: 'Karta grafike', get: a => gpuKind(a.GPU), order: fixed(['NVIDIA', 'AMD', 'E integruar']) },
  screen: { label: 'Ekrani', get: a => screenBucket(a.Screen), order: byNumber },

  mon_size: { label: 'Madhësia', get: a => { const n = num(a['Screen Size']); return n ? `${Math.round(n)}"` : null; }, order: byNumber },
  mon_res: { label: 'Rezolucioni', get: a => resolution(a.Resolution), order: fixed(['4K UHD', '2K QHD', 'Full HD', 'HD']) },
  mon_hz: { label: 'Frekuenca', get: a => { const n = num(a['Refresh Rate']); return n ? `${n}Hz` : null; }, order: byNumber },
  mon_panel: { label: 'Paneli', get: a => panel(a.Panel), order: fixed(['IPS', 'VA', 'TN', 'OLED']) },

  vram: { label: 'Memoria', get: a => { const gb = sizeGB(a.Memoria); return gb ? `${gb}GB` : null; }, order: bySize },
  gpu_cat: {
    label: 'Përdorimi',
    get: a => { const s = String(a.Kategoria ?? '').toLowerCase(); if (!s) return null;
      if (/workstation/.test(s)) return 'Workstation / CAD'; if (/gaming/.test(s)) return 'Gaming';
      if (/llogaritje|gpgpu|ai\b/.test(s)) return 'AI / Llogaritje'; return 'Zyrë / Ekrane'; },
    order: fixed(['Workstation / CAD', 'Gaming', 'AI / Llogaritje', 'Zyrë / Ekrane']),
  },

  capacity: { label: 'Kapaciteti', get: a => capacityBucket(sizeGB(a.Capacity ?? a.Kapaciteti)), order: fixed(CAPACITY_BUCKETS) },
  iface: { label: 'Ndërfaqja', get: driveInterface, order: fixed(['NVMe / M.2', 'SAS', 'SATA']) },

  ram_type: { label: 'Tipi', get: a => { const m = String(a.Tipi ?? '').match(/DDR\d/i); return m ? m[0].toUpperCase() : null; }, order: (a, b) => a.localeCompare(b) },
  ram_use: { label: 'Për', get: raw('Përdorimi') },

  ups_cap: { label: 'Fuqia', get: a => upsBucket(a.Capacity ?? a.Power), order: fixed(['Deri 1000VA', '1000–2200VA', '3000VA', '5000VA+']) },

  forma: { label: 'Forma', get: a => { const s = String(a.Forma ?? ''); const m = s.match(/Rack\s*\dU|Tower/i); return m ? m[0].replace(/\s+/, ' ') : null; }, order: fixed(['Rack 1U', 'Rack 2U', 'Rack 3U', 'Rack 4U', 'Tower']) },
  bays: { label: 'Disqe', get: a => { const m = String(a.Bays ?? '').match(/(\d+)\s*-?\s*bay/i); return m ? `${m[1]} disqe` : null; }, order: byNumber },

  dock_conn: { label: 'Lidhja', get: a => { const m = String(a['Lidhja me laptopin'] ?? '').match(/Thunderbolt\s*\d|USB4|USB-C/i); return m ? m[0] : null; } },
  net_type: { label: 'Lloji', get: a => netKind(a.Type) },
  acc_type: { label: 'Lloji', get: raw('Tipi') },
  lic_platform: { label: 'Platforma', get: raw('Platforma') },
  lic_type: { label: 'Licensa', get: raw('Tipi i licensës') },
};

// group → the category slugs it covers and the facets it shows, in order.
export const FACET_GROUPS = {
  computers: {
    cats: ['desktop', 'pc', 'aio', 'workstation', 'gaming', 'pos', 'laptop', 'macbook', 'business-laptops', 'workstation-laptops'],
    facets: ['cpu', 'gen', 'ram', 'storage', 'gpu', 'screen'],
  },
  monitors: { cats: ['monitore'], facets: ['mon_size', 'mon_res', 'mon_hz', 'mon_panel'] },
  gpu: { cats: ['gpu'], facets: ['vram', 'gpu_cat'] },
  storage: { cats: ['ssd', 'hdd', 'sas', 'sas-hdd', 'sas-ssd', 'sas-nvme'], facets: ['capacity', 'iface'] },
  ram: { cats: ['ram'], facets: ['ram_type', 'ram_use'] },
  ups: { cats: ['ups'], facets: ['ups_cap'] },
  server: { cats: ['server'], facets: ['forma', 'cpu', 'ram'] },
  nas: { cats: ['nas'], facets: ['bays', 'capacity'] },
  switch: { cats: ['switch'], facets: [] },
  networking: { cats: ['others-networking'], facets: ['net_type'] },
  docking: { cats: ['docking-station'], facets: ['dock_conn'] },
  accessories: { cats: ['aksesore'], facets: ['acc_type'] },
  licenses: { cats: ['licensa'], facets: ['lic_platform', 'lic_type'] },
  parts: { cats: ['caddy', 'karta-rrjeti', 'raid-controller', 'procesor'], facets: [] },
};

const CAT_GROUP = {};
for (const [g, def] of Object.entries(FACET_GROUPS)) for (const c of def.cats) CAT_GROUP[c] = g;

export function groupForCategory(slug) {
  return CAT_GROUP[slug] || null;
}

// Facet values for one product (attributes already parsed).
export function facetValue(id, attrs) {
  const def = FACET_DEFS[id];
  if (!def) return null;
  try { return def.get(attrs || {}) ?? null; } catch { return null; }
}

// Pull f_<id>=<value> pairs out of a query object, keeping only known facets.
export function facetParams(query = {}) {
  const out = {};
  for (const [k, v] of Object.entries(query)) {
    if (!k.startsWith('f_') || v == null || v === '') continue;
    const id = k.slice(2);
    if (FACET_DEFS[id]) out[id] = String(v);
  }
  return out;
}
