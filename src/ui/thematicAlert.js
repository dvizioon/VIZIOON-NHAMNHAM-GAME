import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale } from '../utils/responsive.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { Icon } from './iconify.js';

/** @typedef {'info' | 'success' | 'error' | 'warning'} AlertType */

const ALERT_VARIANTS = {
  info: {
    border: Theme.folhaEscura,
    titleColor: '#4E9A2E',
    icon: Icon.from('solar:info-circle-bold', { designSize: 28, color: '#4E9A2E' }),
    defaultTitle: null,
    btnFill: Theme.botaoVerde,
    btnDark: Theme.folhaEscura,
    btnText: '#ffffff',
  },
  success: {
    border: Theme.folhaEscura,
    titleColor: '#4E9A2E',
    icon: Icon.from('solar:check-circle-bold', { designSize: 28, color: '#4E9A2E' }),
    defaultTitle: 'Sucesso!',
    btnFill: Theme.botaoVerde,
    btnDark: Theme.folhaEscura,
    btnText: '#ffffff',
  },
  error: {
    border: 0xE84545,
    titleColor: '#C62828',
    icon: Icon.from('solar:close-circle-bold', { designSize: 28, color: '#E84545' }),
    defaultTitle: 'Ops!',
    btnFill: 0xE84545,
    btnDark: 0xB71C1C,
    btnText: '#ffffff',
  },
  warning: {
    border: 0xF9A825,
    titleColor: '#B8860B',
    icon: Icon.from('solar:danger-triangle-bold', { designSize: 28, color: '#F9A825' }),
    defaultTitle: 'Atenção!',
    btnFill: Theme.sol,
    btnDark: 0xF57C00,
    btnText: '#3B3024',
  },
};

let activeAlert = null;

function resolveVariant(type = 'info') {
  return ALERT_VARIANTS[type] ?? ALERT_VARIANTS.info;
}

function createOkButton(scene, x, y, label, {
  width,
  fontSize,
  fill,
  dark,
  textColor,
  onClick,
}) {
  const container = scene.add.container(x, y);
  const btnH = 52;
  const radius = btnH / 2;

  const bg = scene.add.graphics();
  const draw = (pressed = false) => {
    bg.clear();
    const offset = pressed ? 4 : 0;
    bg.fillStyle(dark, 1);
    bg.fillRoundedRect(-width / 2, -radius + offset, width, btnH, radius);
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(-width / 2, -radius, width, btnH - offset, radius);
  };
  draw();

  const text = scene.add.text(0, -2, label, {
    fontFamily: Theme.fontFamily,
    fontSize: `${fontSize}px`,
    color: textColor,
    fontStyle: 'bold',
  }).setOrigin(0.5);

  container.add([bg, text]);
  container.setSize(width, btnH);
  container.setInteractive({ useHandCursor: true });
  container.on('pointerdown', () => draw(true));
  container.on('pointerup', () => {
    draw(false);
    onClick?.();
  });
  container.on('pointerout', () => draw(false));

  return container;
}

/**
 * Alerta temático — ícone + borda por tipo + OK.
 * @param {AlertType} [options.type='info'] — info | success | error | warning
 */
