import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  getAllProductsAdmin, getProduct, createProduct, updateProduct,
  deleteProduct, getCategories, createCategory, deleteCategory
} from '../database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Only allow real image extensions — blocks .html/.svg/.php disguised as images.
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const ALLOWED_MIME = /^image\/(jpeg|png|webp|gif|avif)$/;

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXT.has(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME.test(file.mimetype) && ALLOWED_EXT.has(ext)) cb(null, true);
    else cb(new Error('Vetëm imazhe lejohen (jpg, png, webp, gif, avif)'));
  },
});

// Resolve a stored "/uploads/..." path to a real file inside uploadsDir only.
function resolveUpload(imgPath) {
  if (typeof imgPath !== 'string' || !imgPath.startsWith('/uploads/')) return null;
  const abs = path.join(uploadsDir, path.basename(imgPath));
  if (path.dirname(abs) !== uploadsDir) return null;
  return abs;
}

const router = express.Router();

// ── Auth ─────────────────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Shumë përpjekje. Provoni sërish më vonë.',
});

router.post('/login', loginLimiter, async (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Fjalëkalimi mungon' });
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return res.status(500).json({ error: 'Admin password not configured' });

  const ok = await bcrypt.compare(password, hash);
  if (!ok) return res.status(401).json({ error: 'Fjalëkalim i gabuar' });

  const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('adminToken', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: req.secure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  res.clearCookie('adminToken', { httpOnly: true, sameSite: 'strict', secure: req.secure });
  res.json({ ok: true });
});

router.get('/check', requireAuth, (req, res) => res.json({ ok: true }));

// ── Products ─────────────────────────────────────────────────────────────────

router.get('/products', requireAuth, (req, res) => {
  res.json(getAllProductsAdmin());
});

router.post('/products', requireAuth, upload.array('images', 10), (req, res) => {
  try {
    const data = { ...req.body };
    // Handle attribute pairs sent as attributes[RAM]=16GB
    if (typeof data.attributes === 'string') {
      try { data.attributes = JSON.parse(data.attributes); } catch { data.attributes = {}; }
    }
    const uploadedImages = (req.files || []).map(f => `/uploads/${f.filename}`);
    const existingImages = data.existing_images ? JSON.parse(data.existing_images) : [];
    data.images = [...existingImages, ...uploadedImages];
    data.featured = data.featured === 'true' || data.featured === '1';
    data.in_stock = data.in_stock !== 'false' && data.in_stock !== '0';
    const product = createProduct(data);
    res.status(201).json(product);
  } catch (err) {
    console.error('[admin] create product —', err.message);
    res.status(400).json({ error: 'Ruajtja e produktit dështoi.' });
  }
});

router.put('/products/:id', requireAuth, upload.array('images', 10), (req, res) => {
  try {
    const data = { ...req.body };
    if (typeof data.attributes === 'string') {
      try { data.attributes = JSON.parse(data.attributes); } catch { data.attributes = {}; }
    }
    const uploadedImages = (req.files || []).map(f => `/uploads/${f.filename}`);
    const existingImages = data.existing_images ? JSON.parse(data.existing_images) : [];
    data.images = [...existingImages, ...uploadedImages];
    data.featured = data.featured === 'true' || data.featured === '1';
    data.in_stock = data.in_stock !== 'false' && data.in_stock !== '0';
    if (data.sale_price === '' || data.sale_price === 'null') data.sale_price = null;
    const product = updateProduct(Number(req.params.id), data);
    if (!product) return res.status(404).json({ error: 'Produkti nuk u gjet' });
    res.json(product);
  } catch (err) {
    console.error('[admin] update product —', err.message);
    res.status(400).json({ error: 'Përditësimi i produktit dështoi.' });
  }
});

router.delete('/products/:id', requireAuth, (req, res) => {
  try {
    const product = deleteProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ error: 'Produkti nuk u gjet' });
    // Delete image files (only those that resolve inside uploads/)
    for (const imgPath of product.images) {
      const abs = resolveUpload(imgPath);
      if (abs && fs.existsSync(abs)) fs.unlinkSync(abs);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin] delete product —', err.message);
    res.status(500).json({ error: 'Fshirja dështoi.' });
  }
});

// ── Categories ────────────────────────────────────────────────────────────────

router.get('/categories', requireAuth, (req, res) => {
  res.json(getCategories());
});

router.post('/categories', requireAuth, (req, res) => {
  try {
    const { name, slug, parent_id, sort_order } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Emri dhe slug janë të detyrueshëm' });
    const cat = createCategory({ name, slug, parent_id, sort_order });
    res.status(201).json(cat);
  } catch (err) {
    console.error('[admin] create category —', err.message);
    res.status(400).json({ error: 'Krijimi i kategorisë dështoi.' });
  }
});

router.delete('/categories/:id', requireAuth, (req, res) => {
  const result = deleteCategory(Number(req.params.id));
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// ── Image delete ──────────────────────────────────────────────────────────────

router.delete('/images', requireAuth, (req, res) => {
  const abs = resolveUpload(req.body?.path);
  if (!abs) return res.status(400).json({ error: 'Invalid path' });
  if (fs.existsSync(abs)) fs.unlinkSync(abs);
  res.json({ ok: true });
});

export default router;
