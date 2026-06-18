import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { drawEnvironmentLayers } from '../ui/createUI.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import {
  COCOON_WOBBLE_KEY,
  COCOON_OPEN_ANIM,
  COCOON_STORY_CARD_Y_RATIO,
  COCOON_HINT_Y_RATIO,
  COCOON_TAP_HIT_W_RATIO,
  COCOON_TAP_HIT_H_RATIO,
  COCOON_TAP_HIT_Y_RATIO,
  layoutCocoonSprite,
  showCocoonFrame,
} from '../config/cocoonConfig.js';
import {
  createCocoonStoryCard,
  createCocoonTapHint,
  preloadCocoonIcons,
} from '../ui/cocoonUi.js';

/** Tela do casulo — frame parado; cada toque avança; 2º toque abre p/ borboleta */
export class CocoonScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.COCOON);
  }

  init() {
    this.cliques = 0;
    this.opening = false;
    this.storyCard = null;
    this.hintText = null;
    this.cocoonSprite = null;
    this.tapZone = null;
  }

  async create() {
    const { width, height } = this.scale;
    const child = GameState.getChild(this);
    const config = GameState.getConfig(this);
    this.maxCliques = config.cliquesCasulo || 2;
    const nome = child?.nome ?? 'Lagartinha';
    const genero = child?.genero ?? 'menino';

    this.buildCocoonStage(width, height);

    await preloadCocoonIcons(this);
    this.storyCard = createCocoonStoryCard(this, width / 2, height * COCOON_STORY_CARD_Y_RATIO, {
      nome,
      genero,
    });
    this.hintText = createCocoonTapHint(this, width / 2, height * COCOON_HINT_Y_RATIO);

    this.buildTapZone(width, height);
    playSound(this, 'cresceu');
    this.cameras.main.fadeIn(400, 0, 0, 0);
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

  buildTapZone(width, height) {
    const hitW = Math.round(width * COCOON_TAP_HIT_W_RATIO);
    const hitH = Math.round(height * COCOON_TAP_HIT_H_RATIO);
    const hitY = Math.round(height * COCOON_TAP_HIT_Y_RATIO);

    this.tapZone = this.add.zone(width / 2, hitY, hitW, hitH)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });

    this.tapZone.on('pointerup', () => this.onCocoonTap());
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

    showCocoonFrame(this.cocoonSprite, this.cliques);
    this.wobbleCocoon();
  }

  wobbleCocoon() {
    const spr = this.cocoonSprite;
    if (!spr) return;

    this.tweens.killTweensOf(spr);
    this.tweens.add({
      targets: spr,
      angle: { from: -4, to: 4 },
      duration: 220,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => spr.setAngle(0),
    });
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

    showCocoonFrame(spr, 3);
    this.time.delayedCall(650, () => this.finishOpenCocoon());
  }

  finishOpenCocoon() {
    playSound(this, 'point', { volumeMul: 0.9 });
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start(SceneKeys.VICTORY);
    });
  }
}
