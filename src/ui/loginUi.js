import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale } from '../utils/responsive.js';
import { Icon } from './iconify.js';
import {
  createIconCircleButton,
  getIconButtonSize,
  getSplashButtonMetrics,
  SPLASH_CORNER_BTN_OPTS,
  SPLASH_ICON_RATIO,
} from './splashUi.js';
import { playSound } from '../systems/ProceduralAudio.js';

export const UI_LOGO_LOGIN_KEY = 'ui_logo_login';
export const UI_LOGO_CADASTRAR_KEY = 'ui_logo_cadastrar';
export const UI_CABECA_LARGATA_KEY = 'ui_cabeca_largata';

const LABEL_COLOR = '#4E9A2E';
const FIELD_GREEN = Theme.modoVerde;
const FIELD_BORDER = Theme.folhaEscura;
const BTN_HOME_FILL = Theme.botaoVerde;
const BTN_ADD_FILL = 0xFBF7E8;
const BTN_SEND_FILL = 0xFBF7E8;
const BTN_BORDER_COLOR = Theme.folhaEscura;
const BTN_BORDER_SCALE = 1;
const BTN_ICON_RATIO = 0.5;

const CHIP_LABEL_COLOR = '#1E6A30';
const CHIP_BORDER_TINT = 0x1E6A30;
const SPLASH_CONNECT_ICON = Icon.from('solar:login-2-outline', { designSize: 24, color: CHIP_LABEL_COLOR });
const GUEST_LINK_COLOR = '#6B4226';
const GUEST_LINK_HOVER = '#3B3024';
const INFO_TEXT_COLOR = '#6B4226';

export const GUEST_EXTERNAL_ICON = Icon.from('mynaui:external-link', {
  designSize: 24,
  color: GUEST_LINK_COLOR,
});

export const LOGIN_ICONS = {
  home: Icon.from('mynaui:home', { designSize: 24, color: '#ffffff' }),
  add: Icon.from('solar:add-circle-broken', { designSize: 24, color: '#4E9A2E' }),
  send: Icon.from('solar:plain-2-linear', { designSize: 24, color: '#4E9A2E' }),
};

export async function preloadLoginUiIcons(scene) {
  await Icon.preload(scene, [...Object.values(LOGIN_ICONS), GUEST_EXTERNAL_ICON]);
}

/** Avatar login — Cabeça_Largata.svg */
export function createLoginAvatar(scene, x, y, size) {
  return scene.add
    .image(x, y, UI_CABECA_LARGATA_KEY)
    .setDisplaySize(size, size * (168 / 142))
    .setOrigin(0.5);
}

export function createLoginUsernameField(scene, x, y, contentW, { onChange, onSubmit } = {}) {
  const scale = uiScale(scene);
  const fieldW = contentW ?? Math.min(scene.scale.width * 0.86, 420);
  const fieldH = Math.max(52, Math.round(56 * scale));
  const labelSize = Math.max(18, Math.round(24 * scale));
  const textSize = Math.max(18, Math.round(22 * scale));
  const labelGap = Math.round(12 * scale);
  const btnInset = Math.round(6 * scale);
  const btnSize = Math.round(fieldH * 0.78);
  const textPadLeft = Math.round(22 * scale);
  const textPadRight = btnSize + btnInset * 2 + Math.round(8 * scale);
  const maxTextW = Math.max(40, fieldW - textPadLeft - textPadRight);

  const root = scene.add.container(x, y);
  let value = '';
  let submitEnabled = false;

  const label = scene.add.text(-fieldW / 2, -fieldH / 2 - labelGap - labelSize / 2, 'Usuário', {
    fontFamily: Theme.fontFamily,
    fontSize: `${labelSize}px`,
    color: LABEL_COLOR,
    fontStyle: 'bold',
  }).setOrigin(0, 0.5);

  const bg = scene.add.graphics();
  const drawBg = () => {
    bg.clear();
    bg.fillStyle(FIELD_GREEN, 1);
    bg.fillRoundedRect(-fieldW / 2, -fieldH / 2, fieldW, fieldH, fieldH / 2);
    bg.lineStyle(3, FIELD_BORDER, 1);
    bg.strokeRoundedRect(-fieldW / 2, -fieldH / 2, fieldW, fieldH, fieldH / 2);
  };
  drawBg();

  const display = scene.add.text(-fieldW / 2 + textPadLeft, 0, 'Digite seu usuário ...', {
    fontFamily: Theme.fontFamily,
    fontSize: `${textSize}px`,
    color: '#ffffff',
  }).setOrigin(0, 0.5);

  const domInput = document.createElement('input');
  domInput.type = 'text';
  domInput.maxLength = 48;
  domInput.autocomplete = 'username';
  domInput.style.cssText = `
    position:absolute; opacity:0; pointer-events:none;
    width:1px; height:1px; left:-9999px;
  `;
  document.body.appendChild(domInput);

  const updateSubmitState = () => {
    const enabled = value.trim().length >= 2;
    if (enabled !== submitEnabled) {
      submitEnabled = enabled;
      sendBtn.setAlpha(enabled ? 1 : 0.82);
    }
  };

  const syncDisplay = () => {
    if (value.length === 0) {
      display.setText('Digite seu usuário ...').setColor('#ffffff');
      display.setCrop();
    } else {
      display.setText(value).setColor('#ffffff');
      if (display.width > maxTextW) {
        display.setCrop(0, 0, maxTextW, display.height);
      } else {
        display.setCrop();
      }
    }
    onChange?.(value);
    updateSubmitState();
  };

  domInput.addEventListener('input', () => {
    value = domInput.value;
    syncDisplay();
  });

  scene.events.once('shutdown', () => domInput.remove());

  const hitW = Math.max(40, fieldW - btnSize - btnInset * 2);
  const hit = scene.add
    .zone(-(btnSize + btnInset * 2) / 2, 0, hitW, fieldH)
    .setInteractive({ useHandCursor: true });
  hit.on('pointerdown', () => domInput.focus());

  const sendBtnX = fieldW / 2 - btnInset - btnSize / 2;
  const sendBtn = createIconCircleButton(scene, sendBtnX, 0, LOGIN_ICONS.send, {
    size: btnSize,
    iconSize: Math.round(btnSize * 0.46),
    absoluteSize: true,
    depth: 22,
    fillRatio: 0.48,
    showBorder: true,
    borderTint: BTN_BORDER_COLOR,
    borderScale: BTN_BORDER_SCALE,
    fillColor: BTN_SEND_FILL,
    onClick: () => {
      if (value.trim().length < 2) return;
      onSubmit?.();
    },
  });
  sendBtn.setAlpha(0.82);

  root.add([label, bg, display, hit, sendBtn]);
  root.setDepth(20);

  return {
    root,
    focus: () => domInput.focus(),
    getValue: () => value.trim(),
    setValue: (next) => {
      value = next ?? '';
      domInput.value = value;
      syncDisplay();
    },
    setSubmitEnabled(enabled) {
      submitEnabled = enabled;
      sendBtn.setAlpha(enabled ? 1 : 0.82);
    },
    destroy: () => {
      domInput.remove();
      root.destroy();
    },
  };
}

