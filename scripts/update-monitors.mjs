import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'products.db'));

// id -> { specs, price, sale_price }
// price = "regular" (was) price, sale_price = current selling price.
// For single-price items (no "from X to Y"), set price only, sale_price null.
const updates = {
  // Acer K251QEBI 24.5" — 3500 (single price)
  321: {
    specs: {
      'Screen Size': '24.5"',
      'Resolution': '1920 x 1080 (Full HD)',
      'Refresh Rate': '75 Hz',
      'Panel': 'IPS',
      'Response Time': '1 ms (VRB)',
      'Ports': 'VGA, HDMI',
      'Features': 'AMD FreeSync, Zero Frame',
    },
    price: 3500,
    sale_price: null,
  },
  // Acer KG271B 27" 240Hz — 12000 from 15000
  322: {
    specs: {
      'Screen Size': '27"',
      'Resolution': '1920 x 1080 (Full HD)',
      'Refresh Rate': '240 Hz',
      'Panel': 'TN',
      'Response Time': '1 ms',
      'Ports': 'HDMI, DisplayPort, DVI',
      'Features': 'AMD FreeSync, Gaming',
    },
    price: 15000,
    sale_price: 12000,
  },
  // Dell P2722H 27" — 12000 from 15000
  324: {
    specs: {
      'Screen Size': '27"',
      'Resolution': '1920 x 1080 (Full HD)',
      'Refresh Rate': '60 Hz',
      'Panel': 'IPS',
      'Response Time': '8 ms (5 ms fast)',
      'Ports': 'HDMI, DisplayPort, VGA, USB hub',
      'Features': 'Height/tilt/swivel/pivot adjustable, ComfortView Plus',
    },
    price: 15000,
    sale_price: 12000,
  },
  // Eizo FlexScan EV2736W — specs only, no price change
  319: {
    specs: {
      'Screen Size': '27"',
      'Resolution': '2560 x 1440 (QHD)',
      'Refresh Rate': '60 Hz',
      'Panel': 'IPS',
      'Response Time': '6 ms',
      'Ports': 'DVI-D, DisplayPort, HDMI',
      'Features': 'Auto EcoView, height adjustable, pivot',
    },
  },
  // Fujitsu P27-8 TS Pro 27" — 12000 from 15000
  325: {
    specs: {
      'Screen Size': '27"',
      'Resolution': '2560 x 1440 (QHD)',
      'Refresh Rate': '60 Hz',
      'Panel': 'IPS',
      'Response Time': '5 ms',
      'Ports': 'DisplayPort, HDMI, DVI-D, VGA, USB hub',
      'Features': 'Height adjustable, pivot, eco-friendly',
    },
    price: 15000,
    sale_price: 12000,
  },
  // HP E231 23" — 3000 from 4000
  326: {
    specs: {
      'Screen Size': '23"',
      'Resolution': '1920 x 1080 (Full HD)',
      'Refresh Rate': '60 Hz',
      'Panel': 'IPS',
      'Response Time': '7 ms',
      'Ports': 'VGA, DVI-D, DisplayPort',
      'Features': 'Height adjustable, pivot, tilt/swivel',
    },
    price: 4000,
    sale_price: 3000,
  },
  // HP E233 23" — 5500 from 7500
  327: {
    specs: {
      'Screen Size': '23"',
      'Resolution': '1920 x 1080 (Full HD)',
      'Refresh Rate': '60 Hz',
      'Panel': 'IPS',
      'Response Time': '5 ms',
      'Ports': 'VGA, HDMI, DisplayPort, USB 3.0 hub',
      'Features': 'Height adjustable, pivot, narrow bezel',
    },
    price: 7500,
    sale_price: 5500,
  },
  // HP E242 24" — 4500 from 6500
  328: {
    specs: {
      'Screen Size': '24"',
      'Resolution': '1920 x 1200 (WUXGA)',
      'Refresh Rate': '60 Hz',
      'Panel': 'IPS',
      'Response Time': '7 ms',
      'Ports': 'VGA, HDMI, DisplayPort, USB 3.0 hub',
      'Features': 'Height adjustable, pivot, 16:10 aspect',
    },
    price: 6500,
    sale_price: 4500,
  },
  // HP E27 G4 27" — 15000 from 17000
  329: {
    specs: {
      'Screen Size': '27"',
      'Resolution': '1920 x 1080 (Full HD)',
      'Refresh Rate': '60 Hz',
      'Panel': 'IPS',
      'Response Time': '5 ms',
      'Ports': 'VGA, HDMI, DisplayPort',
      'Features': 'Height adjustable, pivot, low blue light',
    },
    price: 17000,
    sale_price: 15000,
  },
  // HP Z24i G2 24" — 8500 from 10000
  330: {
    specs: {
      'Screen Size': '24"',
      'Resolution': '1920 x 1200 (WUXGA)',
      'Refresh Rate': '60 Hz',
      'Panel': 'IPS',
      'Response Time': '8 ms (5 ms fast)',
      'Ports': 'VGA, HDMI, DisplayPort, USB 3.0 hub',
      'Features': 'Height adjustable, pivot, 16:10 aspect',
    },
    price: 10000,
    sale_price: 8500,
  },
  // HP Z27n G2 27" — 12000 from 14000
  331: {
    specs: {
      'Screen Size': '27"',
      'Resolution': '2560 x 1440 (QHD)',
      'Refresh Rate': '60 Hz',
      'Panel': 'IPS',
      'Response Time': '8 ms (5 ms fast)',
      'Ports': 'USB-C, DisplayPort, Mini DP, HDMI, USB 3.0 hub',
      'Features': 'USB-C with 65W power delivery, height adjustable, pivot',
    },
    price: 14000,
    sale_price: 12000,
  },
  // HP Z24n G3 — specs only, no price change
  333: {
    specs: {
      'Screen Size': '24"',
      'Resolution': '1920 x 1200 (WUXGA)',
      'Refresh Rate': '60 Hz',
      'Panel': 'IPS',
      'Response Time': '5 ms',
      'Ports': 'USB-C, DisplayPort, HDMI, USB 3.0 hub',
      'Features': 'USB-C with 65W power delivery, height adjustable, pivot, 16:10 aspect',
    },
  },
  // LG 32UD99-W — 20000 from 30000
  335: {
    specs: {
      'Screen Size': '32"',
      'Resolution': '3840 x 2160 (4K UHD)',
      'Refresh Rate': '60 Hz',
      'Panel': 'IPS',
      'Response Time': '5 ms (GTG)',
      'Ports': 'USB-C, HDMI x2, DisplayPort, USB 3.0 hub',
      'Features': 'HDR10, sRGB 95%, AMD FreeSync, height adjustable, pivot',
    },
    price: 30000,
    sale_price: 20000,
  },
  // Lenovo T27i-10 27" — specs only, no price change
  332: {
    specs: {
      'Screen Size': '27"',
      'Resolution': '1920 x 1080 (Full HD)',
      'Refresh Rate': '60 Hz',
      'Panel': 'IPS',
      'Response Time': '4 ms',
      'Ports': 'VGA, HDMI, DisplayPort, USB 3.0 hub',
      'Features': 'Height adjustable, pivot, low blue light',
    },
  },
  // Microsoft Surface Hub 2S 50" — specs only, no price change
  320: {
    specs: {
      'Screen Size': '50"',
      'Resolution': '3840 x 2560 (4K+)',
      'Refresh Rate': '60 Hz',
      'Panel': 'IPS PixelSense, multi-touch',
      'Ports': 'USB-C, HDMI, DisplayPort, USB-A',
      'Features': 'Pen + touch input, Windows 10 Team, integrated speakers/mic/camera',
    },
  },
};

