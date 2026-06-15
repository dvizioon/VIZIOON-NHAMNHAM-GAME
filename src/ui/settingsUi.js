import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale, isPortrait } from '../utils/responsive.js';
import { Icon } from './iconify.js';
import { playSound } from '../systems/ProceduralAudio.js';
import {
  createIconCircleButton,
  getIconButtonSize,
  SETTINGS_BTN_BORDER_SCALE,
  SETTINGS_BTN_CONTENT_OFFSET_X,
  SETTINGS_BTN_CONTENT_OFFSET_Y,
} from './splashUi.js';

export const UI_DECO_3FOLHAS_KEY = 'ui_deco_3folhas';
export const UI_DECO_FOLHAS_RAIZES_KEY = 'ui_deco_folhas_raizes';

const LABEL_COLOR = '#3B3024';
const VOLUME_ZERO_THRESHOLD = 0.005;

function normalizeVolumeValue(raw) {
  const v = Phaser.Math.Clamp(raw, 0, 1);
  return v <= VOLUME_ZERO_THRESHOLD ? 0 : v;
}

function volumePercent(v) {
  return Math.round(v * 100);
}

function isVolumeMuted(v) {
  return v <= 0;
}

export const SETTINGS_ICONS = {
  controller: Icon.from('mynaui:controller'),
  volumeHigh: Icon.from('mynaui:volume-high'),
  volumeOff: Icon.from('mynaui:volume-off'),
  back: Icon.from('solar:map-arrow-left-outline', { color: '#FFFFFF', designSize: 32 }),
  save: Icon.from('mynaui:save', { designSize: 32 }),
  touch: Icon.from('hugeicons:tap-05', { color: '#FFF8E7' }),
  arrowLeft: Icon.from('solar:alt-arrow-left-bold', { color: '#FFF8E7' }),
  arrowRight: Icon.from('solar:alt-arrow-right-bold', { color: '#FFF8E7' }),
};

export async function preloadSettingsIcons(scene) {
  await Icon.preload(scene, Object.values(SETTINGS_ICONS));
}

function sceneOf(parent) {
  return parent instanceof Phaser.Scene ? parent : parent.scene;
}

function attach(parent, obj, x, y) {
  obj.setPosition(x, y);
  if (!(parent instanceof Phaser.Scene)) parent.add(obj);
  return obj;
}

export const PANEL_SHADOW_OFFSET = 10;
export const PANEL_CORNER_RADIUS = 32;
export const PANEL_DESIGN_WIDTH = 400;
export const PANEL_DESIGN_HEIGHT = 420;

export function getSettingsPanelSize(scene) {
  const scale = uiScale(scene);
  const { width } = scene.scale;

  if (isPortrait(scene)) {
    const w = Math.round(width * 0.94);
    const h = Math.round(w * (PANEL_DESIGN_HEIGHT / PANEL_DESIGN_WIDTH) * 1.12);
    const panelScale = w / PANEL_DESIGN_WIDTH;
    return {
      w,
      h,
      contentW: Math.round(300 * panelScale),
      panelScale,
    };
  }

  return {
    w: Math.round(PANEL_DESIGN_WIDTH * scale),
    h: Math.round(PANEL_DESIGN_HEIGHT * scale),
    contentW: Math.round(300 * scale),
    panelScale: scale,
  };
}

export function createSettingsPanel(scene, cx, cy, w, h, { depth = 10, shadowOffset = PANEL_SHADOW_OFFSET } = {}) {
  const panelScale = w / PANEL_DESIGN_WIDTH;
  const r = Math.round(PANEL_CORNER_RADIUS * panelScale);
  const off = Math.round(shadowOffset * panelScale);

  const panel = attach(scene, scene.add.container(cx, cy), cx, cy).setDepth(depth);

  const greenLayer = scene.add.graphics();
  greenLayer.fillStyle(Theme.verde, 1);
  greenLayer.fillRoundedRect(-w / 2 + off, -h / 2 + off, w, h, r);

  const creamLayer = scene.add.graphics();
  creamLayer.fillStyle(Theme.papel, 1);
  creamLayer.fillRoundedRect(-w / 2, -h / 2, w, h, r);

  panel.add([greenLayer, creamLayer]);
  panel._panelW = w;
  panel._panelH = h;
  return panel;
}

