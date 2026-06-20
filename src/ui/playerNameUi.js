import { Theme } from '../config/theme.js';
import { uiScale } from '../utils/responsive.js';
import { Icon } from './iconify.js';
import {
  createIconCircleButton,
  getSplashButtonMetrics,
} from './splashUi.js';
import { playSound } from '../systems/ProceduralAudio.js';
import {
  PLAYER_USERNAME_MAX,
  sanitizePlayerUsername,
  isValidPlayerUsername,
} from '../utils/username.js';

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

export const UI_LOGO_JOGADOR_KEY = 'ui_logo_cadastrar';
export const UI_USER_JOGADOR_KEY = 'ui_user_jogador';
export const UI_SAPO_KEY = 'ui_sapo';
/** viewBox do Sapo.svg — 180×153 */
const SAPO_DISPLAY_ASPECT = 153 / 180;

export const PLAYER_AGE_MIN = 3;
export const PLAYER_AGE_MAX = 99;
export const PLAYER_AGE_DEFAULT = 6;
export const GUEST_PLAYER_NAME = 'Visitante';

const LABEL_COLOR = '#4E9A2E';
const FIELD_GREEN = Theme.modoVerde;
const FIELD_BORDER = Theme.folhaEscura;
const BTN_HOME_FILL = Theme.botaoVerde;
const BTN_SEND_FILL = 0xFBF7E8;
const BTN_BORDER_COLOR = Theme.folhaEscura;
const PLAYER_BTN_BORDER_SCALE = 1;
const PLAYER_BTN_ICON_RATIO = 0.5;

export const PLAYER_NAME_ICONS = {
  home: Icon.from('mynaui:home', { designSize: 24, color: '#ffffff' }),
  send: Icon.from('solar:plain-2-linear', { designSize: 24, color: '#4E9A2E' }),
};

export async function preloadPlayerNameIcons(scene) {
  await Icon.preload(scene, Object.values(PLAYER_NAME_ICONS));
}

/** Avatar cadastro — Sapo.svg (proporção correta, sem espremer) */
export function createRegisterAvatar(scene, x, y, size) {
  const tex = scene.textures.get(UI_SAPO_KEY);
  const src = tex?.getSourceImage?.();
  const aspect = src?.width > 0 && src?.height > 0
    ? src.height / src.width
    : SAPO_DISPLAY_ASPECT;
  const displayW = size;
  const displayH = size * aspect;
  return scene.add
    .image(x, y, UI_SAPO_KEY)
    .setDisplaySize(displayW, displayH)
    .setOrigin(0.5);
}

/** @deprecated use createRegisterAvatar */
export function createUserAvatar(scene, x, y, size) {
  return createRegisterAvatar(scene, x, y, size);
}

