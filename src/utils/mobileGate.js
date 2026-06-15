/** Jogo 100% mobile — bloqueia desktop e celular deitado */
export function isMobilePortraitPlay() {
  const portrait = window.innerHeight > window.innerWidth;
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return portrait && touch;
}

export function setupMobileGate() {
  const overlay = document.getElementById('mobile-only');
  const game = document.getElementById('game-container');
  if (!overlay || !game) return;

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
