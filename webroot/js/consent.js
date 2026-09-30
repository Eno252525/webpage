// Cookie consent banner for the analytics tags injected by tracking.js.
// tracking.js sets Google Consent Mode + Meta consent to "denied/revoke" before
// the tags load (unless the visitor already accepted); this file asks once,
// stores the answer, and flips both to granted on "Pranoj".
// The choice lives in localStorage['itstore_consent'] = 'granted' | 'denied'.
// Any element with [data-cookie-settings] reopens the banner; a link is also
// appended to .footer-bottom on pages that have one.

const KEY = 'itstore_consent';

function getChoice() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

function apply(choice) {
  const g = choice === 'granted' ? 'granted' : 'denied';
  window.gtag?.('consent', 'update', {
    ad_storage: g, ad_user_data: g, ad_personalization: g, analytics_storage: g,
  });
  window.fbq?.('consent', g === 'granted' ? 'grant' : 'revoke');
}

function save(choice) {
  try { localStorage.setItem(KEY, choice); } catch { /* private mode — ask again next visit */ }
  apply(choice);
}

const CSS = `
.cc-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:760px;margin:0 auto;
  background:#fff;color:#141414;border:1px solid rgba(20,20,20,.12);
  box-shadow:0 12px 40px rgba(20,20,20,.14),0 2px 8px rgba(240,160,32,.12);
  padding:20px 22px;display:flex;gap:20px;align-items:center;font-family:'Inter',sans-serif;
  transform:translateY(0);opacity:1;transition:transform .25s ease,opacity .25s ease}
.cc-banner[hidden]{display:none}
.cc-banner.cc-out{transform:translateY(24px);opacity:0}
.cc-text{flex:1;font-size:14px;line-height:1.55;font-weight:400;color:rgba(20,20,20,.75);margin:0}
.cc-text strong{color:#141414;font-weight:700;display:block;margin-bottom:2px;font-size:15px}
.cc-actions{display:flex;gap:10px;flex-shrink:0}
.cc-btn{font-family:'Inter',sans-serif;font-weight:800;font-size:12px;letter-spacing:.14em;text-transform:uppercase;
  padding:12px 22px;cursor:pointer;border:2px solid #141414;background:#fff;color:#141414;min-width:118px;
  transition:background .15s,color .15s,border-color .15s}
.cc-btn:hover{background:#141414;color:#fff}
.cc-btn:focus-visible{outline:3px solid #F0A020;outline-offset:2px}
.cc-btn:active{transform:translateY(1px)}
.cc-accept{background:#F0A020;border-color:#F0A020}
.cc-accept:hover{background:#141414;border-color:#141414;color:#fff}
.cc-link{background:none;border:0;padding:0;font:inherit;color:inherit;text-decoration:underline;cursor:pointer;opacity:.7}
.cc-link:hover{opacity:1}
@media (max-width:640px){.cc-banner{flex-direction:column;align-items:stretch;left:12px;right:12px;bottom:12px;padding:18px}
  .cc-actions{width:100%}.cc-btn{flex:1}}
`;

let banner;

function build() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  banner = document.createElement('div');
  banner.className = 'cc-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('aria-label', 'Pëlqimi për cookies');
  banner.hidden = true;
  banner.innerHTML = `
    <p class="cc-text"><strong>Cookies</strong>
      Përdorim cookies (Google Analytics, Meta Pixel) për të matur vizitat dhe për të përmirësuar reklamat tona.
      Faqja funksionon njësoj edhe nëse i refuzoni.</p>
    <div class="cc-actions">
      <button type="button" class="cc-btn cc-deny">Refuzoj</button>
      <button type="button" class="cc-btn cc-accept">Pranoj</button>
    </div>`;
  banner.querySelector('.cc-accept').addEventListener('click', () => choose('granted'));
  banner.querySelector('.cc-deny').addEventListener('click', () => choose('denied'));
  document.body.appendChild(banner);

  const footer = document.querySelector('.footer-bottom');
  if (footer) {
    const p = document.createElement('p');
    p.innerHTML = '<button type="button" class="cc-link" data-cookie-settings>Cilësimet e cookies</button>';
    footer.appendChild(p);
  }
  document.addEventListener('click', e => {
    if (e.target.closest?.('[data-cookie-settings]')) show();
  });
}

function show() {
  banner.hidden = false;
  banner.classList.add('cc-out');
  requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.remove('cc-out')));
}

function choose(choice) {
  save(choice);
  banner.classList.add('cc-out');
  setTimeout(() => { banner.hidden = true; }, 250);
}

build();
if (!getChoice()) show();
