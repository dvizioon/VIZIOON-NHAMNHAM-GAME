import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import {
  drawSkyBackground,
  createTitle,
  createButton,
  createBackButton,
  createSettingsButton,
  createSpeechBubble,
} from '../ui/createUI.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState, defaultCustom } from '../utils/GameState.js';
/** Tela 3 — carrossel de personagens + nome editável pelo responsável */
export class CharacterScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.CHARACTER);
  }

  create() {
    const { width, height } = this.scale;
    const parentName = GameState.getParentName(this);
    this.criancas = GameState.getCriancas(this);
    this.index = 0;

    const saved = GameState.getChild(this);
    if (saved) {
      const idx = this.criancas.findIndex((c) => c.id === saved.id);
      if (idx >= 0) this.index = idx;
    }

    drawSkyBackground(this);
    createTitle(this, width / 2, 52, `${parentName}, quem vai\nvirar borboleta? 🦋`, 32);

    createBackButton(this, () => {
      playSound(this, 'clique');
      this.scene.start(SceneKeys.NAME);
    });

    createSettingsButton(this, () => {
      playSound(this, 'clique');
      GameState.setReturnScene(this, SceneKeys.CHARACTER);
      this.scene.start(SceneKeys.SETTINGS);
    });

    createSpeechBubble(
      this, width / 2, 118,
      'Passe os personagens e digite o nome da criança! 👇',
      520,
    );

    this.cardContainer = this.add.container(width / 2, height * 0.42);

    this.btnPrev = createButton(this, width / 2 - 320, height * 0.42, '◀', {
      width: 72,
      fontSize: 28,
      onClick: () => this.shift(-1),
    });

    this.btnNext = createButton(this, width / 2 + 320, height * 0.42, '▶', {
      width: 72,
      fontSize: 28,
      onClick: () => this.shift(1),
    });

    this.dotsText = this.add.text(width / 2, height * 0.62, '', {
      fontFamily: Theme.fontFamily,
      fontSize: '18px',
      color: '#3B3024',
    }).setOrigin(0.5);

    this.buildNameInput(width, height);

    this.btnCustom = createButton(this, width / 2 - 170, height * 0.84, '✨ Customizar', {
      width: 260,
      fontSize: 24,
      color: Theme.sol,
      onClick: () => this.goCustomize(),
    });

    this.btnPlay = createButton(this, width / 2 + 170, height * 0.84, '▶ Jogar', {
      width: 260,
      fontSize: 24,
      onClick: () => this.goPlay(),
    });

    this.renderCard(false);
    this.setupSwipe(width);
  }

  buildNameInput(width, height) {
    const inputW = Math.min(width * 0.5, 380);
    const inputY = height * 0.68;

    const bg = this.add.graphics();
    bg.fillStyle(Theme.papel, 1);
    bg.lineStyle(4, Theme.folhaEscura, 1);
    bg.fillRoundedRect(width / 2 - inputW / 2, inputY - 28, inputW, 56, 28);
    bg.strokeRoundedRect(width / 2 - inputW / 2, inputY - 28, inputW, 56, 28);

    this.add.text(width / 2 - inputW / 2, inputY - 52, 'Nome da criança:', {
      fontFamily: Theme.fontFamily,
      fontSize: '18px',
      color: Theme.folhaEscura,
      fontStyle: 'bold',
    });

    this.nomeDigitado = this.criancas[this.index]?.nome || '';
    this.nameText = this.add.text(width / 2, inputY, this.nomeDigitado, {
      fontFamily: Theme.fontFamily,
      fontSize: '26px',
      color: '#3B3024',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.domInput = document.createElement('input');
    this.domInput.type = 'text';
    this.domInput.maxLength = 20;
    this.domInput.value = this.nomeDigitado;
    this.domInput.placeholder = 'Digite o nome...';
    this.domInput.style.cssText = `
      position:absolute; opacity:0; width:1px; height:1px; left:-9999px;
    `;
    document.body.appendChild(this.domInput);

    this.domInput.addEventListener('input', () => {
      this.nomeDigitado = this.domInput.value;
      this.nameText.setText(this.nomeDigitado || '...');
    });

    bg.setInteractive(
      new Phaser.Geom.Rectangle(width / 2 - inputW / 2, inputY - 28, inputW, 56),
      Phaser.Geom.Rectangle.Contains,
    );
    bg.on('pointerdown', () => this.domInput.focus());

    this.input.keyboard.on('keydown', (e) => {
      if (e.key === 'Backspace') {
        this.nomeDigitado = this.nomeDigitado.slice(0, -1);
      } else if (e.key.length === 1 && this.nomeDigitado.length < 20) {
        this.nomeDigitado += e.key;
      }
      this.domInput.value = this.nomeDigitado;
      this.nameText.setText(this.nomeDigitado || '...');
    });

    this.events.once('shutdown', () => this.domInput?.remove());
  }

  setupSwipe(width) {
    let startX = 0;
    this.input.on('pointerdown', (p) => { startX = p.x; });
    this.input.on('pointerup', (p) => {
      const dx = p.x - startX;
      if (Math.abs(dx) > 80) this.shift(dx > 0 ? -1 : 1);
    });
  }

  shift(dir) {
    playSound(this, 'clique');
    this.index = (this.index + dir + this.criancas.length) % this.criancas.length;
    this.nomeDigitado = this.criancas[this.index].nome;
    this.domInput.value = this.nomeDigitado;
    this.nameText.setText(this.nomeDigitado);
    this.renderCard(true);
  }

  renderCard(animate) {
    this.cardContainer.removeAll(true);
    const crianca = this.criancas[this.index];
    const isGirl = crianca.genero === 'menina';
    const accent = isGirl ? Theme.rosa : Theme.verde;
    const faceBg = isGirl ? 0xFFE3F0 : 0xE8F5DC;
    const cardW = 280;
    const cardH = 320;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.14);
    shadow.fillRoundedRect(-cardW / 2 + 8, -cardH / 2 + 10, cardW, cardH, 32);

    const bg = this.add.graphics();
    bg.fillStyle(Theme.papel, 1);
    bg.lineStyle(5, accent, 1);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);

    const ring = this.add.graphics();
    ring.fillStyle(faceBg, 1);
    ring.lineStyle(6, accent, 1);
    ring.fillCircle(0, -20, 88);
    ring.strokeCircle(0, -20, 88);

    const preview = this.add.text(0, -20, isGirl ? '🌸' : '🐛', { fontSize: '64px' }).setOrigin(0.5);

    const tag = this.add.text(0, 100, isGirl ? '🌸 Menina' : '🌿 Menino', {
      fontFamily: Theme.fontFamily,
      fontSize: '20px',
      color: isGirl ? 0xD85A96 : Theme.folhaEscura,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.cardContainer.add([shadow, bg, ring, preview, tag]);

    this.dotsText.setText(
      `${this.index + 1} / ${this.criancas.length}  •  modelo: ${crianca.nome}`,
    );

    if (animate) {
      this.cardContainer.setScale(0.85);
      this.cardContainer.setAlpha(0.3);
      this.tweens.add({
        targets: this.cardContainer,
        scale: 1,
        alpha: 1,
        duration: 220,
        ease: 'Back.easeOut',
      });
    }
  }

  getSelectedChild() {
    const base = this.criancas[this.index];
    const nome = this.nomeDigitado.trim() || base.nome;
    return { ...base, nome };
  }

  goCustomize() {
    const child = this.getSelectedChild();
    if (child.nome.trim().length < 2) return;
    playSound(this, 'clique');
    GameState.setChild(this, child);
    GameState.setCustom(this, defaultCustom(child));
    this.scene.start(SceneKeys.CUSTOMIZE);
  }

  goPlay() {
    const child = this.getSelectedChild();
    if (child.nome.trim().length < 2) return;
    playSound(this, 'clique');
    GameState.setChild(this, child);
    GameState.setCustom(this, defaultCustom(child));
    GameState.initRun(this);
    this.scene.start(SceneKeys.EGG);
  }
}