const updateAttrs = db.prepare(
  `UPDATE products SET attributes = ?, updated_at = datetime('now') WHERE id = ?`
);
const updatePrice = db.prepare(
  `UPDATE products SET price = ?, sale_price = ?, updated_at = datetime('now') WHERE id = ?`
);

const tx = db.transaction(() => {
  for (const [idStr, u] of Object.entries(updates)) {
    const id = Number(idStr);
    updateAttrs.run(JSON.stringify(u.specs), id);
    if (typeof u.price === 'number') {
      updatePrice.run(u.price, u.sale_price ?? null, id);
    }
  }
  // Remove Acer V223WL 22" (id 323)
  const del = db.prepare('DELETE FROM products WHERE id = 323').run();
  console.log('Deleted Acer V223WL rows:', del.changes);
});

tx();

// Verify
const rows = db
  .prepare(
    `SELECT id, name, price, sale_price, in_stock, attributes
     FROM products WHERE category_id = 3 ORDER BY name`
  )
  .all();
console.log('\n— Monitors after update —');
for (const r of rows) {
  const attrs = JSON.parse(r.attributes || '{}');
  console.log(
    `#${r.id} ${r.name}\n  price=${r.price} sale=${r.sale_price ?? '-'} stock=${r.in_stock}\n  ${Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(' | ')}\n`
  );
}
