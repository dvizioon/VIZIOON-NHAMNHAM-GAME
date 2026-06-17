import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale } from '../utils/responsive.js';
import { Icon } from './iconify.js';
import { createIconCircleButton } from './splashUi.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { logoutPlayerSession } from '../services/playerSession.js';
import { SceneKeys } from '../config/constants.js';
import { hasTexture } from '../systems/AssetLoader.js';
import { GUEST_PLAYER_NAME, UI_USER_JOGADOR_KEY } from './playerNameUi.js';

const MODAL_DEPTH = 220;
const CLOSE_ICON = Icon.from('solar:close-circle-bold', { designSize: 24, color: '#4E9A2E' });
const USER_ICON = Icon.from('solar:user-circle-bold', { designSize: 24, color: '#1E6A30' });
const LOGOUT_ICON = Icon.from('solar:logout-2-bold', { designSize: 22, color: '#ffffff' });
const CONNECT_ICON = Icon.from('solar:add-circle-broken', { designSize: 22, color: '#ffffff' });
const BTN_RED = 0xE84545;
const BTN_RED_DARK = 0xB71C1C;

/** Chip no canto superior esquerdo — conta conectada */
export async function createSplashUserChip(scene, x, y, { onClick, size = 52 } = {}) {
  const s = uiScale(scene);
  const session = GameState.getPlayerSession(scene);
  if (!session || session.isGuest) return null;

  return createSplashSessionChip(scene, x, y, {
    onClick,
    size,
    name: session.displayName ?? 'Jogador',
  });
}

/** Chip no canto superior esquerdo — visitante ativo */
export async function createSplashGuestChip(scene, x, y, { onClick, size = 52 } = {}) {
  if (!GameState.hasActiveGuestSession(scene)) return null;

  return createSplashSessionChip(scene, x, y, {
    onClick,
    size,
    name: GUEST_PLAYER_NAME,
  });
}

async function createSplashSessionChip(scene, x, y, { onClick, size, name }) {
  const s = uiScale(scene);
  await Icon.preload(scene, [USER_ICON]);
  const fontSize = Math.max(15, Math.round(18 * s));
  const gap = Math.round(8 * s);
  const iconPx = Math.round(size * 0.46);

  const root = scene.add.container(x, y).setDepth(200);

  const btn = createIconCircleButton(scene, 0, 0, USER_ICON, {
    size,
    iconSize: iconPx,
    absoluteSize: true,
    depth: 201,
    fillRatio: 0.48,
    onClick: () => onClick?.(),
  });

  const label = scene.add.text(size / 2 + gap, 0, name, {
    fontFamily: Theme.fontFamily,
    fontSize: `${fontSize}px`,
    color: '#1E6A30',
    fontStyle: 'bold',
  }).setOrigin(0, 0.5);

  const maxLabelW = Math.max(80, scene.scale.width * 0.34);
  if (label.width > maxLabelW) {
    let trimmed = name;
    while (trimmed.length > 1 && label.setText(`${trimmed}…`), label.width > maxLabelW) {
      trimmed = trimmed.slice(0, -1);
    }
  }

  root.add([btn, label]);
  root.setSize(size + gap + label.width, size);
  root.setInteractive(
    new Phaser.Geom.Rectangle(-size / 2, -size / 2, root.width, size),
    Phaser.Geom.Rectangle.Contains,
  );
  root.input.cursor = 'pointer';
  root.on('pointerup', () => onClick?.());

  return root;
}

