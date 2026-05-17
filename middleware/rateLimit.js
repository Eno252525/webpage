// Simple in-memory rate limiter keyed by client IP.
// Sufficient for a single-process deployment; use a shared store if scaled out.
export function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, message = 'Too many requests' } = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || 'unknown';

    let entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
      hits.set(key, entry);
    }
    entry.count++;

    // Opportunistic cleanup of expired entries.
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (now - v.start > windowMs) hits.delete(k);
      }
    }

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.start + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message });
    }
    next();
  };
}
