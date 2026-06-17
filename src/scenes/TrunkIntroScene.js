import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { drawEnvironmentLayers, DEPTH_TRUNK } from '../ui/createUI.js';
import { attachCharacterCabecaToClimb, syncCabecaToClimbBody } from '../ui/characterAvatar.js';
import { getSpritesManifest } from '../systems/SpriteLoader.js';
import {
  createTrunkStoryCard,
  createTrunkTapHint,
  preloadTrunkIntroIcons,
  TRUNK_STORY_CARD_Y_RATIO,
  TRUNK_HINT_Y_RATIO,
  TRUNK_CLIMBER_START_Y_RATIO,
  TRUNK_CLIMBER_END_Y_RATIO,
} from '../ui/trunkIntroUi.js';
import {
  INTRO_TRUNK_KEY,
  TRUNK_PLAY_WIDTH_RATIO,
  CLIMB_TEX,
  CLIMB_ANIM,
  CLIMB_FRAME_WIDTH,
  CLIMB_SWAY_X,
  INTRO_CLIMB_HEAD_SCALE_MUL,
  INTRO_CLIMB_HEAD_BALL_TOP,
  INTRO_CLIMB_HEAD_OFFSET_Y,
  INTRO_CLIMB_SIZE_MUL,
} from '../config/gameWorldConfig.js';

const CLIMB_DURATION_MS = 3200;

/** Tronco intro — subindo.png + cabeça da criança; toque para subir */
export class TrunkIntroScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.TRUNK_INTRO);
  }

  init() {
    this.climbing = false;
    this.storyCard = null;
    this.hintText = null;
    this.climberContainer = null;
    this.bodySprite = null;
    this.headSprite = null;
    this.climbScale = 1;
    this.pulseTween = null;
  }

  async create() {
    const { width, height } = this.scale;
    const child = GameState.getChild(this);
    const nome = child?.nome ?? 'Lagartinha';
    const genero = child?.genero ?? 'menino';

    drawEnvironmentLayers(this);

    if (this.textures.exists(INTRO_TRUNK_KEY)) {
      this.add.image(width / 2, 0, INTRO_TRUNK_KEY)
        .setOrigin(0.5, 0)
        .setDepth(DEPTH_TRUNK)
        .setDisplaySize(width, height);
    }

    await preloadTrunkIntroIcons(this);
    this.storyCard = createTrunkStoryCard(this, width / 2, height * TRUNK_STORY_CARD_Y_RATIO, {
      nome,
      genero,
    });
    this.hintText = createTrunkTapHint(this, width / 2, height * TRUNK_HINT_Y_RATIO);

    this.buildClimber(width, height, child);
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  getHeadCfg() {
    return {
      ...(getSpritesManifest().characters?.default?.head ?? {}),
      scaleMul: INTRO_CLIMB_HEAD_SCALE_MUL,
      ballTopRatio: INTRO_CLIMB_HEAD_BALL_TOP,
      offsetY: INTRO_CLIMB_HEAD_OFFSET_Y,
    };
  }

  buildClimber(width, height, child) {
    const startY = Math.round(height * TRUNK_CLIMBER_START_Y_RATIO);
    this.climbScale = (width * TRUNK_PLAY_WIDTH_RATIO * INTRO_CLIMB_SIZE_MUL) / CLIMB_FRAME_WIDTH;

    this.climberContainer = this.add.container(width / 2, startY).setDepth(25);

    if (this.textures.exists(CLIMB_TEX)) {
      this.bodySprite = this.add.sprite(0, 0, CLIMB_TEX, 0)
        .setOrigin(0.5, 0.92)
        .setScale(this.climbScale);

      this.climberContainer.add(this.bodySprite);

      this.headSprite = attachCharacterCabecaToClimb(
        this,
        this.climberContainer,
        this.bodySprite,
        child,
        this.climbScale,
        this.getHeadCfg(),
      );
    } else {
      this.bodySprite = this.add.circle(0, 0, 36, 0x7cb342);
      this.climberContainer.add(this.bodySprite);
    }

    const hitW = (this.bodySprite.displayWidth || 80) * 1.35;
    const hitH = (this.bodySprite.displayHeight || 100) * 1.15;
    this.climberContainer.setSize(hitW, hitH);
    this.climberContainer.setInteractive(
      new Phaser.Geom.Rectangle(-hitW / 2, -hitH, hitW, hitH),
      Phaser.Geom.Rectangle.Contains,
    );
    this.climberContainer.input.cursor = 'pointer';

    this.pulseTween = this.tweens.add({
      targets: this.climberContainer,
      scaleX: { from: 1, to: 1.04 },
      scaleY: { from: 1, to: 1.04 },
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.climberContainer.on('pointerdown', () => this.startClimb());
  }

  playClimbAnim() {
    if (this.bodySprite?.anims && this.anims.exists(CLIMB_ANIM)) {
      this.bodySprite.anims.play(CLIMB_ANIM);
    }
  }

  startClimb() {
    if (this.climbing || !this.climberContainer) return;
    this.climbing = true;
    playSound(this, 'hut');

    this.pulseTween?.stop();
    this.climberContainer.setScale(1);
    this.climberContainer.disableInteractive();

    const fadeTargets = [this.storyCard, this.hintText].filter(Boolean);
    if (fadeTargets.length) {
      this.tweens.add({
        targets: fadeTargets,
        alpha: 0,
        duration: 320,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.storyCard?.destroy();
          this.hintText?.destroy();
          this.storyCard = null;
          this.hintText = null;
        },
      });
    }

    this.playClimbAnim();

    const headCfg = this.getHeadCfg();
    const startX = this.climberContainer.x;
    const endY = Math.round(this.scale.height * TRUNK_CLIMBER_END_Y_RATIO);

    this.tweens.add({
      targets: this.climberContainer,
      y: endY,
      duration: CLIMB_DURATION_MS,
      ease: 'Linear',
      onUpdate: (tween) => {
        const progress = tween.progress;
        this.climberContainer.x = startX + Math.sin(progress * Math.PI * 10) * CLIMB_SWAY_X * 0.55;
        if (this.headSprite && this.bodySprite) {
          syncCabecaToClimbBody(this.headSprite, this.bodySprite, this.climbScale, headCfg);
        }
      },
      onComplete: () => {
        this.climberContainer.x = startX;
        this.finishIntro();
      },
    });
  }

  finishIntro() {
    this.bodySprite?.anims?.stop();
    this.headSprite?.anims?.stop();
    playSound(this, 'clique');

    this.time.delayedCall(500, () => {
      this.cameras.main.fadeOut(450, 0, 0, 0);
      this.time.delayedCall(450, () => {
        this.scene.start(SceneKeys.GAME);
      });
    });
  }
}
