import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import { drawEnvironmentLayers } from '../ui/createUI.js';
import { GameState } from '../utils/GameState.js';
import { playSound } from '../systems/ProceduralAudio.js';
import {
  COCOON_WOBBLE_KEY,
  COCOON_TRUNK_KEY,
  COCOON_OPEN_ANIM,
  COCOON_FRAME_COUNT,
  COCOON_HINT_Y_RATIO,
  DEFAULT_COCOON_TUNE,
  layoutCocoonStage,
  getCocoonTapZone,
  showCocoonFrame,
} from '../config/cocoonConfig.js';
import {
  createCocoonStoryCard,
  createCocoonTapHint,
  preloadCocoonIcons,
} from '../ui/cocoonUi.js';

function cloneTune(tune) {
  return { ...DEFAULT_COCOON_TUNE, ...tune };
}

/** Debug casulo — VITE_SCREEN_INIT=telacasulodebug */
export class CocoonDebugScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.COCOON_DEBUG);
    this.tune = cloneTune(DEFAULT_COCOON_TUNE);
    this.cliques = 0;
    this.maxCliques = 2;
    this.opening = false;
    this.previewFrame = 0;
    this.storyCard = null;
    this.hintText = null;
    this.trunkImage = null;
    this.cocoonSprite = null;
    this.tapZone = null;
    this.hitGfx = null;
    this.infoText = null;
    this.tuneText = null;
  }

  async create() {
    const { width, height } = this.scale;
    const child = GameState.getChild(this);
    const nome = child?.nome ?? 'Lagartinha';
    const genero = child?.genero ?? 'menino';
    this.maxCliques = GameState.getConfig(this).cliquesCasulo || 3;

    this.buildCocoonStage(width, height);
    await preloadCocoonIcons(this);
    this.rebuildUi(width, height, nome, genero);
    this.buildOverlayUi(width, height);
    this.bindKeyboard();
    this.scale.on('resize', () => this.scene.restart());
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  buildCocoonStage(width, height) {
    drawEnvironmentLayers(this, { clouds: true, ground: true });

    if (this.textures.exists(COCOON_TRUNK_KEY)) {
      this.trunkImage = this.add.image(width / 2, 0, COCOON_TRUNK_KEY)
        .setDepth(8)
        .setScrollFactor(0);
    }

    if (this.textures.exists(COCOON_WOBBLE_KEY)) {
      this.cocoonSprite = this.add.sprite(0, 0, COCOON_WOBBLE_KEY, 0)
        .setDepth(10)
        .setScrollFactor(0);
    }

    layoutCocoonStage(this.trunkImage, this.cocoonSprite, width, height, this.tune);
    showCocoonFrame(this.cocoonSprite, this.previewFrame);
  }

  rebuildUi(width, height, nome, genero) {
    this.storyCard?.destroy();
    this.hintText?.destroy();
    this.tapZone?.destroy();
    this.hitGfx?.destroy();

    layoutCocoonStage(this.trunkImage, this.cocoonSprite, width, height, this.tune);
    showCocoonFrame(this.cocoonSprite, this.previewFrame);

    this.storyCard = createCocoonStoryCard(
      this,
      width / 2,
      height * this.tune.storyCardYRatio,
      { nome, genero },
    );
    this.hintText = createCocoonTapHint(this, width / 2, height * COCOON_HINT_Y_RATIO);

    const hit = getCocoonTapZone(this.cocoonSprite, this.tune);
    this.hitGfx = this.add.graphics().setDepth(24).setScrollFactor(0);
    if (hit) {
      this.hitGfx.lineStyle(2, 0xFF5252, 0.9);
      this.hitGfx.fillStyle(0xFF5252, 0.15);
      this.hitGfx.strokeRect(hit.x - hit.width / 2, hit.y - hit.height / 2, hit.width, hit.height);
      this.hitGfx.fillRect(hit.x - hit.width / 2, hit.y - hit.height / 2, hit.width, hit.height);

      this.tapZone = this.add.zone(hit.x, hit.y, hit.width, hit.height)
        .setDepth(25)
        .setInteractive({ useHandCursor: true });
      this.tapZone.on('pointerup', () => this.onCocoonTap());
    }

    this.refreshInfo(width, height);
  }

  buildOverlayUi(width, height) {
    this.add.text(width * 0.5, 14, 'Debug — casulo no galho (área vermelha = toque)', {
      fontFamily: Theme.fontFamily,
      fontSize: '15px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1E6A30',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0);

    this.add.text(width * 0.5, 36, [
      '↑↓ galho Y  ·  ←→ galho tam  ·  A/D casulo X  ·  W/S casulo Y  ·  Q/E casulo tam',
      '1-6 frame  ·  W/S card  ·  R reset  ·  V vitória',
    ].join('\n'), {
      fontFamily: Theme.fontFamily,
      fontSize: '11px',
      color: '#FFFFFF',
      stroke: '#1E6A30',
      strokeThickness: 3,
      align: 'center',
      wordWrap: { width: width - 16 },
    }).setOrigin(0.5, 0).setDepth(100).setScrollFactor(0);

    this.tuneText = this.add.text(width * 0.5, height - 28, '', {
      fontFamily: Theme.fontFamily,
      fontSize: '10px',
      color: '#B2FF59',
      stroke: '#1E6A30',
      strokeThickness: 2,
      align: 'center',
      wordWrap: { width: width - 16 },
    }).setOrigin(0.5, 1).setDepth(100).setScrollFactor(0);

    this.infoText = this.add.text(width * 0.5, height - 8, '', {
      fontFamily: Theme.fontFamily,
      fontSize: '11px',
      color: '#FFFFFF',
      stroke: '#1E6A30',
      strokeThickness: 3,
      align: 'center',
      wordWrap: { width: width - 16 },
    }).setOrigin(0.5, 1).setDepth(100).setScrollFactor(0);
  }

  refreshInfo(width, height) {
    const t = this.tune;
    this.tuneText?.setText(
      `galho Y=${t.trunkYRatio.toFixed(2)} tam=${t.trunkWidthRatio.toFixed(2)}  ·  casulo X=${t.cocoonHangXRatio.toFixed(2)} Y=${t.cocoonHangYRatio.toFixed(2)} tam=${t.cocoonHeightRatio.toFixed(2)}  ·  frame ${this.previewFrame}`,
    );
    this.infoText?.setText(
      `toque ${this.cliques}/${this.maxCliques}  ·  hit pad X=${t.tapHitPadX.toFixed(2)} Y=${t.tapHitPadY.toFixed(2)}  ·  card Y=${t.storyCardYRatio.toFixed(2)}  ·  tela ${width}×${height}`,
    );
  }

  bindKeyboard() {
    this.input.keyboard.on('keydown', (event) => {
      const step = event.shiftKey ? 0.04 : 0.02;
      const fine = event.shiftKey ? 0.02 : 0.01;

      if (event.key >= '1' && event.key <= '6') {
        this.previewFrame = Number(event.key) - 1;
        showCocoonFrame(this.cocoonSprite, this.previewFrame);
        this.refreshInfo(this.scale.width, this.scale.height);
        return;
      }
      if (event.key === 'ArrowUp') {
        this.tune.trunkYRatio = Phaser.Math.Clamp(this.tune.trunkYRatio - step, 0.12, 0.55);
        this.relayout();
        return;
      }
      if (event.key === 'ArrowDown') {
        this.tune.trunkYRatio = Phaser.Math.Clamp(this.tune.trunkYRatio + step, 0.12, 0.55);
        this.relayout();
        return;
      }
      if (event.key === 'ArrowLeft') {
        this.tune.trunkWidthRatio = Phaser.Math.Clamp(this.tune.trunkWidthRatio - step, 0.5, 1.2);
        this.relayout();
        return;
      }
      if (event.key === 'ArrowRight') {
        this.tune.trunkWidthRatio = Phaser.Math.Clamp(this.tune.trunkWidthRatio + step, 0.5, 1.2);
        this.relayout();
        return;
      }
      if (event.key === 'a' || event.key === 'A') {
        this.tune.cocoonHangXRatio = Phaser.Math.Clamp(this.tune.cocoonHangXRatio - fine, -0.35, 0.35);
        this.relayout();
        return;
      }
      if (event.key === 'd' || event.key === 'D') {
        this.tune.cocoonHangXRatio = Phaser.Math.Clamp(this.tune.cocoonHangXRatio + fine, -0.35, 0.35);
        this.relayout();
        return;
      }
      if (event.key === 'w' || event.key === 'W') {
        if (event.altKey) {
          this.tune.storyCardYRatio = Phaser.Math.Clamp(this.tune.storyCardYRatio - step, 0.05, 0.45);
        } else {
          this.tune.cocoonHangYRatio = Phaser.Math.Clamp(this.tune.cocoonHangYRatio - fine, -0.1, 0.45);
        }
        this.relayout();
        return;
      }
      if (event.key === 's' || event.key === 'S') {
        if (event.altKey) {
          this.tune.storyCardYRatio = Phaser.Math.Clamp(this.tune.storyCardYRatio + step, 0.05, 0.45);
        } else {
          this.tune.cocoonHangYRatio = Phaser.Math.Clamp(this.tune.cocoonHangYRatio + fine, -0.1, 0.45);
        }
        this.relayout();
        return;
      }
      if (event.key === 'q' || event.key === 'Q') {
        this.tune.cocoonHeightRatio = Phaser.Math.Clamp(this.tune.cocoonHeightRatio - step, 0.12, 0.45);
        this.relayout();
        return;
      }
      if (event.key === 'e' || event.key === 'E') {
        this.tune.cocoonHeightRatio = Phaser.Math.Clamp(this.tune.cocoonHeightRatio + step, 0.12, 0.45);
        this.relayout();
        return;
      }
      if (event.key === 'r' || event.key === 'R') {
        this.tune = cloneTune(DEFAULT_COCOON_TUNE);
        this.cliques = 0;
        this.opening = false;
        this.previewFrame = 0;
        showCocoonFrame(this.cocoonSprite, 0);
        this.tapZone?.setInteractive({ useHandCursor: true });
        this.relayout();
        return;
      }
      if (event.key === 'v' || event.key === 'V') {
        this.scene.start(SceneKeys.VICTORY);
      }
    });
  }

  relayout() {
    const child = GameState.getChild(this);
    const { width, height } = this.scale;
    this.rebuildUi(width, height, child?.nome ?? 'Lagartinha', child?.genero ?? 'menino');
  }

  onCocoonTap() {
    if (this.opening) return;
    this.cliques += 1;
    const isLast = this.cliques >= this.maxCliques;
    playSound(this, isLast ? 'nascer' : 'egg_crack');

    if (isLast) {
      this.openCocoon();
      return;
    }

    this.previewFrame = Math.min(this.cliques, COCOON_FRAME_COUNT - 1);
    showCocoonFrame(this.cocoonSprite, this.previewFrame);
    this.refreshInfo(this.scale.width, this.scale.height);
  }

  openCocoon() {
    if (this.opening) return;
    this.opening = true;
    this.tapZone?.disableInteractive();

    const spr = this.cocoonSprite;
    if (spr?.anims && this.anims.exists(COCOON_OPEN_ANIM)) {
      spr.anims.play(COCOON_OPEN_ANIM);
      spr.once('animationcomplete', () => this.goVictory());
      return;
    }

    showCocoonFrame(spr, COCOON_FRAME_COUNT - 1);
    this.time.delayedCall(650, () => this.goVictory());
  }

  goVictory() {
    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.time.delayedCall(450, () => this.scene.start(SceneKeys.VICTORY));
  }

  shutdown() {
    this.scale.off('resize');
    this.input.keyboard.removeAllListeners('keydown');
  }
}
