import { resolvePublicAssetUrl } from './assetUrl.js';

const GATE_ASSETS = {
  logo: 'assets/textures/ui/LogoSemTronco.svg',
  ring: 'assets/textures/ui/Loading.svg',
  head: 'assets/textures/ui/Cabeça_Largata.svg',
  leaves: 'assets/textures/ui/3folhas.svg',
  trunk: 'assets/textures/ui/Tronco_Bottom_Horinzontal.svg',
};

/** Jogo 100% mobile — bloqueia desktop e celular deitado */
export function isMobilePortraitPlay() {
  const portrait = window.innerHeight > window.innerWidth;
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return portrait && touch;
}

function asset(path) {
  return resolvePublicAssetUrl(path);
}

function buildMobileGateMarkup() {
  return `
    <div class="mobile-gate-scene">
      <img class="mobile-gate-deco mobile-gate-deco--leaves-left" data-asset="leaves" alt="" aria-hidden="true" />
      <img class="mobile-gate-deco mobile-gate-deco--leaves-right" data-asset="leaves" alt="" aria-hidden="true" />
      <img class="mobile-gate-deco mobile-gate-deco--trunk" data-asset="trunk" alt="" aria-hidden="true" />

      <div class="mobile-gate-card">
        <img class="mobile-gate-logo" data-asset="logo" alt="Nhoc Nhoc! A Lagartinha da Turminha" />

        <div class="mobile-gate-hero" aria-hidden="true">
          <img class="mobile-gate-ring" data-asset="ring" alt="" />
          <img class="mobile-gate-head" data-asset="head" alt="" />
        </div>

        <div class="mobile-gate-icons">
          <div class="mobile-gate-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="7" y="2.5" width="10" height="19" rx="2.5" stroke="#4E9A2E" stroke-width="1.8"/>
              <circle cx="12" cy="18.5" r="1.1" fill="#4E9A2E"/>
            </svg>
            <span>Celular</span>
          </div>
          <div class="mobile-gate-icon mobile-gate-icon--rotate">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4.5V8.5" stroke="#4E9A2E" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M8.2 6.7L10.8 9.3" stroke="#4E9A2E" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M15.8 6.7L13.2 9.3" stroke="#4E9A2E" stroke-width="1.8" stroke-linecap="round"/>
              <rect x="7" y="8.5" width="10" height="11" rx="2.2" stroke="#4E9A2E" stroke-width="1.8"/>
            </svg>
            <span>Em pé</span>
          </div>
        </div>

        <h1 class="mobile-gate-title">Nhoc Nhoc! só funciona no celular em pé.</h1>
        <p class="mobile-gate-sub">Abra no telefone ou gire a tela.</p>
      </div>
    </div>
  `;
}

function hydrateGateAssets(root) {
  root.querySelectorAll('[data-asset]').forEach((el) => {
    const key = el.getAttribute('data-asset');
    const path = GATE_ASSETS[key];
    if (path) el.src = asset(path);
  });
}

export function setupMobileGate() {
  const overlay = document.getElementById('mobile-only');
  const game = document.getElementById('game-container');
  if (!overlay || !game) return;

  overlay.innerHTML = buildMobileGateMarkup();
  hydrateGateAssets(overlay);

  const refresh = () => {
    const ok = isMobilePortraitPlay();
    overlay.hidden = ok;
    game.style.visibility = ok ? 'visible' : 'hidden';
    game.style.pointerEvents = ok ? 'auto' : 'none';
  };

  window.addEventListener('resize', refresh);
  window.addEventListener('orientationchange', refresh);
  refresh();
}
