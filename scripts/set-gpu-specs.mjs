// Fills in specifications and an Albanian description for every product in the
// GPU category. The most important spec — the VRAM (Memoria) — is listed first
// so it heads the "Specifikimet" table on the product page.
//
// Matches products by slug and only touches the `attributes`, `description` and
// (where empty) `short_description` fields — price, images, stock etc. are left
// untouched. Idempotent: re-running simply re-applies the same values, and a
// slug that isn't present is skipped with a warning.
//
// Attribute key order is preserved by the product page's spec renderer, so keep
// "Memoria" first in each `attributes` object.
//
// Run:  node scripts/set-gpu-specs.mjs
import { getProductBySlug, updateProduct, getCategories } from '../database.js';

const gpuCat = getCategories().find((c) => c.slug === 'gpu');
if (!gpuCat) throw new Error('GPU category missing — check database seeding.');

// desc() builds a short Albanian description from the spec pieces so every card
// reads consistently. `use` is a one-line positioning sentence per card.
function desc({ name, vram, gpu, iface, outputs, tdp, use }) {
  return (
    `${name} — ${use}\n\n` +
    `Memoria: ${vram}. Procesori grafik: ${gpu}. Ndërfaqja: ${iface}. ` +
    `Daljet: ${outputs}. Konsumi tipik (TDP): ${tdp}.\n\n` +
    `Kartë grafike e përdorur, e testuar dhe në gjendje pune. ` +
    `Për disponueshmërinë dhe përputhshmërinë me sistemin tuaj, na kontaktoni në WhatsApp.`
  );
}

