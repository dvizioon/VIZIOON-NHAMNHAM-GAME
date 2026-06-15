import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import { drawSkyBackground, createTitle, createSpeechBubble } from '../ui/createUI.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';

/** Tela do casulo — 2 toques para evoluir */
export class CocoonScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.COCOON);
  }

  create() {
    const { width, height } = this.scale;
    const child = GameState.getChild(this);
    const config = GameState.getConfig(this);
    this.cliques = 0;
    this.maxCliques = config.cliquesCasulo || 2;

    drawSkyBackground(this);
    createTitle(this, width / 2, 80, `${child.nome} comeu bastante e fez um casulo!`, 30);
    createSpeechBubble(this, width / 2, 150, 'Toque 2 vezes no casulo para ver a surpresa! ✨');

    const cx = width / 2;
    const cy = height * 0.52;

    // Fio
    const thread = this.add.graphics();
    thread.fillStyle(Theme.troncoEscuro, 1);
    thread.fillRect(cx - 3, cy - 100, 6, 64);

    // Casulo
    this.cocoonG = this.add.graphics();
    this.drawCocoon(cx, cy);

    playSound(this, 'cresceu');

    const zone = this.add.zone(cx, cy, 140, 200).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      this.cliques++;
      playSound(this, 'crack');
      this.tweens.add({
        targets: this.cocoonG,
        angle: { from: -8, to: 8 },
        duration: 175,
        yoyo: true,
      });
      if (this.cliques >= this.maxCliques) {
        this.time.delayedCall(400, () => this.scene.start(SceneKeys.VICTORY));
      }
    });
  }

  drawCocoon(x, y) {
    this.cocoonG.clear();
    this.cocoonG.fillGradientStyle(0xC5A572, 0xC5A572, 0x8A6B42, 0x8A6B42, 1);
    this.cocoonG.fillEllipse(x, y, 130, 190);
    this.cocoonG.lineStyle(5, 0x6B4F2E, 1);
    this.cocoonG.strokeEllipse(x, y, 130, 190);
  }
}
