let _config = null;

export async function loadConfig() {
  if (_config) return _config;
  try {
    const res = await fetch('/api/config');
    _config = await res.json();
    window.__WA_NUMBER__ = _config.whatsappNumber || '';
  } catch {
    _config = {};
  }
  return _config;
}
