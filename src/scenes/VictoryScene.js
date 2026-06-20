import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme, CONFETE_CORES } from '../config/theme.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { syncRunScore } from '../services/playerSession.js';
import { uiScale, isPortrait } from '../utils/responsive.js';
import { createFlyableButterfly, destroyFlyableButterfly } from '../ui/butterflyVisual.js';
import { openVictoryPhotoModal } from '../ui/victoryPhotoModal.js';
import { Icon } from '../ui/iconify.js';
import {
  createIconCircleButton,
  getSplashButtonMetrics,
  preloadSplashIcons,
  SPLASH_CORNER_BTN_OPTS,
} from '../ui/splashUi.js';
import {
  buildVictoryStage,
  createVictoryTitleCard,
  createVictoryDragHint,
  spawnVictorySparkles,
} from '../ui/victoryUi.js';
import { beginSceneRun, isStaleRun, gotoScene } from '../utils/sceneRun.js';

const VICTORY_ICONS_BASE = {
  home: Icon.from('mynaui:home', { designSize: 24, color: '#ffffff' }),
};

function getVictoryIcons(genero) {
  const isGirl = genero === 'menina';
  return {
    ...VICTORY_ICONS_BASE,
    photo: Icon.from('solar:camera-bold', {
      designSize: 24,
      color: isGirl ? '#D85A96' : '#1E6A30',
    }),
  };
}

async function preloadVictoryIcons(scene, genero) {
  const icons = getVictoryIcons(genero);
  await Promise.all([
    preloadSplashIcons(scene),
    Icon.preload(scene, Object.values(icons)),
  ]);
  return icons;
}

/** Vitória — borboleta voando/arrastável + jardim */
export class VictoryScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.VICTORY);
  }

  async create() {
    const run = beginSceneRun(this);
    const { width, height } = this.scale;
    const child = GameState.getChild(this);
    const nome = child?.nome ?? 'Lagartinha';
    const genero = child?.genero ?? 'menino';
    const s = uiScale(this);
    const portrait = isPortrait(this);

    buildVictoryStage(this);
    spawnVictorySparkles(this);
    const isGirl = genero === 'menina';
    const victoryIcons = await preloadVictoryIcons(this, genero);
    if (isStaleRun(this, run)) return;

    const titleY = Math.round(58 * s);
    createVictoryTitleCard(this, nome, titleY, genero);
    const dragHint = createVictoryDragHint(this, height * 0.24, genero);

    const homeX = width / 2;
    const homeY = height * 0.52;
    const butterflySize = Math.min(width * 1.02, height * 0.75, 720);

    this.butterfly = await createFlyableButterfly(this, homeX, homeY, {
      genero,
      displaySize: butterflySize,
      homeX,
      homeY,
      homeScale: 1,
      depth: 30,
      child,
      flapMs: 580,
      faceScaleMul: 1.75,
      headHeightRatio: 1.72,
      onFirstTouch: () => dragHint.dismiss(),
    });
    if (isStaleRun(this, run)) return;

    this.butterfly.setScale(0.15);
    this.butterfly.setAlpha(0);
    this.tweens.add({
      targets: this.butterfly,
      scale: 1,
      alpha: 1,
      duration: 900,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.butterfly?.getData('bfStartFlight')?.();
      },
    });

    const { btnSize, btnIcon, btnW, gap } = getSplashButtonMetrics(this);
    const rowY = height * 0.9;
    const homeBtnX = width / 2 - (btnW + gap) / 2;
    const photoX = width / 2 + (btnW + gap) / 2;

    createIconCircleButton(this, homeBtnX, rowY, victoryIcons.home, {
      ...SPLASH_CORNER_BTN_OPTS,
      size: btnSize,
      iconSize: btnIcon,
      absoluteSize: portrait,
      depth: 50,
      fillColor: Theme.botaoVerde,
      borderTint: isGirl ? 0xD85A96 : 0x1E6A30,
      onClick: () => {
        playSound(this, 'clique');
        GameState.resetForNewRun(this);
        gotoScene(this, SceneKeys.SPLASH);
      },
    }).setScrollFactor(0);

    createIconCircleButton(this, photoX, rowY, victoryIcons.photo, {
      ...SPLASH_CORNER_BTN_OPTS,
      size: btnSize,
      iconSize: btnIcon,
      absoluteSize: portrait,
      depth: 50,
      fillColor: Theme.papel,
      borderTint: isGirl ? 0xD85A96 : 0x1E6A30,
      onClick: () => {
        playSound(this, 'clique');
        openVictoryPhotoModal(this, {
          genero,
          butterfly: this.butterfly,
          filename: `borboleta-${nome}.png`,
        });
      },
    }).setScrollFactor(0);

    playSound(this, 'winner', { volumeMul: 0.85 });
    this.spawnConfetti(width, height);
    this.cameras.main.fadeIn(600, 0, 0, 0);

    syncRunScore(this, {
      points: GameState.getPoints(this),
      livesLeft: GameState.getLives(this),
      levelLabel: 'vitoria',
      won: true,
      durationMs: GameState.getRunDurationMs(this),
    });
  }

  spawnConfetti(width, height) {
    for (let i = 0; i < 42; i++) {
      const x = Math.random() * width;
      const color = CONFETE_CORES[i % CONFETE_CORES.length];
      const size = 8 + Math.random() * 7;
      const piece = this.add.rectangle(x, -20, size, size, color)
        .setDepth(200)
        .setScrollFactor(0)
        .setAngle(Math.random() * 360);

      this.tweens.add({
        targets: piece,
        y: height + 30,
        angle: piece.angle + 280 + Math.random() * 200,
        duration: 2800 + Math.random() * 2400,
        delay: Math.random() * 1600,
        repeat: 2,
        onComplete: () => piece.destroy(),
      });
    }
  }

  shutdown() {
    destroyFlyableButterfly(this.butterfly);
    this.butterfly = null;
  }
}
