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
  settingsButtonSize,
} from '../ui/settingsUi.js';
import { getIconButtonSize } from '../ui/splashUi.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
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

    const { size: backSize } = settingsButtonSize(this);
    const { btnH: backH } = getIconButtonSize(this, backSize, { absolute: portrait });
    const titleY = layoutY(this, portrait ? 0.15 : 0.10);
    const backY = titleY - backH / 2 - Math.round(14 * scale);
    const panelCy = layoutY(this, portrait ? 0.52 : 0.48);

    createSettingsBackButton(this, () => this.goBack(), {
      x: width / 2,
      y: backY,
    });

    const title = createTitle(
      this,
      width / 2,
      titleY,
      'Configurações',
      Math.round((portrait ? 34 : 42) * (portrait ? 1 : scale)),
    );
    title.setDepth(150);

    const panel = createSettingsPanel(this, width / 2, panelCy, panelW, panelH, { depth: 10 });
    createSettingsDecorations(this, width / 2, panelCy, panelW, panelH);

    createSettingsSlider(panel, 0, -panelH * 0.28, 'Volume', this.settings.volumeMusica, {
      volumeIcon: true,
      contentW,
      onChange: (v) => {
        this.settings.volumeMusica = v;
        GameState.setSettings(this, this.settings);
        applyMusicVolume(this);
      },
    });

    createSettingsSlider(panel, 0, -panelH * 0.06, 'Efeitos', this.settings.volumeEfeitos, {
      volumeIcon: true,
      contentW,
      onChange: (v) => {
        this.settings.volumeEfeitos = v;
        GameState.setSettings(this, this.settings);
      },
    });

    this.modoRow = createModoRow(panel, 0, panelH * 0.1, {
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
      panelCy + panelH / 2 + Math.round(10 * scale),
      () => this.goBack(),
    );
  }

  goBack() {
    GameState.setSettings(this, this.settings);
    applyMusicVolume(this);
    playSound(this, 'clique');
    this.scene.start(GameState.getReturnScene(this));
  }
}
