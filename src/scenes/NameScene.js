import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import { drawSkyBackground, createTitle, createSpeechBubble, createButton } from '../ui/createUI.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';

/** Tela 2 — nome do responsável */
export class NameScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.NAME);
  }

  create() {
    const { width, height } = this.scale;
    drawSkyBackground(this);

    // Folhinhas decorativas
    const leaves = ['🍃', '🍂', '🌿', '🍃'];
    const positions = [
      [width * 0.08, height * 0.08],
      [width * 0.9, height * 0.14],
      [width * 0.14, height * 0.84],
      [width * 0.92, height * 0.9],
    ];
    positions.forEach(([x, y], i) => {
      const leaf = this.add.text(x, y, leaves[i], { fontSize: '38px' });
      this.tweens.add({
        targets: leaf,
        angle: { from: -8, to: 8 },
        duration: 3000,
        yoyo: true,
        repeat: -1,
        delay: i * 300,
      });
    });

    createTitle(this, width / 2, height * 0.18, 'Olá! Qual é o seu nome? 😄', 36);
    createSpeechBubble(
      this, width / 2, height * 0.32,
      'Digite o nome do papai, da mamãe ou do responsável:',
    );

    let nome = '';
    const inputBg = this.add.graphics();
    const inputW = Math.min(width * 0.86, 420);
    inputBg.fillStyle(Theme.papel, 1);
    inputBg.lineStyle(4, Theme.folhaEscura, 1);
    inputBg.fillRoundedRect(width / 2 - inputW / 2, height * 0.44, inputW, 56, 28);
    inputBg.strokeRoundedRect(width / 2 - inputW / 2, height * 0.44, inputW, 56, 28);

    const inputText = this.add.text(width / 2, height * 0.44 + 28, 'Seu nome aqui...', {
      fontFamily: Theme.fontFamily,
      fontSize: '26px',
      color: '#999999',
    }).setOrigin(0.5);

    const btn = createButton(this, width / 2, height * 0.62, 'Continuar ➜', {
      onClick: () => {
        if (nome.trim().length < 2) return;
        playSound(this, 'clique');
        GameState.setParentName(this, nome.trim());
        this.scene.start(SceneKeys.CHARACTER);
      },
    });
    btn.setAlpha(0.5);

    this.input.keyboard.on('keydown', (event) => {
      if (event.key === 'Backspace') {
        nome = nome.slice(0, -1);
      } else if (event.key === 'Enter' && nome.trim().length >= 2) {
        btn.emit('pointerup');
        return;
      } else if (event.key.length === 1 && nome.length < 20) {
        nome += event.key;
      }
      updateInput();
    });

    // Teclado virtual simples via DOM hidden input para mobile
    const domInput = document.createElement('input');
    domInput.type = 'text';
    domInput.maxLength = 20;
    domInput.placeholder = 'Seu nome aqui...';
    domInput.style.cssText = `
      position:absolute; opacity:0; pointer-events:none;
      width:1px; height:1px; left:-9999px;
    `;
    document.body.appendChild(domInput);
    domInput.focus();

    domInput.addEventListener('input', () => {
      nome = domInput.value;
      updateInput();
    });

    this.events.once('shutdown', () => domInput.remove());

    const updateInput = () => {
      if (nome.length === 0) {
        inputText.setText('Seu nome aqui...').setColor('#999999');
      } else {
        inputText.setText(nome).setColor('#3B3024');
      }
      btn.setAlpha(nome.trim().length >= 2 ? 1 : 0.5);
    };

    inputBg.setInteractive(
      new Phaser.Geom.Rectangle(width / 2 - inputW / 2, height * 0.44, inputW, 56),
      Phaser.Geom.Rectangle.Contains,
    );
    inputBg.on('pointerdown', () => domInput.focus());
  }
}
