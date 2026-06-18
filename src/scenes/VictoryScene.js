import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme, CONFETE_CORES } from '../config/theme.js';
import { drawSkyBackground } from '../ui/createUI.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { syncRunScore } from '../services/playerSession.js';
import { uiScale, isPortrait } from '../utils/responsive.js';
import { createAnimatedButterfly } from '../ui/butterflyVisual.js';
import { downloadGameScreenshot } from '../utils/captureScreenshot.js';
import { Icon } from '../ui/iconify.js';
import {
  createIconCircleButton,
  getSplashButtonMetrics,
  preloadSplashIcons,
  SPLASH_CORNER_BTN_OPTS,
} from '../ui/splashUi.js';

const VICTORY_ICONS = {
  home: Icon.from('mynaui:home', { designSize: 24, color: '#ffffff' }),
  photo: Icon.from('solar:camera-bold', { designSize: 24, color: '#D85A96' }),
};

async function preloadVictoryIcons(scene) {
  await Promise.all([
    preloadSplashIcons(scene),
    Icon.preload(scene, Object.values(VICTORY_ICONS)),
  ]);
}

/** Vitória — borboleta + botões circulares (estilo splash) */
export class VictoryScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.VICTORY);
  }

  async create() {
    const { width, height } = this.scale;
    const child = GameState.getChild(this);
    const nome = child?.nome ?? 'Lagartinha';
    const genero = child?.genero ?? 'menino';
    const s = uiScale(this);
    const portrait = isPortrait(this);

    drawSkyBackground(this);
    await preloadVictoryIcons(this);

    const titleY = Math.round(52 * s);
    this.add.text(width / 2, titleY, `Parabéns, ${nome}!`, {
      fontFamily: Theme.fontFamily,
      fontSize: `${Math.round(34 * s)}px`,
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1E6A30',
      strokeThickness: Math.round(6 * s),
      align: 'center',
    }).setOrigin(0.5).setDepth(40).setScrollFactor(0);

    this.add.text(width / 2, titleY + Math.round(36 * s), 'Você virou uma linda borboleta!', {
      fontFamily: Theme.fontFamily,
      fontSize: `${Math.round(18 * s)}px`,
      color: '#FFFFFF',
      stroke: '#1E6A30',
      strokeThickness: Math.round(4 * s),
      align: 'center',
    }).setOrigin(0.5).setDepth(40).setScrollFactor(0);

    const butterflySize = Math.min(width * 0.88, height * 0.58, 420);
    await createAnimatedButterfly(this, width / 2, height * 0.48, {
      genero,
      displaySize: butterflySize,
      depth: 30,
      child,
      flapMs: 600,
    });

    const { btnSize, btnIcon, btnW, gap } = getSplashButtonMetrics(this);
    const rowY = height * 0.88;
    const homeX = width / 2 - (btnW + gap) / 2;
    const photoX = width / 2 + (btnW + gap) / 2;

    createIconCircleButton(this, homeX, rowY, VICTORY_ICONS.home, {
      size: btnSize,
      iconSize: btnIcon,
      absoluteSize: portrait,
      depth: 50,
      fillColor: Theme.botaoVerde,
      ...SPLASH_CORNER_BTN_OPTS,
      onClick: () => {
        playSound(this, 'clique');
        GameState.resetForNewRun(this);
        this.scene.start(SceneKeys.SPLASH);
      },
    }).setScrollFactor(0);

    createIconCircleButton(this, photoX, rowY, VICTORY_ICONS.photo, {
      size: btnSize,
      iconSize: btnIcon,
      absoluteSize: portrait,
      depth: 50,
      fillColor: Theme.papel,
      ...SPLASH_CORNER_BTN_OPTS,
      onClick: () => {
        playSound(this, 'clique');
        const ok = downloadGameScreenshot(this, `borboleta-${nome}.png`);
        if (!ok) playSound(this, 'fail');
      },
    }).setScrollFactor(0);

    playSound(this, 'fanfarra');
    this.spawnConfetti(width, height);
    this.cameras.main.fadeIn(500, 0, 0, 0);

    syncRunScore(this, {
      points: GameState.getPoints(this),
      livesLeft: GameState.getLives(this),
      levelLabel: 'vitoria',
      won: true,
    });
  }

  spawnConfetti(width, height) {
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const color = CONFETE_CORES[i % CONFETE_CORES.length];
      const size = 10 + Math.random() * 8;
      const piece = this.add.rectangle(x, -20, size, size, color)
        .setDepth(200)
        .setScrollFactor(0)
        .setAngle(Math.random() * 360);

      this.tweens.add({
        targets: piece,
        y: height + 30,
        angle: piece.angle + 280 + Math.random() * 200,
        duration: 2600 + Math.random() * 2200,
        delay: Math.random() * 1400,
        onComplete: () => piece.destroy(),
      });
    }
  }
}
