import express from 'express';
import { searchProducts } from '../database.js';

const router = express.Router();

router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  try {
    res.json(searchProducts(q));
  } catch (err) {
    console.error('[search] —', err.message);
    res.status(500).json({ error: 'Ndodhi një gabim. Provoni sërish.' });
  }
});

export default router;
