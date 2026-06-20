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
  CHAR_PER_PAGE,
  CHAR_GRID_COLS,
  CHAR_TEXT_COLOR,
  filterCriancasAtivas,
} from '../config/characterUiConfig.js';
import { createCharacterFace } from '../ui/characterAvatar.js';
import { openCharacterDetailModal } from '../ui/characterModal.js';
import { playCharacterVoice } from '../systems/characterVoice.js';
import { registerSelectedPerson, ensurePlayerSession } from '../services/playerSession.js';
import { beginSceneRun, isStaleRun, gotoScene } from '../utils/sceneRun.js';

const NAV_GREEN = '#1E6A30';
const SEARCH_BORDER_COLOR = 0x1E6A30;
const SEARCH_BORDER_WIDTH = 3;
const HOME_GREEN = Theme.botaoVerde;

function getSearchBarMetrics(searchW, searchH) {
  const searchBtnSize = Math.round(searchH * 1.06);
  const padLeft = 18;
  const btnInset = searchBtnSize * 0.46;
  const padRight = Math.round(searchBtnSize * 0.54 + 10);
  return {
    searchBtnSize,
    searchIconSize: Math.max(26, Math.round(searchBtnSize * 0.52)),
    padLeft,
    padRight,
    btnInset,
    inputWidth: Math.max(72, searchW - padLeft - padRight),
  };
}

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

