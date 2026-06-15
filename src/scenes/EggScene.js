import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import { drawSkyBackground, createTitle, createSpeechBubble } from '../ui/createUI.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';

/** Tela do ovo — toque para chocar */
export class EggScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.EGG);
  }

  create() {
    const { width, height } = this.scale;
    const config = GameState.getConfig(this);
    this.cliques = 0;
    this.maxCliques = config.cliquesOvo || 3;

    drawSkyBackground(this);
    createTitle(this, width / 2, 80, 'Um ovinho apareceu na folha! 🍃', 32);
    createSpeechBubble(this, width / 2, 150, 'Toque no ovo para ele chocar!');

    const cx = width / 2;
    const cy = height * 0.55;

    // Galho
    const branch = this.add.graphics();
    branch.fillStyle(Theme.tronco, 1);
    branch.lineStyle(4, Theme.troncoEscuro, 1);
    branch.fillRoundedRect(cx - 280, cy + 40, 560, 36, 20);
    branch.strokeRoundedRect(cx - 280, cy + 40, 560, 36, 20);

    // Folha
    const leaf = this.add.graphics();
    leaf.fillStyle(Theme.folha, 1);
    leaf.lineStyle(4, Theme.folhaEscura, 1);
    leaf.fillEllipse(cx, cy + 20, 170, 80);
    leaf.strokeEllipse(cx, cy + 20, 170, 80);

    // Ovo
    this.eggG = this.add.graphics();
    this.crackText = this.add.text(cx, cy - 30, '', { fontSize: '32px' }).setOrigin(0.5);
    this.drawEgg(cx, cy);

    const hitArea = this.add.zone(cx, cy - 30, 100, 130).setInteractive({ useHandCursor: true });
    hitArea.on('pointerup', () => this.onEggTap(cx, cy));
  }

  drawEgg(x, y) {
    this.eggG.clear();
    this.eggG.fillStyle(0xF2EBD8, 1);
    this.eggG.lineStyle(4, 0xC9BFA4, 1);
    this.eggG.fillEllipse(x, y - 30, 92, 118);
    this.eggG.strokeEllipse(x, y - 30, 92, 118);
  }

  onEggTap(x, y) {
    this.cliques++;
    playSound(this, this.cliques >= this.maxCliques ? 'nascer' : 'crack');

    this.tweens.add({
      targets: this.eggG,
      angle: { from: -14, to: 14 },
      duration: 200,
      yoyo: true,
    });

    this.crackText.setText('⚡'.repeat(Math.min(this.cliques, this.maxCliques - 1)));

    if (this.cliques >= this.maxCliques) {
      this.time.delayedCall(450, () => {
        GameState.setPoints(this, 0);
        this.scene.start(SceneKeys.GAME);
      });
    }
  }
}
