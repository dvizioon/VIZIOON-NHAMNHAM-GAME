import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme, CORES } from '../config/theme.js';
import {
  drawSkyBackground,
  createTitle,
  createButton,
  createBackButton,
  createSpeechBubble,
} from '../ui/createUI.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { CaterpillarSprite } from '../entities/CaterpillarSprite.js';
import { gotoScene } from '../utils/sceneRun.js';

/** Tela dedicada de customização da lagartinha */
export class CustomizeScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.CUSTOMIZE);
  }

  create() {
    this._navLock = false;
    const { width, height } = this.scale;
    const child = GameState.getChild(this);
    if (!child) {
      gotoScene(this, SceneKeys.CHARACTER);
      return;
    }

    this.custom = { ...GameState.getCustom(this) };
    this.previewG = null;
    this.fase = 0;

    drawSkyBackground(this);

    // Folhas decorativas
    ['🍃', '🌿', '🍂', '🍃'].forEach((leaf, i) => {
      const t = this.add.text(
        [80, width - 80, 100, width - 100][i],
        [100, 120, height - 80, height - 100][i],
        leaf,
        { fontSize: `${28 + i * 4}px` },
      );
      this.tweens.add({
        targets: t,
        angle: { from: -10, to: 10 },
        duration: 2500 + i * 400,
        yoyo: true,
        repeat: -1,
      });
    });

    createBackButton(this, () => {
      playSound(this, 'clique');
      GameState.setCustom(this, this.custom);
      gotoScene(this, SceneKeys.CHARACTER);
    });

    createTitle(this, width / 2, 56, `Customizar ${child.nome} 🐛`, 36);
    createSpeechBubble(this, width / 2, 118, 'Escolha a cor e os acessórios da lagartinha!', 480);

    // Painel central
    const panel = this.add.graphics();
    panel.fillStyle(Theme.papel, 1);
    panel.lineStyle(5, Theme.texto, 1);
    panel.fillRoundedRect(width / 2 - 340, 150, 680, 420, 32);
    panel.strokeRoundedRect(width / 2 - 340, 150, 680, 420, 32);

    // Preview
    this.caterPreview = CaterpillarSprite.create(
      this, width / 2 + 120, height * 0.42 + 20, child, this.custom, 15,
    );

    this.add.text(width / 2 - 100, height * 0.52, child.nome, {
      fontFamily: Theme.fontFamily,
      fontSize: '24px',
      color: '#3B3024',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Cores
    this.add.text(width / 2 - 280, height * 0.58, 'Cor da lagarta:', {
      fontFamily: Theme.fontFamily,
      fontSize: '20px',
      color: '#3B3024',
      fontStyle: 'bold',
    });

    this.swatchRefs = [];
    CORES.forEach((cor, i) => {
      const sx = width / 2 - 240 + i * 56;
      const sy = height * 0.66;
      const sw = this.add.graphics();
      const drawSw = (sel) => {
        sw.clear();
        sw.fillStyle(cor.clara, 1);
        sw.lineStyle(sel ? 5 : 2, sel ? Theme.texto : 0x000000, sel ? 1 : 0.3);
        sw.fillCircle(sx, sy, 24);
        sw.strokeCircle(sx, sy, 24);
      };
      drawSw(this.custom.cor.nome === cor.nome);
      sw.setInteractive(new Phaser.Geom.Circle(sx, sy, 24), Phaser.Geom.Circle.Contains);
      sw.on('pointerup', () => {
        playSound(this, 'clique');
        this.custom.cor = cor;
        this.swatchRefs.forEach((r) => r.draw(r.cor.nome === cor.nome));
      });
      sw._cor = cor;
      this.swatchRefs.push({ draw: drawSw, cor });
    });

    // Acessórios
    this.chipHat = this.makeAccessoryChip(width / 2 - 120, height * 0.76, '🎉 Chapéu', 'chapeu');
    this.chipGlasses = this.makeAccessoryChip(width / 2 + 120, height * 0.76, '😎 Óculos', 'oculos');
    this.chipHat._draw(this.custom.chapeu);
    this.chipGlasses._draw(this.custom.oculos);

    this.redrawPreview();

    createButton(this, width / 2, height * 0.9, 'Salvar ✓', {
      width: 280,
      fontSize: 26,
      onClick: () => {
        playSound(this, 'clique');
        GameState.setCustom(this, this.custom);
        gotoScene(this, SceneKeys.CHARACTER);
      },
    });

    this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        this.fase += 0.12;
        this.redrawPreview();
      },
    });
  }

  makeAccessoryChip(x, y, label, field) {
    const chip = this.add.container(x, y);
    const bg = this.add.graphics();
    const txt = this.add.text(0, 0, label, {
      fontFamily: Theme.fontFamily,
      fontSize: '20px',
      color: '#3B3024',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const draw = (sel) => {
      bg.clear();
      bg.fillStyle(sel ? Theme.sol : 0xffffff, 1);
      bg.lineStyle(4, Theme.texto, 1);
      bg.fillRoundedRect(-100, -24, 200, 48, 24);
      bg.strokeRoundedRect(-100, -24, 200, 48, 24);
    };
    draw(this.custom[field]);

    chip.add([bg, txt]);
    chip.setSize(200, 48);
    chip.setInteractive({ useHandCursor: true });
    chip.on('pointerup', () => {
      playSound(this, 'clique');
      this.custom[field] = !this.custom[field];
      this.chipHat._draw(this.custom.chapeu);
      this.chipGlasses._draw(this.custom.oculos);
      this.redrawPreview();
    });
    chip._draw = draw;
    return chip;
  }

  redrawPreview() {
    if (this.caterPreview?.mode === 'procedural') {
      const { width, height } = this.scale;
      this.caterPreview.draw({
        x: width / 2 + 120,
        y: height * 0.42 + 20,
        raio: 26,
        segmentos: 5,
        fase: this.fase,
        horizontal: true,
      });
    }
  }
}