export function createLoginInfoBox(scene, x, y, contentW) {
  const scale = uiScale(scene);
  const boxW = contentW ?? Math.min(scene.scale.width * 0.86, 420);
  const padY = Math.round(14 * scale);
  const fontSize = Math.max(14, Math.round(16 * scale));
  const lineGap = Math.round(6 * scale);

  const root = scene.add.container(x, y).setDepth(20);

  const text = scene.add.text(0, 0, 'Para criar uma conta basta\nclicar no botão de (+)', {
    fontFamily: Theme.fontFamily,
    fontSize: `${fontSize}px`,
    color: INFO_TEXT_COLOR,
    align: 'center',
    lineSpacing: lineGap,
  }).setOrigin(0.5);

  const boxH = text.height + padY * 2;
  const bg = scene.add.graphics();
  bg.fillStyle(0xFBF7E8, 1);
  bg.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, Math.round(16 * scale));
  bg.lineStyle(2, 0xE8DCC8, 1);
  bg.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, Math.round(16 * scale));

  root.add([bg, text]);
  return root;
}

export function createGuestPlayLink(scene, x, y, { onClick } = {}) {
  const s = uiScale(scene);
  const fontSize = Math.max(16, Math.round(20 * s));
  const iconPx = Math.round(fontSize * 1.05);
  const gap = Math.round(8 * s);

  const root = scene.add.container(x, y).setDepth(200);

  const label = scene.add.text(0, 0, 'Jogar como visitante', {
    fontFamily: Theme.fontFamily,
    fontSize: `${fontSize}px`,
    color: GUEST_LINK_COLOR,
    fontStyle: 'bold',
  }).setOrigin(0, 0.5);

  const arrow = scene.add
    .image(label.width + gap, 0, GUEST_EXTERNAL_ICON.textureKey)
    .setDisplaySize(iconPx, iconPx)
    .setOrigin(0, 0.5);

  const totalW = label.width + gap + iconPx;
  label.x = -totalW / 2;
  arrow.x = label.x + label.width + gap;

  root.add([label, arrow]);
  root.setSize(totalW, Math.max(label.height, iconPx) + 8);
  root.setInteractive({ useHandCursor: true });

  const setHover = (active) => {
    const color = active ? GUEST_LINK_HOVER : GUEST_LINK_COLOR;
    label.setColor(color);
    arrow.setTint(active ? 0x3B3024 : 0x6B4226);
  };

  root.on('pointerover', () => setHover(true));
  root.on('pointerout', () => setHover(false));
  root.on('pointerup', () => onClick?.());

  return root;
}

