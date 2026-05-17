import express from 'express';
import { getProducts, getProduct, getProductBySlug, getBrands, getFormFactors } from '../database.js';

const router = express.Router();

function fail(res, scope, err) {
  console.error(`[products] ${scope} —`, err.message);
  res.status(500).json({ error: 'Ndodhi një gabim. Provoni sërish.' });
}

router.get('/form-factors', (req, res) => {
  try {
    res.json(getFormFactors(req.query));
  } catch (err) {
    fail(res, 'form-factors', err);
  }
});

router.get('/brands', (req, res) => {
  try {
    res.json(getBrands(req.query));
  } catch (err) {
    fail(res, 'brands', err);
  }
});

router.get('/', (req, res) => {
  try {
    const result = getProducts(req.query);
    res.json(result);
  } catch (err) {
    fail(res, 'list', err);
  }
});

router.get('/slug/:slug', (req, res) => {
  try {
    const product = getProductBySlug(req.params.slug);
    if (!product) return res.status(404).json({ error: 'Produkti nuk u gjet' });
    res.json(product);
  } catch (err) {
    fail(res, 'detail-slug', err);
  }
});

router.get('/:id', (req, res) => {
  try {
    const product = getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ error: 'Produkti nuk u gjet' });
    res.json(product);
  } catch (err) {
    fail(res, 'detail', err);
  }
});

export default router;
