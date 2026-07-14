// Fills in specs for the Buffalo TeraStation 1400R (NAS TS1400R1204-EU RackMount)
// and fixes its filtering: the product was stored with brand "NAS" (a bogus brand
// facet on the shop sidebar) instead of "Buffalo". Idempotent — safe to re-run.
import { getProductBySlug, updateProduct } from '../database.js';

const slug = 'nas-ts1400r1204-eu-rackmount';
const p = getProductBySlug(slug);
if (!p) throw new Error(`Product not found: ${slug}`);

const update = {
  // Prefix "Buffalo" so it matches the sibling NAS products and search.
  name: 'Buffalo NAS TS1400R1204-EU RackMount',
  brand: 'Buffalo',
  short_description:
    'Buffalo TeraStation 1400R (TS1400R1204-EU) — NAS 1U rackmount 4-bay me 12TB (4 × 3TB SATA), RAID 0/1/5/6/10, dy porta Gigabit Ethernet.',
  description:
    'Buffalo TeraStation 1400R (TS1400R1204-EU) është një NAS 1U rackmount i ndërtuar për biznese të vogla dhe zyra që kërkojnë ruajtje të centralizuar dhe të besueshme të të dhënave. Vjen me 4 disqe 3.5" SATA hot-swap me kapacitet total 12TB (4 × 3TB) dhe mbështet nivelet e RAID 0, 1, 5, 6, 10 dhe JBOD për mbrojtje të të dhënave. Përdor procesor Marvell ARMADA 370 me 1.2 GHz dhe 512 MB RAM DDR3, me dy porta Gigabit Ethernet për tolerancë ndaj defekteve dhe shpejtësi, plus porta USB për backup lokal. Ideal për backup, ndarje skedarësh dhe ruajtje qendrore në rrjet. Gjendja: i përdorur dhe i testuar.',
  attributes: {
    Brand: 'Buffalo',
    Model: 'TS1400R1204-EU (TeraStation 1400R)',
    Kapaciteti: '12TB (4 × 3TB SATA)',
    Bays: '4-bay hot-swap 3.5" SATA',
    CPU: 'Marvell ARMADA 370 1.2 GHz',
    RAM: '512 MB DDR3',
    RAID: '0 / 1 / 5 / 6 / 10 / JBOD',
    Rrjeti: '2 × Gigabit Ethernet',
    USB: '1 × USB 2.0, 2 × USB 3.0',
    'Form Factor': '1U Rackmount',
    Gjendja: 'I përdorur',
  },
};

const out = updateProduct(p.id, update);
console.log(`Updated #${out.id}: ${out.name} (brand: ${out.brand})`);
console.log('Attributes:', JSON.stringify(out.attributes, null, 2));
