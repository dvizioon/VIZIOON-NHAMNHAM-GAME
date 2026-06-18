import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import {
  createScoreHudPreview,
  DEFAULT_SCORE_HUD_TUNE,
  GAME_SCORE_MAX,
  updateGameHudScore,
} from '../ui/gameUi.js';

const PCT_STEPS = [1, 10, 25, 50, 75, 100];

function cloneTune(tune) {
  return {
    ...tune,
    tube: { ...tune.tube },
  };
}

/** Debug da barra de progresso — VITE_SCREEN_INIT=telascore */
export class ScoreHudDebugScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.SCORE_HUD_DEBUG);
    this.tune = cloneTune(DEFAULT_SCORE_HUD_TUNE);
    this.pct = 50;
    this.hud = null;
    this.infoText = null;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#E8F9FF');

    this.add.text(width * 0.5, 28, 'Debug — barra de progresso', {
      fontFamily: Theme.fontFamily,
      fontSize: '20px',
      color: '#1E6A30',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width * 0.5, 54, 'Teclas 1–9 = 10%–90%  ·  0 = 100%  ·  ← → X  ·  ↑ ↓ altura  ·  A D largura', {
      fontFamily: Theme.fontFamily,
      fontSize: '13px',
      color: '#336633',
    }).setOrigin(0.5);

    this.rebuildHud(width, height);
    this.buildPctButtons(width, height);
    this.buildTuneButtons(width, height);

    this.infoText = this.add.text(width * 0.5, height - 18, '', {
      fontFamily: Theme.fontFamily,
      fontSize: '12px',
      color: '#336633',
      align: 'center',
      wordWrap: { width: width - 24 },
    }).setOrigin(0.5, 1);

    this.refreshInfo();
    this.bindKeyboard();
    this.scale.on('resize', this.onResize, this);
  }

  rebuildHud(width, height) {
    this.hud?.scoreRoot?.destroy?.();
    this.hud = createScoreHudPreview(this, {
      x: width * 0.5,
      y: height * 0.44,
      scaleMul: 1.45,
      tune: this.tune,
      score: Math.round((this.pct / 100) * GAME_SCORE_MAX),
    });
  }

  buildPctButtons(width, height) {
    const y = height * 0.74;
    const gap = 8;
    const labels = PCT_STEPS.map((pct) => `${pct}%`);
    const btnW = Math.min(52, (width - 40 - gap * (labels.length - 1)) / labels.length);
    const totalW = labels.length * btnW + (labels.length - 1) * gap;
    let x = width * 0.5 - totalW / 2 + btnW / 2;

    labels.forEach((label, index) => {
      const pct = PCT_STEPS[index];
      this.makeButton(x, y, btnW, 34, label, () => this.setPct(pct));
      x += btnW + gap;
    });
  }

  buildTuneButtons(width, height) {
    const y = height * 0.82;
    const specs = [
      { label: '← X', onClick: () => this.nudgeX(-0.2) },
      { label: 'X →', onClick: () => this.nudgeX(0.2) },
      { label: '− alt', onClick: () => this.nudgeTube('h', -2) },
      { label: '+ alt', onClick: () => this.nudgeTube('h', 2) },
      { label: '− larg', onClick: () => this.nudgeTube('w', -1) },
      { label: '+ larg', onClick: () => this.nudgeTube('w', 1) },
      { label: 'Reset', onClick: () => this.resetTune() },
    ];
    const gap = 8;
    const btnW = Math.min(58, (width - 32 - gap * (specs.length - 1)) / specs.length);
    const totalW = specs.length * btnW + (specs.length - 1) * gap;
    let x = width * 0.5 - totalW / 2 + btnW / 2;

    specs.forEach((spec) => {
      this.makeButton(x, y, btnW, 34, spec.label, spec.onClick);
      x += btnW + gap;
    });
  }

  makeButton(x, y, w, h, label, onClick) {
    const bg = this.add.graphics();
    const text = this.add.text(0, 0, label, {
      fontFamily: Theme.fontFamily,
      fontSize: '13px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const btn = this.add.container(x, y, [bg, text]).setDepth(60).setSize(w, h);
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
      if (event.key >= '1' && event.key <= '9') {
        this.setPct(Number(event.key) * 10);
        return;
      }
      if (event.key === '0') {
        this.setPct(100);
        return;
      }
      if (event.key === 'ArrowLeft') {
        this.nudgeX(-0.2);
        return;
      }
      if (event.key === 'ArrowRight') {
        this.nudgeX(0.2);
        return;
      }
      if (event.key === 'ArrowUp') {
        this.nudgeTube('h', 2);
        return;
      }
      if (event.key === 'ArrowDown') {
        this.nudgeTube('h', -2);
        return;
      }
      if (event.key === 'a' || event.key === 'A') {
        this.nudgeTube('w', -1);
        return;
      }
      if (event.key === 'd' || event.key === 'D') {
        this.nudgeTube('w', 1);
      }
    });
  }

  setPct(pct) {
    this.pct = Phaser.Math.Clamp(pct, 1, 100);
    updateGameHudScore(this.hud, Math.round((this.pct / 100) * GAME_SCORE_MAX));
    this.refreshInfo();
  }

  nudgeX(delta) {
    this.tune.xNudge = Phaser.Math.Clamp(this.tune.xNudge + delta, -6, 6);
    this.rebuildHud(this.scale.width, this.scale.height);
    this.refreshInfo();
  }

  nudgeTube(axis, delta) {
    const key = axis === 'h' ? 'h' : 'w';
    this.tune.tube[key] = Math.max(8, this.tune.tube[key] + delta);
    this.rebuildHud(this.scale.width, this.scale.height);
    this.refreshInfo();
  }

  resetTune() {
    this.tune = cloneTune(DEFAULT_SCORE_HUD_TUNE);
    this.rebuildHud(this.scale.width, this.scale.height);
    this.refreshInfo();
  }

  refreshInfo() {
    const t = this.tune.tube;
    this.infoText?.setText(
      `${this.pct}%  ·  xNudge ${this.tune.xNudge.toFixed(1)}  ·  tubo w${t.w} h${t.h} y${t.y}  ·  pad top ${this.tune.fillPadTop} bottom ${this.tune.fillPadBottom}`,
    );
  }

  onResize() {
    this.scene.restart();
  }

  shutdown() {
    this.scale.off('resize', this.onResize, this);
    this.input.keyboard.removeAllListeners('keydown');
  }
}
