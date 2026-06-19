import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import {
  FROG_ATTACK_KEY,
  FROG_ATTACK_FRAME_COUNT,
  FROG_ATTACK_FRAME_W,
  FROG_ATTACK_FRAME_H,
  FROG_ATTACK_ORIGIN_X,
  FROG_ATTACK_ORIGIN_Y,
  syncFrogAttackDisplay,
  anchorFrogAttackSprite,
  playFrogAttackAnim,
  stopFrogAttackAnim,
  setFrogAttackFrame,
  getGameFrogAttackScale,
} from '../config/frogAttackConfig.js';
import {
  FROG_JUMP_KEY,
  FROG_JUMP_ANIM,
  FROG_JUMP_FRAME_COUNT,
  FROG_JUMP_FRAME_W,
  FROG_JUMP_FRAME_H,
  FROG_JUMP_ORIGIN_X,
  FROG_JUMP_ORIGIN_Y,
  getSplashFrogJumpArc,
  syncFrogJumpDisplay,
} from '../config/introFrogConfig.js';
import { SPLASH_CATERPILLAR_SCALE } from '../config/caterpillarConfig.js';
import { playSound } from '../systems/ProceduralAudio.js';

const GROUND_OFFSET_RATIO = 0.080;
const FRAME_GAP = 10;
const JUMP_MS = 680;

