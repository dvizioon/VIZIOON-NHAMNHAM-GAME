import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { drawSkyBackground, getGroundY, getGrassTopY, DEPTH_FRUIT } from '../ui/createUI.js';
import {
  UI_LOGO_KEY,
  SPLASH_ICONS,
  createIconCircleButton,
  placeTopRightButton,
  getIconButtonSize,
  SPLASH_CORNER_BTN_OPTS,
} from '../ui/splashUi.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { CaterpillarSprite } from '../entities/CaterpillarSprite.js';
import { ensureBgmPlaying } from '../systems/MusicManager.js';
import { responsiveWidth, layoutY, isPortrait, mobileBtnSize } from '../utils/responsive.js';
import { hasTexture } from '../systems/AssetLoader.js';
import {
  drawBoundsHit,
  drawCircleHit,
  getGameObjectCircle,
  isDebugHitboxes,
} from '../utils/debug.js';

import { FOOD_FRUTAS } from '../config/foodConfig.js';
import { SplashFrogChase } from '../systems/SplashFrogChase.js';
import { SPLASH_FROG_ENABLED, SPLASH_FROG_CHANCE, getSplashFrogDisplayScale, getSplashFrogJumpArc, getSplashFrogGroundY } from '../config/introFrogConfig.js';
import {
  restoreAnyPlayerSession,
  startPlayFromSplash,
} from '../services/playerSession.js';
import {
  createSplashGuestChip,
  createSplashUserChip,
  openGuestProfileModal,
  openPlayerProfileModal,
} from '../ui/playerProfileModal.js';
import { createSplashConnectChip } from '../ui/loginUi.js';
import { openRankingModal } from '../ui/rankingUi.js';
import {
  SPLASH_CATERPILLAR_GROUND_OFFSET_RATIO,
  getSplashCaterpillarOpts,
} from '../config/caterpillarConfig.js';
import { DEPTH_CATERPILLAR } from '../ui/createUI.js';

const FOOD_KEY = FOOD_FRUTAS.key;
const SPLASH_BTN_SIZE = 142;
const SPLASH_ICON_RATIO = 0.42;
const SPLASH_LAYOUT = {
  portrait: {
    logoY: 0.43,
    configTop: 0.045,
    buttonsY: 0.735,
    sideMargin: 0.05,
    playBtn: 0.22,
    btnGap: 0.08,
  },
  landscape: { logoY: 0.31, buttonsY: 0.64, logoWidth: 0.38, playBtn: null, btnGap: 0.032 },
};
const LOGO_MAX_WIDTH = 400;
const FOOD_FRAMES = FOOD_FRUTAS.frames;
const FOOD_FRAME_W = FOOD_FRUTAS.frameWidth;
const FOOD_FRAME_H = FOOD_FRUTAS.frameHeight;
const FOOD_ASPECT = FOOD_FRAME_H / FOOD_FRAME_W;
const FOOD_BASE_W = FOOD_FRUTAS.baseDisplayW;
const FRUIT_HIT_R = 0.34;
const FRUIT_HIT_CY = 0.56;
const SEG_HIT_R = 0.42;
const SEG_HIT_CY = 0.32;
const DEPTH_UI = 50;
const SCENE_PAD_TOP = 0.08;