/** Folhas — atrás do creme (depth 8) */
export function createSettingsDecorations(scene, cx, cy, w, h) {
  const panelScale = w / PANEL_DESIGN_WIDTH;
  const decoDepth = 8;

  if (scene.textures.exists(UI_DECO_3FOLHAS_KEY)) {
    const leafW = Math.round(105 * panelScale);
    const leafH = Math.round(166 * panelScale);
    scene.add
      .image(cx - w / 2 - leafW * 0.06, cy + h * 0.12, UI_DECO_3FOLHAS_KEY)
      .setDisplaySize(leafW, leafH)
      .setOrigin(0.55, 0.45)
      .setDepth(decoDepth);
  }

  if (scene.textures.exists(UI_DECO_FOLHAS_RAIZES_KEY)) {
    const rightW = Math.round(125 * panelScale);
    const rightH = Math.round(186 * panelScale);
    scene.add
      .image(cx + w / 2 + rightW * 0.06, cy - h * 0.02, UI_DECO_FOLHAS_RAIZES_KEY)
      .setDisplaySize(rightW, rightH)
      .setOrigin(0.62, 0.58)
      .setFlipY(true)
      .setDepth(decoDepth);
  }
}

/** Slider — ícone fixo à esquerda + % ao lado + trilho */
export function createSettingsSlider(
  parent,
  x,
  y,
  label,
  initial,
  { onChange, volumeIcon = false, percentOnAdjust = true, contentW } = {},
) {
  const scene = sceneOf(parent);
  const scale = contentW ? contentW / 300 : uiScale(scene);
  const innerW = contentW ?? Math.round(300 * scale);
  const trackH = Math.round(18 * scale);
  const knobR = Math.round(14 * scale);
  const iconPx = Math.round(32 * scale);
  const iconGap = Math.round(12 * scale);
  const labelSize = Math.max(16, Math.round(22 * scale));

  const row = attach(parent, scene.add.container(0, 0), x, y);
  let value = normalizeVolumeValue(initial);
  let isDragging = false;

  const labelText = scene.add.text(0, -Math.round(32 * scale), label, {
    fontFamily: Theme.fontFamily,
    fontSize: `${labelSize}px`,
    color: LABEL_COLOR,
    fontStyle: 'bold',
  }).setOrigin(0.5);

  const leftPadding = volumeIcon ? Math.round(65 * scale) : 0;
  const trackX = -innerW / 2 + leftPadding;
  const trackW = innerW / 2 - trackX;
  const trackInset = knobR + Math.round(4 * scale);
  const trackInnerX = trackX + trackInset;
  const trackInnerW = Math.max(1, trackW - trackInset * 2);

  const indicatorX = -innerW / 2 + Math.round(15 * scale);
  const indicatorY = trackH / 2;

  let iconImg;
  let percentText;

  if (volumeIcon) {
    const startKey = isVolumeMuted(value)
      ? SETTINGS_ICONS.volumeOff.textureKey
      : SETTINGS_ICONS.volumeHigh.textureKey;

    iconImg = scene.add
      .image(indicatorX, indicatorY, startKey)
      .setDisplaySize(iconPx, iconPx)
      .setOrigin(0.5);

    percentText = scene.add.text(indicatorX, indicatorY - Math.round(28 * scale), '', {
      fontFamily: Theme.fontFamily,
      fontSize: `${Math.max(14, Math.round(18 * scale))}px`,
      color: LABEL_COLOR,
      fontStyle: 'bold',
    }).setOrigin(0.5, 1).setVisible(false);
  }

  const trackBg = scene.add.graphics();
  const trackFill = scene.add.graphics();
  const knob = scene.add.graphics();

  const knobX = () => trackInnerX + trackInnerW * value;

  const updateIndicator = () => {
    if (!iconImg) return;
    const muted = isVolumeMuted(value);
    iconImg.setTexture(muted ? SETTINGS_ICONS.volumeOff.textureKey : SETTINGS_ICONS.volumeHigh.textureKey);

    if (percentText) {
      if (percentOnAdjust && isDragging && !muted) {
        percentText.setVisible(true);
        percentText.setText(`${volumePercent(value)}%`);
      } else {
        percentText.setVisible(false);
        percentText.setText('');
      }
    }
  };

  const redraw = () => {
    trackBg.clear();
    trackBg.fillStyle(0xE8F5DC, 1);
    trackBg.fillRoundedRect(trackInnerX, 0, trackInnerW, trackH, trackH / 2);

    trackFill.clear();
    if (value > 0) {
      trackFill.fillStyle(Theme.folhaEscura, 1);
      trackFill.fillRoundedRect(trackInnerX, 0, trackInnerW * value, trackH, trackH / 2);
    }

    const kx = knobX();
    knob.clear();
    knob.fillStyle(Theme.sol, 1);
    knob.lineStyle(2, Theme.texto, 1);
    knob.fillCircle(kx, trackH / 2, knobR);
    knob.strokeCircle(kx, trackH / 2, knobR);

    updateIndicator();
  };

  redraw();

  const zone = scene.add
    .zone(trackInnerX + trackInnerW / 2, trackH / 2, trackInnerW, Math.max(40, trackH + 20))
    .setInteractive({ useHandCursor: true });

  const update = (localX) => {
    let raw = (localX - trackInnerX) / trackInnerW;
    if (localX <= trackInnerX + knobR * 0.5) raw = 0;
    value = normalizeVolumeValue(raw);
    redraw();
    onChange?.(value);
  };

  const stopAdjusting = () => {
    if (!isDragging) return;
    isDragging = false;
    redraw();
  };

  const localX = (pointer) => row.getLocalPoint(pointer.x, pointer.y).x;

  zone.on('pointerdown', (pointer) => {
    update(localX(pointer));
    scene.input.once('pointerup', stopAdjusting);
  });
  zone.on('pointermove', (pointer) => {
    if (!pointer.isDown) return;
    isDragging = true;
    update(localX(pointer));
  });
  zone.on('pointerup', stopAdjusting);
  zone.on('pointerout', (pointer) => {
    if (!pointer.isDown) stopAdjusting();
  });

  const parts = [labelText, trackBg, trackFill, knob, zone];
  if (iconImg) parts.push(iconImg);
  if (percentText) parts.push(percentText);
  row.add(parts);

  row.setValue = (v) => {
    value = normalizeVolumeValue(v);
    redraw();
  };

  return row;
}

