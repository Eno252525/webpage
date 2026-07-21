// Fills in Albanian descriptions + structured specs for every Buffalo NAS, marks
// them all as new (badge "I RI" → the product page shows the "I Ri" tag instead
// of "Të Përdorur"), and prices the enterprise TeraStation 7120r (TS-2RZH96T12D-EU)
// at 70000 L. Specs verified against Buffalo product pages / distributor listings.
// Idempotent — safe to re-run.
import { getProductBySlug, updateProduct } from '../database.js';

const NEW_BADGE = 'I RI';

const updates = [
  {
    slug: 'nas-ts1400r1204-eu-rackmount',
    name: 'Buffalo NAS TS1400R1204-EU RackMount',
    brand: 'Buffalo',
    badge: NEW_BADGE,
    price: 15000,
    short_description:
      'Buffalo TeraStation 1400R (TS1400R1204-EU) — NAS 1U rackmount 4-bay me 12TB (4 × 3TB SATA), RAID 0/1/5/6/10, dy porta Gigabit Ethernet.',
    description:
      'Buffalo TeraStation 1400R (TS1400R1204-EU) është një NAS 1U rackmount i ndërtuar për biznese të vogla dhe zyra që kërkojnë ruajtje të centralizuar dhe të besueshme të të dhënave. Vjen me 4 disqe 3.5" SATA hot-swap me kapacitet total 12TB (4 × 3TB) dhe mbështet nivelet e RAID 0, 1, 5, 6, 10 dhe JBOD për mbrojtje të të dhënave. Përdor procesor Marvell ARMADA 370 me 1.2 GHz dhe 512 MB RAM DDR3, me dy porta Gigabit Ethernet për tolerancë ndaj defekteve dhe shpejtësi, plus porta USB për backup lokal. Ideal për backup, ndarje skedarësh dhe ruajtje qendrore në rrjet. Gjendja: i ri, i papërdorur.',
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
      Gjendja: 'I ri',
    },
  },
  {
    slug: 'buffalo-nas-ls441d',
    name: 'Buffalo NAS LS441D',
    brand: 'Buffalo',
    badge: NEW_BADGE,
    price: 10000,
    short_description:
      'Buffalo LinkStation 441D (LS441D) — NAS desktop 4-bay 3.5" SATA, RAID 0/1/5/10, Gigabit Ethernet, USB 3.0. Ideal për shtëpi dhe zyra të vogla.',
    description:
      'Buffalo LinkStation 441D (LS441D) është një NAS desktop 4-bay i projektuar për shtëpi dhe zyra të vogla që duan ruajtje qendrore dhe backup të automatizuar në rrjet. Katër foletë 3.5" SATA mbështesin kapacitet deri në 16TB dhe nivelet RAID 0, 1, 5, 10 dhe JBOD për siguri të të dhënave. Punon me procesor Marvell ARMADA 370 1.2 GHz dhe 512 MB RAM DDR3, me një portë Gigabit Ethernet dhe tre porta USB (1 × USB 2.0, 2 × USB 3.0) për backup të jashtëm. Vjen me server media DLNA/UPnP, server FTP dhe print, klient BitTorrent dhe softuer backup — një zgjidhje e plotë ruajtjeje me çmim të përballueshëm. Gjendja: i ri, i papërdorur.',
    attributes: {
      Brand: 'Buffalo',
      Model: 'LS441D (LinkStation 441D)',
      Kapaciteti: 'Deri në 16TB (4 × deri 4TB SATA)',
      Bays: '4-bay 3.5" SATA',
      CPU: 'Marvell ARMADA 370 1.2 GHz',
      RAM: '512 MB DDR3',
      RAID: '0 / 1 / 5 / 10 / JBOD',
      Rrjeti: '1 × Gigabit Ethernet',
      USB: '1 × USB 2.0, 2 × USB 3.0',
      'Form Factor': 'Desktop',
      Gjendja: 'I ri',
    },
  },
  {
    slug: 'buffalo-nas-ts-2rzh96t12d-eu',
    name: 'Buffalo NAS TS-2RZH96T12D-EU',
    brand: 'Buffalo',
    badge: NEW_BADGE,
    price: 70000,
    short_description:
      'Buffalo TeraStation 7120r Enterprise (TS-2RZH96T12D-EU) — NAS 2U rackmount 12-bay me 96TB (12 × 8TB), Intel Xeon, 8GB ECC, 4 × Gigabit, iSCSI.',
    description:
      'Buffalo TeraStation 7120r Enterprise (TS-2RZH96T12D-EU) është një NAS 2U rackmount i klasit enterprise, i ndërtuar për ngarkesa kritike biznesi, virtualizim dhe ruajtje me performancë të lartë. Ka 12 foletë hot-swap me kapacitet total 96TB (12 × 8TB disqe enterprise) dhe mbështet nivelet RAID 0, 1, 5, 6, 10, 51, 61 dhe JBOD, me disqe hot-spare për mbrojtje maksimale. Fuqizohet nga procesor Intel Xeon E3-1275 quad-core 3.4 GHz me 8GB memorie ECC, katër porta Gigabit Ethernet me link aggregation (deri në 4 Gbps) dhe slot PCI-Express për shtim të një karte 10GbE. Mbështet iSCSI si target virtualizimi, WebAccess për akses në distancë, backup në cloud dhe ushqim rezervë (redundant power) për disponueshmëri të vazhdueshme 24/7. Zgjidhja ideale për qendra të dhënash të vogla, ndarje skedarësh të mëdhenj dhe aplikime AutoCAD/video. Gjendja: i ri, i papërdorur.',
    attributes: {
      Brand: 'Buffalo',
      Model: 'TS-2RZH96T12D-EU (TeraStation 7120r Enterprise)',
      Kapaciteti: '96TB (12 × 8TB enterprise SATA)',
      Bays: '12-bay hot-swap 3.5" SATA',
      CPU: 'Intel Xeon E3-1275 quad-core 3.4 GHz',
      RAM: '8 GB ECC',
      RAID: '0 / 1 / 5 / 6 / 10 / 51 / 61 / JBOD',
      Rrjeti: '4 × Gigabit Ethernet (link aggregation) + slot PCIe për 10GbE',
      iSCSI: 'Po',
      Ushqimi: 'Redundant power supply',
      'Form Factor': '2U Rackmount',
      Gjendja: 'I ri',
    },
  },
  {
    slug: 'buffalo-nas-ts1200d0402-eu',
    name: 'Buffalo NAS TS1200D0402-EU',
    brand: 'Buffalo',
    badge: NEW_BADGE,
    price: 6000,
    short_description:
      'Buffalo TeraStation 1200D (TS1200D0402-EU) — NAS desktop 2-bay me 4TB (2 × 2TB), RAID 0/1/JBOD, Gigabit Ethernet. Ideal për zyra të vogla dhe shtëpi.',
    description:
      'Buffalo TeraStation 1200D (TS1200D0402-EU) është një NAS desktop 2-bay kompakt dhe i thjeshtë për t\'u përdorur, ideal për shtëpi dhe zyra të vogla që duan backup dhe ndarje skedarësh në rrjet. Vjen me 2 disqe 3.5" SATA me kapacitet total 4TB (2 × 2TB), të konfiguruar në RAID 1 për tepricë (redundancë) dhe mbështet gjithashtu RAID 0 dhe JBOD. Punon me procesor ARM 1.2 GHz dhe 512 MB RAM DDR3, me një portë Gigabit Ethernet dhe portë USB për backup të jashtëm. Mbështet replikim në kohë reale drejt një TeraStation tjetër, backup Time Machine për Mac dhe licenca NovaBACKUP për PC. Një zgjidhje e besueshme dhe ekonomike ruajtjeje qendrore. Gjendja: i ri, i papërdorur.',
    attributes: {
      Brand: 'Buffalo',
      Model: 'TS1200D0402-EU (TeraStation 1200D)',
      Kapaciteti: '4TB (2 × 2TB SATA)',
      Bays: '2-bay hot-swap 3.5" SATA',
      CPU: 'ARM 1.2 GHz',
      RAM: '512 MB DDR3',
      RAID: '0 / 1 / JBOD',
      Rrjeti: '1 × Gigabit Ethernet',
      USB: '1 × USB 2.0',
      'Form Factor': 'Desktop',
      Gjendja: 'I ri',
    },
  },
  {
    slug: 'buffalo-nas-ws5220dn08w6eu',
    name: 'Buffalo NAS WS5220DN08W6EU',
    brand: 'Buffalo',
    badge: NEW_BADGE,
    price: 10000,
    short_description:
      'Buffalo TeraStation WS5220DN (WS5220DN08W6EU) — NAS desktop 2-bay me 8TB (2 × 4TB), Windows Storage Server 2016 Workgroup, 8GB ECC, 10GbE + Gigabit.',
    description:
      'Buffalo TeraStation WS5220DN (WS5220DN08W6EU) është një NAS desktop 2-bay që punon me Windows Storage Server 2016 Workgroup Edition, duke ofruar integrim të plotë me mjediset Windows dhe Active Directory. Ka 2 disqe 3.5" SATA me kapacitet total 8TB (2 × 4TB) dhe mbështet RAID 0, 1 dhe JBOD. Ndërtohet me komponentë të klasit biznes për punë të qëndrueshme 24/7: procesor Intel Atom C3338, 8GB memorie ECC, një portë 10GbE (10GBASE-T) plus dy porta Gigabit Ethernet dhe porta USB 3.0. Mbështet protokollet CIFS/SMB, AFP, FTP, SFTP, NFS dhe SNMP, dhe është ideale për ndarje skedarësh, backup dhe ruajtje qendrore në rrjete biznesi. Gjendja: i ri, i papërdorur.',
    attributes: {
      Brand: 'Buffalo',
      Model: 'WS5220DN08W6EU (TeraStation WS5220DN)',
      'Sistemi Operativ': 'Windows Storage Server 2016 Workgroup',
      Kapaciteti: '8TB (2 × 4TB SATA)',
      Bays: '2-bay 3.5" SATA',
      CPU: 'Intel Atom C3338',
      RAM: '8 GB ECC',
      RAID: '0 / 1 / JBOD',
      Rrjeti: '1 × 10GbE (10GBASE-T) + 2 × Gigabit Ethernet',
      USB: '2 × USB 3.0',
      'Form Factor': 'Desktop',
      Gjendja: 'I ri',
    },
  },
];

for (const u of updates) {
  const p = getProductBySlug(u.slug);
  if (!p) {
    console.warn(`SKIP — product not found: ${u.slug}`);
    continue;
  }
  const out = updateProduct(p.id, u);
  console.log(`Updated #${out.id}: ${out.name} — ${out.price} L, badge "${out.badge}"`);
}