/** Tela 1 — vitrine com sprite Figma + botão JOGAR */
export class SplashScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.SPLASH);
  }

  init() {
    this.userChip = null;
    this.profileModalClose = null;
  }

  async create() {
    const { width, height } = this.scale;
    drawSkyBackground(this);
    ensureBgmPlaying(this);
    await restoreAnyPlayerSession(this);

    const groundLine = getGroundY(this);
    const caterpillarY = groundLine + height * SPLASH_CATERPILLAR_GROUND_OFFSET_RATIO;
    const splashChild = { id: 'default' };
    const splashCustom = { cor: { clara: 0x7CB342, escura: 0x5C8F2E }, chapeu: false, oculos: false };

    this.caterpillar = CaterpillarSprite.create(
      this, -120, caterpillarY, splashChild, splashCustom, DEPTH_CATERPILLAR,
      getSplashCaterpillarOpts(),
    );

    if (SPLASH_FROG_ENABLED) {
      this.splashFrog = new SplashFrogChase(this, {
        groundY: getSplashFrogGroundY(this),
        depth: DEPTH_CATERPILLAR - 1,
        getMatchScale: () => getSplashFrogDisplayScale(
          this.caterpillar?.displayScale ?? getSplashCaterpillarOpts().displayScale,
        ),
        getJumpArc: () => getSplashFrogJumpArc(
          this.caterpillar?.displayScale ?? getSplashCaterpillarOpts().displayScale,
        ),
        onTurnComplete: ({ nextFromRight }) => {
          this.caterpillar?.resumeAfterFrogTurn?.(nextFromRight);
        },
      });
    }

    this.setupFallingFood(this.scale.width);

    // Colisão fruta × lagarta desativada — frutas caem direto ao chão

    // Arcade debug global desligado — usamos círculos via getBounds (skills GetBounds)
    this.physics.world.drawDebug = false;

    if (isDebugHitboxes(this)) {
      this.debugGfx = this.add.graphics().setDepth(250);
      this.debugDraw = () => this.drawHitboxDebug();
      this.events.on('update', this.debugDraw);
    }

    this.placeLogo(this.scale.width, DEPTH_UI);
    this.placeSplashButtons(width);
    await this.placeUserChip(width);

    const caterpillar = this.caterpillar;

    if (caterpillar.mode === 'filament') {
      caterpillar.startWander(this, {
        alternateWithFrog: SPLASH_FROG_ENABLED,
        frogChance: SPLASH_FROG_CHANCE,
        edgePad: isPortrait(this) ? Math.max(48, width * 0.06) : Math.max(100, width * 0.08),
        speed: 85,
        scaredSpeed: 240,
        pauseMs: 2200,
        startRight: true,
        onCaterpillarGone: SPLASH_FROG_ENABLED
          ? ({ fromRight }) => { this.splashFrog?.startTurn({ exitToRight: fromRight }); }
          : undefined,
      });
      caterpillar.enablePetInteraction?.(() => playSound(this, 'clique'));
      this.events.on('update', () => {
        caterpillar.updateWave(this.time.now * 0.001, caterpillar.isMoving);
      });
    }

    this.events.once('shutdown', () => {
      this.splashFrog?.destroy();
      this.splashFrog = null;
      caterpillar.destroy?.();
      this.caterpillar = null;
      this.fruitSpawnTimer?.destroy();
      this.fruitSpawnTimer = null;
      this.clearFruits();
      if (this.debugDraw) this.events.off('update', this.debugDraw);
      this.debugGfx?.destroy();
    });
  }

  clearFruits() {
    for (const fruit of this.activeFruits ?? []) {
      this.tweens.killTweensOf(fruit);
      fruit?.destroy?.();
    }
    this.activeFruits = [];
  }

  countActiveFruits() {
    return (this.activeFruits ?? []).filter((f) => f.active).length;
  }

  trackFruit(fruit) {
    if (!this.activeFruits) this.activeFruits = [];
    this.activeFruits.push(fruit);
    fruit.once('destroy', () => {
      this.activeFruits = this.activeFruits.filter((f) => f !== fruit);
    });
  }

  getFruitCircle(fruit) {
    return getGameObjectCircle(fruit, FRUIT_HIT_R, FRUIT_HIT_CY);
  }

  getFruitFallTargetY(fruit) {
    return this.scale.height + fruit.displayHeight;
  }

  fadeFruitBehindGrass(fruit) {
    if (fruit.y < this.grassTopY) return;
    const t = Phaser.Math.Clamp((fruit.y - this.grassTopY) / 90, 0, 1);
    fruit.setAlpha(1 - t);
  }

  getCaterpillarCircles() {
    const api = this.caterpillar;
    if (!api?.container?.active || api.mode !== 'filament' || !api.segments) return [];

    return api.segments.map(({ sprite: seg }) =>
      getGameObjectCircle(seg, SEG_HIT_R, SEG_HIT_CY));
  }

  /*
  // —— Colisão fruta × lagarta (desativada) ——
  findSupportingSegment(fruitX, r, segCircles) { ... }
  getCaterpillarSurfaceCy(fruitX, r, segCircles) { ... }
  getCaterpillarEdgeX(r, segCircles, side) { ... }
  nudgeFruitCircleY(fruit, targetCy, amount = 1) { ... }
  updateRollingFruits(delta) { ... }
  checkFruitCaterpillar(fruit) { ... }
  rollFruitOff(fruit, fc, hitCircle) { ... }
  dropFruitToGround(fruit, side) { ... }
  */

  drawHitboxDebug() {
    const g = this.debugGfx;
    if (!g) return;
    g.clear();

    g.lineStyle(2, 0x44ff88, 0.85);
    g.lineBetween(0, this.grassTopY, this.scale.width, this.grassTopY);
    g.lineBetween(0, getGroundY(this), this.scale.width, getGroundY(this));

    const api = this.caterpillar;
    if (api?.mode === 'filament' && api.segments) {
      for (const { sprite: seg } of api.segments) {
        drawBoundsHit(g, seg.getBounds(), 0x44ff88);
        drawCircleHit(g, getGameObjectCircle(seg, SEG_HIT_R, SEG_HIT_CY), 0x4488ff);
      }
    }
    for (const fruit of this.activeFruits ?? []) {
      if (!fruit.active) continue;
      drawBoundsHit(g, fruit.getBounds(), 0xaaff66);
      drawCircleHit(g, this.getFruitCircle(fruit), 0xff8844);
    }
  }

  startFruitFall(fruit, fallMs) {
    fruit.setData('state', 'falling');

    this.tweens.add({
      targets: fruit,
      y: this.getFruitFallTargetY(fruit),
      duration: fallMs,
      ease: 'Quad.easeIn',
      onUpdate: () => this.fadeFruitBehindGrass(fruit),
      onComplete: () => fruit.destroy(),
    });
    this.tweens.add({
      targets: fruit,
      rotation: Phaser.Math.FloatBetween(-0.28, 0.28),
      duration: fallMs,
      ease: 'Sine.easeOut',
    });
  }

  setupFallingFood(width) {
    if (!hasTexture(this, FOOD_KEY)) return;

    const { height } = this.scale;
    this._fruitFrameBag = [];
    this.grassTopY = getGrassTopY(this);

    this.activeFruits = [];

    // 1ª onda já ao abrir — não depende da lagarta
    this.spawnFruitWave(width, height);

    this.fruitSpawnTimer = this.time.addEvent({
      delay: Phaser.Math.Between(5500, 7500),
      loop: true,
      callback: () => {
        this.spawnFruitWave(width, height);
        this.fruitSpawnTimer.delay = Phaser.Math.Between(5500, 7500);
      },
      startAt: Phaser.Math.Between(5500, 7500),
    });
  }

  pickWaveCount() {
    const roll = Phaser.Math.Between(1, 10);
    if (roll <= 2) return 1;
    if (roll <= 5) return 2;
    if (roll <= 8) return 3;
    return 4;
  }

  pickSpreadX(width, count) {
    const pad = 64;
    const minGap = FOOD_BASE_W * 1.1;
    const usable = width - pad * 2;
    const segment = usable / count;
    const xs = [];

    for (let i = 0; i < count; i++) {
      const center = pad + segment * i + segment / 2;
      const jitter = Phaser.Math.FloatBetween(-segment * 0.22, segment * 0.22);
      xs.push(Phaser.Math.Clamp(center + jitter, pad, width - pad));
    }

    xs.sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) {
      if (xs[i] - xs[i - 1] < minGap) {
        xs[i] = Math.min(width - pad, xs[i - 1] + minGap);
      }
    }
    return xs;
  }

  spawnFruitWave(width, height) {
    if (this.countActiveFruits() >= 7) return;

    const count = this.pickWaveCount();
    const xs = count === 1
      ? [Phaser.Math.Between(80, width - 80)]
      : this.pickSpreadX(width, count);

    let accDelay = 0;
    xs.forEach((x, i) => {
      accDelay += Phaser.Math.Between(550, 950);
      this.time.delayedCall(accDelay, () => this.spawnFruitAt(width, height, x, i));
    });
  }

  pickFruitFrame() {
    if (!this._fruitFrameBag.length) {
      this._fruitFrameBag = Phaser.Utils.Array.Shuffle(
        Array.from({ length: FOOD_FRAMES }, (_, i) => i),
      );
    }
    return this._fruitFrameBag.pop();
  }

  spawnFruitAt(width, height, x, laneIndex = 0) {
    if (!this.activeFruits) return;
    if (this.countActiveFruits() >= 8) return;

    const frame = this.pickFruitFrame();
    const sizeVar = Phaser.Math.FloatBetween(0.75, 1.05);
    const displayW = Math.round(FOOD_BASE_W * sizeVar);
    const displayH = Math.round(displayW * FOOD_ASPECT);
    const spawnTop = Math.max(100, height * 0.18);
    const startY = Phaser.Math.Between(-height * 0.62, -spawnTop) - laneIndex * 80;

    const fruit = this.add.image(x, startY, FOOD_KEY, frame);
    fruit.setOrigin(0.5, 0.5);
    fruit.setDisplaySize(displayW, displayH);
    fruit.setDepth(DEPTH_FRUIT);
    fruit.setData('settled', false);
    this.trackFruit(fruit);

    const fallMs = Phaser.Math.Between(4800, 6800) + laneIndex * 350;
    this.startFruitFall(fruit, fallMs);
  }

  placeLogo(width, depth) {
    const portrait = isPortrait(this);
    const layout = portrait ? SPLASH_LAYOUT.portrait : SPLASH_LAYOUT.landscape;
    const y = layoutY(this, layout.logoY ?? 0.5);
    const maxW = portrait
      ? Math.round(width * (1 - layout.sideMargin * 2))
      : responsiveWidth(this, layout.logoWidth, LOGO_MAX_WIDTH);

    if (this.textures.exists(UI_LOGO_KEY)) {
      const logo = this.add.image(width / 2, y, UI_LOGO_KEY).setDepth(depth);
      logo.setScale(maxW / logo.width);
    }
  }

  placeSplashButtons(width) {
    const portrait = isPortrait(this);
    const layout = portrait ? SPLASH_LAYOUT.portrait : SPLASH_LAYOUT.landscape;
    const btnSize = mobileBtnSize(this, layout.playBtn ?? 0.19, SPLASH_BTN_SIZE);
    const btnIcon = Math.round(btnSize * SPLASH_ICON_RATIO);
    const { btnW, btnH } = getIconButtonSize(this, btnSize, { absolute: portrait });
    const gap = Math.round(width * layout.btnGap);
    const rowY = layoutY(this, layout.buttonsY);

    if (portrait) {
      const topM = Math.max(10, Math.round(this.scale.height * (layout.configTop ?? 0.045)));
      const sideM = Math.max(10, Math.round(width * (layout.sideMargin ?? 0.05)));

      createIconCircleButton(this, width - sideM - btnW / 2, topM + btnH / 2, SPLASH_ICONS.config, {
        size: btnSize,
        iconSize: btnIcon,
        absoluteSize: true,
        depth: DEPTH_UI,
        ...SPLASH_CORNER_BTN_OPTS,
        onClick: () => {
          playSound(this, 'clique');
          GameState.setReturnScene(this, SceneKeys.SPLASH);
          this.scene.start(SceneKeys.SETTINGS);
        },
      });
    } else {
      placeTopRightButton(this, SPLASH_ICONS.config, {
        marginRatio: layout.sideMargin ?? 0.04,
        size: btnSize,
        iconSize: btnIcon,
        absoluteSize: portrait,
        depth: DEPTH_UI,
        ...SPLASH_CORNER_BTN_OPTS,
        onClick: () => {
          playSound(this, 'clique');
          GameState.setReturnScene(this, SceneKeys.SPLASH);
          this.scene.start(SceneKeys.SETTINGS);
        },
      });
    }

    const showRanking = GameState.isOnlineConnected(this);
    const playX = showRanking ? width / 2 - (btnW + gap) / 2 : width / 2;

    createIconCircleButton(this, playX, rowY, SPLASH_ICONS.play, {
      size: btnSize,
      iconSize: btnIcon,
      absoluteSize: portrait,
      depth: DEPTH_UI,
      onClick: async () => {
        playSound(this, 'clique');
        this.splashFrog?.destroy();
        this.caterpillar?.destroy?.();
        await startPlayFromSplash(this);
      },
    });

    if (showRanking) {
      const rankX = width / 2 + (btnW + gap) / 2;
      createIconCircleButton(this, rankX, rowY, SPLASH_ICONS.ranking, {
        size: btnSize,
        iconSize: btnIcon,
        absoluteSize: portrait,
        depth: DEPTH_UI,
        onClick: async () => {
          playSound(this, 'clique');
          await openRankingModal(this);
        },
      });
    }
  }

  async placeUserChip(width) {
    const portrait = isPortrait(this);
    const layout = portrait ? SPLASH_LAYOUT.portrait : SPLASH_LAYOUT.landscape;
    const btnSize = mobileBtnSize(this, layout.playBtn ?? 0.19, SPLASH_BTN_SIZE);
    const btnIcon = Math.round(btnSize * SPLASH_ICON_RATIO);
    const { btnW, btnH } = getIconButtonSize(this, btnSize, { absolute: portrait });
    const topM = Math.max(10, Math.round(this.scale.height * (layout.configTop ?? 0.045)));
    const sideM = Math.max(10, Math.round(width * (layout.sideMargin ?? 0.05)));
    const chipX = sideM + btnW / 2;
    const chipY = topM + btnH / 2;
    const chipOpts = { size: btnSize, iconSize: btnIcon, absoluteSize: portrait };

    this.userChip?.destroy();
    this.userChip = null;

    if (GameState.isOnlineConnected(this)) {
      this.userChip = await createSplashUserChip(this, chipX, chipY, {
        ...chipOpts,
        onClick: () => this.openUserProfile(),
      });
      return;
    }

    if (GameState.hasActiveGuestSession(this)) {
      this.userChip = await createSplashGuestChip(this, chipX, chipY, {
        ...chipOpts,
        onClick: () => this.openGuestProfile(),
      });
      return;
    }

    this.userChip = await createSplashConnectChip(this, chipX, chipY, {
      ...chipOpts,
      onClick: () => {
        playSound(this, 'clique');
        this.scene.start(SceneKeys.LOGIN);
      },
    });
  }

  openUserProfile() {
    if (this.profileModalClose) return;
    playSound(this, 'clique');
    openPlayerProfileModal(this, {
      onClose: () => {
        this.profileModalClose = null;
      },
      onLogout: () => {
        this.profileModalClose = null;
        this.scene.restart();
      },
    }).then(({ close }) => {
      this.profileModalClose = close;
    });
  }

  openGuestProfile() {
    if (this.profileModalClose) return;
    playSound(this, 'clique');
    openGuestProfileModal(this, {
      onClose: () => {
        this.profileModalClose = null;
      },
      onLogout: () => {
        this.profileModalClose = null;
        this.scene.restart();
      },
      onConnect: () => {
        this.profileModalClose = null;
      },
    }).then(({ close }) => {
      this.profileModalClose = close;
    });
  }
}
