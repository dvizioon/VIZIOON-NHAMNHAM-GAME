import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { drawEnvironmentLayers } from '../ui/createUI.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import {
  COCOON_WOBBLE_KEY,
  COCOON_TRUNK_KEY,
  COCOON_WOBBLE_ANIM,
  COCOON_OPEN_ANIM,
  COCOON_FRAME_COUNT,
  COCOON_STORY_CARD_Y_RATIO,
  COCOON_HINT_Y_RATIO,
  layoutCocoonStage,
  getCocoonTapZone,
  showCocoonFrame,
} from '../config/cocoonConfig.js';
import {
  createCocoonStoryCard,
  createCocoonTapHint,
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
  }

  async create() {
    const { width, height } = this.scale;
    const child = GameState.getChild(this);
    const config = GameState.getConfig(this);
    this.maxCliques = config.cliquesCasulo || 3;
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
    this.scale.on('resize', this.onResize, this);
    playSound(this, 'cresceu');
    this.cameras.main.fadeIn(400, 0, 0, 0);
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
    this.hintText?.setPosition(width / 2, height * COCOON_HINT_Y_RATIO);
    this.buildTapZone();
  }

  onCocoonTap() {
    if (this.opening) return;

    this.cliques += 1;
    const isLast = this.cliques >= this.maxCliques;
    playSound(this, isLast ? 'nascer' : 'egg_crack');

    if (isLast) {
      this.playCocoonOpenAnim();
      return;
    }

    this.wobbleCocoon();
  }

  wobbleCocoon() {
    const spr = this.cocoonSprite;
    if (!spr) return;

    this.tweens.killTweensOf(spr);
    if (spr.anims && this.anims.exists(COCOON_WOBBLE_ANIM)) {
      spr.anims.play(COCOON_WOBBLE_ANIM);
      spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => showCocoonFrame(spr, 0));
      return;
    }

    showCocoonFrame(spr, Math.min(this.cliques, 2));
  }

  playCocoonOpenAnim() {
    if (this.opening) return;
    this.opening = true;
    this.tapZone?.disableInteractive();

    const fadeTargets = [this.storyCard, this.hintText].filter(Boolean);
    if (fadeTargets.length) {
      this.tweens.add({
        targets: fadeTargets,
        alpha: 0,
        duration: 280,
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
    if (spr?.anims && this.anims.exists(COCOON_OPEN_ANIM)) {
      spr.anims.play(COCOON_OPEN_ANIM);
      spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.finishOpenCocoon());
      return;
    }

    showCocoonFrame(spr, 5);
    this.time.delayedCall(650, () => this.finishOpenCocoon());
  }

  finishOpenCocoon() {
    playSound(this, 'point', { volumeMul: 0.9 });
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start(SceneKeys.VICTORY);
    });
  }

  shutdown() {
    this.scale.off('resize', this.onResize, this);
  }
}
