import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { drawEnvironmentLayers, getGroundY, DEPTH_TRUNK } from '../ui/createUI.js';
import { attachCharacterCabecaToClimb, syncCabecaToClimbBody } from '../ui/characterAvatar.js';
import { getSpritesManifest } from '../systems/SpriteLoader.js';
import {
  INTRO_TRUNK_KEY,
  CLIMB_TEX,
  CLIMB_ANIM,
  TRUNK_PLAY_WIDTH_RATIO,
  CLIMB_FRAME_WIDTH,
  CLIMB_EYES_CLOSED_FRAME,
} from '../config/gameWorldConfig.js';

/** Tronco intro — lagarta sobe; toque fecha os olhos até o fim */
export class TrunkIntroScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.TRUNK_INTRO);
  }

  init() {
    this.eyesClosed = false;
    this.climberContainer = null;
    this.bodySprite = null;
    this.headSprite = null;
    this.climbScale = 1;
  }

  create() {
    const { width, height } = this.scale;
    const child = GameState.getChild(this);
    const anchorY = Math.round(getGroundY(this));

    drawEnvironmentLayers(this);

    if (this.textures.exists(INTRO_TRUNK_KEY)) {
      this.add.image(width / 2, 0, INTRO_TRUNK_KEY)
        .setOrigin(0.5, 0)
        .setDepth(DEPTH_TRUNK)
        .setDisplaySize(width, height);
    }

    const nome = child?.nome ?? 'Lagartinha';
    this.add.text(width / 2, height * 0.1, `${nome} vai subir! 🐛`, {
      fontFamily: Theme.fontFamily,
      fontSize: '22px',
      color: '#3B3024',
      fontStyle: 'bold',
      backgroundColor: '#FFF8E7CC',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(20);

    this.climbScale = (width * TRUNK_PLAY_WIDTH_RATIO * 1.1) / CLIMB_FRAME_WIDTH;
    this.buildClimber(width / 2, height + 60, child);

    this.time.delayedCall(600, () => playSound(this, 'hut'));

    this.tweens.add({
      targets: this.climberContainer,
      y: anchorY,
      duration: 1400,
      ease: 'Sine.easeOut',
      delay: 600,
    });

    this.time.delayedCall(5000, () => {
      this.cameras.main.fadeOut(450, 0, 0, 0);
      this.time.delayedCall(450, () => {
        this.scene.start(SceneKeys.GAME);
      });
    });

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  buildClimber(startX, startY, child) {
    this.climberContainer = this.add.container(startX, startY).setDepth(25);

    if (this.textures.exists(CLIMB_TEX)) {
      this.bodySprite = this.add.sprite(0, 0, CLIMB_TEX, 0)
        .setOrigin(0.5, 0.92)
        .setScale(this.climbScale);

      if (this.anims.exists(CLIMB_ANIM)) {
        this.bodySprite.anims.play(CLIMB_ANIM);
      }

      this.climberContainer.add(this.bodySprite);
      const headCfg = getSpritesManifest().characters?.default?.head ?? {};
      this.headSprite = attachCharacterCabecaToClimb(
        this,
        this.climberContainer,
        this.bodySprite,
        child,
        this.climbScale,
        headCfg,
      );
    } else {
      const fallback = this.add.circle(0, 0, 24, Theme.folha);
      this.climberContainer.add(fallback);
      this.bodySprite = fallback;
    }

    const hitW = (this.bodySprite.displayWidth || 80) * 1.35;
    const hitH = (this.bodySprite.displayHeight || 100) * 1.15;
    this.climberContainer.setSize(hitW, hitH);
    this.climberContainer.setInteractive(
      new Phaser.Geom.Rectangle(-hitW / 2, -hitH, hitW, hitH),
      Phaser.Geom.Rectangle.Contains,
    );
    this.climberContainer.on('pointerdown', () => this.closeEyes());
  }

  closeEyes() {
    if (this.eyesClosed || !this.bodySprite) return;
    this.eyesClosed = true;
    playSound(this, 'clique');

    this.bodySprite.anims?.stop();
    if (this.headSprite) this.headSprite.anims?.stop();

    const headCfg = getSpritesManifest().characters?.default?.head ?? {};
    const closedHeadFrame = headCfg.blinkFrame ?? 3;
    const blinkTargets = [this.headSprite, this.bodySprite].filter(Boolean);

    this.tweens.add({
      targets: this.climberContainer,
      y: this.climberContainer.y - this.bodySprite.displayHeight * 0.08,
      duration: 280,
      ease: 'Sine.easeOut',
      yoyo: true,
    });

    this.tweens.add({
      targets: blinkTargets,
      scaleY: (t) => t.scaleY * 0.92,
      duration: 110,
      ease: 'Sine.easeIn',
      yoyo: true,
      onComplete: () => {
        this.bodySprite.setFrame(CLIMB_EYES_CLOSED_FRAME);
        this.bodySprite.setScale(this.climbScale);

        if (this.headSprite) {
          this.headSprite.setFrame(closedHeadFrame);
          syncCabecaToClimbBody(
            this.headSprite,
            this.bodySprite,
            this.climbScale,
            headCfg,
          );
        }
      },
    });
  }
}
