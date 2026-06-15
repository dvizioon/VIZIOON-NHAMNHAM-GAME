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
import { openCharacterDetailModal } from '../ui/characterModal.js';

const NAV_GREEN = '#1E6A30';
const HOME_GREEN = Theme.botaoVerde;

const NAV_ICONS = {
  home: Icon.from('mynaui:home', { designSize: 24, color: '#ffffff' }),
  search: Icon.from('solar:magnifer-linear', { designSize: 24, color: NAV_GREEN }),
  arrowLeft: Icon.from('solar:map-arrow-left-outline', { designSize: 24, color: NAV_GREEN }),
  arrowRight: Icon.from('solar:map-arrow-right-outline', { designSize: 24, color: NAV_GREEN }),
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
    this.searchBarGfx = null;
    this.layout = null;
    this.swipeStartX = 0;
    this.swipeBlockedTap = false;
    this.lastPageDir = 0;
    this.syncSearchDom = null;
    this.modalClose = null;
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
    this.setupGridSwipe();

    this.applyFilter(false);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.syncSearchDom = () => this.positionSearchInput();
    this.scale.on('resize', this.syncSearchDom);
    this.positionSearchInput();

    this.events.once('shutdown', () => {
      this.scale.off('resize', this.syncSearchDom);
      this.modalClose?.(true);
      this.modalClose = null;
      this.domSearch?.remove();
      this.domSearch = null;
    });
  }

  computeLayout(width, height) {
    const s = uiScale(this);
    const sidePad = Math.max(8, width * 0.02);
    const logoW = width * 0.88;
    let logoH = logoW * 0.22;

    if (hasTexture(this, UI_LOGO_PERSONAGENS_KEY)) {
      const tex = this.textures.get(UI_LOGO_PERSONAGENS_KEY).getSourceImage();
      logoH = logoW * (tex.height / tex.width);
    }

    const topPad = Math.max(6, height * 0.01);
    const logoY = topPad + logoH / 2;
    const gapLogoSearch = Math.max(18, height * 0.024);
    const searchH = Math.max(44, width * 0.105);
    const searchY = logoY + logoH / 2 + gapLogoSearch + searchH / 2 - 14;
    const gapSearchGrid = Math.max(28, height * 0.036);
    const gridTop = searchY + searchH / 2 + gapSearchGrid;

    return {
      s,
      sidePad,
      logoY,
      logoW,
      logoH,
      searchY,
      searchW: logoW,
      searchH,
      gridTop,
      gridW: width * 0.94,
      gridH: height * 0.52,
      pageY: height * 0.808,
      homeY: height * 0.915,
      homeSize: Math.max(96, width * 0.22),
      navBtn: Math.max(58, width * 0.135),
      navGap: width * 0.24,
    };
  }

  buildHeader(width) {
    const { logoY, logoW } = this.layout;
    if (hasTexture(this, UI_LOGO_PERSONAGENS_KEY)) {
      const logo = this.add.image(width / 2, logoY, UI_LOGO_PERSONAGENS_KEY)
        .setDepth(15)
        .setOrigin(0.5, 0.5);
      logo.setDisplaySize(logoW, this.layout.logoH);
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
    const { searchY, searchW, searchH } = this.layout;
    const barX = width / 2;
    const searchBtnSize = Math.round(searchH * 0.92);

    this.searchBarGfx = this.add.graphics().setDepth(16);
    this.searchBarGfx.fillStyle(Theme.modoVerde, 1);
    this.searchBarGfx.fillRoundedRect(
      barX - searchW / 2,
      searchY - searchH / 2,
      searchW,
      searchH,
      searchH / 2,
    );

    createIconCircleButton(this, barX + searchW / 2 - searchBtnSize * 0.52, searchY, NAV_ICONS.search, {
      onClick: () => this.domSearch?.focus(),
      size: searchBtnSize,
      iconSize: 24,
      fillColor: Theme.sol,
      depth: 18,
      absoluteSize: true,
    });

    this.domSearch = document.createElement('input');
    this.domSearch.type = 'search';
    this.domSearch.placeholder = 'Pesquisar...';
    this.domSearch.autocomplete = 'off';
    this.domSearch.enterKeyHint = 'search';
    this.domSearch.setAttribute('inputmode', 'search');
    this.domSearch.className = 'char-scene-search';
    document.body.appendChild(this.domSearch);

    let style = document.getElementById('char-scene-search-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'char-scene-search-style';
      document.head.appendChild(style);
    }
    style.textContent = `
      .char-scene-search::placeholder {
        color: #ffffff;
        opacity: 0.92;
      }
    `;

    this.domSearch.addEventListener('input', () => {
      this.searchQuery = this.domSearch.value;
      this.applyFilter(true);
    });

    this.searchBarGfx.setInteractive(
      new Phaser.Geom.Rectangle(barX - searchW / 2, searchY - searchH / 2, searchW - searchBtnSize * 1.05, searchH),
      Phaser.Geom.Rectangle.Contains,
    );
    this.searchBarGfx.on('pointerdown', () => this.domSearch.focus());
  }

  positionSearchInput() {
    if (!this.domSearch || !this.layout) return;

    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const { width } = this.scale;
    const { searchY, searchW, searchH } = this.layout;
    const barX = width / 2;
    const searchBtnSize = Math.round(searchH * 0.92);
    const scaleX = rect.width / width;
    const scaleY = rect.height / this.scale.height;

    const left = rect.left + (barX - searchW / 2 + 18) * scaleX;
    const top = rect.top + (searchY - searchH / 2 + 2) * scaleY;
    const w = (searchW - searchBtnSize * 1.15) * scaleX;
    const h = (searchH - 4) * scaleY;
    const fontPx = Math.max(15, Math.round(searchH * 0.36 * scaleY));

    this.domSearch.style.cssText = `
      position:fixed;
      left:${left}px;
      top:${top}px;
      width:${w}px;
      height:${h}px;
      margin:0;
      padding:0 6px;
      border:none;
      outline:none;
      background:transparent;
      color:#ffffff;
      caret-color:#ffffff;
      font-family:'Fredoka','Comic Sans MS',sans-serif;
      font-size:${fontPx}px;
      font-weight:700;
      z-index:1000;
      -webkit-appearance:none;
    `;
  }

  buildPagination() {
    const { width } = this.scale;
    const { pageY, navBtn, navGap, s } = this.layout;
    const cx = width / 2;

    this.btnPrev = createIconCircleButton(this, cx - navGap, pageY, NAV_ICONS.arrowRight, {
      onClick: () => this.shiftPage(-1),
      size: navBtn,
      iconSize: 24,
      fillColor: Theme.sol,
      borderScale: 1,
      showBorder: true,
      flipIcon: true,
      depth: 25,
      absoluteSize: true,
    });

    this.btnNext = createIconCircleButton(this, cx + navGap, pageY, NAV_ICONS.arrowRight, {
      onClick: () => this.shiftPage(1),
      size: navBtn,
      iconSize: 24,
      fillColor: Theme.sol,
      borderScale: 1,
      showBorder: true,
      depth: 25,
      absoluteSize: true,
    });

    this.pageLabel = this.add.text(cx, pageY, '', {
      fontFamily: Theme.fontFamily,
      fontSize: `${Math.max(15, Math.round(17 * s))}px`,
      color: Theme.texto,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(25);
  }

  buildHomeButton() {
    const { width } = this.scale;
    const { homeY, homeSize } = this.layout;
    const homeIcon = Math.round(homeSize * 0.42);

    createIconCircleButton(this, width / 2, homeY, NAV_ICONS.home, {
      onClick: () => {
        playSound(this, 'clique');
        this.scene.start(SceneKeys.SPLASH);
      },
      size: homeSize,
      iconSize: homeIcon,
      fillColor: HOME_GREEN,
      fillRatio: 0.4,
      borderScale: 1,
      borderTint: Theme.folhaEscura,
      showBorder: true,
      depth: 30,
      absoluteSize: true,
    });
  }

  setupGridSwipe() {
    this.input.on('pointerdown', (p) => {
      this.swipeStartX = p.x;
      this.swipeBlockedTap = false;
    });

    this.input.on('pointerup', (p) => {
      const dx = p.x - this.swipeStartX;
      if (Math.abs(dx) > 72) {
        this.swipeBlockedTap = true;
        this.lastPageDir = dx > 0 ? -1 : 1;
        this.shiftPage(this.lastPageDir);
      }
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
    this.lastPageDir = dir;
    this.page = (this.page + dir + max) % max;
    this.renderGrid(true);
  }

  renderGrid(animate = false) {
    this.gridContainer.removeAll(true);

    const { width } = this.scale;
    const { gridTop, gridW, gridH } = this.layout;
    const start = this.page * CHAR_PER_PAGE;
    const pageItems = this.filtered.slice(start, start + CHAR_PER_PAGE);

    const cellW = gridW / CHAR_GRID_COLS;
    const cellH = gridH / 2;
    const gridLeft = width / 2 - gridW / 2 + cellW / 2;

    pageItems.forEach((crianca, i) => {
      const col = i % CHAR_GRID_COLS;
      const row = Math.floor(i / CHAR_GRID_COLS);
      const x = gridLeft + col * cellW;
      const y = gridTop + row * cellH + cellH * 0.5;
      const cardSize = Math.min(cellW * 0.98, cellH * 0.9);
      this.gridContainer.add(this.createCharacterCard(crianca, x, y, cardSize, i));
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
      this.gridContainer.setAlpha(0.35);
      this.gridContainer.x = (this.lastPageDir || 0) * -32;
      this.tweens.add({
        targets: this.gridContainer,
        alpha: 1,
        x: 0,
        duration: 240,
        ease: 'Sine.easeOut',
      });
    }
  }

  createCharacterCard(crianca, x, y, size, frameHint = 0) {
    const s = this.layout.s;
    const container = this.add.container(x, y);
    const r = size * 0.36;

    const nameY = -(r + Math.round(26 * s));
    const name = this.add.text(0, nameY, crianca.nome, {
      fontFamily: Theme.fontFamily,
      fontSize: `${Math.max(16, Math.round(19 * s))}px`,
      color: Theme.texto,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: size * 0.98 },
    }).setOrigin(0.5, 1);

    const divider = this.add.graphics();
    divider.lineStyle(2, Theme.texto, 0.28);
    divider.lineBetween(-size * 0.38, nameY + 6, size * 0.38, nameY + 6);

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
      avatar = this.add.sprite(0, 2, CHAR_HEADS_KEY, frameHint % 4);
      avatar.setOrigin(0.5, 0.58);
      const headH = r * 1.82;
      avatar.setDisplaySize(headH * 0.82, headH);
      if (this.anims.exists(CHAR_HEADS_ANIM_KEY)) {
        avatar.anims.play(CHAR_HEADS_ANIM_KEY);
      }
    } else {
      avatar = this.add.text(0, 0, crianca.genero === 'menina' ? '🌸' : '🐛', {
        fontSize: `${Math.round(r * 1.3)}px`,
      }).setOrigin(0.5);
    }

    container.add([shadow, base, ring, avatar, divider, name]);

    const hitTop = nameY - 10;
    const hitBottom = r + 14;
    const hitH = hitBottom - hitTop;
    const hitZone = this.add.rectangle(0, (hitTop + hitBottom) / 2, size * 0.96, hitH, 0xffffff, 0);
    hitZone.setInteractive({ useHandCursor: true });
    container.add(hitZone);
    container.bringToTop(hitZone);

    hitZone.on('pointerdown', () => container.setScale(0.95));
    hitZone.on('pointerup', () => {
      container.setScale(1);
      if (this.swipeBlockedTap) return;
      this.openCharacterModal(crianca, frameHint);
    });
    hitZone.on('pointerout', () => container.setScale(1));

    return container;
  }

  restoreSearchInput() {
    if (!this.domSearch) return;
    this.domSearch.style.pointerEvents = '';
    this.domSearch.style.visibility = '';
  }

  hideSearchInput() {
    if (!this.domSearch) return;
    this.domSearch.style.pointerEvents = 'none';
  }

  async openCharacterModal(crianca, frameHint = 0) {
    if (this.modalClose) return;

    playSound(this, 'clique');
    this.hideSearchInput();

    const { close } = await openCharacterDetailModal(this, crianca, {
      frameHint,
      onPlay: () => {
        this.modalClose = null;
        this.restoreSearchInput();
        this.startGameWith(crianca);
      },
      onClose: () => {
        this.modalClose = null;
        this.restoreSearchInput();
      },
    });
    this.modalClose = close;
  }

  startGameWith(crianca) {
    GameState.setChild(this, crianca);
    GameState.setCustom(this, defaultCustom(crianca));
    GameState.initRun(this);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => {
      this.scene.start(SceneKeys.TRUNK_INTRO);
    });
  }

  selectChild(crianca) {
    this.openCharacterModal(crianca);
  }
}