/** Campo usuário — cadastro */
export function createPlayerNameField(scene, x, y, contentW, {
  onChange,
  label = 'Usuário',
  placeholder = 'Digite seu usuário ...',
} = {}) {
  const scale = uiScale(scene);
  const fieldW = contentW ?? Math.min(scene.scale.width * 0.86, 420);
  const fieldH = Math.max(52, Math.round(56 * scale));
  const labelSize = Math.max(18, Math.round(24 * scale));
  const textSize = Math.max(18, Math.round(22 * scale));
  const labelGap = Math.round(12 * scale);
  const textPadLeft = Math.round(22 * scale);
  const textPadRight = Math.round(18 * scale);
  const maxTextW = Math.max(40, fieldW - textPadLeft - textPadRight);

  const root = scene.add.container(x, y);
  let value = '';

  const labelText = scene.add.text(-fieldW / 2, -fieldH / 2 - labelGap - labelSize / 2, label, {
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

  const display = scene.add.text(-fieldW / 2 + textPadLeft, 0, placeholder, {
    fontFamily: Theme.fontFamily,
    fontSize: `${textSize}px`,
    color: '#ffffffaa',
  }).setOrigin(0, 0.5);

  const caret = scene.add.graphics();
  const getCaretX = () => {
    const textW = value.length === 0 ? 0 : Math.min(display.width, maxTextW);
    return -fieldW / 2 + textPadLeft + textW + 2;
  };
  const drawCaret = (visible) => {
    caret.clear();
    if (!visible) return;
    const caretX = getCaretX();
    caret.lineStyle(2, 0xffffff, 1);
    caret.lineBetween(caretX, -textSize * 0.42, caretX, textSize * 0.42);
  };

  let focused = false;

  const domInput = document.createElement('input');
  domInput.type = 'text';
  domInput.maxLength = PLAYER_USERNAME_MAX;
  domInput.autocomplete = 'username';
  domInput.inputMode = 'text';
  domInput.readOnly = true;
  domInput.style.cssText = `
    position:absolute; opacity:0; pointer-events:none;
    width:1px; height:1px; left:-9999px;
  `;
  document.body.appendChild(domInput);

  const syncDisplay = () => {
    if (value.length === 0) {
      display.setText(placeholder).setColor('#ffffffaa');
      display.setCrop();
    } else {
      display.setText(value).setColor('#ffffff');
      if (display.width > maxTextW) {
        display.setCrop(display.width - maxTextW, 0, maxTextW, display.height);
      } else {
        display.setCrop();
      }
    }
    drawCaret(focused);
    onChange?.(value);
  };

  domInput.addEventListener('input', () => {
    const next = sanitizePlayerUsername(domInput.value);
    if (next !== domInput.value) domInput.value = next;
    value = next;
    syncDisplay();
  });
  domInput.addEventListener('blur', () => {
    focused = false;
    domInput.readOnly = true;
    drawCaret(false);
  });

  scene.events.once('shutdown', () => domInput.remove());

  const activateInput = () => {
    domInput.readOnly = false;
    focused = true;
    domInput.focus();
    syncDisplay();
  };

  const blurInput = () => {
    focused = false;
    domInput.readOnly = true;
    domInput.blur();
    drawCaret(false);
  };

  const hit = scene.add.zone(0, 0, fieldW, fieldH).setInteractive({ useHandCursor: true });
  hit.on('pointerdown', activateInput);

  root.add([labelText, bg, display, caret, hit]);
  root.setDepth(20);

  return {
    root,
    focus: activateInput,
    blur: blurInput,
    getValue: () => sanitizePlayerUsername(value),
    setValue: (next) => {
      value = next ?? '';
      domInput.value = value;
      syncDisplay();
    },
    destroy: () => {
      domInput.remove();
      root.destroy();
    },
  };
}

/** Slider de idade — trilho verde, knob branco com número */
export function createAgeSlider(scene, x, y, initial, { min = PLAYER_AGE_MIN, max = PLAYER_AGE_MAX, contentW, onChange } = {}) {
  const scale = uiScale(scene);
  const innerW = contentW ?? Math.min(scene.scale.width * 0.86, 420);
  const trackH = Math.max(52, Math.round(56 * scale));
  const knobR = Math.round(trackH * 0.38);
  const labelSize = Math.max(18, Math.round(24 * scale));
  const labelGap = Math.round(12 * scale);
  const numSize = Math.max(16, Math.round(22 * scale));

  const root = scene.add.container(x, y);
  let age = clamp(Math.round(initial), min, max);
  let isDragging = false;

  const label = scene.add.text(-innerW / 2, -trackH / 2 - labelGap - labelSize / 2, 'Idade', {
    fontFamily: Theme.fontFamily,
    fontSize: `${labelSize}px`,
    color: LABEL_COLOR,
    fontStyle: 'bold',
  }).setOrigin(0, 0.5);

  const trackInset = knobR + 4;
  const trackInnerX = -innerW / 2 + trackInset;
  const trackInnerW = Math.max(1, innerW - trackInset * 2);

  const trackBg = scene.add.graphics();
  const knob = scene.add.graphics();
  const ageText = scene.add.text(0, 0, `${age}`, {
    fontFamily: Theme.fontFamily,
    fontSize: `${numSize}px`,
    color: LABEL_COLOR,
    fontStyle: 'bold',
  }).setOrigin(0.5);

  const valueToX = (val) => trackInnerX + ((val - min) / (max - min)) * trackInnerW;
  const xToValue = (localX) => {
    const raw = (localX - trackInnerX) / trackInnerW;
    return clamp(Math.round(min + raw * (max - min)), min, max);
  };

  const hintSize = Math.max(12, Math.round(14 * scale));
  const ageHintH = Math.round(20 * scale);
  const dragHint = scene.add.text(0, trackH / 2 + Math.round(10 * scale), '← Arraste para escolher a idade →', {
    fontFamily: Theme.fontFamily,
    fontSize: `${hintSize}px`,
    color: '#6B4226',
    fontStyle: 'bold',
  }).setOrigin(0.5, 0);

  const redraw = () => {
    trackBg.clear();
    trackBg.fillStyle(FIELD_GREEN, 1);
    trackBg.fillRoundedRect(-innerW / 2, -trackH / 2, innerW, trackH, trackH / 2);
    trackBg.lineStyle(3, FIELD_BORDER, 1);
    trackBg.strokeRoundedRect(-innerW / 2, -trackH / 2, innerW, trackH, trackH / 2);

    const kx = valueToX(age);
    knob.clear();
    knob.fillStyle(Theme.papel, 1);
    knob.lineStyle(3, FIELD_BORDER, 1);
    knob.fillCircle(kx, 0, knobR);
    knob.strokeCircle(kx, 0, knobR);
    ageText.setPosition(kx, 0);
    ageText.setText(`${age}`);
  };

  redraw();

  const zone = scene.add
    .zone(0, Math.round(8 * scale), innerW, Math.max(trackH + ageHintH + 12, 72))
    .setInteractive({ useHandCursor: true });

  const applyX = (localX) => {
    const next = xToValue(localX);
    if (next !== age) {
      age = next;
      redraw();
      onChange?.(age);
    }
  };

  zone.on('pointerdown', (pointer) => {
    isDragging = true;
    applyX(pointer.x - x);
  });

  const onPointerMove = (pointer) => {
    if (!isDragging || !pointer.isDown) return;
    applyX(pointer.x - x);
  };
  const onPointerUp = () => {
    isDragging = false;
  };
  scene.input.on('pointermove', onPointerMove);
  scene.input.on('pointerup', onPointerUp);

  scene.events.once('shutdown', () => {
    scene.input.off('pointermove', onPointerMove);
    scene.input.off('pointerup', onPointerUp);
  });

  root.add([label, trackBg, knob, ageText, dragHint, zone]);
  root.setDepth(20);

  scene.tweens.add({
    targets: dragHint,
    alpha: { from: 0.72, to: 1 },
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  return {
    root,
    getValue: () => age,
    setValue: (val) => {
      age = clamp(Math.round(val), min, max);
      redraw();
    },
  };
}

export function computePlayerNameLayout(scene, logoH, grassTop) {
  const { width, height } = scene.scale;
  const s = uiScale(scene);
  const btnMetrics = getSplashButtonMetrics(scene);
  const fieldH = Math.max(52, Math.round(56 * s));
  const labelSize = Math.max(18, Math.round(24 * s));
  const labelGap = Math.round(12 * s);
  const blockH = fieldH + labelGap + labelSize;
  const ageHintH = Math.round(20 * s);
  const ageBlockH = blockH + ageHintH;
  const contentW = Math.min(width * 0.86, 420);

  const topPad = Math.max(8, height * 0.012);
  const logoGap = Math.max(12, height * 0.016);
  const avatarGapAboveField = Math.max(14, height * 0.018);
  const btnAgeGap = Math.max(44, height * 0.048);
  const fieldGap = Math.max(10, height * 0.012);
  const grassMargin = Math.max(10, height * 0.012);

  const logoY = topPad + logoH / 2;
  const logoBottom = logoY + logoH / 2;
  const contentTop = logoBottom + logoGap;

  const btnYFromGrass = grassTop - grassMargin - btnMetrics.btnH / 2;
  const btnY = Math.max(btnYFromGrass, height * 0.772);
  const maxAgeY = btnY - btnMetrics.btnH / 2 - btnAgeGap - ageBlockH / 2;
  const ageY = maxAgeY;
  const fieldY = ageY - fieldGap - blockH;

  const fieldTop = fieldY - blockH / 2;
  const avatarSpaceH = Math.max(64, fieldTop - avatarGapAboveField - contentTop);
  let avatarSize = Math.max(118, Math.min(width * 0.44, height * 0.2, avatarSpaceH * 0.96));
  let avatarY = contentTop + avatarSpaceH / 2;

  if (avatarY + avatarSize / 2 > fieldTop - avatarGapAboveField) {
    avatarSize = Math.max(100, (fieldTop - avatarGapAboveField - contentTop) * 0.96);
    avatarY = contentTop + (fieldTop - avatarGapAboveField - contentTop) / 2;
  }

  const ageBottom = ageY + ageBlockH / 2;
  const btnTop = btnY - btnMetrics.btnH / 2;
  const guestNudgeUp = Math.max(8, height * 0.01);
  const guestY = (ageBottom + btnTop) / 2 - guestNudgeUp;

  return {
    contentW,
    logoY,
    avatarY,
    avatarSize,
    fieldY,
    ageY,
    btnY,
    guestY,
    btnMetrics,
  };
}

export function createPlayerNavButtons(scene, width, y, btnMetrics, { onHome, onSubmit, canSubmit }) {
  const { btnSize, btnW, gap, portrait } = btnMetrics;
  const btnIcon = Math.round(btnSize * PLAYER_BTN_ICON_RATIO);
  const homeX = width / 2 - (btnW + gap) / 2;
  const sendX = width / 2 + (btnW + gap) / 2;

  const homeBtn = createIconCircleButton(scene, homeX, y, PLAYER_NAME_ICONS.home, {
    size: btnSize,
    iconSize: btnIcon,
    fillRatio: 0.48,
    absoluteSize: portrait,
    depth: 200,
    showBorder: true,
    borderTint: BTN_BORDER_COLOR,
    borderScale: PLAYER_BTN_BORDER_SCALE,
    fillColor: BTN_HOME_FILL,
    onClick: () => {
      playSound(scene, 'clique');
      onHome?.();
    },
  });

  const sendBtn = createIconCircleButton(scene, sendX, y, PLAYER_NAME_ICONS.send, {
    size: btnSize,
    iconSize: btnIcon,
    fillRatio: 0.48,
    absoluteSize: portrait,
    depth: 200,
    showBorder: true,
    borderTint: BTN_BORDER_COLOR,
    borderScale: PLAYER_BTN_BORDER_SCALE,
    fillColor: BTN_SEND_FILL,
    onClick: () => {
      if (!canSubmit?.()) return;
      playSound(scene, 'clique');
      onSubmit?.();
    },
  });

  sendBtn.setAlpha(0.82);

  return {
    homeBtn,
    sendBtn,
    setSubmitEnabled(enabled) {
      sendBtn.setAlpha(enabled ? 1 : 0.82);
    },
  };
}
