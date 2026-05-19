const BASE = '';

async function req(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const getProducts = (params = {}) => {
  const q = new URLSearchParams(Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  ));
  return req(`/api/products${q.toString() ? '?' + q : ''}`);
};

export const getProduct = (id) => req(`/api/products/${id}`);

export const getProductBySlug = (slug) => req(`/api/products/slug/${encodeURIComponent(slug)}`);

export const getCategories = () => req('/api/categories');

export const getFormFactors = (params = {}) => {
  const q = new URLSearchParams(Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  ));
  return req(`/api/products/form-factors${q.toString() ? '?' + q : ''}`);
};

export const getBrands = (params = {}) => {
  const q = new URLSearchParams(Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  ));
  return req(`/api/products/brands${q.toString() ? '?' + q : ''}`);
};

export const searchProducts = (q) =>
  q.length >= 2 ? req(`/api/search?q=${encodeURIComponent(q)}`) : Promise.resolve([]);
