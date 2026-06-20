import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale } from '../utils/responsive.js';
import { Icon } from './iconify.js';
import {
  createIconCircleButton,
  SPLASH_CORNER_BTN_OPTS,
} from './splashUi.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { downloadFromDataUrl, loadGameSnapshotTexture } from '../utils/captureScreenshot.js';
import { captureVictoryButterflyPhoto } from '../utils/victoryPhotoCapture.js';

const MODAL_DEPTH = 225;
const ICON_GREEN = '#4E9A2E';

let activeModal = null;
let opening = false;
const CLOSE_ICON = Icon.from('solar:close-circle-bold', { designSize: 24, color: ICON_GREEN });
const HEADER_CAMERA_ICON = Icon.from('solar:camera-bold', { designSize: 28, color: ICON_GREEN });
const DOWNLOAD_ICON = Icon.from('solar:download-minimalistic-bold', { designSize: 22, color: '#ffffff' });

function photoSubtitle(genero) {
  return genero === 'menina'
    ? 'Olha que linda que ficou!'
    : 'Olha que incrível que ficou!';
}

function createActionButton(scene, x, y, label, iconDef, {
  color = Theme.botaoVerde,
  darkColor = Theme.folhaEscura,
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

  const icon = scene.add.image(-width / 2 + 30, -1, iconDef.textureKey)
    .setDisplaySize(22, 22)
    .setOrigin(0.5);

  const text = scene.add.text(-width / 2 + 54, -2, label, {
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

function drawCheckerBg(gfx, size, cell = 14) {
  const half = size / 2;
  gfx.clear();
  for (let row = 0; row < size; row += cell) {
    for (let col = 0; col < size; col += cell) {
      const even = (Math.floor(col / cell) + Math.floor(row / cell)) % 2 === 0;
      gfx.fillStyle(even ? 0xeeeeee : 0xffffff, 1);
      gfx.fillRect(-half + col, -half + row, cell, cell);
    }
  }
}

/**
 * Modal de foto — preview só da borboleta (sem fundo) + botão de baixar.
 */
export async function openVictoryPhotoModal(scene, options = {}) {
  // Trava síncrona: o open é async (captura + ícones + textura). Sem isso, um
  // toque duplo (ou o evento-fantasma do touch) abre dois modais antes de
  // qualquer um registrar `activeModal` — e o primeiro nunca fecha.
  if (opening) return { close: () => {} };
  opening = true;
  try {
    return await buildVictoryPhotoModal(scene, options);
  } finally {
    opening = false;
  }
}

async function buildVictoryPhotoModal(scene, {
  genero = 'menino',
  butterfly = null,
  filename = 'nhamnham-borboleta.png',
  onClose,
} = {}) {
  activeModal?.close?.(false);
  activeModal = null;

  const isGirl = genero === 'menina';
  const accentColor = isGirl ? Theme.rosa : Theme.botaoVerde;
  const accentDark = isGirl ? 0xD85A96 : Theme.folhaEscura;
  const frameStroke = isGirl ? Theme.rosa : Theme.folhaEscura;

  const { width, height } = scene.scale;

  const photo = await captureVictoryButterflyPhoto(scene, butterfly);
  if (!scene.sys.isActive()) return { close: () => {} };

  if (!photo?.preview) {
    onClose?.();
    return { close: () => {} };
  }

  const { preview: previewUrl, download: downloadUrl } = photo;

  await Icon.preload(scene, [CLOSE_ICON, HEADER_CAMERA_ICON, DOWNLOAD_ICON]);
  if (!scene.sys.isActive()) return { close: () => {} };

  let snapKey;
  try {
    snapKey = await loadGameSnapshotTexture(scene, previewUrl);
  } catch {
    onClose?.();
    return { close: () => {} };
  }
  if (!scene.sys.isActive()) {
    if (snapKey && scene.textures.exists(snapKey)) scene.textures.remove(snapKey);
    return { close: () => {} };
  }

  const s = uiScale(scene);
  const panelW = Math.min(Math.round(width * 0.92), 380);
  const wrapW = panelW - Math.round(28 * s);
  const padTop = Math.max(40, Math.round(46 * s));
  const padBottom = Math.max(28, Math.round(32 * s));
  const btnH = 54;
  const btnGap = Math.round(22 * s);
  const btnW = Math.min(panelW - Math.round(40 * s), 280);
  const headerIconSize = Math.round(36 * s);
  const titleSize = Math.max(22, Math.round(28 * s));
  const bodySize = Math.max(15, Math.round(17 * s));
  const framePad = Math.round(8 * s);

  const previewSize = Math.min(wrapW, Math.round(height * 0.44));
  const frameOuter = previewSize + framePad * 2;

  const subtitleText = photoSubtitle(genero);
  const measureSub = scene.add.text(0, 0, subtitleText, {
    fontFamily: Theme.fontFamily,
    fontSize: `${bodySize}px`,
    color: '#3B3024',
    align: 'center',
    wordWrap: { width: wrapW },
  }).setOrigin(0.5, 0);
  const subtitleH = measureSub.height;
  measureSub.destroy();

  const panelH = padTop
    + headerIconSize
    + Math.round(10 * s)
    + titleSize
    + Math.round(12 * s)
    + subtitleH
    + Math.round(16 * s)
    + frameOuter
    + btnGap
    + btnH
    + padBottom;

  const cx = width / 2;
  const cy = height / 2;
  // Garante que o painel nunca estoura a tela (sem sobrar de lado/embaixo).
  const fitScale = Math.min(1, (height * 0.94) / panelH, (width * 0.96) / panelW);
  const root = scene.add.container(0, 0).setDepth(MODAL_DEPTH).setScrollFactor(0);

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

  const headerIcon = scene.add
    .image(0, y + headerIconSize / 2, HEADER_CAMERA_ICON.textureKey)
    .setDisplaySize(headerIconSize, headerIconSize)
    .setOrigin(0.5);
  if (isGirl) headerIcon.setTint(Theme.rosa);
  panel.add(headerIcon);
  y += headerIconSize + Math.round(10 * s);

  const title = scene.add.text(0, y, 'Sua borboleta!', {
    fontFamily: Theme.fontFamily,
    fontSize: `${titleSize}px`,
    color: ICON_GREEN,
    fontStyle: 'bold',
  }).setOrigin(0.5, 0);
  panel.add(title);
  y += title.height + Math.round(12 * s);

  const body = scene.add.text(0, y, subtitleText, {
    fontFamily: Theme.fontFamily,
    fontSize: `${bodySize}px`,
    color: '#3B3024',
    align: 'center',
    wordWrap: { width: wrapW },
  }).setOrigin(0.5, 0);
  panel.add(body);
  y += body.height + Math.round(16 * s);

  const frameY = y + frameOuter / 2;
  const frame = scene.add.container(0, frameY);

  const boardSize = previewSize + framePad * 2;
  const checker = scene.add.graphics();
  drawCheckerBg(checker, boardSize);

  const frameBg = scene.add.graphics();
  frameBg.lineStyle(4, frameStroke, 1);
  frameBg.strokeRoundedRect(
    -boardSize / 2,
    -boardSize / 2,
    boardSize,
    boardSize,
    Math.round(12 * s),
  );

  const snap = scene.add.image(0, 0, snapKey)
    .setDisplaySize(previewSize, previewSize)
    .setOrigin(0.5);

  frame.add([checker, snap, frameBg]);
  panel.add(frame);

  let closed = false;

  function close(playClick = true) {
    if (closed) return;
    closed = true;
    if (activeModal?.close === close) activeModal = null;
    if (playClick) playSound(scene, 'clique');
    if (snapKey && scene.textures.exists(snapKey)) {
      scene.textures.remove(snapKey);
    }
    root.destroy();
    onClose?.();
  }

  const saveBtnY = panelH / 2 - padBottom - btnH / 2;
  const saveBtn = createActionButton(
    scene,
    0,
    saveBtnY,
    'Baixar',
    DOWNLOAD_ICON,
    {
      color: accentColor,
      darkColor: accentDark,
      width: btnW,
      fontSize: Math.max(17, Math.round(19 * s)),
      onClick: () => {
        playSound(scene, 'clique');
        const ok = downloadFromDataUrl(downloadUrl ?? previewUrl, filename);
        if (!ok) playSound(scene, 'fail');
      },
    },
  );
  panel.add(saveBtn);

  const closeInset = 10;
  const closeBtnSize = 44;
  const closeBtn = createIconCircleButton(
    scene,
    panelW / 2 - closeInset - closeBtnSize / 2,
    -panelH / 2 + closeInset + closeBtnSize / 2,
    CLOSE_ICON,
    {
      ...SPLASH_CORNER_BTN_OPTS,
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

  panel.setScale(0.92 * fitScale).setAlpha(0);
  scene.tweens.add({
    targets: panel,
    scale: fitScale,
    alpha: 1,
    duration: 220,
    ease: 'Back.easeOut',
  });

  const handle = { close: (playClick = false) => close(playClick) };
  activeModal = handle;
  scene.events.once('shutdown', () => {
    if (activeModal === handle) activeModal = null;
    close(false);
  });

  return handle;
}
