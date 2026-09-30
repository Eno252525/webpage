// ── Meta Pixel + Google Analytics 4 ──────────────────────────────────────────
// Both are opt-in via .env (META_PIXEL_ID, GA_MEASUREMENT_ID) and gated on the
// cookie banner (webroot/js/consent.js); with neither ID set
// the site ships no third-party tags and the CSP stays first-party only.
//
// The head snippet also defines `window.itTrack(event, params)` — the single
// hook the frontend calls — and fires a lead event for every click on a
// wa.me link (the site has no checkout, so a WhatsApp click IS the conversion).
// Events use GA4 names; Meta gets the matching standard event:
//   view_item → ViewContent, add_to_cart → AddToCart, generate_lead → Contact

const PIXEL_ID = (process.env.META_PIXEL_ID || '').trim();
const GA_ID    = (process.env.GA_MEASUREMENT_ID || '').trim();

// IDs are interpolated into inline JS, so accept only their known shapes.
const pixelId = /^\d{5,20}$/.test(PIXEL_ID) ? PIXEL_ID : '';
const gaId    = /^G-[A-Z0-9]{4,15}$/i.test(GA_ID) ? GA_ID.toUpperCase() : '';
if (PIXEL_ID && !pixelId) console.warn('[tracking] META_PIXEL_ID ignored — expected digits only');
if (GA_ID && !gaId) console.warn('[tracking] GA_MEASUREMENT_ID ignored — expected G-XXXXXXX');

export const trackingEnabled = Boolean(pixelId || gaId);

// Extra CSP sources, merged into the matching directives in server.js.
export const trackingCsp = {
  script: [
    ...(gaId ? ['https://www.googletagmanager.com'] : []),
    ...(pixelId ? ['https://connect.facebook.net'] : []),
  ],
  img: [
    ...(gaId ? ['https://*.google-analytics.com', 'https://*.googletagmanager.com'] : []),
    ...(pixelId ? ['https://www.facebook.com'] : []),
  ],
  connect: [
    ...(gaId ? ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'] : []),
    ...(pixelId ? ['https://www.facebook.com', 'https://connect.facebook.net'] : []),
  ],
};

const META_EVENT = { view_item: 'ViewContent', add_to_cart: 'AddToCart', generate_lead: 'Contact' };

function buildHead() {
  if (!trackingEnabled) return '';
  // Consent first: both tags start denied/revoked unless the visitor already
  // accepted in the banner (webroot/js/consent.js, localStorage itstore_consent).
  let out = `\n<!-- Analytics -->
<script>window.__ccOk=(function(){try{return localStorage.getItem('itstore_consent')==='granted'}catch(e){return false}})();</script>`;
  if (gaId) {
    out += `\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}(function(g){gtag('consent','default',{ad_storage:g,ad_user_data:g,ad_personalization:g,analytics_storage:g});})(window.__ccOk?'granted':'denied');gtag('js',new Date());gtag('config','${gaId}');</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>`;
  }
  if (pixelId) {
    out += `\n<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('consent',window.__ccOk?'grant':'revoke');fbq('init','${pixelId}');fbq('track','PageView');</script>`;
  }
  out += `\n<script type="module" src="/js/consent.js"></script>`;
  out += `\n<script>(function(){var M=${JSON.stringify(META_EVENT)};
window.itTrack=function(ev,p){p=p||{};try{
if(window.gtag)gtag('event',ev,p);
if(window.fbq&&M[ev]){var it=(p.items||[])[0]||{};fbq('track',M[ev],{content_ids:it.item_id?[String(it.item_id)]:undefined,content_name:it.item_name,content_type:'product',value:p.value,currency:p.currency});}
}catch(e){}};
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href*="wa.me/"]');if(a)window.itTrack('generate_lead',{method:'whatsapp',page:location.pathname});},true);
})();</script>`;
  return out;
}

const HEAD = buildHead();

// Insert the tags before </head>. Callers run addScriptNonce afterwards, which
// stamps the per-request CSP nonce onto these inline scripts.
export function injectTracking(html) {
  return HEAD ? html.replace('</head>', `${HEAD}\n</head>`) : html;
}
