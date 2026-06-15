import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import {
  INTRO_TRUNK_KEY,
  CLIMB_TEX,
  CLIMB_ANIM,
  CLIMBER_ANCHOR_Y_RATIO,
  TRUNK_PLAY_WIDTH_RATIO,
} from '../config/gameWorldConfig.js';

/** Tronco intro — lagarta entra no tronco antes do gameplay */
export class TrunkIntroScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.TRUNK_INTRO);
  }

  create() {
    const { width, height } = this.scale;
    const child = GameState.getChild(this);
    const anchorY = Math.round(height * CLIMBER_ANCHOR_Y_RATIO);

    if (this.textures.exists(INTRO_TRUNK_KEY)) {
      this.add.image(width / 2, 0, INTRO_TRUNK_KEY)
        .setOrigin(0.5, 0)
        .setDepth(0)
        .setDisplaySize(width, height);
    } else {
      const g = this.add.graphics().setDepth(0);
      g.fillGradientStyle(Theme.ceuClaro, Theme.ceuClaro, Theme.ceu, Theme.ceu, 1);
      g.fillRect(0, 0, width, height);
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

    const climbScale = (width * TRUNK_PLAY_WIDTH_RATIO * 1.1) / 244;
    let climber = null;

    if (this.textures.exists(CLIMB_TEX)) {
      climber = this.add.sprite(width / 2, height + 60, CLIMB_TEX, 0)
        .setOrigin(0.5, 0.92)
        .setDepth(15)
        .setScale(climbScale);

      if (this.anims.exists(CLIMB_ANIM)) {
        climber.anims.play(CLIMB_ANIM);
      }
    } else {
      climber = this.add.circle(width / 2, height + 60, 24, Theme.folha)
        .setDepth(15);
    }

    this.tweens.add({
      targets: climber,
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
}
