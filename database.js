import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'products.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL UNIQUE,
    parent_id  INTEGER REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT NOT NULL,
    slug              TEXT NOT NULL UNIQUE,
    short_description TEXT DEFAULT '',
    description       TEXT DEFAULT '',
    price             REAL NOT NULL,
    sale_price        REAL,
    category_id       INTEGER REFERENCES categories(id),
    images            TEXT DEFAULT '[]',
    attributes        TEXT DEFAULT '{}',
    badge             TEXT,
    featured          INTEGER DEFAULT 0,
    in_stock          INTEGER DEFAULT 1,
    created_at        TEXT DEFAULT (datetime('now')),
    updated_at        TEXT DEFAULT (datetime('now'))
  );
`);

// ── Migration: add brand column if missing ───────────────────────────────────
try {
  db.exec(`ALTER TABLE products ADD COLUMN brand TEXT DEFAULT ''`);
} catch {
  // column already exists
}

// ── Migration: add view_count column if missing ──────────────────────────────
try {
  db.exec(`ALTER TABLE products ADD COLUMN view_count INTEGER DEFAULT 0`);
} catch {
  // column already exists
}

// ── Migration: add laptop subcategories if missing ───────────────────────────
{
  const laptopCat = db.prepare("SELECT id FROM categories WHERE slug = 'laptop'").get();
  if (laptopCat) {
    const insertSub = db.prepare(
      'INSERT OR IGNORE INTO categories (name, slug, parent_id, sort_order) VALUES (?, ?, ?, ?)'
    );
    insertSub.run('Business Laptops', 'business-laptops', laptopCat.id, 1);
    insertSub.run('Workstation Laptops', 'workstation-laptops', laptopCat.id, 2);
  }
}

// ── Migration: add Komponente subcategories if missing ───────────────────────
{
  const komponenteCat = db.prepare("SELECT id FROM categories WHERE slug = 'komponente'").get();
  if (komponenteCat) {
    const insertSub = db.prepare(
      'INSERT OR IGNORE INTO categories (name, slug, parent_id, sort_order) VALUES (?, ?, ?, ?)'
    );
    insertSub.run('Caddy', 'caddy', komponenteCat.id, 0);
    insertSub.run('Karta Rrjeti', 'karta-rrjeti', komponenteCat.id, 0);
    insertSub.run('RAID Controller', 'raid-controller', komponenteCat.id, 0);
    insertSub.run('SAS', 'sas', komponenteCat.id, 0);
  }
}

// ── Seed default categories (only if empty) ──────────────────────────────────

const catCount = db.prepare('SELECT COUNT(*) as n FROM categories').get().n;
if (catCount === 0) {
  const insertCat = db.prepare(
    'INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, ?)'
  );
  const cats = [
    ['Laptop', 'laptope', 1],
    ['Desktop', 'desktop', 2],
    ['Monitor', 'monitore', 3],
    ['Rrjet', 'rrjet', 6],
    ['Gaming', 'gaming', 7],
    ['Licenses', 'licenses', 8],
  ];
  for (const [name, slug, sort_order] of cats) insertCat.run(name, slug, sort_order);
}

// ── Query helpers ────────────────────────────────────────────────────────────

function parseProduct(row) {
  if (!row) return null;
  return {
    ...row,
    images: JSON.parse(row.images || '[]'),
    attributes: JSON.parse(row.attributes || '{}'),
    featured: row.featured === 1,
    in_stock: row.in_stock === 1,
    sale_price: row.sale_price ?? null,
  };
}

export function getFormFactors({ category, brand } = {}) {
  const conditions = ["json_extract(p.attributes, '$.Form Factor') IS NOT NULL"];
  const params = {};

  if (category) {
    const cat = db.prepare('SELECT id FROM categories WHERE slug = ?').get(category);
    if (cat) {
      conditions.push('p.category_id IN (SELECT id FROM categories WHERE id = :catId OR parent_id = :catId)');
      params.catId = cat.id;
    }
  }
  if (brand) { conditions.push('LOWER(p.brand) = LOWER(:brand)'); params.brand = brand; }

  return db.prepare(`
    SELECT DISTINCT json_extract(p.attributes, '$.Form Factor') as form_factor
    FROM products p
    WHERE ${conditions.join(' AND ')}
    ORDER BY form_factor ASC
  `).all(params).map(r => r.form_factor);
}

export function getBrands({ category } = {}) {
  const conditions = ["p.brand IS NOT NULL AND p.brand != ''"];
  const params = {};

  if (category) {
    const cat = db.prepare('SELECT id FROM categories WHERE slug = ?').get(category);
    if (cat) {
      conditions.push('p.category_id IN (SELECT id FROM categories WHERE id = :catId OR parent_id = :catId)');
      params.catId = cat.id;
    }
  }

  return db.prepare(`
    SELECT DISTINCT p.brand FROM products p
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.brand ASC
  `).all(params).map(r => r.brand);
}

export function getProducts({ category, brand, form_factor, min_price, max_price, orderby, page, per_page, search, featured, sale } = {}) {
  const conditions = [];
  const params = {};

  if (category) {
    const cat = db.prepare('SELECT id FROM categories WHERE slug = ?').get(category);
    if (cat) {
      // Include products from this category AND all direct subcategories
      conditions.push('p.category_id IN (SELECT id FROM categories WHERE id = :catId OR parent_id = :catId)');
      params.catId = cat.id;
    }
  }
  if (brand) { conditions.push('LOWER(p.brand) = LOWER(:brand)'); params.brand = brand; }
  if (form_factor) { conditions.push("json_extract(p.attributes, '$.Form Factor') = :form_factor"); params.form_factor = form_factor; }
  if (min_price) { conditions.push('COALESCE(NULLIF(p.sale_price, 0), p.price) >= :min_price'); params.min_price = Number(min_price); }
  if (max_price) { conditions.push('COALESCE(NULLIF(p.sale_price, 0), p.price) <= :max_price'); params.max_price = Number(max_price); }
  if (search) { conditions.push("p.name LIKE :search"); params.search = `%${search}%`; }
  if (featured === '1' || featured === true) { conditions.push('p.featured = 1'); }
  if (sale === '1') { conditions.push('p.sale_price IS NOT NULL AND p.sale_price > 0'); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const orderMap = {
    price_asc: 'COALESCE(NULLIF(p.sale_price, 0), p.price) ASC',
    price_desc: 'COALESCE(NULLIF(p.sale_price, 0), p.price) DESC',
    newest: 'p.created_at DESC',
    featured: 'p.featured DESC, p.created_at DESC',
    popularity: 'p.view_count DESC, p.featured DESC, p.created_at DESC',
  };
  const order = orderMap[orderby] || 'p.created_at DESC';

  const limit = Math.min(Number(per_page) || 12, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const total = db.prepare(`SELECT COUNT(*) as n FROM products p ${where}`).get(params).n;

  const rows = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${where}
    ORDER BY ${order}
    LIMIT :limit OFFSET :offset
  `).all({ ...params, limit, offset });

  return {
    products: rows.map(parseProduct),
    total,
    pages: Math.ceil(total / limit),
    page: Math.max(Number(page) || 1, 1),
  };
}

