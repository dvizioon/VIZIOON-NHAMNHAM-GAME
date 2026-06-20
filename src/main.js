import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig.js';
import { initDebugFlags } from './utils/debug.js';
import { setupMobileGate } from './utils/mobileGate.js';
import { pauseBgm, resumeBgm, beginBgmAfterUnlock } from './systems/MusicManager.js';

const GAME_INSTANCE_KEY = '__nhocPhaserGame__';
const AUDIO_UNLOCKED_KEY = '__nhocAudioUnlocked__';

const boundListeners = [];

function trackListener(target, type, handler, options) {
  target.addEventListener(type, handler, options);
  boundListeners.push({ target, type, handler, options });
}

function untrackAllListeners() {
  while (boundListeners.length > 0) {
    const { target, type, handler, options } = boundListeners.pop();
    try {
      target.removeEventListener(type, handler, options);
    } catch {
      /* ignore */
    }
  }
}

function cleanupOrphanDomInputs() {
  document.querySelectorAll('input.char-scene-search').forEach((el) => el.remove());
  document.querySelectorAll('body > input[type="text"], body > input[type="search"]').forEach((el) => {
    if (el.classList.contains('char-scene-search')
      || el.style.opacity === '0'
      || el.style.left === '-9999px') {
      el.remove();
    }
  });
}

function clearGameContainer() {
  const container = document.getElementById('game-container');
  if (container) {
    container.querySelectorAll('canvas').forEach((canvas) => canvas.remove());
    container.replaceChildren();
  }

  document.querySelectorAll('body > canvas, canvas.phaser-canvas').forEach((canvas) => {
    canvas.remove();
  });
}

function destroyExistingGame() {
  untrackAllListeners();

  const prev = window[GAME_INSTANCE_KEY];
  if (prev) {
    try {
      prev.destroy(true, true);
    } catch {
      /* ignore */
    }
    window[GAME_INSTANCE_KEY] = null;
  }

  clearGameContainer();
  cleanupOrphanDomInputs();
}

function unlockGameAudio(game) {
  if (window[AUDIO_UNLOCKED_KEY]) return;
  window[AUDIO_UNLOCKED_KEY] = true;

  try {
    if (game.sound?.locked) {
      game.sound.unlock();
    }
  } catch {
    /* ignore */
  }

  if (!game.sound?.locked) {
    beginBgmAfterUnlock(getActiveScene(game));
  }
}

function getActiveScene(game) {
  const scenes = game.scene?.getScenes?.(true) ?? [];
  return scenes.find((s) => s.scene?.isActive()) ?? scenes[0] ?? null;
}

function bootstrapGame() {
  destroyExistingGame();
  setupMobileGate();

  const game = new Phaser.Game(createGameConfig());
  window[GAME_INSTANCE_KEY] = game;
  initDebugFlags(game);

  const onUnlock = () => unlockGameAudio(game);
  trackListener(document, 'pointerdown', onUnlock, { once: true, passive: true });
  trackListener(document, 'touchstart', onUnlock, { once: true, passive: true });
  trackListener(document, 'keydown', onUnlock, { once: true, passive: true });

  const refreshScale = () => game.scale?.refresh?.();
  trackListener(window, 'resize', refreshScale);
  trackListener(window, 'orientationchange', () => setTimeout(refreshScale, 150));

  const onAppBackground = () => pauseBgm(getActiveScene(game));
  const onAppForeground = () => {
    if (!window[AUDIO_UNLOCKED_KEY] || game.sound?.locked) return;
    resumeBgm(getActiveScene(game));
  };

  trackListener(document, 'visibilitychange', () => {
    if (document.hidden) onAppBackground();
    else onAppForeground();
  });
  trackListener(window, 'pagehide', onAppBackground);
  trackListener(window, 'pageshow', onAppForeground);

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      window[AUDIO_UNLOCKED_KEY] = false;
      destroyExistingGame();
    });
  }

  return game;
}

const game = bootstrapGame();

export default game;
