export const t = {
  // Nav
  newArrivals: 'Të Reja',
  laptops: 'Laptop',
  monitors: 'Monitor',
  peripherals: 'Periferikë',
  storage: 'Ruajtja',
  gaming: 'Gaming',
  sale: 'Oferta',
  allCategories: 'Të gjitha',

  // Product actions
  addToBasket: 'Shto në Shportë',
  addedToBasket: 'U shtua!',
  viewBasket: 'Shiko Shportën',
  removeItem: 'Hiq',
  emptyBasket: 'Shporta juaj është bosh',
  continueShopping: 'Vazhdo blerjen',

  // Basket / inquiry
  myInquiry: 'Shporta ime',
  inquiryItems: (n) => `${n} ${n === 1 ? 'produkt' : 'produkte'}`,
  total: 'Totali',
  sendWhatsApp: 'Dërgo në WhatsApp',
  whatsappMessage: (lines, total) =>
    `Përshëndetje, dua të porosis:\n${lines}\nTotali: ${total}€`,

  // Shop filters
  filters: 'Filtrat',
  applyFilters: 'Apliko',
  clearFilters: 'Pastro filtrat',
  priceRange: 'Çmimi',
  minPrice: 'Min €',
  maxPrice: 'Max €',
  sortBy: 'Rendit',
  sortNewest: 'Më të reja',
  sortPriceAsc: 'Çmim ↑',
  sortPriceDesc: 'Çmim ↓',
  sortFeatured: 'Të veçuara',

  // States
  loading: 'Duke ngarkuar…',
  noResults: 'Nuk u gjetën produkte',
  noResultsHint: 'Provo të ndryshosh filtrat ose kërkimin.',
  errorLoading: 'Gabim gjatë ngarkimit. Provoni sërish.',

  // Pagination
  previous: 'Prapa',
  next: 'Para',
  page: 'Faqja',

  // Product detail
  inStock: 'Në stok',
  outOfStock: 'Pa stok',
  category: 'Kategoria',
  specifications: 'Specifikimet',
  description: 'Përshkrimi',
  relatedProducts: 'Produkte të ngjashme',

  // Footer / misc
  freeShipping: 'Dërgesa falas mbi 99€',
  newArrivalsAnnounce: 'Produkte të reja',
  subscribe: 'Abonohu',
  emailPlaceholder: 'Adresa juaj email',
  copyright: (year) => `© ${year} IT Store — Information & Technology Resource Specialist`,

  // Admin
  adminLogin: 'Hyr si Admin',
  passwordLabel: 'Fjalëkalimi',
  loginBtn: 'Hyr',
  logout: 'Dil',
  addProduct: 'Shto Produkt',
  editProduct: 'Ndrysho Produktin',
  deleteProduct: 'Fshi',
  saveProduct: 'Ruaj',
  cancel: 'Anulo',
  confirmDelete: 'Jeni i sigurt që doni ta fshini këtë produkt?',
};