export function createModoToggle(scene, x, y, icon, { active = false, onClick, layoutScale } = {}) {
  const scale = layoutScale ?? uiScale(scene);
  const size = Math.round(58 * scale);
  const iconPx = Math.round(32 * scale);
  const container = scene.add.container(x, y);

  const bg = scene.add.graphics();
  const draw = (on) => {
    bg.clear();
    bg.fillStyle(on ? Theme.folhaEscura : Theme.modoVerde, 1);
    bg.fillRoundedRect(-size / 2, -size / 2, size, size, Math.round(10 * scale));
  };
  draw(active);

  const iconImg = scene.add
    .image(0, 0, icon.textureKey)
    .setDisplaySize(iconPx, iconPx)
    .setOrigin(0.5);

  container.add([bg, iconImg]);
  container.setSize(size, size);
  container.setInteractive({ useHandCursor: true });
  container.setActive = (on) => draw(on);

  container.on('pointerup', () => {
    playSound(scene, 'clique');
    onClick?.();
  });

  return container;
}

export function createModoArrowsToggle(scene, x, y, { active = false, onClick, layoutScale } = {}) {
  const scale = layoutScale ?? uiScale(scene);
  const size = Math.round(58 * scale);
  const iconPx = Math.round(22 * scale);
  const spread = Math.round(11 * scale);
  const container = scene.add.container(x, y);

  const bg = scene.add.graphics();
  const draw = (on) => {
    bg.clear();
    bg.fillStyle(on ? Theme.folhaEscura : Theme.modoVerde, 1);
    bg.fillRoundedRect(-size / 2, -size / 2, size, size, Math.round(10 * scale));
  };
  draw(active);

  const leftIcon = scene.add
    .image(-spread, 0, SETTINGS_ICONS.arrowLeft.textureKey)
    .setDisplaySize(iconPx, iconPx)
    .setOrigin(0.5);

  const rightIcon = scene.add
    .image(spread, 0, SETTINGS_ICONS.arrowRight.textureKey)
    .setDisplaySize(iconPx, iconPx)
    .setOrigin(0.5);

  container.add([bg, leftIcon, rightIcon]);
  container.setSize(size, size);
  container.setInteractive({ useHandCursor: true });
  container.setActive = (on) => draw(on);

  container.on('pointerup', () => {
    playSound(scene, 'clique');
    onClick?.();
  });

  return container;
}