function removeOrphanCharacterSearchInputs() {
  document.querySelectorAll('input.char-scene-search').forEach((el) => el.remove());
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
    this._openingModal = false;
    this._searchSuppressed = false;
    this._onSwipeDown = null;
    this._onSwipeUp = null;
  }

  async create() {
    const run = beginSceneRun(this);
    const { width, height } = this.scale;
    await ensurePlayerSession(this);
    if (isStaleRun(this, run)) return;
    this.criancas = filterCriancasAtivas(GameState.getCriancas(this));
    this.filtered = [...this.criancas];

    const saved = GameState.getChild(this);
    if (saved) {
      const idx = this.filtered.findIndex((c) => c.id === saved.id);
      if (idx >= 0) this.page = Math.floor(idx / CHAR_PER_PAGE);
    }

    drawSkyBackground(this);
    await Icon.preload(this, Object.values(NAV_ICONS));
    if (isStaleRun(this, run)) return;

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
      this.destroySearchInput();
      this.modalClose?.(true);
      this.modalClose = null;
      this._openingModal = false;

      if (this.gridContainer) {
        this.tweens.killTweensOf(this.gridContainer);
        this.gridContainer.removeAll(true);
      }

      if (this._onSwipeDown) this.input.off('pointerdown', this._onSwipeDown);
      if (this._onSwipeUp) this.input.off('pointerup', this._onSwipeUp);
      this._onSwipeDown = null;
      this._onSwipeUp = null;
    });
  }

  destroySearchInput() {
    if (this.syncSearchDom) {
      this.scale.off('resize', this.syncSearchDom);
      this.syncSearchDom = null;
    }
    this.domSearch?.remove();
    this.domSearch = null;
    this._searchSuppressed = false;
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
    const gapLogoSearch = Math.max(14, height * 0.02);
    const searchH = Math.max(44, width * 0.105);
    const searchY = logoY + logoH / 2 + gapLogoSearch + searchH / 2 - 9;
    const gapSearchGrid = Math.max(10, height * 0.012);
    const gridTop = searchY + searchH / 2 + gapSearchGrid - Math.max(18, height * 0.022);

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
    removeOrphanCharacterSearchInputs();

    const { width } = this.scale;
    const { searchY, searchW, searchH } = this.layout;
    const barX = width / 2;
    const { searchBtnSize, searchIconSize, padLeft, inputWidth, btnInset } = getSearchBarMetrics(searchW, searchH);

    this.searchBarGfx = this.add.graphics().setDepth(16);
    this.searchBarGfx.fillStyle(Theme.modoVerde, 1);
    this.searchBarGfx.fillRoundedRect(
      barX - searchW / 2,
      searchY - searchH / 2,
      searchW,
      searchH,
      searchH / 2,
    );
    this.searchBarGfx.lineStyle(SEARCH_BORDER_WIDTH, SEARCH_BORDER_COLOR, 1);
    this.searchBarGfx.strokeRoundedRect(
      barX - searchW / 2,
      searchY - searchH / 2,
      searchW,
      searchH,
      searchH / 2,
    );

    createIconCircleButton(this, barX + searchW / 2 - btnInset, searchY, NAV_ICONS.search, {
      onClick: () => this.domSearch?.focus(),
      size: searchBtnSize,
      iconSize: searchIconSize,
      fillColor: Theme.sol,
      showBorder: false,
      simpleBorder: true,
      borderColor: SEARCH_BORDER_COLOR,
      borderWidth: SEARCH_BORDER_WIDTH,
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
      new Phaser.Geom.Rectangle(
        barX - searchW / 2,
        searchY - searchH / 2,
        padLeft + inputWidth,
        searchH,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    this.searchBarGfx.on('pointerdown', () => this.domSearch.focus());
  }

  positionSearchInput() {
    if (!this.domSearch || !this.layout || !this.sys?.isActive()) return;
    this.applySearchInputStyles();
  }

  applySearchInputStyles() {
    if (!this.domSearch || !this.layout) return;

    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const { width } = this.scale;
    const { searchY, searchW, searchH } = this.layout;
    const barX = width / 2;
    const { padLeft, inputWidth } = getSearchBarMetrics(searchW, searchH);
    const scaleX = rect.width / width;
    const scaleY = rect.height / this.scale.height;

    const left = rect.left + (barX - searchW / 2 + padLeft) * scaleX;
    const top = rect.top + (searchY - searchH / 2 + 2) * scaleY;
    const w = inputWidth * scaleX;
    const h = (searchH - 4) * scaleY;
    const fontPx = Math.max(15, Math.round(searchH * 0.36 * scaleY));
    const hidden = this._searchSuppressed || this.modalClose || this._openingModal;

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
      box-sizing:border-box;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      -webkit-appearance:none;
      display:${hidden ? 'none' : 'block'};
      pointer-events:${hidden ? 'none' : 'auto'};
      visibility:${hidden ? 'hidden' : 'visible'};
      opacity:${hidden ? '0' : '1'};
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
      borderTint: Theme.folhaEscura,
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
      borderTint: Theme.folhaEscura,
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
        this.modalClose?.(true);
        this.modalClose = null;
        this.destroySearchInput();
        gotoScene(this, SceneKeys.SPLASH);
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
    this._onSwipeDown = (p) => {
      this.swipeStartX = p.x;
      this.swipeBlockedTap = false;
    };
    this._onSwipeUp = (p) => {
      const dx = p.x - this.swipeStartX;
      if (Math.abs(dx) > 72) {
        this.swipeBlockedTap = true;
        this.lastPageDir = dx > 0 ? -1 : 1;
        this.shiftPage(this.lastPageDir);
      }
    };
    this.input.on('pointerdown', this._onSwipeDown);
    this.input.on('pointerup', this._onSwipeUp);
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
    if (this.gridContainer) {
      this.tweens.killTweensOf(this.gridContainer);
    }
    this.renderGrid(true);
  }

  renderGrid(animate = false) {
    if (this.gridContainer) {
      this.tweens.killTweensOf(this.gridContainer);
      this.gridContainer.removeAll(true);
    }

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
    const empty = this.filtered.length === 0;
    this.pageLabel.setText(
      empty
        ? 'Nenhuma criança encontrada'
        : `Página ${this.page + 1} / ${totalPages}`,
    );
    this.pageLabel.setColor(empty ? CHAR_TEXT_COLOR : Theme.texto);

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

    const avatar = createCharacterFace(this, crianca, r, frameHint, { headHeightRatio: 2.32 });

    const dividerY = r + Math.round(12 * s);
    const divider = this.add.graphics();
    divider.lineStyle(2, 0x490808, 1);
    divider.lineBetween(-size * 0.38, dividerY, size * 0.38, dividerY);

    const nameY = dividerY + Math.round(12 * s);
    const name = this.add.text(0, nameY, crianca.nome, {
      fontFamily: Theme.fontFamily,
      fontSize: `${Math.max(16, Math.round(19 * s))}px`,
      color: CHAR_TEXT_COLOR,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: size * 0.98 },
    }).setOrigin(0.5, 0);

    container.add([shadow, base, ring, avatar, divider, name]);

    const hitTop = -r - 10;
    const hitBottom = nameY + name.height + 8;
    const hitH = hitBottom - hitTop;
    const hitZone = this.add.zone(0, (hitTop + hitBottom) / 2, size * 0.96, hitH);
    hitZone.setInteractive({ useHandCursor: true });
    container.add(hitZone);
    container.bringToTop(hitZone);

    hitZone.on('pointerdown', () => container.setScale(0.95));
    hitZone.on('pointerup', () => {
      container.setScale(1);
      if (this.swipeBlockedTap) return;
      playCharacterVoice(this, crianca);
      this.openCharacterModal(crianca, frameHint);
    });
    hitZone.on('pointerout', () => container.setScale(1));

    return container;
  }

  restoreSearchInput() {
    if (!this.domSearch) return;
    this._searchSuppressed = false;
    this.applySearchInputStyles();
  }

  hideSearchInput() {
    if (!this.domSearch) return;
    this.domSearch.blur();
    this._searchSuppressed = true;
    this.applySearchInputStyles();
  }

  async openCharacterModal(crianca, frameHint = 0) {
    if (this.modalClose || this._openingModal) return;

    this._openingModal = true;
    playSound(this, 'clique');
    this.hideSearchInput();

    try {
      const { close } = await openCharacterDetailModal(this, crianca, {
        frameHint,
        onPlay: () => {
          this.modalClose = null;
          this.startGameWith(crianca);
        },
        onClose: () => {
          this.modalClose = null;
          this.restoreSearchInput();
        },
      });
      this.modalClose = close;
    } finally {
      this._openingModal = false;
      if (this.modalClose) {
        this.hideSearchInput();
      }
    }
  }

  startGameWith(crianca) {
    const custom = defaultCustom(crianca);
    GameState.setChild(this, crianca);
    GameState.setCustom(this, custom);
    GameState.initRun(this);
    registerSelectedPerson(this, crianca, custom);
    this.modalClose?.(true);
    this.modalClose = null;
    this.destroySearchInput();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => {
      gotoScene(this, SceneKeys.EGG);
    });
  }

  selectChild(crianca) {
    this.openCharacterModal(crianca);
  }
}
