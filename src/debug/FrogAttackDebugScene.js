import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import { drawEnvironmentLayers, getGroundY, DEPTH_TRUNK } from '../ui/createUI.js';
import {
  GAME_TRUNK_KEY,
  TRUNK_PLAY_WIDTH_RATIO,
  GAME_CLIMBER_Y_LIFT,
} from '../config/gameWorldConfig.js';
import {
  FROG_ATTACK_KEY,
  FROG_ATTACK_ORIGIN_X,
  FROG_ATTACK_ORIGIN_Y,
  DEFAULT_FROG_ATTACK_TUNE,
  getGameFrogEdgeInset,
  getGameFrogAttackScale,
  syncFrogAttackDisplay,
  anchorFrogAttackSprite,
  playFrogAttackAnim,
  stopFrogAttackAnim,
} from '../config/frogAttackConfig.js';

function cloneTune(tune) {
  return { ...tune };
}

/** Debug sapo na árvore — VITE_SCREEN_INIT=telasapoatacando */
export class FrogAttackDebugScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.FROG_ATTACK_DEBUG);
    this.tune = cloneTune(DEFAULT_FROG_ATTACK_TUNE);
    this.fromLeft = true;
    this.headY = 0;
    this.frogSprite = null;
    this.attackLoopActive = false;
    this.headGfx = null;
    this.tongueGfx = null;
    this.infoText = null;
  }

  create() {
    const { width, height } = this.scale;
    this.headY = Math.round(getGroundY(this) - height * GAME_CLIMBER_Y_LIFT);
    this.trunkCX = width / 2;

    this.buildEnvironment(width, height);
    this.buildHeadGuide();
    this.buildFrog();
    this.buildOverlayUi(width, height);
    this.startAttackLoop();
    this.bindKeyboard();
    this.scale.on('resize', this.onResize, this);
  }

  buildEnvironment(width, height) {
    drawEnvironmentLayers(this);

    if (this.textures.exists(GAME_TRUNK_KEY)) {
      this.add.image(width / 2, 0, GAME_TRUNK_KEY)
        .setOrigin(0.5, 0)
        .setDepth(DEPTH_TRUNK)
        .setScrollFactor(0)
        .setDisplaySize(width, height);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, 0x8B5A2B)
        .setDepth(DEPTH_TRUNK)
        .setScrollFactor(0);
    }

    this.add.text(width * 0.5, 18, 'Debug — sapo atacando na árvore', {
      fontFamily: Theme.fontFamily,
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1E6A30',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0);
  }

  buildHeadGuide() {
    this.headGfx = this.add.graphics().setDepth(25).setScrollFactor(0);
    this.tongueGfx = this.add.graphics().setDepth(26).setScrollFactor(0);
    this.refreshHeadGuide();
  }

  refreshHeadGuide() {
    const g = this.headGfx;
    const tg = this.tongueGfx;
    if (!g || !tg) return;

    g.clear();
    g.lineStyle(2, 0xFFD54F, 0.9);
    g.strokeCircle(this.trunkCX, this.headY, 28);
    g.fillStyle(0xFFD54F, 0.25);
    g.fillCircle(this.trunkCX, this.headY, 28);
    g.lineStyle(1, 0xFFFFFF, 0.7);
    g.lineBetween(this.trunkCX - 36, this.headY, this.trunkCX + 36, this.headY);

    const spr = this.frogSprite;
    tg.clear();
    if (spr?.active) {
      const tongueX = this.fromLeft
        ? spr.x + spr.displayWidth * 0.78
        : spr.x - spr.displayWidth * 0.78;
      tg.lineStyle(2, 0xFF5252, 0.85);
      tg.lineBetween(spr.x, spr.y, tongueX, spr.y);
      tg.fillStyle(0xFF5252, 0.35);
      tg.fillCircle(tongueX, spr.y, 10);
    }
  }

  buildFrog() {
    if (!this.textures.exists(FROG_ATTACK_KEY)) {
      this.add.text(this.scale.width * 0.5, this.scale.height * 0.5, 'frog_attack não carregou', {
        fontFamily: Theme.fontFamily,
        fontSize: '16px',
        color: '#CC0000',
      }).setOrigin(0.5).setDepth(50);
      return;
    }

    const scale = getGameFrogAttackScale(this.scale.width, this.tune);
    this.frogSprite = this.add.sprite(0, 0, FROG_ATTACK_KEY, 0)
      .setOrigin(FROG_ATTACK_ORIGIN_X, FROG_ATTACK_ORIGIN_Y)
      .setDepth(31)
      .setScrollFactor(0);
    syncFrogAttackDisplay(this.frogSprite, scale);
    this.layoutFrog();
  }

  layoutFrog() {
    const spr = this.frogSprite;
    if (!spr?.active) return;

    const scale = getGameFrogAttackScale(this.scale.width, this.tune);
    syncFrogAttackDisplay(spr, scale);
    anchorFrogAttackSprite(spr, {
      screenWidth: this.scale.width,
      y: this.headY,
      fromLeft: this.fromLeft,
      useGameLayout: true,
      tune: this.tune,
    });
    this.refreshHeadGuide();
    this.refreshInfo();
  }

  startAttackLoop() {
    this.attackLoopActive = true;
    const loop = () => {
      const spr = this.frogSprite;
      if (!this.attackLoopActive || !spr?.active) return;
      playFrogAttackAnim(spr, this, {
        onFrame: () => this.refreshHeadGuide(),
        onComplete: () => {
          if (this.attackLoopActive) {
            this.time.delayedCall(260, loop);
          }
        },
      });
    };
    loop();
  }

  stopAttackLoop() {
    this.attackLoopActive = false;
    stopFrogAttackAnim(this.frogSprite);
    this.layoutFrog();
  }

  buildOverlayUi(width, height) {
    this.add.text(width * 0.5, 42, '↑↓ cabeça  ·  ←→ borda  ·  Z/X largura  ·  Q/E escala  ·  W/S Y  ·  Espaço = lado', {
      fontFamily: Theme.fontFamily,
      fontSize: '12px',
      color: '#FFFFFF',
      stroke: '#1E6A30',
      strokeThickness: 3,
      align: 'center',
      wordWrap: { width: width - 20 },
    }).setOrigin(0.5, 0).setDepth(100).setScrollFactor(0);

    const btnY = height - 34;
    const specs = [
      { label: '← borda', onClick: () => this.nudgeInset(-2) },
      { label: 'borda →', onClick: () => this.nudgeInset(2) },
      { label: '− tam', onClick: () => this.nudgeScaleMul(-0.02) },
      { label: '+ tam', onClick: () => this.nudgeScaleMul(0.02) },
      { label: 'Lado', onClick: () => this.toggleSide() },
      { label: 'Reset', onClick: () => this.resetTune() },
    ];
    const gap = 8;
    const btnW = Math.min(58, (width - 32 - gap * (specs.length - 1)) / specs.length);
    const totalW = specs.length * btnW + (specs.length - 1) * gap;
    let x = width * 0.5 - totalW / 2 + btnW / 2;

    specs.forEach((spec) => {
      this.makeButton(x, btnY, btnW, 34, spec.label, spec.onClick);
      x += btnW + gap;
    });

    this.infoText = this.add.text(width * 0.5, height - 8, '', {
      fontFamily: Theme.fontFamily,
      fontSize: '11px',
      color: '#FFFFFF',
      stroke: '#1E6A30',
      strokeThickness: 3,
      align: 'center',
      wordWrap: { width: width - 16 },
    }).setOrigin(0.5, 1).setDepth(100).setScrollFactor(0);

    this.refreshInfo();
  }

  makeButton(x, y, w, h, label, onClick) {
    const bg = this.add.graphics();
    const text = this.add.text(0, 0, label, {
      fontFamily: Theme.fontFamily,
      fontSize: '12px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const btn = this.add.container(x, y, [bg, text]).setDepth(100).setSize(w, h).setScrollFactor(0);
    const draw = (hover = false) => {
      bg.clear();
      bg.fillStyle(hover ? 0x6AAA18 : Theme.botaoVerde, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    };
    draw(false);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => draw(true));
    btn.on('pointerout', () => draw(false));
    btn.on('pointerdown', onClick);
    return btn;
  }

  bindKeyboard() {
    this.input.keyboard.on('keydown', (event) => {
      if (event.key === 'ArrowUp') {
        this.nudgeHeadY(-4);
        return;
      }
      if (event.key === 'ArrowDown') {
        this.nudgeHeadY(4);
        return;
      }
      if (event.key === 'ArrowLeft') {
        this.nudgeInset(-2);
        return;
      }
      if (event.key === 'ArrowRight') {
        this.nudgeInset(2);
        return;
      }
      if (event.key === 'z' || event.key === 'Z') {
        this.nudgeWidthRatio(-0.01);
        return;
      }
      if (event.key === 'x' || event.key === 'X') {
        this.nudgeWidthRatio(0.01);
        return;
      }
      if (event.key === 'q' || event.key === 'Q') {
        this.nudgeScaleMul(-0.02);
        return;
      }
      if (event.key === 'e' || event.key === 'E') {
        this.nudgeScaleMul(0.02);
        return;
      }
      if (event.key === 'w' || event.key === 'W') {
        this.nudgeYOffset(-2);
        return;
      }
      if (event.key === 's' || event.key === 'S') {
        this.nudgeYOffset(2);
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        this.toggleSide();
      }
    });
  }

  nudgeHeadY(delta) {
    this.headY = Phaser.Math.Clamp(this.headY + delta, 80, this.scale.height - 40);
    this.relayoutFrog();
  }

  nudgeInset(delta) {
    const key = this.fromLeft ? 'edgeInsetLeftPx' : 'edgeInsetRightPx';
    const max = this.fromLeft ? 200 : 320;
    this.tune[key] = Phaser.Math.Clamp((this.tune[key] ?? getGameFrogEdgeInset(this.fromLeft, this.tune)) + delta, 0, max);
    this.relayoutFrog();
  }

  nudgeWidthRatio(delta) {
    this.tune.widthRatio = Phaser.Math.Clamp(
      Number((this.tune.widthRatio + delta).toFixed(3)),
      0.2,
      1.2,
    );
    this.relayoutFrog();
  }

  nudgeScaleMul(delta) {
    this.tune.scaleMul = Phaser.Math.Clamp(
      Number((this.tune.scaleMul + delta).toFixed(3)),
      0.5,
      2.5,
    );
    this.relayoutFrog();
  }

  nudgeYOffset(delta) {
    this.tune.yOffsetPx = Phaser.Math.Clamp(this.tune.yOffsetPx + delta, -80, 120);
    this.relayoutFrog();
  }

  toggleSide() {
    this.fromLeft = !this.fromLeft;
    this.relayoutFrog();
  }

  resetTune() {
    this.tune = cloneTune(DEFAULT_FROG_ATTACK_TUNE);
    const { height } = this.scale;
    this.headY = Math.round(getGroundY(this) - height * GAME_CLIMBER_Y_LIFT);
    this.relayoutFrog();
  }

  relayoutFrog() {
    const wasActive = this.attackLoopActive;
    if (wasActive) this.stopAttackLoop();
    this.layoutFrog();
    if (wasActive) this.startAttackLoop();
  }

  refreshInfo() {
    const t = this.tune;
    const side = this.fromLeft ? 'esq' : 'dir';
    const inset = getGameFrogEdgeInset(this.fromLeft, t);
    this.infoText?.setText(
      `cabeça Y=${this.headY}  ·  lado ${side}  ·  borda ${inset}px (esq ${t.edgeInsetLeftPx} / dir ${t.edgeInsetRightPx})  ·  Y+${t.yOffsetPx}px  ·  largura ${t.widthRatio.toFixed(2)}  ·  escala ${t.scaleMul.toFixed(2)}  ·  tronco ${Math.round(this.scale.width * TRUNK_PLAY_WIDTH_RATIO)}px`,
    );
  }

  onResize() {
    this.scene.restart();
  }

  shutdown() {
    this.stopAttackLoop();
    this.scale.off('resize', this.onResize, this);
    this.input.keyboard.removeAllListeners('keydown');
  }
}
