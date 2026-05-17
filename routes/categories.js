import express from 'express';
import { getCategories } from '../database.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const flat = getCategories();
    // Build tree
    const map = {};
    const roots = [];
    for (const cat of flat) { map[cat.id] = { ...cat, children: [] }; }
    for (const cat of flat) {
      if (cat.parent_id && map[cat.parent_id]) {
        map[cat.parent_id].children.push(map[cat.id]);
      } else {
        roots.push(map[cat.id]);
      }
    }
    res.json(roots);
  } catch (err) {
    console.error('[categories] —', err.message);
    res.status(500).json({ error: 'Ndodhi një gabim. Provoni sërish.' });
  }
});

export default router;
