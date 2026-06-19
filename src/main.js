import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig.js';
import { initDebugFlags } from './utils/debug.js';
import { setupMobileGate } from './utils/mobileGate.js';
import { pauseBgm, resumeBgm } from './systems/MusicManager.js';

setupMobileGate();

const game = new Phaser.Game(createGameConfig());
initDebugFlags(game);

const refreshScale = () => game.scale.refresh();
window.addEventListener('resize', refreshScale);
window.addEventListener('orientationchange', () => setTimeout(refreshScale, 150));

function getActiveScene() {
  const scenes = game.scene.getScenes(true);
  return scenes.find((s) => s.scene.isActive()) ?? scenes[0] ?? null;
}

function onAppBackground() {
  pauseBgm(getActiveScene());
}

function onAppForeground() {
  resumeBgm(getActiveScene());
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) onAppBackground();
  else onAppForeground();
});

window.addEventListener('pagehide', onAppBackground);
window.addEventListener('pageshow', onAppForeground);

export default game;
