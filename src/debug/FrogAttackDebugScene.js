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
  getFrogTongueReachMul,
  getFrogTongueHitHalfH,
  getFrogTongueAnchorShift,
  getFrogTongueExtraPad,
  syncFrogAttackDisplay,
  anchorFrogAttackSprite,
  playFrogAttackAnim,
  stopFrogAttackAnim,
  setFrogAttackFrame,
} from '../config/frogAttackConfig.js';
import { drawFrogTongueHitDebug, FROG_DEBUG_FREEZE_FRAME } from '../utils/debug.js';

function cloneTune(tune) {
  return { ...DEFAULT_FROG_ATTACK_TUNE, ...tune };
}

/** Debug sapo na árvore — VITE_SCREEN_INIT=telasapoatacando */
export class FrogAttackDebugScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.FROG_ATTACK_DEBUG);
    this.tune = cloneTune(DEFAULT_FROG_ATTACK_TUNE);
    this.fromLeft = true;
    this.headY = 0;
    this.mockSegments = 4;
    this.mockBodyR = 36;
    this.mockSpacing = 42;
    this.hitExtraPad = 14;
    this.frogSprite = null;
    this.attackLoopActive = false;
    this.attackPaused = false;
    this.headGfx = null;
    this.hitGfx = null;
    this.infoText = null;
    this.tuneText = null;
  }

  create() {
    const { width, height } = this.scale;
    this.headY = Math.round(getGroundY(this) - height * GAME_CLIMBER_Y_LIFT);
    this.trunkCX = width / 2;

    this.buildEnvironment(width, height);
    this.buildDebugGraphics();
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

    this.add.text(width * 0.5, 18, 'Debug — sapo + hitbox da língua', {
      fontFamily: Theme.fontFamily,
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1E6A30',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0);
  }

  buildDebugGraphics() {
    this.headGfx = this.add.graphics().setDepth(25).setScrollFactor(0);
    this.hitGfx = this.add.graphics().setDepth(27).setScrollFactor(0);
    this.refreshDebugGraphics();
  }

  getMockCaterpillarTargets() {
    const targets = [];
    for (let i = 0; i < this.mockSegments; i += 1) {
      targets.push({
        x: this.trunkCX,
        y: this.headY - i * this.mockSpacing,
        r: this.mockBodyR,
      });
    }
    return targets;
  }

  refreshDebugGraphics() {
    const g = this.headGfx;
    const hitG = this.hitGfx;
    if (!g || !hitG) return;

    g.clear();
    g.lineStyle(2, 0xFFD54F, 0.9);
    g.strokeCircle(this.trunkCX, this.headY, 28);
    g.fillStyle(0xFFD54F, 0.18);
    g.fillCircle(this.trunkCX, this.headY, 28);
    g.lineStyle(1, 0xFFFFFF, 0.7);
    g.lineBetween(this.trunkCX - 36, this.headY, this.trunkCX + 36, this.headY);

    hitG.clear();
    const spr = this.frogSprite;
    if (spr?.active) {
      drawFrogTongueHitDebug(
        hitG,
        spr,
        this.fromLeft,
        this.hitExtraPad,
        this.getMockCaterpillarTargets(),
        this.tune,
      );
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
    this.refreshDebugGraphics();
    this.refreshInfo();
  }

  startAttackLoop() {
    this.attackLoopActive = true;
    const loop = () => {
      const spr = this.frogSprite;
      if (!this.attackLoopActive || !spr?.active) return;
      playFrogAttackAnim(spr, this, {
        onFrame: () => this.refreshDebugGraphics(),
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

  toggleAttackPause() {
    this.attackPaused = !this.attackPaused;
    if (this.attackPaused) {
      this.stopAttackLoop();
      setFrogAttackFrame(this.frogSprite, FROG_DEBUG_FREEZE_FRAME);
      this.refreshDebugGraphics();
    } else {
      this.startAttackLoop();
    }
    this.pauseBtnLabel?.setText(this.attackPaused ? 'Retomar' : 'Pausar');
  }

  buildOverlayUi(width, height) {
    this.add.text(width * 0.5, 40, [
      '↑↓ cabeça  ·  ←→ borda  ·  Z/X largura  ·  Q/E escala  ·  W/S Y  ·  Espaço = lado  ·  P = pausar',
      'HIT: botões abaixo  ·  ou Alt+←→ move X  ·  [ ] alcance  ·  , . altura  ·  1-6 segmentos',
      'DIR: ancora + puxa hit pra direita (canto)  ·  ancora − puxa pra lagarta',
    ].join('\n'), {
      fontFamily: Theme.fontFamily,
      fontSize: '11px',
      color: '#FFFFFF',
      stroke: '#1E6A30',
      strokeThickness: 3,
      align: 'center',
      lineSpacing: 4,
      wordWrap: { width: width - 20 },
    }).setOrigin(0.5, 0).setDepth(100).setScrollFactor(0);

    const hitBtnY = height - 74;
    const hitSpecs = [
      { label: 'hit ←', onClick: () => this.nudgeTongueAnchorShift(-6) },
      { label: 'hit →', onClick: () => this.nudgeTongueAnchorShift(6) },
      { label: 'alc −', onClick: () => this.nudgeTongueReach(-0.02) },
      { label: 'alc +', onClick: () => this.nudgeTongueReach(0.02) },
      { label: 'alt −', onClick: () => this.nudgeTongueHalfH(-4) },
      { label: 'alt +', onClick: () => this.nudgeTongueHalfH(4) },
    ];
    const hitGap = 6;
    const hitBtnW = Math.min(52, (width - 24 - hitGap * (hitSpecs.length - 1)) / hitSpecs.length);
    const hitTotalW = hitSpecs.length * hitBtnW + (hitSpecs.length - 1) * hitGap;
    let hitX = width * 0.5 - hitTotalW / 2 + hitBtnW / 2;
    hitSpecs.forEach((spec) => {
      this.makeButton(hitX, hitBtnY, hitBtnW, 30, spec.label, spec.onClick);
      hitX += hitBtnW + hitGap;
    });

    const btnY = height - 34;
    const specs = [
      { label: '← borda', onClick: () => this.nudgeInset(-2) },
      { label: 'borda →', onClick: () => this.nudgeInset(2) },
      { label: '− tam', onClick: () => this.nudgeScaleMul(-0.02) },
      { label: '+ tam', onClick: () => this.nudgeScaleMul(0.02) },
      { label: 'Lado', onClick: () => this.toggleSide() },
      { label: 'Pausar', onClick: () => this.toggleAttackPause(), isPause: true },
      { label: 'Reset', onClick: () => this.resetTune() },
    ];
    const gap = 8;
    const btnW = Math.min(58, (width - 32 - gap * (specs.length - 1)) / specs.length);
    const totalW = specs.length * btnW + (specs.length - 1) * gap;
    let x = width * 0.5 - totalW / 2 + btnW / 2;

    specs.forEach((spec) => {
      const btn = this.makeButton(x, btnY, btnW, 34, spec.label, spec.onClick);
      if (spec.isPause) {
        this.pauseBtnLabel = btn.list[1];
      }
      x += btnW + gap;
    });

    this.tuneText = this.add.text(width * 0.5, height - 88, '', {
      fontFamily: Theme.fontFamily,
      fontSize: '10px',
      color: '#B2FF59',
      stroke: '#1E6A30',
      strokeThickness: 2,
      align: 'center',
      wordWrap: { width: width - 16 },
    }).setOrigin(0.5, 1).setDepth(100).setScrollFactor(0);

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
      if (event.key === 'p' || event.key === 'P') {
        this.toggleAttackPause();
        return;
      }
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        this.nudgeTongueAnchorShift(-6);
        return;
      }
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        this.nudgeTongueAnchorShift(6);
        return;
      }
      if (event.key === 'k' || event.key === 'K') {
        this.nudgeTongueAnchorShift(-6);
        return;
      }
      if (event.key === 'l' || event.key === 'L') {
        this.nudgeTongueAnchorShift(6);
        return;
      }
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
      if (event.key === '[') {
        this.nudgeTongueReach(-0.02);
        return;
      }
      if (event.key === ']') {
        this.nudgeTongueReach(0.02);
        return;
      }
      if (event.key === ',') {
        this.nudgeTongueHalfH(-4);
        return;
      }
      if (event.key === '.') {
        this.nudgeTongueHalfH(4);
        return;
      }
      if (event.key === ';') {
        this.nudgeTongueAnchorShift(-3);
        return;
      }
      if (event.key === '\'' || event.key === '"') {
        this.nudgeTongueAnchorShift(3);
        return;
      }
      if (event.key === '-') {
        this.nudgeHitExtraPad(-2);
        return;
      }
      if (event.key === '=' || event.key === '+') {
        this.nudgeHitExtraPad(2);
        return;
      }
      if (event.key >= '1' && event.key <= '6') {
        this.mockSegments = Number(event.key);
        this.refreshDebugGraphics();
        this.refreshInfo();
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        this.toggleSide();
      }
    });
  }

  sideHitKey(prefix) {
    return this.fromLeft ? `${prefix}Left` : `${prefix}Right`;
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
    const key = this.fromLeft ? 'yOffsetLeftPx' : 'yOffsetRightPx';
    this.tune[key] = Phaser.Math.Clamp((this.tune[key] ?? this.tune.yOffsetPx) + delta, -80, 120);
    this.relayoutFrog();
  }

  nudgeTongueReach(delta) {
    const key = this.sideHitKey('tongueReachMul');
    this.tune[key] = Phaser.Math.Clamp(
      Number((this.tune[key] + delta).toFixed(3)),
      0.1,
      1.4,
    );
    this.refreshDebugGraphics();
    this.refreshInfo();
  }

  nudgeTongueHalfH(delta) {
    const key = this.sideHitKey('tongueHitHalfH');
    this.tune[key] = Phaser.Math.Clamp(this.tune[key] + delta, 20, 220);
    this.refreshDebugGraphics();
    this.refreshInfo();
  }

  nudgeTongueAnchorShift(delta) {
    const key = this.sideHitKey('tongueAnchorShift');
    this.tune[key] = Phaser.Math.Clamp(this.tune[key] + delta, -180, 180);
    this.refreshDebugGraphics();
    this.refreshInfo();
  }

  nudgeHitExtraPad(delta) {
    const key = this.sideHitKey('tongueExtraPad');
    this.tune[key] = Phaser.Math.Clamp(this.tune[key] + delta, 0, 80);
    this.refreshDebugGraphics();
    this.refreshInfo();
  }

  toggleSide() {
    this.fromLeft = !this.fromLeft;
    this.relayoutFrog();
  }

  resetTune() {
    this.tune = cloneTune(DEFAULT_FROG_ATTACK_TUNE);
    this.hitExtraPad = 14;
    this.mockSegments = 4;
    const { height } = this.scale;
    this.headY = Math.round(getGroundY(this) - height * GAME_CLIMBER_Y_LIFT);
    this.relayoutFrog();
  }

  relayoutFrog() {
    const wasActive = this.attackLoopActive;
    const wasPaused = this.attackPaused;
    if (wasActive) this.stopAttackLoop();
    this.layoutFrog();
    if (wasPaused) {
      setFrogAttackFrame(this.frogSprite, FROG_DEBUG_FREEZE_FRAME);
      this.refreshDebugGraphics();
    } else if (wasActive) {
      this.startAttackLoop();
    }
  }

  refreshInfo() {
    const t = this.tune;
    const side = this.fromLeft ? 'esq' : 'dir';
    const inset = getGameFrogEdgeInset(this.fromLeft, t);
    const reach = getFrogTongueReachMul(this.fromLeft, t);
    const halfH = getFrogTongueHitHalfH(this.fromLeft, t);
    const shift = getFrogTongueAnchorShift(this.fromLeft, t);
    const extra = getFrogTongueExtraPad(this.fromLeft, t);

    this.infoText?.setText(
      `cabeça Y=${this.headY}  ·  lado ${side}  ·  borda ${inset}px  ·  largura ${t.widthRatio.toFixed(2)}  ·  escala ${t.scaleMul.toFixed(2)}  ·  seg ${this.mockSegments}`,
    );

    this.tuneText?.setText(
      `HIT ${side}: ancoraX ${shift}px (← lagarta · → canto)  ·  alcance ${reach.toFixed(2)}  ·  altura ±${halfH}px  ·  extra ${extra}px`,
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
