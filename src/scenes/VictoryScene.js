import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme, CONFETE_CORES } from '../config/theme.js';
import { drawSkyBackground, createTitle, createSpeechBubble, createButton } from '../ui/createUI.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';

/** Tela final — borboleta + confete */
export class VictoryScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.VICTORY);
  }

  create() {
    const { width, height } = this.scale;
    const child = GameState.getChild(this);
    const parentName = GameState.getParentName(this);
    const custom = GameState.getCustom(this);

    drawSkyBackground(this);
    createTitle(this, width / 2, 60, `🎉 Parabéns, ${child.nome}! 🎉`, 40);

    const stage = this.add.container(width / 2, height * 0.42);

    // Asas
    const wingL = this.add.graphics();
    const wingR = this.add.graphics();
    wingL.fillStyle(custom.cor.clara, 0.95);
    wingL.fillEllipse(-70, 0, 120, 150);
    wingL.lineStyle(4, 0x000000, 0.25);
    wingL.strokeEllipse(-70, 0, 120, 150);
    wingR.fillStyle(custom.cor.clara, 0.95);
    wingR.fillEllipse(70, 0, 120, 150);
    wingR.lineStyle(4, 0x000000, 0.25);
    wingR.strokeEllipse(70, 0, 120, 150);

    this.tweens.add({
      targets: wingL,
      scaleX: { from: 1, to: 0.6 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: wingR,
      scaleX: { from: 1, to: 0.6 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Corpo
    const body = this.add.graphics();
    body.fillStyle(custom.cor.escura, 1);
    body.lineStyle(4, 0x000000, 0.3);
    body.fillRoundedRect(-21, -20, 42, 140, 24);
    body.strokeRoundedRect(-21, -20, 42, 140, 24);

    // Rosto — foto da criança
    const face = this.add.graphics();
    face.fillStyle(0xFFE9C9, 1);
    face.lineStyle(5, custom.cor.escura, 1);
    face.fillCircle(0, -50, 42);
    face.strokeCircle(0, -50, 42);
    stage.add(face);

    if (custom.chapeu) {
      this.add.text(-10, -95, '🎉', { fontSize: '44px' });
    }
    if (custom.oculos) {
      this.add.text(-18, -58, '🕶️', { fontSize: '36px' });
    }

    stage.add([wingL, wingR, body]);

    createSpeechBubble(
      this, width / 2, height * 0.72,
      `A lagartinha ${child.nome} comeu, cresceu e virou uma linda BORBOLETA! 🦋\n\n` +
      `É a metamorfose: 🥚 ➜ 🐛 ➜ 💤 ➜ 🦋\n\n` +
      `Obrigada por ajudar, ${parentName}! 💚`,
      620,
    );

    createButton(this, width / 2, height * 0.92, 'Jogar de novo 🔄', {
      color: Theme.rosa,
      width: 300,
      onClick: () => {
        playSound(this, 'clique');
        GameState.resetForNewRun(this);
        this.scene.start(SceneKeys.CHARACTER);
      },
    });

    playSound(this, 'fanfarra');
    this.spawnConfetti(width, height);
  }

  spawnConfetti(width, height) {
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * width;
      const color = CONFETE_CORES[i % CONFETE_CORES.length];
      const size = 12;
      const piece = this.add.rectangle(x, -20, size, size, color).setDepth(200);

      this.tweens.add({
        targets: piece,
        y: height + 20,
        angle: 360 + Math.random() * 360,
        duration: (2500 + Math.random() * 2500),
        delay: Math.random() * 1200,
        onComplete: () => piece.destroy(),
      });
    }
  }
}
