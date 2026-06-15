import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import { drawSkyBackground } from '../ui/createUI.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState, defaultCustom } from '../utils/GameState.js';
import { uiScale } from '../utils/responsive.js';
import { createIconCircleButton } from '../ui/splashUi.js';
import { Icon } from '../ui/iconify.js';
import { hasTexture } from '../systems/AssetLoader.js';
import {
  UI_LOGO_PERSONAGENS_KEY,
  CHAR_HEADS_KEY,
  CHAR_HEADS_ANIM_KEY,
  CHAR_PER_PAGE,
  CHAR_GRID_COLS,
} from '../config/characterUiConfig.js';

const NAV_ICONS = {
  home: Icon.from('solar:home-2-bold', { designSize: 24 }),
  search: Icon.from('solar:magnifer-linear', { designSize: 24 }),
};

function normalizeText(value) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Tela Personagens — mobile, 2×2 (4 por página) */
export class CharacterScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.CHARACTER);
  }

  init() {
    this.criancas = [];
    this.filtered = [];
    this.page = 0;
    this.searchQuery = '';
    this.gridContainer = null;
    this.pageLabel = null;
    this.domSearch = null;
    this.searchVisible = null;
    this.layout = null;
  }

  async create() {
    const { width, height } = this.scale;
    this.criancas = GameState.getCriancas(this);
    this.filtered = [...this.criancas];

    const saved = GameState.getChild(this);
    if (saved) {
      const idx = this.filtered.findIndex((c) => c.id === saved.id);
      if (idx >= 0) this.page = Math.floor(idx / CHAR_PER_PAGE);
    }

    drawSkyBackground(this);
    await Icon.preload(this, Object.values(NAV_ICONS));

    this.layout = this.computeLayout(width, height);
    this.buildHeader(width);
    this.buildSearchBar();
    this.gridContainer = this.add.container(0, 0).setDepth(20);
    this.buildPagination();
    this.buildHomeButton();

    this.applyFilter(false);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.events.once('shutdown', () => {
      this.domSearch?.remove();
      this.domSearch = null;
    });
  }

  computeLayout(width, height) {
    const s = uiScale(this);
    return {
      s,
      logoY: height * 0.085,
      logoW: width * 0.88,
      searchY: height * 0.165,
      searchW: width * 0.92,
      searchH: Math.max(58, width * 0.132),
      gridTop: height * 0.245,
      gridW: width * 0.94,
      gridH: height * 0.52,
      pageY: height * 0.805,
      homeY: height * 0.925,
      homeSize: Math.max(108, width * 0.24),
      navBtn: Math.max(58, width * 0.14),
    };
  }

  buildHeader(width) {
    const { logoY, logoW } = this.layout;
    if (hasTexture(this, UI_LOGO_PERSONAGENS_KEY)) {
      const logo = this.add.image(width / 2, logoY, UI_LOGO_PERSONAGENS_KEY)
        .setDepth(15)
        .setOrigin(0.5);
      logo.setDisplaySize(logoW, logoW * (logo.height / logo.width));
    } else {
      this.add.text(width / 2, logoY, 'Personagens', {
        fontFamily: Theme.fontFamily,
        fontSize: `${Math.round(44 * this.layout.s)}px`,
        color: '#4E9A2E',
        fontStyle: 'bold',
        stroke: '#ffffff',
        strokeThickness: 6,
      }).setOrigin(0.5).setDepth(15);
    }
  }

  buildSearchBar() {
    const { width } = this.scale;
    const { searchY, searchW, searchH, s } = this.layout;
    const barX = width / 2;
    const searchBtnSize = Math.round(searchH * 0.88);

    const g = this.add.graphics().setDepth(16);
    g.fillStyle(Theme.modoVerde, 1);
    g.fillRoundedRect(barX - searchW / 2, searchY - searchH / 2, searchW, searchH, searchH / 2);

    this.searchVisible = this.add.text(barX - searchW / 2 + 24, searchY, 'Pesquisar...', {
      fontFamily: Theme.fontFamily,
      fontSize: `${Math.round(searchH * 0.38)}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(17).setAlpha(0.85);

    createIconCircleButton(this, barX + searchW / 2 - searchBtnSize * 0.55, searchY, NAV_ICONS.search, {
      onClick: () => this.domSearch?.focus(),
      size: searchBtnSize,
      iconSize: Math.round(searchBtnSize * 0.46),
      fillColor: Theme.sol,
      depth: 18,
      absoluteSize: true,
    });

    this.domSearch = document.createElement('input');
    this.domSearch.type = 'search';
    this.domSearch.placeholder = 'Pesquisar...';
    this.domSearch.autocomplete = 'off';
    this.domSearch.style.cssText = `
      position:absolute; opacity:0; width:1px; height:1px; left:-9999px;
    `;
    document.body.appendChild(this.domSearch);

    this.domSearch.addEventListener('input', () => {
      this.searchQuery = this.domSearch.value;
      this.searchVisible.setText(this.searchQuery || 'Pesquisar...');
      this.searchVisible.setAlpha(this.searchQuery ? 1 : 0.85);
      this.applyFilter(true);
    });

    g.setInteractive(
      new Phaser.Geom.Rectangle(barX - searchW / 2, searchY - searchH / 2, searchW - searchBtnSize * 1.1, searchH),
      Phaser.Geom.Rectangle.Contains,
    );
    g.on('pointerdown', () => this.domSearch.focus());
  }

  buildPagination() {
    const { width } = this.scale;
    const { pageY, navBtn, s } = this.layout;
    const gap = width * 0.28;

    const mkNavBtn = (x, label, dir) => {
      const c = this.add.container(x, pageY).setDepth(25);
      const bg = this.add.graphics();
      const r = navBtn / 2;
      const draw = (pressed = false) => {
        bg.clear();
        bg.fillStyle(pressed ? 0xE6B800 : Theme.sol, 1);
        bg.fillCircle(0, 0, r);
      };
      draw();
      const t = this.add.text(0, 0, label, {
        fontFamily: Theme.fontFamily,
        fontSize: `${Math.round(navBtn * 0.52)}px`,
        color: Theme.folhaEscura,
        fontStyle: 'bold',
      }).setOrigin(0.5);
      c.add([bg, t]);
      c.setSize(navBtn, navBtn);
      c.setInteractive(new Phaser.Geom.Circle(0, 0, r), Phaser.Geom.Circle.Contains);
      c.on('pointerdown', () => draw(true));
      c.on('pointerup', () => {
        draw(false);
        this.shiftPage(dir);
      });
      c.on('pointerout', () => draw(false));
      return c;
    };

    this.btnPrev = mkNavBtn(width / 2 - gap / 2, '‹', -1);
    this.btnNext = mkNavBtn(width / 2 + gap / 2, '›', 1);

    this.pageLabel = this.add.text(width / 2, pageY + navBtn * 0.72, '', {
      fontFamily: Theme.fontFamily,
      fontSize: `${Math.max(16, Math.round(18 * s))}px`,
      color: Theme.texto,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(25);
  }

  buildHomeButton() {
    const { width } = this.scale;
    const { homeY, homeSize } = this.layout;

    createIconCircleButton(this, width / 2, homeY, NAV_ICONS.home, {
      onClick: () => {
        playSound(this, 'clique');
        this.scene.start(SceneKeys.SPLASH);
      },
      size: homeSize,
      iconSize: Math.round(homeSize * 0.38),
      fillColor: Theme.botaoVerde,
      depth: 30,
      absoluteSize: true,
    });
  }

  applyFilter(resetPage) {
    const q = normalizeText(this.searchQuery);
    this.filtered = !q
      ? [...this.criancas]
      : this.criancas.filter((c) => (
        normalizeText(c.nome).includes(q)
        || normalizeText(c.nomeCompleto).includes(q)
      ));

    if (resetPage) this.page = 0;
    this.page = Phaser.Math.Clamp(this.page, 0, Math.max(0, this.pageCount() - 1));
    this.renderGrid();
  }

  pageCount() {
    return Math.max(1, Math.ceil(this.filtered.length / CHAR_PER_PAGE));
  }

  shiftPage(dir) {
    const max = this.pageCount();
    if (max <= 1) return;
    playSound(this, 'clique');
    this.page = (this.page + dir + max) % max;
    this.renderGrid(true);
  }

  renderGrid(animate = false) {
    this.gridContainer.removeAll(true);

    const { width } = this.scale;
    const { gridTop, gridW, gridH, s } = this.layout;
    const start = this.page * CHAR_PER_PAGE;
    const pageItems = this.filtered.slice(start, start + CHAR_PER_PAGE);

    const cellW = gridW / CHAR_GRID_COLS;
    const cellH = gridH / 2;
    const gridLeft = width / 2 - gridW / 2 + cellW / 2;

    pageItems.forEach((crianca, i) => {
      const col = i % CHAR_GRID_COLS;
      const row = Math.floor(i / CHAR_GRID_COLS);
      const x = gridLeft + col * cellW;
      const y = gridTop + row * cellH + cellH * 0.4;
      const cardSize = Math.min(cellW * 0.96, cellH * 0.88);
      this.gridContainer.add(this.createCharacterCard(crianca, x, y, cardSize));
    });

    const totalPages = this.pageCount();
    this.pageLabel.setText(
      this.filtered.length
        ? `Página ${this.page + 1} / ${totalPages}`
        : 'Nenhuma criança encontrada',
    );

    this.btnPrev?.setAlpha(totalPages > 1 ? 1 : 0.35);
    this.btnNext?.setAlpha(totalPages > 1 ? 1 : 0.35);

    if (animate) {
      this.gridContainer.setAlpha(0.3);
      this.gridContainer.setScale(0.96);
      this.tweens.add({
        targets: this.gridContainer,
        alpha: 1,
        scale: 1,
        duration: 220,
        ease: 'Sine.easeOut',
      });
    }
  }

  createCharacterCard(crianca, x, y, size) {
    const s = this.layout.s;
    const container = this.add.container(x, y);
    const r = size * 0.34;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.14);
    shadow.fillCircle(5, 8, r + 8);

    const base = this.add.graphics();
    base.fillStyle(0xffffff, 1);
    base.fillCircle(0, 0, r + 6);
    base.lineStyle(5, Theme.folhaEscura, 0.2);
    base.strokeCircle(0, 0, r + 6);

    const accent = crianca.genero === 'menina' ? Theme.rosa : Theme.verde;
    const ring = this.add.graphics();
    ring.fillStyle(accent, 0.15);
    ring.lineStyle(7, accent, 1);
    ring.fillCircle(0, 0, r);
    ring.strokeCircle(0, 0, r);

    let avatar;
    if (hasTexture(this, CHAR_HEADS_KEY)) {
      avatar = this.add.sprite(0, 2, CHAR_HEADS_KEY, 0);
      avatar.setOrigin(0.5, 0.58);
      const headH = r * 2.05;
      avatar.setDisplaySize(headH * 0.82, headH);
      if (this.anims.exists(CHAR_HEADS_ANIM_KEY)) {
        avatar.anims.play(CHAR_HEADS_ANIM_KEY);
      }
    } else {
      avatar = this.add.text(0, 0, crianca.genero === 'menina' ? '🌸' : '🐛', {
        fontSize: `${Math.round(r * 1.3)}px`,
      }).setOrigin(0.5);
    }

    const name = this.add.text(0, r + Math.round(22 * s), crianca.nome, {
      fontFamily: Theme.fontFamily,
      fontSize: `${Math.max(17, Math.round(20 * s))}px`,
      color: Theme.texto,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: size * 0.98 },
    }).setOrigin(0.5, 0);

    container.add([shadow, base, ring, avatar, name]);
    container.setSize(size, size);
    container.setInteractive(new Phaser.Geom.Circle(0, 0, r + 10), Phaser.Geom.Circle.Contains);

    container.on('pointerdown', () => container.setScale(0.95));
    container.on('pointerup', () => {
      container.setScale(1);
      this.selectChild(crianca);
    });
    container.on('pointerout', () => container.setScale(1));

    return container;
  }

  selectChild(crianca) {
    playSound(this, 'clique');
    GameState.setChild(this, crianca);
    GameState.setCustom(this, defaultCustom(crianca));
    GameState.initRun(this);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => {
      this.scene.start(SceneKeys.TRUNK_INTRO);
    });
  }
}
