// ── Phusion Passenger entry point ────────────────────────────────────────────
// cPanel's Application Manager (Passenger) looks for `app.js` by default.
// The real application lives in server.js; importing it starts the server.
// For local development keep using `node server.js` (see CLAUDE.md).
import './server.js';
