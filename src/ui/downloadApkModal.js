import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale } from '../utils/responsive.js';
import { Icon } from './iconify.js';
import {
  createIconCircleButton,
  getIconButtonSize,
  SPLASH_CORNER_BTN_OPTS,
  SPLASH_ICON_RATIO,
} from './splashUi.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { showWarningAlert } from './thematicAlert.js';
import {
  APP_CREDITS,
  APP_GITHUB_REPO,
  APP_IOS_URL,
  APP_SUPPORT_EMAIL,
  openExternalUrl,
  openSupportEmail,
  startApkDownload,
} from '../config/appLinks.js';
import {
  fetchLatestReleaseInfo,
  formatAppVersion,
} from '../services/releaseUpdate.js';

const MODAL_DEPTH = 225;
const CHIP_LABEL_COLOR = '#1E6A30';
const CHIP_BORDER_TINT = 0x1E6A30;

const DOWNLOAD_ICON = Icon.from('solar:download-minimalistic-bold', {
  designSize: 24,
  color: CHIP_LABEL_COLOR,
});
const ANDROID_SYM = Icon.from('mdi:android', { designSize: 56, color: '#3DDC84' });
const IOS_SYM = Icon.from('mdi:apple', { designSize: 56, color: '#4C3433' });
const GITHUB_ICON = Icon.from('mdi:github', { designSize: 22, color: '#ffffff' });
const CLOSE_ICON = Icon.from('solar:close-circle-bold', { designSize: 24, color: '#4E9A2E' });
const SUPPORT_ICON = Icon.from('healthicons:contact-support-outline', { designSize: 20, color: '#4E9A2E' });

const FOOTER_BROWN = '#6B4226';

let activeModal = null;

function createActionButton(scene, x, y, label, iconDef, {
  color = Theme.botaoVerde,
  darkColor = Theme.folhaEscura,
  textColor = '#ffffff',
  width = 260,
  fontSize = 20,
  onClick,
} = {}) {
  const container = scene.add.container(x, y);
  const btnH = 54;
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
  const icon = scene.add.image(-width / 2 + 30, -1, iconDef.textureKey)
    .setDisplaySize(iconSize, iconSize)
    .setOrigin(0.5);

  const text = scene.add.text(-width / 2 + 54, -2, label, {
    fontFamily: Theme.fontFamily,
    fontSize: `${fontSize}px`,
    color: textColor,
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

function getPlatformCardMetrics(size) {
  const pad = Math.round(size * 0.22);
  const cardW = size + pad * 2;
  const cardH = cardW + Math.round(size * 0.18);
  return {
    pad,
    cardW,
    cardH,
    iconY: -Math.round(size * 0.1),
    labelY: Math.round(cardH * 0.28),
  };
}

function createPlatformSymbol(scene, x, y, size, iconDef, label, onClick) {
  const container = scene.add.container(x, y);
  const { cardW, cardH, iconY, labelY } = getPlatformCardMetrics(size);

  const bg = scene.add.graphics();
  const draw = (pressed = false) => {
    bg.clear();
    const offset = pressed ? 3 : 0;
    bg.fillStyle(Theme.folhaEscura, 1);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2 + offset, cardW, cardH, 18);
    bg.fillStyle(Theme.papel, 1);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH - offset, 18);
    bg.lineStyle(3, Theme.folhaEscura, 1);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH - offset, 18);
  };
  draw();

  const icon = scene.add.image(0, iconY, iconDef.textureKey)
    .setDisplaySize(size, size)
    .setOrigin(0.5);

  const text = scene.add.text(0, labelY, label, {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.max(14, Math.round(size * 0.28))}px`,
    color: '#1E6A30',
    fontStyle: 'bold',
  }).setOrigin(0.5);

  container.add([bg, icon, text]);
  container.setSize(cardW, cardH);
  container.setInteractive({ useHandCursor: true });
  container.on('pointerdown', () => draw(true));
  container.on('pointerup', () => {
    draw(false);
    onClick?.();
  });
  container.on('pointerout', () => draw(false));

  return container;
}

/** Botão circular de download — só ícone, sem label (evita sobrepor Conectar) */
export async function createSplashDownloadChip(scene, x, y, {
  onClick,
  size = 52,
  iconSize,
  absoluteSize = true,
  iconOnly = true,
  depth = 200,
} = {}) {
  await Icon.preload(scene, [DOWNLOAD_ICON]);

  const iconPx = iconSize ?? Math.round(size * SPLASH_ICON_RATIO);
  const { btnW, btnH } = getIconButtonSize(scene, size, { absolute: absoluteSize });

  if (iconOnly) {
    return createIconCircleButton(scene, x, y, DOWNLOAD_ICON, {
      size,
      iconSize: iconPx,
      absoluteSize,
      depth,
      ...SPLASH_CORNER_BTN_OPTS,
      borderTint: CHIP_BORDER_TINT,
      onClick: () => onClick?.(),
    });
  }

  const s = uiScale(scene);
  const root = scene.add.container(x, y).setDepth(200);

  const btn = createIconCircleButton(scene, 0, 0, DOWNLOAD_ICON, {
    size,
    iconSize: iconPx,
    absoluteSize,
    depth: 201,
    ...SPLASH_CORNER_BTN_OPTS,
    borderTint: CHIP_BORDER_TINT,
  });

  const label = scene.add.text(btnW / 2 + Math.round(8 * s), 0, 'App', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.max(15, Math.round(18 * s))}px`,
    color: CHIP_LABEL_COLOR,
    fontStyle: 'bold',
  }).setOrigin(0, 0.5);

  root.add([btn, label]);
  root.setSize(btnW + Math.round(8 * s) + label.width, btnH);
  root.setInteractive(
    new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, root.width, btnH),
    Phaser.Geom.Rectangle.Contains,
  );
  root.input.cursor = 'pointer';
  root.on('pointerup', () => onClick?.());

  return root;
}

