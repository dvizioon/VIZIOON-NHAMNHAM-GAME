import { Theme } from '../config/theme.js';
import { uiScale, isPortrait } from '../utils/responsive.js';
import { Icon } from './iconify.js';

export const UI_LOGO_KEY = 'ui_logo';
export const UI_BUTTON_BORDER_KEY = 'ui_button_border';

export const CIRCLE_BTN_SIZE = 142;
export const CIRCLE_BTN_ICON_SIZE = 60;
/** Borda dos botões circulares (voltar/salvar) — aumente p/ borda maior */
export const SETTINGS_BTN_BORDER_SCALE = 1;

/** Ajuste fino — centralizar círculo interno na BordaButton.svg */
export const SETTINGS_BTN_CONTENT_OFFSET_X = -1;
export const SETTINGS_BTN_CONTENT_OFFSET_Y = -2;

/** BordaButton.svg — viewBox 142×145 */
const BORDER_ASPECT = 145 / 142;

export const SPLASH_ICONS = {
  config: Icon.from('mynaui:config', { designSize: 24 }),
  play: Icon.from('solar:play-linear', { designSize: 24 }),
  ranking: Icon.from('solar:ranking-broken', { designSize: 24 }),
};

export async function preloadSplashIcons(scene) {
  await Icon.preload(scene, Object.values(SPLASH_ICONS));
}

/** Tamanho renderizado do botão (borda incluída) */
export function getIconButtonSize(scene, size = 142, { absolute = false } = {}) {
  const scale = absolute ? 1 : uiScale(scene);
  const btnW = Math.round(size * scale);
  const btnH = Math.round(size * BORDER_ASPECT * scale);
  return { btnW, btnH, scale };
}

/**
 * Botão circular — borda atrás (menor, só o traço verde), conteúdo centralizado.
 * Camadas: BordaButton → círculo branco → ícone
 */
export function createIconCircleButton(
  scene,
  x,
  y,
  icon,
  {
    onClick,
    size = 142,
    iconSize = 56,
    depth = 200,
    fillRatio = 0.42,
    borderScale = 0.88,
    fillColor = Theme.papel,
    flipIcon = false,
    contentOffsetX = 0,
    contentOffsetY = 0,
    absoluteSize = false,
    showBorder = true,
    borderTint = null,
    simpleBorder = false,
    borderColor = 0x1E6A30,
    borderWidth = 3,
  } = {},
) {
  const textureKey = icon instanceof Icon ? icon.textureKey : icon;
  const { btnW, btnH, scale } = getIconButtonSize(scene, size, { absolute: absoluteSize });
  const iconScale = absoluteSize ? 1 : scale;
  const iconPx = Math.round(iconSize * iconScale);
  const fillR = Math.round(Math.min(btnW, btnH) * fillRatio);
  const borderW = Math.round(btnW * borderScale);
  const borderH = Math.round(btnH * borderScale);

  const container = scene.add.container(x, y).setDepth(depth);

  const content = scene.add.container(
    Math.round(contentOffsetX * iconScale),
    Math.round(contentOffsetY * iconScale),
  );

  const bg = scene.add.graphics();
  bg.fillStyle(fillColor, 1);
  bg.fillCircle(0, 0, fillR);
  if (simpleBorder) {
    bg.lineStyle(borderWidth, borderColor, 1);
    bg.strokeCircle(0, 0, fillR);
  }

  const iconImg = scene.add
    .image(0, 0, textureKey)
    .setDisplaySize(iconPx, iconPx)
    .setOrigin(0.5);

  if (flipIcon) {
    iconImg.scaleX = -Math.abs(iconImg.scaleX);
  }

  content.add([bg, iconImg]);

  if (showBorder && !simpleBorder && scene.textures.exists(UI_BUTTON_BORDER_KEY)) {
    const border = scene.add
      .image(0, 0, UI_BUTTON_BORDER_KEY)
      .setDisplaySize(borderW, borderH)
      .setOrigin(0.5);
    if (borderTint != null) border.setTint(borderTint);
    container.add([border, content]);
  } else {
    container.add(content);
  }

  container.setSize(btnW, btnH);
  container.setInteractive({ useHandCursor: true });

  container.on('pointerdown', () => container.setScale(0.94));
  container.on('pointerup', () => {
    container.setScale(1);
    onClick?.();
  });
  container.on('pointerout', () => container.setScale(1));

  return container;
}

/** Canto superior esquerdo — celular (config longe da logo central) */
export function placeTopLeftButton(scene, icon, {
  margin = 24,
  marginRatio = null,
  absoluteSize = false,
  onClick,
  ...opts
} = {}) {
  const { width } = scene.scale;
  const abs = absoluteSize || isPortrait(scene);
  const { btnW, btnH, scale } = getIconButtonSize(scene, opts.size ?? 142, { absolute: abs });
  const m = marginRatio != null
    ? Math.max(12, Math.round(width * marginRatio))
    : Math.round(margin * (abs ? 1 : scale));

  return createIconCircleButton(
    scene,
    m + btnW / 2,
    m + btnH / 2,
    icon,
    { onClick, absoluteSize: abs, ...opts },
  );
}

/** Canto superior direito — encaixa a caixa do botão na margem */
export function placeTopRightButton(scene, icon, {
  margin = 24,
  marginRatio = null,
  absoluteSize = false,
  onClick,
  ...opts
} = {}) {
  const { width } = scene.scale;
  const abs = absoluteSize || isPortrait(scene);
  const { btnW, btnH, scale } = getIconButtonSize(scene, opts.size ?? 142, { absolute: abs });
  const m = marginRatio != null
    ? Math.max(12, Math.round(width * marginRatio))
    : Math.round(margin * (abs ? 1 : scale));

  return createIconCircleButton(
    scene,
    width - m - btnW / 2,
    m + btnH / 2,
    icon,
    { onClick, absoluteSize: abs, ...opts },
  );
}
