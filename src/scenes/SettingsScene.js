import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { drawSkyBackground } from '../ui/createUI.js';
import {
  createSettingsPanel,
  createSettingsSlider,
  createSettingsTitleLogo,
  createSettingsHomeButton,
  createModoRow,
  getSettingsPanelSize,
  settingsButtonSize,
} from '../ui/settingsUi.js';
import { GameState } from '../utils/GameState.js';
import { syncPlayerConfig } from '../services/playerSession.js';
import { applyMusicVolume } from '../systems/MusicManager.js';
import { layoutY, uiScale, isPortrait } from '../utils/responsive.js';
import { getIconButtonSize } from '../ui/splashUi.js';

/** Configurações — logo SVG + painel + home; salva ao alterar */
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.SETTINGS);
    this._syncTimer = null;
  }

  create() {
    const { width } = this.scale;
    const portrait = isPortrait(this);
    const scale = uiScale(this);
    const { w: panelW, h: panelH, contentW } = getSettingsPanelSize(this);
    this.settings = {
      ...GameState.getSettings(this),
      modo: GameState.getSettings(this).modo ?? 'toque',
    };

    drawSkyBackground(this);

    const logoMaxW = Math.min(width * 0.88, 420);
    createSettingsTitleLogo(this, width / 2, layoutY(this, portrait ? 0.1 : 0.095), {
      maxWidth: logoMaxW,
    });

    const panelCy = layoutY(this, portrait ? 0.46 : 0.42);
    const panel = createSettingsPanel(this, width / 2, panelCy, panelW, panelH, { depth: 10 });

    const persist = () => this.persistSettings();

    createSettingsSlider(panel, 0, -panelH * 0.28, 'Volume', this.settings.volumeMusica, {
      volumeIcon: true,
      contentW,
      onChange: (v) => {
        this.settings.volumeMusica = v;
        persist();
      },
    });

    createSettingsSlider(panel, 0, -panelH * 0.02, 'Efeitos', this.settings.volumeEfeitos, {
      volumeIcon: true,
      contentW,
      onChange: (v) => {
        this.settings.volumeEfeitos = v;
        persist();
      },
    });

    this.modoRow = createModoRow(panel, 0, panelH * 0.28, {
      activeMode: this.settings.modo,
      contentW,
      onChange: (modo) => {
        this.settings.modo = modo;
        this.modoRow._setMode(modo);
        persist();
      },
    });

    const { size } = settingsButtonSize(this);
    const { btnH } = getIconButtonSize(this, size, { absolute: portrait });
    const homeY = panelCy + panelH / 2 + Math.round(18 * scale) + btnH / 2;

    createSettingsHomeButton(this, width / 2, homeY, () => this.goBack());
  }

  persistSettings() {
    GameState.setSettings(this, this.settings);
    applyMusicVolume(this);

    if (this._syncTimer) clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => {
      syncPlayerConfig(this, this.settings);
      this._syncTimer = null;
    }, 350);
  }

  goBack() {
    if (this._syncTimer) {
      clearTimeout(this._syncTimer);
      this._syncTimer = null;
    }
    GameState.setSettings(this, this.settings);
    applyMusicVolume(this);
    syncPlayerConfig(this, this.settings);
    this.scene.start(GameState.getReturnScene(this));
  }

  shutdown() {
    if (this._syncTimer) {
      clearTimeout(this._syncTimer);
      this._syncTimer = null;
    }
  }
}
