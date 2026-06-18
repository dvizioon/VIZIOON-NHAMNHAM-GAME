import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import { drawEnvironmentLayers } from '../ui/createUI.js';
import { GameState } from '../utils/GameState.js';
import { playSound } from '../systems/ProceduralAudio.js';
import {
  COCOON_WOBBLE_KEY,
  COCOON_OPEN_ANIM,
  COCOON_HINT_Y_RATIO,
  DEFAULT_COCOON_TUNE,
  layoutCocoonSprite,
  showCocoonFrame,
} from '../config/cocoonConfig.js';
import {
  createCocoonStoryCard,
  createCocoonTapHint,
  preloadCocoonIcons,
} from '../ui/cocoonUi.js';

function cloneTune(tune) {
  return { ...tune };
}

/** Debug casulo — VITE_SCREEN_INIT=telacasulodebug */
export class CocoonDebugScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.COCOON_DEBUG);
    this.tune = cloneTune(DEFAULT_COCOON_TUNE);
    this.cliques = 0;
    this.maxCliques = 2;
    this.opening = false;
    this.storyCard = null;
    this.hintText = null;
    this.cocoonSprite = null;
    this.tapZone = null;
    this.hitGfx = null;
    this.infoText = null;
  }

  async create() {
    const { width, height } = this.scale;
    const child = GameState.getChild(this);
    const nome = child?.nome ?? 'Lagartinha';
    const genero = child?.genero ?? 'menino';
    this.maxCliques = GameState.getConfig(this).cliquesCasulo || 2;

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

    if (!this.textures.exists(COCOON_WOBBLE_KEY)) return;

    this.cocoonSprite = this.add.sprite(width / 2, height / 2, COCOON_WOBBLE_KEY, 0)
      .setOrigin(0.5)
      .setDepth(10)
      .setScrollFactor(0);

    layoutCocoonSprite(this.cocoonSprite, width, height);
    showCocoonFrame(this.cocoonSprite, 0);
  }

  rebuildUi(width, height, nome, genero) {
    this.storyCard?.destroy();
    this.hintText?.destroy();
    this.tapZone?.destroy();
    this.hitGfx?.destroy();

    this.storyCard = createCocoonStoryCard(
      this,
      width / 2,
      height * this.tune.storyCardYRatio,
      { nome, genero },
    );
    this.hintText = createCocoonTapHint(this, width / 2, height * COCOON_HINT_Y_RATIO);

    const hitW = Math.round(width * this.tune.tapHitWRatio);
    const hitH = Math.round(height * this.tune.tapHitHRatio);
    const hitY = Math.round(height * this.tune.tapHitYRatio);

    this.hitGfx = this.add.graphics().setDepth(24).setScrollFactor(0);
    this.hitGfx.lineStyle(2, 0xFF5252, 0.9);
    this.hitGfx.fillStyle(0xFF5252, 0.15);
    this.hitGfx.strokeRect(width / 2 - hitW / 2, hitY - hitH / 2, hitW, hitH);
    this.hitGfx.fillRect(width / 2 - hitW / 2, hitY - hitH / 2, hitW, hitH);

    this.tapZone = this.add.zone(width / 2, hitY, hitW, hitH)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });
    this.tapZone.on('pointerup', () => this.onCocoonTap());
    this.refreshInfo(width, height);
  }

  buildOverlayUi(width, height) {
    this.add.text(width * 0.5, 14, 'Debug — casulo (toque na área vermelha)', {
      fontFamily: Theme.fontFamily,
      fontSize: '15px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1E6A30',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0);

    this.add.text(width * 0.5, 36, '↑↓ área Y  ·  ←→ largura  ·  Q/E altura  ·  W/S card  ·  R reset  ·  V vitória', {
      fontFamily: Theme.fontFamily,
      fontSize: '11px',
      color: '#FFFFFF',
      stroke: '#1E6A30',
      strokeThickness: 3,
      align: 'center',
      wordWrap: { width: width - 16 },
    }).setOrigin(0.5, 0).setDepth(100).setScrollFactor(0);

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
    this.infoText?.setText(
      `toque ${this.cliques}/${this.maxCliques}  ·  área W=${t.tapHitWRatio.toFixed(2)} H=${t.tapHitHRatio.toFixed(2)} Y=${t.tapHitYRatio.toFixed(2)}  ·  card Y=${t.storyCardYRatio.toFixed(2)}  ·  tela ${width}×${height}`,
    );
  }

  bindKeyboard() {
    this.input.keyboard.on('keydown', (event) => {
      const step = event.shiftKey ? 0.04 : 0.02;
      if (event.key === 'ArrowUp') {
        this.tune.tapHitYRatio = Phaser.Math.Clamp(this.tune.tapHitYRatio - step, 0.2, 0.9);
        this.relayout();
        return;
      }
      if (event.key === 'ArrowDown') {
        this.tune.tapHitYRatio = Phaser.Math.Clamp(this.tune.tapHitYRatio + step, 0.2, 0.9);
        this.relayout();
        return;
      }
      if (event.key === 'ArrowLeft') {
        this.tune.tapHitWRatio = Phaser.Math.Clamp(this.tune.tapHitWRatio - step, 0.1, 0.9);
        this.relayout();
        return;
      }
      if (event.key === 'ArrowRight') {
        this.tune.tapHitWRatio = Phaser.Math.Clamp(this.tune.tapHitWRatio + step, 0.1, 0.9);
        this.relayout();
        return;
      }
      if (event.key === 'q' || event.key === 'Q') {
        this.tune.tapHitHRatio = Phaser.Math.Clamp(this.tune.tapHitHRatio - step, 0.08, 0.6);
        this.relayout();
        return;
      }
      if (event.key === 'e' || event.key === 'E') {
        this.tune.tapHitHRatio = Phaser.Math.Clamp(this.tune.tapHitHRatio + step, 0.08, 0.6);
        this.relayout();
        return;
      }
      if (event.key === 'w' || event.key === 'W') {
        this.tune.storyCardYRatio = Phaser.Math.Clamp(this.tune.storyCardYRatio - step, 0.05, 0.45);
        this.relayout();
        return;
      }
      if (event.key === 's' || event.key === 'S') {
        this.tune.storyCardYRatio = Phaser.Math.Clamp(this.tune.storyCardYRatio + step, 0.05, 0.45);
        this.relayout();
        return;
      }
      if (event.key === 'r' || event.key === 'R') {
        this.tune = cloneTune(DEFAULT_COCOON_TUNE);
        this.cliques = 0;
        this.opening = false;
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

    showCocoonFrame(this.cocoonSprite, this.cliques);
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

    showCocoonFrame(spr, 3);
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