/** Modal temático — download do APK Android */
export async function openDownloadApkModal(scene, { onClose } = {}) {
  if (!scene?.add) return { close: () => {} };

  activeModal?.close?.();
  activeModal = null;

  const { width, height } = scene.scale;
  const s = uiScale(scene);
  await Icon.preload(scene, [ANDROID_SYM, IOS_SYM, GITHUB_ICON, CLOSE_ICON, SUPPORT_ICON]);
  if (!scene.sys.isActive()) return { close: () => {} };

  const panelW = Math.min(Math.round(width * 0.92), 400);
  const padX = Math.round(28 * s);
  const padTop = Math.round(44 * s);
  const padBottom = Math.round(32 * s);
  const bodySize = Math.max(15, Math.round(17 * s));
  const smallSize = Math.max(13, Math.round(14 * s));
  const titleSize = Math.max(24, Math.round(28 * s));
  const wrapW = panelW - padX * 2;
  const btnW = Math.min(panelW - Math.round(40 * s), 300);
  const btnH = 54;
  const sectionGap = Math.round(16 * s);
  const footerGap = Math.round(20 * s);
  const closeInset = Math.max(22, Math.round(26 * s));

  const message = 'Escolha sua plataforma';
  const platformIconSize = Math.round(Math.min(panelW * 0.18, 56 * s));
  const { cardW: platformCardW, cardH: platformCardH } = getPlatformCardMetrics(platformIconSize);
  const platformRowH = platformCardH + Math.round(16 * s);
  const titleLineH = Math.round(titleSize * 1.2);

  const measureBody = scene.add.text(0, 0, message, {
    fontFamily: Theme.fontFamily,
    fontSize: `${bodySize}px`,
    color: FOOTER_BROWN,
    align: 'center',
    wordWrap: { width: wrapW },
    lineSpacing: 4,
  }).setOrigin(0.5, 0);

  const measureCredits = scene.add.text(0, 0, APP_CREDITS, {
    fontFamily: Theme.fontFamily,
    fontSize: `${smallSize}px`,
    color: '#6B4226',
    align: 'center',
    wordWrap: { width: wrapW },
    lineSpacing: 4,
  }).setOrigin(0.5, 0);

  const measureMail = scene.add.text(0, 0, APP_SUPPORT_EMAIL, {
    fontFamily: Theme.fontFamily,
    fontSize: `${smallSize}px`,
    color: '#4E9A2E',
    fontStyle: 'bold',
  }).setOrigin(0.5, 0);

  const versionLineH = Math.round(smallSize * 1.35);
  const versionGap = Math.round(8 * s);

  const contentH = padTop
    + titleLineH
    + versionGap
    + versionLineH
    + sectionGap
    + measureBody.height
    + sectionGap
    + platformRowH
    + sectionGap
    + btnH
    + footerGap
    + measureCredits.height
    + Math.round(10 * s)
    + measureMail.height
    + padBottom;

  const panelH = Math.min(Math.max(contentH, Math.round(height * 0.58)), Math.round(height * 0.86));

  measureBody.destroy();
  measureCredits.destroy();
  measureMail.destroy();

  const cx = width / 2;
  const cy = height * 0.48;
  const root = scene.add.container(0, 0).setDepth(MODAL_DEPTH);

  const overlay = scene.add.rectangle(cx, height / 2, width, height, 0x061018, 0.68);
  overlay.setInteractive();

  const panel = scene.add.container(cx, cy);
  const panelBg = scene.add.graphics();
  panelBg.fillStyle(Theme.papel, 1);
  panelBg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 28);
  panelBg.lineStyle(5, Theme.folhaEscura, 1);
  panelBg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 28);
  panel.add(panelBg);
  panel.setInteractive(
    new Phaser.Geom.Rectangle(-panelW / 2, -panelH / 2, panelW, panelH),
    Phaser.Geom.Rectangle.Contains,
  );

  let y = -panelH / 2 + padTop;

  const title = scene.add.text(0, y, 'Baixar o App', {
    fontFamily: Theme.fontFamily,
    fontSize: `${titleSize}px`,
    color: '#4E9A2E',
    fontStyle: 'bold',
  }).setOrigin(0.5, 0);
  panel.add(title);
  y += title.height + versionGap;

  const versionText = scene.add.text(0, y, `Versão ${formatAppVersion()}`, {
    fontFamily: Theme.fontFamily,
    fontSize: `${smallSize}px`,
    color: '#6B4226',
    fontStyle: 'bold',
    align: 'center',
  }).setOrigin(0.5, 0);
  panel.add(versionText);
  y += versionText.height + sectionGap;

  const body = scene.add.text(0, y, message, {
    fontFamily: Theme.fontFamily,
    fontSize: `${bodySize}px`,
    color: FOOTER_BROWN,
    align: 'center',
    wordWrap: { width: wrapW },
    lineSpacing: 4,
    fontStyle: 'bold',
  }).setOrigin(0.5, 0);
  panel.add(body);
  y += body.height + sectionGap;

  const platformGap = platformCardW / 2 + Math.round(12 * s);
  const platformY = y + platformRowH / 2 - Math.round(8 * s);
  let latestRelease = null;
  const androidCard = createPlatformSymbol(
    scene,
    -platformGap,
    platformY,
    platformIconSize,
    ANDROID_SYM,
    'Android',
    () => {
      playSound(scene, 'clique');
      startApkDownload(latestRelease?.downloadUrl);
    },
  );
  const iosCard = createPlatformSymbol(
    scene,
    platformGap,
    platformY,
    platformIconSize,
    IOS_SYM,
    'iOS',
    () => {
      playSound(scene, 'clique');
      if (APP_IOS_URL) {
        openExternalUrl(APP_IOS_URL);
        return;
      }
      showWarningAlert(
        scene,
        'O app para iOS ainda não está disponível.\nFique de olho nas novidades!',
        { title: 'Em breve no iOS' },
      );
    },
  );
  panel.add([androidCard, iosCard]);
  y += platformRowH + sectionGap;

  let closed = false;

  function close(playClick = true) {
    if (closed) return;
    closed = true;
    if (playClick) playSound(scene, 'clique');
    root.destroy();
    if (activeModal?.close === close) activeModal = null;
    onClose?.();
  }

  const githubBtn = createActionButton(
    scene,
    0,
    y + btnH / 2,
    'Projeto',
    GITHUB_ICON,
    {
      width: btnW,
      fontSize: Math.max(17, Math.round(19 * s)),
      onClick: () => {
        playSound(scene, 'clique');
        openExternalUrl(APP_GITHUB_REPO);
      },
    },
  );
  panel.add(githubBtn);
  y += btnH + footerGap;

  const credits = scene.add.text(0, y, APP_CREDITS, {
    fontFamily: Theme.fontFamily,
    fontSize: `${smallSize}px`,
    color: '#6B4226',
    align: 'center',
    wordWrap: { width: wrapW },
    lineSpacing: 4,
  }).setOrigin(0.5, 0);
  panel.add(credits);
  y += credits.height + Math.round(10 * s);

  const mailIconSize = Math.round(20 * s);
  const mailGap = Math.round(6 * s);
  const mailRow = scene.add.container(0, y + Math.round(smallSize * 0.55));
  const mailText = scene.add.text(0, 0, APP_SUPPORT_EMAIL, {
    fontFamily: Theme.fontFamily,
    fontSize: `${smallSize}px`,
    color: '#4E9A2E',
    fontStyle: 'bold',
  }).setOrigin(0, 0.5);
  const mailIcon = scene.add.image(0, 0, SUPPORT_ICON.textureKey)
    .setDisplaySize(mailIconSize, mailIconSize)
    .setOrigin(1, 0.5);
  const mailRowW = mailIconSize + mailGap + mailText.width;
  mailIcon.setPosition(-mailRowW / 2 + mailIconSize, 0);
  mailText.setPosition(-mailRowW / 2 + mailIconSize + mailGap, 0);
  mailRow.add([mailIcon, mailText]);
  mailRow.setSize(mailRowW, mailIconSize);
  mailRow.setInteractive(
    new Phaser.Geom.Rectangle(-mailRowW / 2, -mailIconSize / 2, mailRowW, mailIconSize),
    Phaser.Geom.Rectangle.Contains,
  );
  mailRow.input.cursor = 'pointer';
  mailRow.on('pointerover', () => mailText.setColor('#1E6A30'));
  mailRow.on('pointerout', () => mailText.setColor('#4E9A2E'));
  mailRow.on('pointerup', () => {
    playSound(scene, 'clique');
    openSupportEmail();
  });
  panel.add(mailRow);

  const closeBtnSize = 44;
  const closeBtn = createIconCircleButton(
    scene,
    panelW / 2 - closeInset - closeBtnSize / 2,
    -panelH / 2 + closeInset + closeBtnSize / 2,
    CLOSE_ICON,
    {
      size: closeBtnSize,
      iconSize: 22,
      absoluteSize: true,
      depth: MODAL_DEPTH + 2,
      onClick: () => close(true),
    },
  );
  panel.add(closeBtn);

  overlay.on('pointerup', () => close(true));

  root.add([overlay, panel]);

  panel.setScale(0.92).setAlpha(0);
  scene.tweens.add({
    targets: panel,
    scale: 1,
    alpha: 1,
    duration: 220,
    ease: 'Back.easeOut',
  });

  const handle = { close: () => close(false) };
  activeModal = handle;
  scene.events.once('shutdown', () => {
    if (activeModal === handle) activeModal = null;
  });

  fetchLatestReleaseInfo().then((latest) => {
    if (!latest) return;
    latestRelease = latest;
  }).catch(() => {});

  return handle;
}
