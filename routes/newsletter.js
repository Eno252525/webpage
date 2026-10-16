import express from 'express';
import { addNewsletterSubscriber } from '../database.js';

const router = express.Router();

// Footer "Abonohu" form. Stores the address; the admin exports the list as CSV.
router.post('/', (req, res) => {
  const email = String(req.body?.email || '').trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ error: 'Shkruani një adresë email të vlefshme.' });
  }
  try {
    addNewsletterSubscriber(email, req.body?.source);
    res.json({ ok: true });
  } catch (err) {
    console.error('[newsletter] —', err.message);
    res.status(500).json({ error: 'Ndodhi një gabim. Provoni sërish.' });
  }
});

export default router;