export async function showThematicAlert(scene, message, {
  depth = 260,
  type = 'info',
  title = undefined,
  buttonLabel = 'OK',
  maxWidth = null,
  onClose,
  dismissOnOverlay = true,
} = {}) {
  if (!scene?.add) return { close: () => {} };

  activeAlert?.close?.();

  const variant = resolveVariant(type);
  await Icon.preload(scene, [variant.icon]);

  const resolvedTitle = title === undefined ? variant.defaultTitle : title;
  const { width, height } = scene.scale;
  const s = uiScale(scene);
  const panelMaxW = Math.min(maxWidth ?? width * 0.88, 360);
  const padX = Math.round(22 * s);
  const padTop = Math.round(16 * s);
  const padBottom = Math.round(18 * s);
  const btnH = 52;
  const btnGap = Math.round(14 * s);
  const iconSize = Math.round(Math.min(panelMaxW * 0.16, 52));
  const iconGap = Math.round(10 * s);
  const titleSize = Math.max(18, Math.round(22 * s));
  const bodySize = Math.max(16, Math.round(18 * s));
  const btnFont = Math.max(17, Math.round(20 * s));
  const textWrapW = panelMaxW - padX * 2;

  const measureTitle = resolvedTitle
    ? scene.add.text(0, 0, resolvedTitle, {
      fontFamily: Theme.fontFamily,
      fontSize: `${titleSize}px`,
      color: variant.titleColor,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: textWrapW },
    }).setOrigin(0.5, 0)
    : null;

  const measureBody = scene.add.text(0, 0, message, {
    fontFamily: Theme.fontFamily,
    fontSize: `${bodySize}px`,
    color: '#3B3024',
    align: 'center',
    wordWrap: { width: textWrapW },
    lineSpacing: 6,
  }).setOrigin(0.5, 0);

  const contentW = Math.min(
    panelMaxW,
    Math.max(
      measureBody.width + padX * 2,
      measureTitle?.width ? measureTitle.width + padX * 2 : 0,
      260,
    ),
  );
  const wrapW = contentW - padX * 2;

  measureBody.setWordWrapWidth(wrapW);
  if (measureTitle) measureTitle.setWordWrapWidth(wrapW);

  const titleBlockH = measureTitle ? measureTitle.height + Math.round(8 * s) : 0;
  const iconBlockH = iconSize + iconGap;
  const boxContentH = padTop + iconBlockH + titleBlockH + measureBody.height + btnGap + btnH + padBottom;

  measureTitle?.destroy();
  measureBody.destroy();

  const cx = width / 2;
  const cy = height * 0.46;
  const root = scene.add.container(0, 0).setDepth(depth);

  const overlay = scene.add.rectangle(cx, height / 2, width, height, 0x061018, 0.68);
  overlay.setInteractive({ useHandCursor: false });

  const panel = scene.add.container(cx, cy);
  const boxTop = -boxContentH / 2;

  const panelBg = scene.add.graphics();
  panelBg.fillStyle(Theme.papel, 1);
  panelBg.fillRoundedRect(-contentW / 2, boxTop, contentW, boxContentH, 22);
  panelBg.lineStyle(5, variant.border, 1);
  panelBg.strokeRoundedRect(-contentW / 2, boxTop, contentW, boxContentH, 22);
  panel.add(panelBg);

  let textY = boxTop + padTop;

  const icon = scene.add
    .image(0, textY + iconSize / 2, variant.icon.textureKey)
    .setDisplaySize(iconSize, iconSize)
    .setOrigin(0.5);
  panel.add(icon);
  textY += iconBlockH;

  if (resolvedTitle) {
    const titleText = scene.add.text(0, textY, resolvedTitle, {
      fontFamily: Theme.fontFamily,
      fontSize: `${titleSize}px`,
      color: variant.titleColor,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: wrapW },
    }).setOrigin(0.5, 0);
    panel.add(titleText);
    textY += titleText.height + Math.round(8 * s);
  }

  const body = scene.add.text(0, textY, message, {
    fontFamily: Theme.fontFamily,
    fontSize: `${bodySize}px`,
    color: '#3B3024',
    align: 'center',
    wordWrap: { width: wrapW },
    lineSpacing: 6,
  }).setOrigin(0.5, 0);
  panel.add(body);

  const btnW = Math.min(contentW - Math.round(36 * s), 220);
  const okBtn = createOkButton(scene, 0, boxTop + boxContentH - padBottom - btnH / 2, buttonLabel, {
    width: btnW,
    fontSize: btnFont,
    fill: variant.btnFill,
    dark: variant.btnDark,
    textColor: variant.btnText,
    onClick: () => dismiss(true),
  });
  panel.add(okBtn);

  panel.setInteractive(
    new Phaser.Geom.Rectangle(-contentW / 2, boxTop, contentW, boxContentH),
    Phaser.Geom.Rectangle.Contains,
  );

  root.add([overlay, panel]);

  let closed = false;
  function dismiss(withSound = false) {
    if (closed) return;
    closed = true;
    if (withSound) playSound(scene, 'clique');
    root.destroy();
    if (activeAlert?.close === dismiss) activeAlert = null;
    onClose?.();
  }

  if (dismissOnOverlay) {
    overlay.on('pointerup', () => dismiss(true));
  }

  panel.setScale(0.92).setAlpha(0);
  scene.tweens.add({
    targets: panel,
    scale: 1,
    alpha: 1,
    duration: 220,
    ease: 'Back.easeOut',
  });

  const handle = { close: () => dismiss(false) };
  activeAlert = handle;
  scene.events.once('shutdown', () => {
    if (activeAlert === handle) activeAlert = null;
  });

  return handle;
}

export function showSuccessAlert(scene, message, options = {}) {
  return showThematicAlert(scene, message, { ...options, type: 'success' });
}

export function showErrorAlert(scene, message, options = {}) {
  return showThematicAlert(scene, message, { ...options, type: 'error' });
}

export function showWarningAlert(scene, message, options = {}) {
  return showThematicAlert(scene, message, { ...options, type: 'warning' });
}

export function showInfoAlert(scene, message, options = {}) {
  return showThematicAlert(scene, message, { ...options, type: 'info' });
}