export function getProduct(id) {
  const row = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(id);
  if (!row) return null;
  const product = parseProduct(row);

  // Related products (same category, exclude self)
  if (product.category_id) {
    const related = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ? AND p.id != ?
      ORDER BY p.created_at DESC LIMIT 8
    `).all(product.category_id, product.id);
    product.related = related.map(parseProduct);
  } else {
    product.related = [];
  }
  return product;
}

export function getProductBySlug(slug) {
  const row = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
  return row ? getProduct(row.id) : null;
}

const incrementViewStmt = db.prepare('UPDATE products SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?');
export function incrementProductViews(id) {
  try { incrementViewStmt.run(Number(id)); } catch { /* non-critical */ }
}

export function createProduct(data) {
  const stmt = db.prepare(`
    INSERT INTO products (name, slug, short_description, description, price, sale_price,
      category_id, images, attributes, badge, featured, in_stock, brand)
    VALUES (:name, :slug, :short_description, :description, :price, :sale_price,
      :category_id, :images, :attributes, :badge, :featured, :in_stock, :brand)
  `);
  const result = stmt.run({
    name: data.name,
    slug: data.slug,
    short_description: data.short_description || '',
    description: data.description || '',
    price: Number(data.price),
    sale_price: data.sale_price ? Number(data.sale_price) : null,
    category_id: data.category_id ? Number(data.category_id) : null,
    images: JSON.stringify(data.images || []),
    attributes: JSON.stringify(data.attributes || {}),
    badge: data.badge || null,
    featured: data.featured ? 1 : 0,
    in_stock: data.in_stock !== false ? 1 : 0,
    brand: data.brand || '',
  });
  return getProduct(result.lastInsertRowid);
}

export function updateProduct(id, data) {
  const fields = [];
  const params = { id };

  const allowed = ['name', 'slug', 'short_description', 'description', 'price', 'sale_price',
    'category_id', 'badge', 'featured', 'in_stock', 'brand'];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = :${key}`);
      params[key] = data[key];
    }
  }
  if (data.images !== undefined) { fields.push('images = :images'); params.images = JSON.stringify(data.images); }
  if (data.attributes !== undefined) { fields.push('attributes = :attributes'); params.attributes = JSON.stringify(data.attributes); }
  fields.push("updated_at = datetime('now')");

  db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = :id`).run(params);
  return getProduct(id);
}

export function deleteProduct(id) {
  const product = getProduct(id);
  if (!product) return null;
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return product;
}

export function searchProducts(q) {
  return db.prepare(`
    SELECT p.id, p.name, p.slug, p.price, p.sale_price, p.images
    FROM products p
    WHERE p.name LIKE ?
    ORDER BY p.featured DESC, p.name ASC
    LIMIT 6
  `).all(`%${q}%`).map(r => ({
    ...r,
    images: JSON.parse(r.images || '[]'),
  }));
}

export function getCategories() {
  return db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
}

export function createCategory(data) {
  const stmt = db.prepare('INSERT INTO categories (name, slug, parent_id, sort_order) VALUES (?, ?, ?, ?)');
  const result = stmt.run(data.name, data.slug, data.parent_id || null, data.sort_order || 0);
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
}

export function deleteCategory(id) {
  const used = db.prepare('SELECT COUNT(*) as n FROM products WHERE category_id = ?').get(id).n;
  if (used > 0) return { error: 'Kjo kategori ka produkte. Hiqeni produktet fillimisht.' };
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  return { ok: true };
}

export function getProductsForSitemap() {
  return db.prepare('SELECT slug, updated_at, images FROM products ORDER BY updated_at DESC').all();
}

export function getAllProductsAdmin() {
  return db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.created_at DESC
  `).all().map(parseProduct);
}

export default db;