export const SETTINGS_BTN_SIZE = 108;
export const SETTINGS_BTN_ICON_SIZE = 46;

export function settingsButtonSize(scene) {
  if (isPortrait(scene)) {
    return {
      size: Math.max(72, Math.round(scene.scale.width * 0.17)),
      icon: Math.max(30, Math.round(scene.scale.width * 0.07)),
    };
  }
  return { size: SETTINGS_BTN_SIZE, icon: SETTINGS_BTN_ICON_SIZE };
}

const settingsCircleBtnOpts = {
  borderScale: SETTINGS_BTN_BORDER_SCALE,
  contentOffsetX: SETTINGS_BTN_CONTENT_OFFSET_X,
  contentOffsetY: SETTINGS_BTN_CONTENT_OFFSET_Y,
};

export function createSettingsBackButton(scene, onClick, { x, y, absoluteSize } = {}) {
  const scale = uiScale(scene);
  const portrait = isPortrait(scene);
  const abs = absoluteSize ?? portrait;
  const { size, icon } = settingsButtonSize(scene);
  const { btnW, btnH } = getIconButtonSize(scene, size, { absolute: abs });
  const { width } = scene.scale;
  const m = portrait ? Math.max(12, Math.round(width * 0.04)) : Math.round(36 * scale);

  const px = x ?? m + btnW / 2;
  const py = y ?? m + btnH / 2;

  return createIconCircleButton(scene, px, py, SETTINGS_ICONS.back, {
    size,
    iconSize: icon,
    absoluteSize: abs,
    depth: 200,
    fillColor: Theme.botaoVerde,
    ...settingsCircleBtnOpts,
    onClick,
  });
}

export function createSettingsSaveButton(scene, x, y, onClick) {
  const portrait = isPortrait(scene);
  const { size, icon } = settingsButtonSize(scene);
  return createIconCircleButton(scene, x, y, SETTINGS_ICONS.save, {
    size,
    iconSize: icon,
    absoluteSize: portrait,
    depth: 200,
    fillColor: Theme.papel,
    ...settingsCircleBtnOpts,
    onClick,
  });
}

/** Linha Modo — título + controller centralizados; toggles abaixo */
export function createModoRow(parent, x, y, { activeMode = 'toque', onChange, contentW } = {}) {
  const scene = sceneOf(parent);
  const scale = contentW ? contentW / 300 : uiScale(scene);
  const iconPx = Math.round(28 * scale);
  const labelY = -Math.round(32 * scale);

  const row = attach(parent, scene.add.container(0, 0), x, y);

  const label = scene.add.text(0, labelY, 'Modo', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.max(16, Math.round(22 * scale))}px`,
    color: LABEL_COLOR,
    fontStyle: 'bold',
  }).setOrigin(0.5);

  const totalHeaderW = label.width + iconPx + Math.round(8 * scale);
  const headerStartX = -totalHeaderW / 2;

  const controller = scene.add
    .image(headerStartX, labelY, SETTINGS_ICONS.controller.textureKey)
    .setDisplaySize(iconPx, iconPx)
    .setOrigin(0, 0.5);

  label.setX(headerStartX + iconPx + Math.round(8 * scale) + label.width / 2);

  const toggleY = Math.round(30 * scale);
  const btnSize = Math.round(58 * scale);
  const toggleGap = Math.round(20 * scale);
  const pairW = btnSize * 2 + toggleGap;
  const leftX = -pairW / 2 + btnSize / 2;

  const btnToque = createModoToggle(scene, leftX, toggleY, SETTINGS_ICONS.touch, {
    active: activeMode === 'toque',
    layoutScale: scale,
    onClick: () => onChange?.('toque'),
  });

  const btnSetas = createModoArrowsToggle(scene, leftX + btnSize + toggleGap, toggleY, {
    active: activeMode === 'setas',
    layoutScale: scale,
    onClick: () => onChange?.('setas'),
  });

  row.add([label, controller, btnToque, btnSetas]);
  row._setMode = (mode) => {
    btnToque.setActive(mode === 'toque');
    btnSetas.setActive(mode === 'setas');
  };

  return row;
}
