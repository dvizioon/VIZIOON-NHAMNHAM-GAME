import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { drawSkyBackground, createTitle } from '../ui/createUI.js';
import {
  createSettingsPanel,
  createSettingsDecorations,
  createSettingsSlider,
  createSettingsBackButton,
  createSettingsSaveButton,
  createModoRow,
  getSettingsPanelSize,
} from '../ui/settingsUi.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { syncPlayerConfig } from '../services/playerSession.js';
import { applyMusicVolume } from '../systems/MusicManager.js';
import { layoutY, uiScale, isPortrait } from '../utils/responsive.js';

/** Configurações — layout Figma */
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.SETTINGS);
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

    createSettingsBackButton(this, () => this.goBack());

    const title = createTitle(
      this,
      width / 2,
      layoutY(this, portrait ? 0.095 : 0.085),
      'Configurações',
      Math.round((portrait ? 36 : 42) * (portrait ? 1 : scale)),
    );
    title.setDepth(150);

    const panelCy = layoutY(this, portrait ? 0.53 : 0.48);
    const panel = createSettingsPanel(this, width / 2, panelCy, panelW, panelH, { depth: 10 });
    createSettingsDecorations(this, width / 2, panelCy, panelW, panelH);

    createSettingsSlider(panel, 0, -panelH * 0.30, 'Volume', this.settings.volumeMusica, {
      volumeIcon: true,
      contentW,
      onChange: (v) => {
        this.settings.volumeMusica = v;
        GameState.setSettings(this, this.settings);
        applyMusicVolume(this);
      },
    });

    createSettingsSlider(panel, 0, -panelH * 0.02, 'Efeitos', this.settings.volumeEfeitos, {
      volumeIcon: true,
      contentW,
      onChange: (v) => {
        this.settings.volumeEfeitos = v;
        GameState.setSettings(this, this.settings);
      },
    });

    this.modoRow = createModoRow(panel, 0, panelH * 0.26, {
      activeMode: this.settings.modo,
      contentW,
      onChange: (modo) => {
        this.settings.modo = modo;
        this.modoRow._setMode(modo);
        GameState.setSettings(this, this.settings);
      },
    });

    createSettingsSaveButton(
      this,
      width / 2,
      panelCy + panelH / 2 + Math.round(12 * scale),
      () => this.goBack(),
    );
  }

  goBack() {
    GameState.setSettings(this, this.settings);
    applyMusicVolume(this);
    syncPlayerConfig(this, this.settings);
    playSound(this, 'clique');
    this.scene.start(GameState.getReturnScene(this));
  }
}