/** Debug sapo — atacando.png (3 frames) + pulando.png — VITE_SCREEN_INIT=telasapo */
export class FrogDebugScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.FROG_DEBUG);
    this.attackPreviewActive = false;
    this.jumpPreviewActive = false;
    this.attackFromLeft = true;
    this.attackSprites = [];
    this.attackPreview = null;
    this.jumpSprites = [];
    this.jumpPreview = null;
    this.jumpTween = null;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#E8F9FF');

    this.add.text(width * 0.5, 20, 'Debug — Sapo', {
      fontFamily: Theme.fontFamily,
      fontSize: '20px',
      color: '#1E6A30',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const footY = (groundY) => groundY + height * GROUND_OFFSET_RATIO;
    const attackStripY = height * 0.17;
    const attackPreviewY = height * 0.44;
    const jumpStripY = height * 0.62;
    const jumpPreviewY = height * 0.78;

    const attackStripScale = (height * 0.1) / FROG_ATTACK_FRAME_H;
    const attackPreviewScale = getGameFrogAttackScale(width);
    const jumpStripScale = (height * 0.09) / FROG_JUMP_FRAME_H;
    const jumpPreviewScale = jumpStripScale * 1.35;

    this.drawGroundGuide(attackPreviewY, width);
    this.drawGroundGuide(jumpPreviewY, width);

    this.addLabel('Atacando — 3 frames (miniaturas)', width * 0.5, attackStripY - height * 0.055);
    this.addLabel('Preview na borda', width * 0.5, attackPreviewY - height * 0.1);
    this.addLabel('Pulando — 4 frames', width * 0.5, jumpStripY - height * 0.055);

    this.attackSprites = this.buildAttackStrip(
      width * 0.5,
      footY(attackStripY),
      attackStripScale,
    );
    this.attackPreview = this.buildAttackPreview(
      footY(attackPreviewY),
      attackPreviewScale,
    );

    this.jumpSprites = this.buildJumpStrip(
      width * 0.5,
      footY(jumpStripY),
      jumpStripScale,
    );
    this.jumpPreview = this.buildJumpPreview(
      width * 0.5,
      footY(jumpPreviewY),
      jumpPreviewScale,
    );

    this.debugAttackFootY = footY(attackPreviewY);
    this.debugJumpFootY = footY(jumpPreviewY);
    this.debugAttackPreviewScale = attackPreviewScale;

    this.createAttackControls(width, height);
    this.createJumpControls(width, height);
    this.layoutAttackPreview();
    this.scale.on('resize', this.onResize, this);
  }

  buildAttackStrip(centerX, footY, scale) {
    if (!this.textures.exists(FROG_ATTACK_KEY)) return [];

    const cellW = FROG_ATTACK_FRAME_W * scale;
    const totalW = FROG_ATTACK_FRAME_COUNT * cellW + (FROG_ATTACK_FRAME_COUNT - 1) * FRAME_GAP;
    let x = centerX - totalW / 2 + cellW / 2;
    const sprites = [];

    for (let i = 0; i < FROG_ATTACK_FRAME_COUNT; i += 1) {
      const spr = this.add.sprite(x, footY, FROG_ATTACK_KEY, i)
        .setOrigin(FROG_ATTACK_ORIGIN_X, FROG_ATTACK_ORIGIN_Y)
        .setDepth(3);
      syncFrogAttackDisplay(spr, scale);
      sprites.push(spr);
      x += cellW + FRAME_GAP;
    }

    return sprites;
  }

  buildAttackPreview(footY, scale) {
    if (!this.textures.exists(FROG_ATTACK_KEY)) return null;

    const spr = this.add.sprite(0, footY, FROG_ATTACK_KEY, 0)
      .setOrigin(FROG_ATTACK_ORIGIN_X, FROG_ATTACK_ORIGIN_Y)
      .setDepth(8);
    syncFrogAttackDisplay(spr, scale);
    spr.setData('frogAttackScale', scale);
    return spr;
  }

  buildJumpStrip(centerX, footY, scale) {
    if (!this.textures.exists(FROG_JUMP_KEY)) return [];

    const cellW = FROG_JUMP_FRAME_W * scale;
    const totalW = FROG_JUMP_FRAME_COUNT * cellW + (FROG_JUMP_FRAME_COUNT - 1) * FRAME_GAP;
    let x = centerX - totalW / 2 + cellW / 2;
    const sprites = [];

    for (let i = 0; i < FROG_JUMP_FRAME_COUNT; i += 1) {
      const spr = this.add.sprite(x, footY, FROG_JUMP_KEY, i)
        .setOrigin(FROG_JUMP_ORIGIN_X, FROG_JUMP_ORIGIN_Y)
        .setData('frogDisplayScale', scale)
        .setDepth(3);
      syncFrogJumpDisplay(spr);
      sprites.push(spr);
      x += cellW + FRAME_GAP;
    }

    return sprites;
  }

  buildJumpPreview(centerX, footY, scale) {
    if (!this.textures.exists(FROG_JUMP_KEY)) return null;

    const spr = this.add.sprite(centerX, footY, FROG_JUMP_KEY, 0)
      .setOrigin(FROG_JUMP_ORIGIN_X, FROG_JUMP_ORIGIN_Y)
      .setData('frogDisplayScale', scale)
      .setDepth(6);
    syncFrogJumpDisplay(spr);
    return spr;
  }

  createAttackControls(viewWidth, viewHeight) {
    const y = viewHeight * 0.54;
    this.attackAnimBtn = this.makeButton(viewWidth * 0.35, y, '▶ Ataque', () => this.toggleAttackPreview());
    this.attackSideBtn = this.makeButton(viewWidth * 0.65, y, 'Lado: esq.', () => this.toggleAttackSide());
    this.attackAnimBtnLabel = this.attackAnimBtn.list[1];
    this.attackSideBtnLabel = this.attackSideBtn.list[1];
  }

  createJumpControls(viewWidth, viewHeight) {
    const y = viewHeight - 40;
    this.jumpAnimBtn = this.makeButton(viewWidth * 0.5, y, '▶ Pulo', () => this.toggleJumpPreview());
    this.jumpAnimBtnLabel = this.jumpAnimBtn.list[1];
  }

  makeButton(x, y, label, onClick) {
    const bg = this.add.graphics();
    const text = this.add.text(0, 0, label, {
      fontFamily: Theme.fontFamily,
      fontSize: '15px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const padX = 22;
    const padY = 12;
    const btnW = text.width + padX * 2;
    const btnH = text.height + padY * 2;
    const btn = this.add.container(x, y, [bg, text]).setDepth(50).setSize(btnW, btnH);

    const draw = (hover = false) => {
      bg.clear();
      bg.fillStyle(hover ? 0x6AAA18 : Theme.botaoVerde, 1);
      bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 14);
    };
    draw(false);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => draw(true));
    btn.on('pointerout', () => draw(false));
    btn.on('pointerdown', onClick);
    return btn;
  }

  toggleAttackSide() {
    this.attackFromLeft = !this.attackFromLeft;
    this.attackSideBtnLabel.setText(this.attackFromLeft ? 'Lado: esq.' : 'Lado: dir.');
    this.layoutAttackPreview();
  }

  layoutAttackPreview() {
    const spr = this.attackPreview;
    if (!spr?.active) return;
    anchorFrogAttackSprite(spr, {
      screenWidth: this.scale.width,
      y: this.debugAttackFootY,
      fromLeft: this.attackFromLeft,
    });
  }

  toggleAttackPreview() {
    this.attackPreviewActive = !this.attackPreviewActive;
    if (this.attackPreviewActive) {
      this.attackAnimBtnLabel.setText('⏸ Ataque');
      this.startAttackPreview();
    } else {
      this.attackAnimBtnLabel.setText('▶ Ataque');
      this.stopAttackPreview();
    }
  }

  startAttackPreview() {
    const spr = this.attackPreview;
    if (!spr?.active) return;
    this.layoutAttackPreview();

    const loop = () => {
      if (!this.attackPreviewActive || !spr.active) return;
      playFrogAttackAnim(spr, this, {
        onComplete: () => {
          if (this.attackPreviewActive) {
            this.time.delayedCall(420, loop);
          }
        },
      });
    };
    loop();
  }

  stopAttackPreview() {
    const spr = this.attackPreview;
    if (!spr?.active) return;
    stopFrogAttackAnim(spr);
    this.layoutAttackPreview();
    setFrogAttackFrame(spr, 0);
  }

  toggleJumpPreview() {
    this.jumpPreviewActive = !this.jumpPreviewActive;
    if (this.jumpPreviewActive) {
      this.jumpAnimBtnLabel.setText('⏸ Pulo');
      this.startJumpPreview();
    } else {
      this.jumpAnimBtnLabel.setText('▶ Pulo');
      this.stopJumpPreview();
    }
  }

  startJumpPreview() {
    const spr = this.jumpPreview;
    if (!spr?.active) return;

    const arc = getSplashFrogJumpArc(SPLASH_CATERPILLAR_SCALE);
    const groundY = this.debugJumpFootY;

    const playCycle = () => {
      if (!this.jumpPreviewActive || !spr.active) return;

      playSound(this, 'jump', { volumeMul: 0.78 });

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
          if (this.jumpPreviewActive) {
            this.time.delayedCall(420, playCycle);
          }
        },
      });
    };

    playCycle();
  }

  stopJumpPreview() {
    this.jumpTween?.stop();
    this.jumpTween = null;
    const spr = this.jumpPreview;
    if (!spr?.active) return;
    spr.anims?.stop();
    spr.setFrame(0);
    spr.setY(this.debugJumpFootY);
    syncFrogJumpDisplay(spr);
  }

  addLabel(text, x, y) {
    this.add.text(x, y, text, {
      fontFamily: Theme.fontFamily,
      fontSize: '15px',
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

  onResize() {
    this.scene.restart();
  }

  shutdown() {
    this.jumpTween?.stop();
    this.scale.off('resize', this.onResize, this);
  }
}