/** Modal — informações da conta conectada */
export async function openPlayerProfileModal(scene, { onClose, onLogout } = {}) {
  const session = GameState.getPlayerSession(scene);
  if (!session || session.isGuest) return { close: () => {} };

  const { width, height } = scene.scale;
  const s = uiScale(scene);
  await Icon.preload(scene, [CLOSE_ICON]);

  const panelW = Math.min(Math.round(width * 0.88), 360);
  const topPad = 22;
  const bottomPad = 24;
  const panelH = Math.min(height * 0.52, Math.round(height * 0.42));

  const cx = width / 2;
  const cy = height * 0.46;
  const root = scene.add.container(0, 0).setDepth(MODAL_DEPTH);

  const overlay = scene.add.rectangle(cx, height / 2, width, height, 0x061018, 0.68);
  overlay.setInteractive();
  overlay.on('pointerup', () => close());

  const panel = scene.add.container(cx, cy);
  const panelBg = scene.add.graphics();
  panelBg.fillStyle(Theme.papel, 1);
  panelBg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 26);
  panelBg.lineStyle(5, Theme.folhaEscura, 1);
  panelBg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 26);
  panel.add(panelBg);
  panel.setInteractive(
    new Phaser.Geom.Rectangle(-panelW / 2, -panelH / 2, panelW, panelH),
    Phaser.Geom.Rectangle.Contains,
  );

  const titleSize = Math.max(22, Math.round(28 * s));
  const bodySize = Math.max(15, Math.round(17 * s));
  const labelColor = '#4E9A2E';
  let y = -panelH / 2 + topPad;

  const title = scene.add.text(0, y, 'Minha conta', {
    fontFamily: Theme.fontFamily,
    fontSize: `${titleSize}px`,
    color: labelColor,
    fontStyle: 'bold',
  }).setOrigin(0.5, 0);
  panel.add(title);
  y += title.height + 16;

  const avatarSize = Math.round(Math.min(panelW * 0.28, 88));
  if (hasTexture(scene, UI_USER_JOGADOR_KEY)) {
    const avatar = scene.add.image(0, y + avatarSize / 2, UI_USER_JOGADOR_KEY)
      .setDisplaySize(avatarSize, avatarSize)
      .setOrigin(0.5);
    panel.add(avatar);
    y += avatarSize + 14;
  }

  const nameLabel = scene.add.text(0, y, 'Nome', {
    fontFamily: Theme.fontFamily,
    fontSize: `${bodySize}px`,
    color: labelColor,
    fontStyle: 'bold',
  }).setOrigin(0.5, 0);
  panel.add(nameLabel);
  y += nameLabel.height + 6;

  const nameValue = scene.add.text(0, y, session.displayName ?? '—', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.max(18, Math.round(22 * s))}px`,
    color: '#3B3024',
    fontStyle: 'bold',
  }).setOrigin(0.5, 0);
  panel.add(nameValue);

  const closeBtnSize = 44;
  const closeBtn = createIconCircleButton(
    scene,
    cx + panelW / 2 - closeBtnSize * 0.55,
    cy - panelH / 2 + closeBtnSize * 0.55,
    CLOSE_ICON,
    {
      size: closeBtnSize,
      iconSize: 22,
      absoluteSize: true,
      depth: MODAL_DEPTH + 2,
      onClick: () => close(),
    },
  );

  const logoutY = cy + panelH / 2 - bottomPad - 18;
  const logout = scene.add.text(cx, logoutY, 'Sair da conta', {
    fontFamily: Theme.fontFamily,
    fontSize: `${bodySize}px`,
    color: '#6B4226',
    fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(MODAL_DEPTH + 1).setInteractive({ useHandCursor: true });

  logout.on('pointerover', () => logout.setColor('#3B3024'));
  logout.on('pointerout', () => logout.setColor('#6B4226'));
  logout.on('pointerup', () => {
    logoutPlayerSession(scene);
    close();
    onLogout?.();
  });

  root.add([overlay, panel, logout]);

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    playSound(scene, 'clique');
    closeBtn?.destroy();
    root.destroy();
    onClose?.();
  }

  return { close };
}

function createModalIconButton(scene, x, y, label, iconDef, {
  color,
  darkColor,
  width = 260,
  fontSize = 20,
  onClick,
} = {}) {
  const container = scene.add.container(x, y);
  const btnH = 52;
  const radius = btnH / 2;

  const bg = scene.add.graphics();
  const draw = (pressed = false) => {
    bg.clear();
    const offset = pressed ? 4 : 0;
    bg.fillStyle(darkColor, 1);
    bg.fillRoundedRect(-width / 2, -radius + offset, width, btnH, radius);
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-width / 2, -radius, width, btnH - offset, radius);
  };
  draw();

  const iconSize = 22;
  const icon = scene.add.image(-width / 2 + 28, -1, iconDef.textureKey)
    .setDisplaySize(iconSize, iconSize)
    .setOrigin(0.5);

  const text = scene.add.text(-width / 2 + 52, -2, label, {
    fontFamily: Theme.fontFamily,
    fontSize: `${fontSize}px`,
    color: '#ffffff',
    fontStyle: 'bold',
  }).setOrigin(0, 0.5);

  container.add([bg, icon, text]);
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

/** Modal — visitante (sair ou conectar conta) */
export async function openGuestProfileModal(scene, { onClose, onLogout, onConnect } = {}) {
  if (!GameState.hasActiveGuestSession(scene)) return { close: () => {} };

  const { width, height } = scene.scale;
  const s = uiScale(scene);
  await Icon.preload(scene, [CLOSE_ICON, LOGOUT_ICON, CONNECT_ICON]);

  const panelW = Math.min(Math.round(width * 0.88), 360);
  const topPad = Math.max(40, Math.round(46 * s));
  const bottomPad = Math.max(28, Math.round(32 * s));
  const titleSize = Math.max(22, Math.round(28 * s));
  const bodySize = Math.max(15, Math.round(17 * s));
  const btnGap = Math.max(14, Math.round(16 * s));
  const sectionGap = Math.max(24, Math.round(28 * s));
  const btnH = 52;
  const hintLinesH = bodySize * 2.4 + 8;
  const panelH = Math.min(
    Math.round(height * 0.52),
    topPad + titleSize + 14 + hintLinesH + sectionGap + btnH + btnGap + btnH + bottomPad,
  );
  const cx = width / 2;
  const cy = height * 0.46;
  const root = scene.add.container(0, 0).setDepth(MODAL_DEPTH);

  const overlay = scene.add.rectangle(cx, height / 2, width, height, 0x061018, 0.68);
  overlay.setInteractive();
  overlay.on('pointerup', () => close());

  const panel = scene.add.container(cx, cy);
  const panelBg = scene.add.graphics();
  panelBg.fillStyle(Theme.papel, 1);
  panelBg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 26);
  panelBg.lineStyle(5, Theme.folhaEscura, 1);
  panelBg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 26);
  panel.add(panelBg);
  panel.setInteractive(
    new Phaser.Geom.Rectangle(-panelW / 2, -panelH / 2, panelW, panelH),
    Phaser.Geom.Rectangle.Contains,
  );

  const labelColor = '#4E9A2E';
  let y = -panelH / 2 + topPad;

  const title = scene.add.text(0, y, GUEST_PLAYER_NAME, {
    fontFamily: Theme.fontFamily,
    fontSize: `${titleSize}px`,
    color: labelColor,
    fontStyle: 'bold',
  }).setOrigin(0.5, 0);
  panel.add(title);
  y += title.height + 14;

  const hint = scene.add.text(
    0,
    y,
    'Você está jogando como visitante.\nConecte uma conta para salvar progresso.',
    {
      fontFamily: Theme.fontFamily,
      fontSize: `${bodySize}px`,
      color: '#6B4226',
      align: 'center',
      lineSpacing: 5,
    },
  ).setOrigin(0.5, 0);
  panel.add(hint);
  y += hint.height + sectionGap;

  const btnW = Math.min(panelW - 48, 280);
  const btnFont = Math.max(17, Math.round(20 * s));

  const connectBtn = createModalIconButton(scene, 0, y, 'Conectar', CONNECT_ICON, {
    color: Theme.botaoVerde,
    darkColor: Theme.folhaEscura,
    width: btnW,
    fontSize: btnFont,
    onClick: () => {
      close(false);
      onConnect?.();
      scene.scene.start(SceneKeys.LOGIN);
    },
  });
  panel.add(connectBtn);
  y += btnH + btnGap;

  const logoutBtn = createModalIconButton(scene, 0, y, 'Sair', LOGOUT_ICON, {
    color: BTN_RED,
    darkColor: BTN_RED_DARK,
    width: btnW,
    fontSize: btnFont,
    onClick: () => {
      logoutPlayerSession(scene);
      close(false);
      onLogout?.();
    },
  });
  panel.add(logoutBtn);

  const closeBtnSize = 44;
  const closeInset = Math.max(16, Math.round(20 * s));
  const closeBtn = createIconCircleButton(
    scene,
    cx + panelW / 2 - closeBtnSize / 2 - closeInset,
    cy - panelH / 2 + closeBtnSize / 2 + closeInset,
    CLOSE_ICON,
    {
      size: closeBtnSize,
      iconSize: 22,
      absoluteSize: true,
      depth: MODAL_DEPTH + 2,
      onClick: () => close(),
    },
  );

  root.add([overlay, panel]);

  let closed = false;
  function close(playClick = true) {
    if (closed) return;
    closed = true;
    if (playClick) playSound(scene, 'clique');
    closeBtn?.destroy();
    root.destroy();
    onClose?.();
  }

  return { close };
}
