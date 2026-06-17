import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import {
  FROG_JUMP_KEY,
  FROG_JUMP_ANIM,
  FROG_JUMP_FRAME_COUNT,
  FROG_JUMP_FRAME_W,
  FROG_JUMP_ORIGIN_X,
  FROG_JUMP_ORIGIN_Y,
  getSplashFrogJumpArc,
  syncFrogJumpDisplay,
} from '../config/introFrogConfig.js';
import { SPLASH_CATERPILLAR_SCALE } from '../config/caterpillarConfig.js';

const GROUND_OFFSET_RATIO = 0.080;
const FIT_WIDTH_RATIO = 0.88;
const FRAME_GAP = 16;
const JUMP_MS = 680;

/** Tela debug — 4 frames estáticos + linha “Pulando” (igual telalargata) */
export class FrogDebugScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.FROG_DEBUG);
    this.animPreviewActive = false;
    this.frameSprites = [];
    this.pulandoSprite = null;
    this.jumpTween = null;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#E8F9FF');

    const framesGroundY = height * 0.22;
    const pulandoGroundY = height * 0.55;
    const footY = (groundY) => groundY + height * GROUND_OFFSET_RATIO;
    const centerX = width * 0.5;

    this.drawGroundGuide(framesGroundY, width);
    this.drawGroundGuide(pulandoGroundY, width);

    this.addLabel('Frames', centerX, framesGroundY - height * 0.07);
    this.addLabel('Pulando', centerX, pulandoGroundY - height * 0.07);

    const frogScale = this.computeDebugFrogScale(width);

    this.frameSprites = this.buildFrameStrip(
      centerX,
      footY(framesGroundY),
      width,
      frogScale,
    );

    this.pulandoSprite = this.buildPulandoSprite(centerX, footY(pulandoGroundY), frogScale);

    this.debugCenterX = centerX;
    this.debugViewWidth = width;
    this.debugPulandoFootY = footY(pulandoGroundY);
    this.debugFrogScale = frogScale;

    this.createAnimToggleButton(width, height);
    this.scale.on('resize', this.onResize, this);
  }

  computeDebugFrogScale(viewWidth) {
    const maxW = viewWidth * FIT_WIDTH_RATIO;
    const stripW = FROG_JUMP_FRAME_COUNT * FROG_JUMP_FRAME_W
      + (FROG_JUMP_FRAME_COUNT - 1) * FRAME_GAP;
    return maxW / stripW;
  }

  buildFrameStrip(centerX, footY, viewWidth, frogScale) {
    if (!this.textures.exists(FROG_JUMP_KEY)) return [];

    const cellW = FROG_JUMP_FRAME_W * frogScale;
    const totalW = FROG_JUMP_FRAME_COUNT * cellW + (FROG_JUMP_FRAME_COUNT - 1) * FRAME_GAP;
    let x = centerX - totalW / 2 + cellW / 2;
    const sprites = [];

    for (let i = 0; i < FROG_JUMP_FRAME_COUNT; i += 1) {
      const spr = this.add.sprite(x, footY, FROG_JUMP_KEY, i)
        .setOrigin(FROG_JUMP_ORIGIN_X, FROG_JUMP_ORIGIN_Y)
        .setData('frogDisplayScale', frogScale)
        .setDepth(5);
      syncFrogJumpDisplay(spr);
      sprites.push(spr);
      x += cellW + FRAME_GAP;
    }

    return sprites;
  }

  buildPulandoSprite(centerX, footY, frogScale) {
    if (!this.textures.exists(FROG_JUMP_KEY)) return null;

    const spr = this.add.sprite(centerX, footY, FROG_JUMP_KEY, 0)
      .setOrigin(FROG_JUMP_ORIGIN_X, FROG_JUMP_ORIGIN_Y)
      .setData('frogDisplayScale', frogScale)
      .setDepth(6);
    syncFrogJumpDisplay(spr);
    spr.anims?.stop();
    spr.setFrame(0);
    return spr;
  }

  addLabel(text, x, y) {
    this.add.text(x, y, text, {
      fontFamily: Theme.fontFamily,
      fontSize: '17px',
      color: '#336633',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  drawGroundGuide(y, width) {
    const g = this.add.graphics().setDepth(1);
    g.lineStyle(2, 0x8B6914, 0.55);
    g.lineBetween(width * 0.06, y, width * 0.94, y);
    g.lineStyle(1, 0x7CB342, 0.35);
    g.lineBetween(width * 0.06, y - 2, width * 0.94, y - 2);
  }

  layoutPulandoSprite() {
    const spr = this.pulandoSprite;
    if (!spr?.active) return;
    spr.setPosition(this.debugCenterX, this.debugPulandoFootY);
    syncFrogJumpDisplay(spr);
  }

  createAnimToggleButton(viewWidth, viewHeight) {
    const label = this.add.text(0, 0, '▶  Ver animação', {
      fontFamily: Theme.fontFamily,
      fontSize: '17px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const padX = 28;
    const padY = 14;
    const btnW = label.width + padX * 2;
    const btnH = label.height + padY * 2;
    const bg = this.add.graphics();

    this.animBtn = this.add.container(viewWidth * 0.5, viewHeight - 44, [bg, label])
      .setDepth(50)
      .setSize(btnW, btnH);

    this.animBtn.setInteractive({ useHandCursor: true });
    this.animBtn.on('pointerover', () => this.refreshAnimBtnStyle(true));
    this.animBtn.on('pointerout', () => this.refreshAnimBtnStyle(false));
    this.animBtn.on('pointerdown', () => this.toggleAnimPreview());
    this.animBtnLabel = label;
    this.refreshAnimBtnStyle(false);
  }

  refreshAnimBtnStyle(hover = false) {
    if (!this.animBtnLabel || !this.animBtn) return;
    const padX = 28;
    const padY = 14;
    const btnW = this.animBtnLabel.width + padX * 2;
    const btnH = this.animBtnLabel.height + padY * 2;
    const bg = this.animBtn.list[0];
    bg.clear();
    const fill = this.animPreviewActive
      ? 0x5EA448
      : (hover ? 0x6AAA18 : Theme.botaoVerde);
    bg.fillStyle(fill, 1);
    bg.lineStyle(3, 0x4E7A14, 1);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
    this.animBtn.setSize(btnW, btnH);
  }

  toggleAnimPreview() {
    this.animPreviewActive = !this.animPreviewActive;
    if (this.animPreviewActive) {
      this.animBtnLabel.setText('⏸  Parar animação');
      this.startAnimPreview();
    } else {
      this.animBtnLabel.setText('▶  Ver animação');
      this.stopAnimPreview();
    }
    this.refreshAnimBtnStyle(false);
  }

  startAnimPreview() {
    const spr = this.pulandoSprite;
    if (!spr?.active) return;

    const arc = getSplashFrogJumpArc(SPLASH_CATERPILLAR_SCALE);
    const groundY = this.debugPulandoFootY;

    const playCycle = () => {
      if (!this.animPreviewActive || !spr.active) return;

      spr.setY(groundY);
      spr.setFrame(0);
      syncFrogJumpDisplay(spr);

      if (this.anims.exists(FROG_JUMP_ANIM)) {
        spr.play(FROG_JUMP_ANIM);
      }

      this.jumpTween?.stop();
      this.jumpTween = this.tweens.add({
        targets: spr,
        y: groundY - arc,
        duration: JUMP_MS * 0.42,
        yoyo: true,
        ease: 'Sine.easeOut',
        onComplete: () => {
          if (spr.active) {
            spr.y = groundY;
            spr.setFrame(0);
            syncFrogJumpDisplay(spr);
          }
          if (this.animPreviewActive) {
            this.time.delayedCall(420, playCycle);
          }
        },
      });
    };

    playCycle();
  }

  stopAnimPreview() {
    this.jumpTween?.stop();
    this.jumpTween = null;

    const spr = this.pulandoSprite;
    if (!spr?.active) return;

    spr.anims?.stop();
    spr.setFrame(0);
    spr.setY(this.debugPulandoFootY);
    syncFrogJumpDisplay(spr);
  }

  onResize() {
    this.scene.restart();
  }

  shutdown() {
    this.jumpTween?.stop();
    this.scale.off('resize', this.onResize, this);
  }
}
