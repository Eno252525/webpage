import db from '../database.js';

const updates = [
  {
    id: 251,
    name: 'Apple MacBook Air 2020 - i5-1038NG7 / 8GB RAM / 256GB SSD',
    slug: 'apple-macbook-air-2020',
    short_description: 'Apple MacBook Air 2020 - i5-1038NG7 / 8GB RAM / 256GB SSD',
    price: 44900,
    attributes: { CPU: 'i5-1038NG7', RAM: '8GB', SSD: '256GB', Screen: '13.3"', GPU: 'Integrated' },
  },
  {
    id: 252,
    name: 'Apple MacBook Pro 2020 - i7-1068NG7 / 32GB RAM / 1TB SSD',
    slug: 'apple-macbook-pro-2020',
    short_description: 'Apple MacBook Pro 2020 - i7-1068NG7 / 32GB RAM / 1TB SSD',
    price: 60000,
    attributes: { CPU: 'i7-1068NG7', RAM: '32GB', SSD: '1TB', Screen: '13.3"', GPU: 'Integrated' },
  },
  {
    id: 253,
    name: 'Apple MacBook Pro 2019 - i9-9880H / 32GB RAM / 1TB SSD',
    slug: 'apple-macbook-pro-2019',
    short_description: 'Apple MacBook Pro 2019 - i9-9880H / 32GB RAM / 1TB SSD',
    price: 80000,
    attributes: { CPU: 'i9-9880H', RAM: '32GB', SSD: '1TB', Screen: '15.6"', GPU: 'Radeon Vega 4GB' },
  },
  {
    id: 254,
    name: 'Apple MacBook Air 2019 - i5-8210Y / 8GB RAM / 250GB SSD',
    slug: 'apple-macbook-air-2019',
    short_description: 'Apple MacBook Air 2019 - i5-8210Y / 8GB RAM / 250GB SSD',
    price: 43000,
    attributes: { CPU: 'i5-8210Y', RAM: '8GB', SSD: '250GB', Screen: '13.3"', GPU: 'Integrated' },
  },
];

const stmt = db.prepare(`
  UPDATE products
  SET name = :name,
      slug = :slug,
      short_description = :short_description,
      price = :price,
      attributes = :attributes,
      updated_at = datetime('now')
  WHERE id = :id
`);

for (const u of updates) {
  stmt.run({
    id: u.id,
    name: u.name,
    slug: u.slug,
    short_description: u.short_description,
    price: u.price,
    attributes: JSON.stringify(u.attributes),
  });
  console.log(`#${u.id} -> ${u.name} (${u.price} L, slug=${u.slug})`);
}