// Each entry: slug + the spec fields. `mem` is the headline VRAM (capacity +
// type); `bus` the memory bus width; `gpu` the chip + architecture; `iface` the
// PCIe interface; `out` the display outputs; `tdp` board power; `kind` the usage
// class shown as "Kategoria"; `use` the one-line positioning sentence.
const gpus = [
  {
    slug: 'asus-geforce-210-silent-low-profile-v2',
    mem: '1 GB DDR3', bus: '64-bit', gpu: 'GeForce GT 210 (GT218, Tesla)',
    iface: 'PCIe 2.0 x16', out: '1× VGA, 1× DVI, 1× HDMI', tdp: '30 W',
    kind: 'Dalje ekrani / Zyrë', cooling: 'Pasive (pa ventilator)',
    use: 'kartë hyrëse low-profile pa ventilator, ideale për dalje ekrani në PC zyre dhe sisteme kompakte.',
  },
  {
    slug: 'msi-geforce-2080-super-graphics-card',
    mem: '8 GB GDDR6', bus: '256-bit', gpu: 'GeForce RTX 2080 SUPER (TU104, Turing)',
    iface: 'PCIe 3.0 x16', out: '3× DisplayPort, 1× HDMI', tdp: '250 W',
    kind: 'Gaming / Krijues', cooling: 'Aktive (dy ventilatorë)',
    use: 'kartë gaming e klasës së lartë me ray-tracing dhe DLSS për lojëra 1440p/4K dhe punë krijuese.',
  },
  {
    slug: 'msi-n750-ti-tf-2gd5-oc',
    mem: '2 GB GDDR5', bus: '128-bit', gpu: 'GeForce GTX 750 Ti (GM107, Maxwell)',
    iface: 'PCIe 3.0 x16', out: '2× DVI, 1× Mini-HDMI', tdp: '60 W',
    kind: 'Gaming buxhetor', cooling: 'Aktive (Twin Frozr, OC)',
    use: 'kartë gaming buxhetore me konsum të ulët që punon pa lidhje shtesë PCIe.',
  },
  {
    slug: 'nvidia-quadro-2000-graphics-card',
    mem: '1 GB GDDR5', bus: '128-bit', gpu: 'Quadro 2000 (GF106, Fermi)',
    iface: 'PCIe 2.0 x16', out: '1× DVI, 2× DisplayPort', tdp: '62 W',
    kind: 'Workstation / CAD', cooling: 'Aktive',
    use: 'kartë workstation për CAD, modelim 3D dhe aplikacione profesionale me driver-a të certifikuar.',
  },
  {
    slug: 'nvidia-quadro-4000-graphics-card',
    mem: '2 GB GDDR5', bus: '256-bit', gpu: 'Quadro 4000 (GF100, Fermi)',
    iface: 'PCIe 2.0 x16', out: '1× DVI, 2× DisplayPort', tdp: '142 W',
    kind: 'Workstation / CAD', cooling: 'Aktive',
    use: 'kartë workstation e mesme për CAD/CAE dhe përpunim 3D me driver-a profesionalë.',
  },
  {
    slug: 'nvidia-quadro-5000-graphics-card-2-5gb-gpu',
    mem: '2.5 GB GDDR5', bus: '320-bit', gpu: 'Quadro 5000 (GF100, Fermi)',
    iface: 'PCIe 2.0 x16', out: '1× DVI, 2× DisplayPort', tdp: '152 W',
    kind: 'Workstation / CAD', cooling: 'Aktive',
    use: 'kartë workstation e fuqishme për vizualizim 3D, CAD dhe render profesional.',
  },
  {
    slug: 'nvidia-quadro-600-graphics-card',
    mem: '1 GB DDR3', bus: '128-bit', gpu: 'Quadro 600 (GF108, Fermi)',
    iface: 'PCIe 2.0 x16', out: '1× DVI, 1× DisplayPort', tdp: '40 W',
    kind: 'Workstation hyrëse', cooling: 'Aktive',
    use: 'kartë workstation hyrëse me konsum të ulët për CAD 2D/3D dhe aplikacione profesionale.',
  },
  {
    slug: 'nvidia-quadro-k2200-graphics-card',
    mem: '4 GB GDDR5', bus: '128-bit', gpu: 'Quadro K2200 (GM107, Maxwell)',
    iface: 'PCIe 2.0 x16', out: '1× DVI, 2× DisplayPort', tdp: '68 W',
    kind: 'Workstation / CAD', cooling: 'Aktive',
    use: 'kartë workstation efikase me 4 GB memorie për CAD, SolidWorks dhe modelim 3D.',
  },
  {
    slug: 'nvidia-quadro-k4200-graphics-card',
    mem: '4 GB GDDR5', bus: '256-bit', gpu: 'Quadro K4200 (GK104, Kepler)',
    iface: 'PCIe 2.0 x16', out: '1× DVI, 2× DisplayPort', tdp: '108 W',
    kind: 'Workstation / CAD', cooling: 'Aktive',
    use: 'kartë workstation e klasës së mesme për CAD/CAM, render dhe vizualizim 3D.',
  },
  {
    slug: 'nvidia-quadro-k5000-graphics-card',
    mem: '4 GB GDDR5', bus: '256-bit', gpu: 'Quadro K5000 (GK104, Kepler)',
    iface: 'PCIe 2.0 x16', out: '2× DVI, 2× DisplayPort', tdp: '122 W',
    kind: 'Workstation / CAD', cooling: 'Aktive',
    use: 'kartë workstation e fuqishme me katër dalje ekrani për CAD dhe përpunim profesional.',
  },
  {
    slug: 'nvidia-quadro-k600-graphics-card',
    mem: '1 GB DDR3', bus: '128-bit', gpu: 'Quadro K600 (GK107, Kepler)',
    iface: 'PCIe 2.0 x16', out: '1× DVI, 1× DisplayPort', tdp: '41 W',
    kind: 'Workstation hyrëse', cooling: 'Aktive',
    use: 'kartë workstation hyrëse me konsum të ulët për CAD 2D/3D dhe punë profesionale bazë.',
  },
  {
    slug: 'nvidia-quadro-k620-graphics-card',
    mem: '2 GB DDR3', bus: '128-bit', gpu: 'Quadro K620 (GM107, Maxwell)',
    iface: 'PCIe 2.0 x16', out: '1× DVI, 1× DisplayPort', tdp: '45 W',
    kind: 'Workstation hyrëse', cooling: 'Aktive',
    use: 'kartë workstation hyrëse me 2 GB memorie dhe konsum të ulët për CAD dhe aplikacione profesionale.',
  },
  {
    slug: 'nvidia-quadro-m2000-graphics-card',
    mem: '4 GB GDDR5', bus: '128-bit', gpu: 'Quadro M2000 (GM206, Maxwell)',
    iface: 'PCIe 3.0 x16', out: '4× DisplayPort', tdp: '75 W',
    kind: 'Workstation / CAD', cooling: 'Aktive',
    use: 'kartë workstation me katër dalje DisplayPort, pa lidhje shtesë PCIe, për CAD dhe modelim 3D.',
  },
  {
    slug: 'nvidia-quadro-m4000-graphics-card',
    mem: '8 GB GDDR5', bus: '256-bit', gpu: 'Quadro M4000 (GM204, Maxwell)',
    iface: 'PCIe 3.0 x16', out: '4× DisplayPort', tdp: '120 W',
    kind: 'Workstation / CAD', cooling: 'Aktive',
    use: 'kartë workstation me 8 GB memorie për render, vizualizim dhe skena 3D komplekse.',
  },
  {
    slug: 'nvidia-quadro-m5000-graphics-card',
    mem: '8 GB GDDR5', bus: '256-bit', gpu: 'Quadro M5000 (GM204, Maxwell)',
    iface: 'PCIe 3.0 x16', out: '4× DisplayPort, 1× DVI', tdp: '150 W',
    kind: 'Workstation / CAD', cooling: 'Aktive',
    use: 'kartë workstation e klasës së lartë me 8 GB memorie për CAD, VR dhe render profesional.',
  },
  {
    slug: 'nvidia-quadro-p1000-graphics-card',
    mem: '4 GB GDDR5', bus: '128-bit', gpu: 'Quadro P1000 (GP107, Pascal)',
    iface: 'PCIe 3.0 x16', out: '4× Mini-DisplayPort', tdp: '47 W',
    kind: 'Workstation kompakte', cooling: 'Aktive',
    use: 'kartë workstation kompakte low-profile me katër dalje 4K për CAD dhe stacione multi-monitor.',
  },
  {
    slug: 'nvidia-quadro-p2000-graphics-card',
    mem: '5 GB GDDR5', bus: '160-bit', gpu: 'Quadro P2000 (GP106, Pascal)',
    iface: 'PCIe 3.0 x16', out: '4× DisplayPort', tdp: '75 W',
    kind: 'Workstation / CAD', cooling: 'Aktive',
    use: 'kartë workstation e balancuar me 5 GB memorie, pa lidhje shtesë PCIe, për CAD dhe modelim 3D.',
  },
  {
    slug: 'nvidia-quadro-p2200-graphics-card',
    mem: '5 GB GDDR5X', bus: '160-bit', gpu: 'Quadro P2200 (GP106, Pascal)',
    iface: 'PCIe 3.0 x16', out: '4× DisplayPort', tdp: '75 W',
    kind: 'Workstation / CAD', cooling: 'Aktive',
    use: 'kartë workstation me 5 GB GDDR5X dhe katër dalje DisplayPort për CAD, BIM dhe vizualizim.',
  },
  {
    slug: 'nvidia-quadro-p4000-graphics-card',
    mem: '8 GB GDDR5', bus: '256-bit', gpu: 'Quadro P4000 (GP104, Pascal)',
    iface: 'PCIe 3.0 x16', out: '4× DisplayPort', tdp: '105 W',
    kind: 'Workstation / VR', cooling: 'Aktive',
    use: 'kartë workstation single-slot me 8 GB memorie për render, VR dhe skena 3D të mëdha.',
  },
  {
    slug: 'nvidia-quadro-p5000-graphics-card',
    mem: '16 GB GDDR5X', bus: '256-bit', gpu: 'Quadro P5000 (GP104, Pascal)',
    iface: 'PCIe 3.0 x16', out: '4× DisplayPort, 1× DVI', tdp: '180 W',
    kind: 'Workstation / VR', cooling: 'Aktive',
    use: 'kartë workstation me 16 GB memorie për projekte të mëdha CAD, VR dhe render me kërkesa të larta.',
  },
  {
    slug: 'nvidia-quadro-p600-graphics-card',
    mem: '2 GB GDDR5', bus: '128-bit', gpu: 'Quadro P600 (GP107, Pascal)',
    iface: 'PCIe 3.0 x16', out: '4× Mini-DisplayPort', tdp: '40 W',
    kind: 'Workstation kompakte', cooling: 'Aktive',
    use: 'kartë workstation kompakte low-profile me katër dalje për stacione multi-monitor dhe CAD bazë.',
  },
  {
    slug: 'nvidia-quadro-p6000-graphics-card',
    mem: '24 GB GDDR5X', bus: '384-bit', gpu: 'Quadro P6000 (GP102, Pascal)',
    iface: 'PCIe 3.0 x16', out: '4× DisplayPort, 1× DVI', tdp: '250 W',
    kind: 'Workstation flagship', cooling: 'Aktive',
    use: 'kartë workstation flagship me 24 GB memorie për render profesional, simulime dhe skena 3D masive.',
  },
  {
    slug: 'nvidia-quadro-p620-graphics-card',
    mem: '2 GB GDDR5', bus: '128-bit', gpu: 'Quadro P620 (GP107, Pascal)',
    iface: 'PCIe 3.0 x16', out: '4× Mini-DisplayPort', tdp: '40 W',
    kind: 'Workstation kompakte', cooling: 'Aktive',
    use: 'kartë workstation kompakte low-profile me katër dalje 4K për CAD dhe konfigurime multi-monitor.',
  },
  {
    slug: 'nvidia-quadro-rtx-4000-graphics-card',
    mem: '8 GB GDDR6', bus: '256-bit', gpu: 'Quadro RTX 4000 (TU104, Turing)',
    iface: 'PCIe 3.0 x16', out: '3× DisplayPort, 1× USB-C (VirtualLink)', tdp: '160 W',
    kind: 'Workstation / RTX', cooling: 'Aktive (single-slot)',
    use: 'kartë workstation me ray-tracing dhe Tensor Cores, 8 GB GDDR6, për render, AI dhe punë 3D.',
  },
  {
    slug: 'nvidia-quadro-rtx-5000-graphics-card',
    mem: '16 GB GDDR6', bus: '256-bit', gpu: 'Quadro RTX 5000 (TU104, Turing)',
    iface: 'PCIe 3.0 x16', out: '4× DisplayPort, 1× USB-C (VirtualLink)', tdp: '230 W',
    kind: 'Workstation / RTX', cooling: 'Aktive',
    use: 'kartë workstation me 16 GB GDDR6, ray-tracing dhe Tensor Cores për render, VR dhe ngarkesa AI.',
  },
  {
    slug: 'nvidia-rtx-3090-24gb',
    mem: '24 GB GDDR6X', bus: '384-bit', gpu: 'GeForce RTX 3090 (GA102, Ampere)',
    iface: 'PCIe 4.0 x16', out: '3× DisplayPort, 1× HDMI 2.1', tdp: '350 W',
    kind: 'Gaming flagship / Krijues', cooling: 'Aktive',
    use: 'kartë flagship me 24 GB GDDR6X për gaming 4K, render dhe ngarkesa AI/ML kërkuese.',
  },
  {
    slug: 'nvidia-rtx-3090-suprim-x',
    mem: '24 GB GDDR6X', bus: '384-bit', gpu: 'GeForce RTX 3090 (GA102, Ampere)',
    iface: 'PCIe 4.0 x16', out: '3× DisplayPort, 1× HDMI 2.1', tdp: '350 W',
    kind: 'Gaming flagship / Krijues', cooling: 'Aktive (MSI SUPRIM X, tri-ventilatorë, factory OC)',
    use: 'versioni premium MSI SUPRIM X i RTX 3090 me ftohje tri-ventilatorësh dhe overclock nga fabrika, 24 GB GDDR6X.',
  },
  {
    slug: 'nvidia-tesla-c2075-graphics-card',
    mem: '6 GB GDDR5', bus: '384-bit', gpu: 'Tesla C2075 (GF110, Fermi)',
    iface: 'PCIe 2.0 x16', out: '1× DVI (kryesisht për llogaritje GPGPU)', tdp: '225 W',
    kind: 'Llogaritje / GPGPU', cooling: 'Aktive',
    use: 'akselerator llogaritës GPGPU me 6 GB memorie dhe mbështetje CUDA për simulime dhe llogaritje shkencore.',
  },
  {
    slug: 'zotac-gt640-zone-edition-graphics-card',
    mem: '2 GB DDR3', bus: '128-bit', gpu: 'GeForce GT 640 (GK107, Kepler)',
    iface: 'PCIe 3.0 x16', out: '1× VGA, 1× DVI, 1× HDMI', tdp: '65 W',
    kind: 'Dalje ekrani / HTPC', cooling: 'Pasive (pa ventilator, Zone Edition)',
    use: 'kartë pa ventilator dhe krejt e heshtur, ideale për HTPC, dalje ekrani dhe media.',
  },
  {
    slug: 'zotac-geforce-1050-ti-graphics-card',
    mem: '4 GB GDDR5', bus: '128-bit', gpu: 'GeForce GTX 1050 Ti (GP107, Pascal)',
    iface: 'PCIe 3.0 x16', out: '1× DVI, 1× HDMI, 1× DisplayPort', tdp: '75 W',
    kind: 'Gaming buxhetor', cooling: 'Aktive',
    use: 'kartë gaming buxhetore me 4 GB memorie që punon pa lidhje shtesë PCIe — e shkëlqyer për lojëra 1080p.',
  },
];

