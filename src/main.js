import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig.js';
import { initDebugFlags } from './utils/debug.js';
import { setupMobileGate } from './utils/mobileGate.js';

setupMobileGate();

const game = new Phaser.Game(createGameConfig());
initDebugFlags(game);

const refreshScale = () => game.scale.refresh();
window.addEventListener('resize', refreshScale);
window.addEventListener('orientationchange', () => setTimeout(refreshScale, 150));

export default game;