export function computeLoginLayout(scene, logoH, grassTop) {
  const { width, height } = scene.scale;
  const s = uiScale(scene);
  const btnMetrics = getSplashButtonMetrics(scene);
  const fieldH = Math.max(52, Math.round(56 * s));
  const labelSize = Math.max(18, Math.round(24 * s));
  const labelGap = Math.round(12 * s);
  const blockH = fieldH + labelGap + labelSize;
  const contentW = Math.min(width * 0.86, 420);
  const infoBoxH = Math.max(72, Math.round(88 * s));

  const topPad = Math.max(8, height * 0.012);
  const logoGap = Math.max(12, height * 0.016);
  const avatarGap = Math.max(14, height * 0.018);
  const grassMargin = Math.max(10, height * 0.012);
  const btnInfoGap = Math.max(36, height * 0.042);
  const infoGuestGap = Math.max(16, height * 0.018);
  const guestBtnGap = Math.max(40, height * 0.048);

  const logoY = topPad + logoH / 2;
  const logoBottom = logoY + logoH / 2;
  const contentTop = logoBottom + logoGap;

  const btnYFromGrass = grassTop - grassMargin - btnMetrics.btnH / 2;
  const btnY = Math.max(btnYFromGrass, height * 0.772);

  const guestY = btnY - btnMetrics.btnH / 2 - guestBtnGap;
  const infoY = guestY - infoGuestGap - infoBoxH / 2;
  const fieldY = infoY - btnInfoGap - blockH / 2;

  const fieldTop = fieldY - blockH / 2;
  const avatarSpaceH = Math.max(64, fieldTop - avatarGap - contentTop);
  let avatarSize = Math.max(118, Math.min(width * 0.44, height * 0.2, avatarSpaceH * 0.96));
  let avatarY = contentTop + avatarSpaceH / 2;

  if (avatarY + avatarSize / 2 > fieldTop - avatarGap) {
    avatarSize = Math.max(100, (fieldTop - avatarGap - contentTop) * 0.96);
    avatarY = contentTop + (fieldTop - avatarGap - contentTop) / 2;
  }

  return {
    contentW,
    logoY,
    avatarY,
    avatarSize,
    fieldY,
    infoY,
    guestY,
    btnY,
    btnMetrics,
  };
}

export function createLoginNavButtons(scene, width, y, btnMetrics, { onHome, onRegister }) {
  const { btnSize, btnW, gap, portrait } = btnMetrics;
  const btnIcon = Math.round(btnSize * BTN_ICON_RATIO);
  const homeX = width / 2 - (btnW + gap) / 2;
  const addX = width / 2 + (btnW + gap) / 2;

  createIconCircleButton(scene, homeX, y, LOGIN_ICONS.home, {
    size: btnSize,
    iconSize: btnIcon,
    fillRatio: 0.48,
    absoluteSize: portrait,
    depth: 200,
    showBorder: true,
    borderTint: BTN_BORDER_COLOR,
    borderScale: BTN_BORDER_SCALE,
    fillColor: BTN_HOME_FILL,
    onClick: () => {
      playSound(scene, 'clique');
      onHome?.();
    },
  });

  createIconCircleButton(scene, addX, y, LOGIN_ICONS.add, {
    size: btnSize,
    iconSize: btnIcon,
    fillRatio: 0.48,
    absoluteSize: portrait,
    depth: 200,
    showBorder: true,
    borderTint: BTN_BORDER_COLOR,
    borderScale: BTN_BORDER_SCALE,
    fillColor: BTN_ADD_FILL,
    onClick: () => {
      playSound(scene, 'clique');
      onRegister?.();
    },
  });
}

export async function createSplashConnectChip(scene, x, y, { onClick, size = 52, iconSize, absoluteSize = true } = {}) {
  const s = uiScale(scene);
  await Icon.preload(scene, [SPLASH_CONNECT_ICON]);

  const fontSize = Math.max(15, Math.round(18 * s));
  const gap = Math.round(8 * s);
  const iconPx = iconSize ?? Math.round(size * SPLASH_ICON_RATIO);
  const { btnW, btnH } = getIconButtonSize(scene, size, { absolute: absoluteSize });

  const root = scene.add.container(x, y).setDepth(200);

  const btn = createIconCircleButton(scene, 0, 0, SPLASH_CONNECT_ICON, {
    size,
    iconSize: iconPx,
    absoluteSize,
    depth: 201,
    ...SPLASH_CORNER_BTN_OPTS,
    borderTint: CHIP_BORDER_TINT,
    onClick: () => onClick?.(),
  });

  const label = scene.add.text(btnW / 2 + gap, 0, 'Conectar', {
    fontFamily: Theme.fontFamily,
    fontSize: `${fontSize}px`,
    color: CHIP_LABEL_COLOR,
    fontStyle: 'bold',
  }).setOrigin(0, 0.5);

  root.add([btn, label]);
  root.setSize(btnW + gap + label.width, btnH);
  root.setInteractive(
    new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, root.width, btnH),
    Phaser.Geom.Rectangle.Contains,
  );
  root.input.cursor = 'pointer';
  root.on('pointerup', () => onClick?.());

  return root;
}