let updated = 0;
let missing = 0;
for (const g of gpus) {
  const existing = getProductBySlug(g.slug);
  if (!existing) {
    console.warn(`Missing (skipped): ${g.slug}`);
    missing++;
    continue;
  }

  // "Memoria" first so the VRAM heads the spec table.
  const attributes = {
    Memoria: g.mem,
    'Ndërfaqja e Memories': g.bus,
    GPU: g.gpu,
    Ndërfaqja: g.iface,
    Daljet: g.out,
    'Konsumi (TDP)': g.tdp,
    Ftohja: g.cooling,
    Kategoria: g.kind,
  };

  const description = desc({
    name: existing.name,
    vram: g.mem,
    gpu: g.gpu,
    iface: g.iface,
    outputs: g.out,
    tdp: g.tdp,
    use: g.use,
  });

  // Leave a hand-written short_description alone; only fill it if empty.
  const short = existing.short_description && existing.short_description.trim()
    ? existing.short_description
    : `${existing.name} — ${g.mem}, ${g.gpu}.`;

  updateProduct(existing.id, {
    attributes,
    description,
    short_description: short,
  });
  console.log(`Updated #${existing.id}: ${existing.name}  →  ${g.mem}`);
  updated++;
}

console.log(`\nDone. Updated ${updated}, missing ${missing}, of ${gpus.length}.`);
