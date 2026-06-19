import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { drawEnvironmentLayers } from '../ui/createUI.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { SplashFrogChase } from '../systems/SplashFrogChase.js';
import {
  FROG_JUMP_KEY,
  SPLASH_FROG_ENABLED,
  getSplashFrogGroundY,
  getSplashFrogSceneScale,
  getSplashFrogSceneJumpArc,
} from '../config/introFrogConfig.js';
import {
  COCOON_WOBBLE_KEY,
  COCOON_TRUNK_KEY,
  COCOON_TRUNK_DEPTH,
  COCOON_SPRITE_DEPTH,
  COCOON_FROG_DEPTH,
  COCOON_FRAME_COUNT,
  COCOON_STORY_CARD_Y_RATIO,
  COCOON_HINT_Y_RATIO,
  layoutCocoonStage,
  getCocoonTapZone,
  showCocoonFrame,
  playCocoonTapWobble,
  playCocoonOpenAnim as runCocoonOpenAnim,
  stopCocoonAnim,
} from '../config/cocoonConfig.js';
import {
  createCocoonStoryCard,
  createCocoonTapHint,
  startCocoonTapHintAnim,
  preloadCocoonIcons,
} from '../ui/cocoonUi.js';

/** Tela do casulo — galho + casulo pendurado; cada toque balança; 2º toque abre p/ borboleta */
export class CocoonScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.COCOON);
  }

  init() {
    this.cliques = 0;
    this.opening = false;
    this.storyCard = null;
    this.hintText = null;
    this.trunkImage = null;
    this.cocoonSprite = null;
    this.tapZone = null;
    this.cocoonBusy = false;
    this.cocoonFrog = null;
    this.frogLoopTimer = null;
    this.frogFromRight = true;
  }

  async create() {
    const { width, height } = this.scale;
    const child = GameState.getChild(this);
    this.maxCliques = 2;
    const nome = child?.nome ?? 'Lagartinha';
    const genero = child?.genero ?? 'menino';

    this.buildCocoonStage(width, height);

    await preloadCocoonIcons(this);
    this.storyCard = createCocoonStoryCard(this, width / 2, height * COCOON_STORY_CARD_Y_RATIO, {
      nome,
      genero,
    });
    this.hintText = createCocoonTapHint(this, width / 2, height * COCOON_HINT_Y_RATIO);

    this.buildTapZone();
    this.spawnPassingFrog();
    this.scale.on('resize', this.onResize, this);
    playSound(this, 'cresceu');
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  buildCocoonStage(width, height) {
    drawEnvironmentLayers(this, { clouds: true, ground: true });

    if (this.textures.exists(COCOON_WOBBLE_KEY)) {
      this.cocoonSprite = this.add.sprite(0, 0, COCOON_WOBBLE_KEY, 0)
        .setDepth(COCOON_SPRITE_DEPTH)
        .setScrollFactor(0);
    }

    if (this.textures.exists(COCOON_TRUNK_KEY)) {
      this.trunkImage = this.add.image(width / 2, 0, COCOON_TRUNK_KEY)
        .setDepth(COCOON_TRUNK_DEPTH)
        .setScrollFactor(0);
    }

    layoutCocoonStage(this.trunkImage, this.cocoonSprite, width, height);
    showCocoonFrame(this.cocoonSprite, 0);
  }

  buildTapZone() {
    this.tapZone?.destroy();
    const hit = getCocoonTapZone(this.cocoonSprite);
    if (!hit) return;

    this.tapZone = this.add.zone(hit.x, hit.y, hit.width, hit.height)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });

    this.tapZone.on('pointerup', () => this.onCocoonTap());
  }

  onResize(gameSize) {
    const { width, height } = gameSize;
    layoutCocoonStage(this.trunkImage, this.cocoonSprite, width, height);
    showCocoonFrame(this.cocoonSprite, this.opening ? COCOON_FRAME_COUNT - 1 : 0);
    this.storyCard?.setPosition(width / 2, height * COCOON_STORY_CARD_Y_RATIO);
    const hintY = height * COCOON_HINT_Y_RATIO;
    startCocoonTapHintAnim(this, this.hintText, width / 2, hintY);
    this.buildTapZone();
  }

  onCocoonTap() {
    if (this.opening || this.cocoonBusy) return;

    this.cliques += 1;
    const isLast = this.cliques >= this.maxCliques;
    playSound(this, 'egg_crack');

    if (isLast) {
      this.startCocoonOpen();
      return;
    }

    this.wobbleCocoon();
  }

  spawnPassingFrog() {
    if (!SPLASH_FROG_ENABLED || !this.textures.exists(FROG_JUMP_KEY)) return;

    this.cocoonFrog = new SplashFrogChase(this, {
      groundY: getSplashFrogGroundY(this),
      depth: COCOON_FROG_DEPTH,
      getMatchScale: () => getSplashFrogSceneScale(),
      getJumpArc: () => getSplashFrogSceneJumpArc(),
      onTurnComplete: () => this.scheduleNextFrogPass(),
    });

    this.time.delayedCall(1100, () => {
      if (this.cocoonFrog?.frog?.active && !this.opening) {
        this.cocoonFrog.startTurn({ exitToRight: this.frogFromRight });
      }
    });
  }

  scheduleNextFrogPass() {
    if (this.opening) return;
    this.frogLoopTimer?.remove();
    this.frogLoopTimer = this.time.delayedCall(Phaser.Math.Between(3200, 5200), () => {
      if (!this.cocoonFrog?.frog?.active || this.opening) return;
      this.frogFromRight = !this.frogFromRight;
      this.cocoonFrog.startTurn({ exitToRight: this.frogFromRight });
    });
  }

  stopCocoonFrog() {
    this.frogLoopTimer?.remove();
    this.frogLoopTimer = null;
    this.cocoonFrog?.destroy();
    this.cocoonFrog = null;
  }

  wobbleCocoon({ onComplete } = {}) {
    const spr = this.cocoonSprite;
    if (!spr) return;

    this.cocoonBusy = true;
    this.tweens.killTweensOf(spr);
    playCocoonTapWobble(spr, this, 1, {
      onComplete: () => {
        this.cocoonBusy = false;
        onComplete?.();
      },
    });
  }

  startCocoonOpen() {
    if (this.opening) return;
    this.opening = true;
    this.cocoonBusy = true;
    this.stopCocoonFrog();
    this.tapZone?.disableInteractive();

    const fadeTargets = [this.storyCard, this.hintText].filter(Boolean);
    if (fadeTargets.length) {
      this.tweens.add({
        targets: fadeTargets,
        alpha: 0,
        duration: 400,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.storyCard?.destroy();
          this.hintText?.destroy();
          this.storyCard = null;
          this.hintText = null;
        },
      });
    }

    const spr = this.cocoonSprite;
    if (spr) {
      runCocoonOpenAnim(spr, this, {
        onComplete: () => {
          this.cocoonBusy = false;
          playSound(this, 'nascer');
          this.finishOpenCocoon();
        },
      });
      return;
    }

    showCocoonFrame(spr, 5);
    this.time.delayedCall(900, () => {
      playSound(this, 'nascer');
      this.finishOpenCocoon();
    });
  }

  finishOpenCocoon() {
    this.time.delayedCall(400, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, () => {
        this.scene.start(SceneKeys.VICTORY);
      });
    });
  }

  shutdown() {
    stopCocoonAnim(this.cocoonSprite);
    this.stopCocoonFrog();
    if (this.hintText) this.tweens.killTweensOf(this.hintText);
    this.scale.off('resize', this.onResize, this);
  }
}
