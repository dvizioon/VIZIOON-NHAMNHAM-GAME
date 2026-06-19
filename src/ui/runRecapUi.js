import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale, responsiveWidth } from '../utils/responsive.js';
import { Icon } from './iconify.js';
import { PANEL_CORNER_RADIUS, PANEL_SHADOW_OFFSET } from './settingsUi.js';
import { FOOD_FRUTAS, getFruitLabel } from '../config/foodConfig.js';
import { GAME_SCORE_MAX } from './gameUi.js';
import { loadLastRunRecap } from '../utils/localPreferences.js';
import { createIconCircleButton } from './splashUi.js';
import { playSound } from '../systems/ProceduralAudio.js';

const MODAL_DEPTH = 230;
const CLOSE_ICON = Icon.from('solar:close-circle-bold', { designSize: 24, color: '#4E9A2E' });

function formatRunDuration(ms) {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min} min ${sec} s`;
  return `${sec} s`;
}

function buildFruitGrid(scene, fruitCounts, cardW, padX, s) {
  const fruitEntries = Object.entries(fruitCounts ?? {})
    .map(([frame, count]) => ({ frame: Number(frame), count }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);

  const iconSize = Math.round(34 * s);
  const cellW = Math.round(72 * s);
  const cellH = Math.round(58 * s);
  const cols = Math.min(4, Math.max(1, Math.floor((cardW - padX * 2) / cellW)));
  const fruitGrid = scene.add.container(0, 0);

  if (fruitEntries.length === 0) {
    const empty = scene.add.text(0, 0, 'Nenhuma fruta registrada ainda.\nJogue uma partida até o casulo!', {
      fontFamily: Theme.fontFamily,
      fontSize: `${Math.round(14 * s)}px`,
      color: '#6B4226',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0, 0);
    fruitGrid.add(empty);
    fruitGrid._gridH = empty.height;
    return fruitGrid;
  }

  fruitEntries.forEach((entry, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = col * cellW + cellW / 2;
    const cy = row * cellH + cellH / 2;
    const cell = scene.add.container(cx, cy);

    if (scene.textures.exists(FOOD_FRUTAS.key)) {
      const icon = scene.add.image(0, -Math.round(6 * s), FOOD_FRUTAS.key, entry.frame)
        .setDisplaySize(iconSize, iconSize)
        .setOrigin(0.5);
      cell.add(icon);
    }

    const count = scene.add.text(0, Math.round(14 * s), `×${entry.count}`, {
      fontFamily: Theme.fontFamily,
      fontSize: `${Math.round(13 * s)}px`,
      color: '#1E6A30',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    const name = scene.add.text(0, Math.round(26 * s), getFruitLabel(entry.frame), {
      fontFamily: Theme.fontFamily,
      fontSize: `${Math.round(10 * s)}px`,
      color: '#490808',
      align: 'center',
      wordWrap: { width: cellW - 4 },
    }).setOrigin(0.5, 0);

    cell.add([count, name]);
    fruitGrid.add(cell);
  });

  const rows = Math.ceil(fruitEntries.length / cols);
  fruitGrid._gridH = rows * cellH;
  return fruitGrid;
}

/** Modal — barra 100 pts, tempo e frutas de uma partida */
export async function openRunRecapModal(scene, recap, {
  onClose,
  title = 'Sua melhor partida',
} = {}) {
  const { width, height } = scene.scale;
  const s = uiScale(scene);
  await Icon.preload(scene, [CLOSE_ICON]);

  const panelW = Math.min(responsiveWidth(scene, 0.94, 560), width * 0.96);
  const padX = Math.round(16 * s);
  const padY = Math.round(14 * s);
  const r = Math.round(PANEL_CORNER_RADIUS * (panelW / 400));
  const off = Math.round(PANEL_SHADOW_OFFSET * (panelW / 400));
  const cx = width / 2;
  const cy = height * 0.48;
  const points = recap?.points ?? 0;
  const durationMs = recap?.durationMs ?? 0;
  const genero = recap?.genero ?? 'menino';
  const isMenina = genero === 'menina';
  const shadowColor = isMenina ? Theme.rosa : Theme.verde;

  const root = scene.add.container(0, 0).setDepth(MODAL_DEPTH);
  const overlay = scene.add.rectangle(cx, height / 2, width, height, 0x061018, 0.72);
  overlay.setInteractive();
  overlay.on('pointerup', () => close());

  const panel = scene.add.container(cx, cy);

  const titleText = scene.add.text(0, 0, title, {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(22 * s)}px`,
    color: '#490808',
    fontStyle: 'bold',
  }).setOrigin(0, 0);

  const barW = panelW - padX * 2;
  const barH = Math.round(22 * s);
  const barBg = scene.add.graphics();
  const barFill = scene.add.graphics();
  const ratio = recap ? points / GAME_SCORE_MAX : 0;
  barBg.fillStyle(0xe8dcc8, 1);
  barBg.fillRoundedRect(0, 0, barW, barH, barH / 2);
  barBg.lineStyle(2, Theme.folhaEscura, 0.35);
  barBg.strokeRoundedRect(0, 0, barW, barH, barH / 2);
  const fillW = Math.max(barH, Math.round(barW * Phaser.Math.Clamp(ratio, 0, 1)));
  barFill.fillStyle(Theme.botaoVerde, 1);
  barFill.fillRoundedRect(0, 0, fillW, barH, barH / 2);
  const barLabel = scene.add.text(barW / 2, barH / 2, recap ? `${points} / ${GAME_SCORE_MAX}` : '—', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(14 * s)}px`,
    color: '#ffffff',
    fontStyle: 'bold',
    stroke: '#1E6A30',
    strokeThickness: Math.round(3 * s),
  }).setOrigin(0.5);
  const barWrap = scene.add.container(0, 0, [barBg, barFill, barLabel]);

  const timeText = scene.add.text(0, 0, recap
    ? `Tempo: ${formatRunDuration(durationMs)}`
    : 'Ainda não há partida salva.', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(15 * s)}px`,
    color: '#490808',
    fontStyle: recap ? 'bold' : 'normal',
  }).setOrigin(0, 0);

  const fruitsTitle = scene.add.text(0, 0, 'Frutas que você comeu:', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(16 * s)}px`,
    color: '#490808',
    fontStyle: 'bold',
  }).setOrigin(0, 0);

  const fruitGrid = buildFruitGrid(scene, recap?.fruitCounts, panelW, padX, s);
  const gap = Math.round(10 * s);
  const contentH = titleText.height + gap + barH + gap + timeText.height + gap
    + fruitsTitle.height + gap + (fruitGrid._gridH ?? 0);
  const panelH = contentH + padY * 2;

  panel.setInteractive(
    new Phaser.Geom.Rectangle(-panelW / 2, -panelH / 2, panelW, panelH),
    Phaser.Geom.Rectangle.Contains,
  );

  const shadow = scene.add.graphics();
  shadow.fillStyle(shadowColor, 1);
  shadow.fillRoundedRect(-panelW / 2 + off, -panelH / 2 + off, panelW, panelH, r);
  const bg = scene.add.graphics();
  bg.fillStyle(Theme.papel, 1);
  bg.lineStyle(Math.max(3, Math.round(3 * s)), Theme.folhaEscura, 1);
  bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, r);
  bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, r);

  let ty = -panelH / 2 + padY;
  const tx = -panelW / 2 + padX;
  titleText.setPosition(tx, ty);
  ty += titleText.height + gap;
  barWrap.setPosition(tx, ty);
  ty += barH + gap;
  timeText.setPosition(tx, ty);
  ty += timeText.height + gap;
  fruitsTitle.setPosition(tx, ty);
  ty += fruitsTitle.height + gap;
  fruitGrid.setPosition(tx, ty);

  panel.add([shadow, bg, titleText, barWrap, timeText, fruitsTitle, fruitGrid]);

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

  root.add([overlay, panel]);

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

/** Modal — última partida salva localmente */
export async function openLastRunRecapModal(scene, options = {}) {
  return openRunRecapModal(scene, loadLastRunRecap(), {
    ...options,
    title: 'Sua última partida',
  });
}
