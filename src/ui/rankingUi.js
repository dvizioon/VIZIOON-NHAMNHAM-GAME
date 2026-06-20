import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale } from '../utils/responsive.js';
import { Icon } from './iconify.js';
import { createIconCircleButton } from './splashUi.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { GameApi } from '../services/gameApi.js';
import { GUEST_PLAYER_NAME, UI_USER_JOGADOR_KEY } from './playerNameUi.js';
import { openRunRecapModal } from './runRecapUi.js';
import { PANEL_CORNER_RADIUS, PANEL_SHADOW_OFFSET } from './settingsUi.js';
import { showWarningAlert } from './thematicAlert.js';

const MODAL_DEPTH = 220;

let activeModal = null;

const CLOSE_ICON = Icon.from('solar:close-circle-bold', { designSize: 24, color: '#4E9A2E' });
const TROPHY_ICON = Icon.from('solar:cup-star-bold', { designSize: 28, color: '#FFD54F' });
const EYE_ICON = Icon.from('solar:eye-bold', { designSize: 22, color: '#1E6A30' });

const MEDAL_ICONS = {
  1: Icon.from('solar:medal-ribbons-star-bold', { designSize: 30, color: '#F9A825' }),
  2: Icon.from('solar:medal-ribbon-bold', { designSize: 28, color: '#90A4AE' }),
  3: Icon.from('solar:medal-ribbon-bold', { designSize: 28, color: '#EF6C00' }),
};

function formatRankTime(ms) {
  if (!ms || ms <= 0) return '—';
  const totalSec = Math.max(1, Math.round(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}:${String(sec).padStart(2, '0')}`;
  return `${sec}s`;
}

function createThemedPanel(scene, panelW, panelH, s) {
  const r = Math.round(PANEL_CORNER_RADIUS * (panelW / 420));
  const off = Math.round(PANEL_SHADOW_OFFSET * (panelW / 420));
  const shadow = scene.add.graphics();
  shadow.fillStyle(Theme.folhaEscura, 1);
  shadow.fillRoundedRect(-panelW / 2 + off, -panelH / 2 + off, panelW, panelH, r);

  const bg = scene.add.graphics();
  bg.fillStyle(Theme.papel, 1);
  bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, r);
  bg.lineStyle(Math.max(4, Math.round(4 * s)), Theme.folhaEscura, 1);
  bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, r);

  return { shadow, bg };
}

function createPlayerAvatar(scene, x, y, size, { highlight = false } = {}) {
  const wrap = scene.add.container(x, y);
  const ring = scene.add.graphics();
  ring.fillStyle(0xffffff, 1);
  ring.fillCircle(0, 0, size / 2 + 2);
  ring.lineStyle(highlight ? 3 : 2, highlight ? Theme.folhaEscura : 0xD8C9A8, 1);
  ring.strokeCircle(0, 0, size / 2 + 2);

  if (scene.textures.exists(UI_USER_JOGADOR_KEY)) {
    const face = scene.add.image(0, 0, UI_USER_JOGADOR_KEY)
      .setDisplaySize(size, size)
      .setOrigin(0.5);
    wrap.add([ring, face]);
  } else {
    wrap.add(ring);
  }
  return wrap;
}

function createRankBadge(scene, x, y, rank, s) {
  const medal = MEDAL_ICONS[rank];
  if (medal && scene.textures.exists(medal.textureKey)) {
    const size = Math.round(30 * s);
    const icon = scene.add.image(0, 0, medal.textureKey)
      .setDisplaySize(size, size)
      .setOrigin(0.5);
    return scene.add.container(x, y, [icon]);
  }

  const size = Math.round(24 * s);
  const g = scene.add.graphics();
  g.fillStyle(0xE8DCC8, 1);
  g.fillCircle(0, 0, size / 2);
  g.lineStyle(2, Theme.folhaEscura, 0.35);
  g.strokeCircle(0, 0, size / 2);
  const label = scene.add.text(0, 0, `${rank}º`, {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(12 * s)}px`,
    color: '#490808',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  return scene.add.container(x, y, [g, label]);
}

function createRowEyeButton(scene, x, y, s, onClick) {
  const size = Math.round(34 * s);
  const bg = scene.add.graphics();
  bg.fillStyle(0xffffff, 1);
  bg.fillCircle(0, 0, size / 2);
  bg.lineStyle(2, Theme.folhaEscura, 1);
  bg.strokeCircle(0, 0, size / 2);
  const icon = scene.add.image(0, 0, EYE_ICON.textureKey)
    .setDisplaySize(Math.round(18 * s), Math.round(18 * s))
    .setOrigin(0.5);
  const btn = scene.add.container(x, y, [bg, icon]);
  btn.setSize(size, size);
  btn.setInteractive({ useHandCursor: true });
  btn.on('pointerup', () => {
    playSound(scene, 'clique');
    onClick?.();
  });
  return btn;
}

function createScrollableList(scene, panel, { x, y, width, height }) {
  const maskGfx = scene.add.graphics();
  maskGfx.fillStyle(0xffffff, 1);
  maskGfx.fillRect(x, y, width, height);
  panel.add(maskGfx);
  const mask = maskGfx.createGeometryMask();

  const scrollRoot = scene.add.container(x, y);
  const content = scene.add.container(0, 0);
  scrollRoot.add(content);
  scrollRoot.setMask(mask);
  panel.add(scrollRoot);

  const listBg = scene.add.graphics();
  listBg.fillStyle(0xF3EBD4, 0.55);
  listBg.fillRoundedRect(x, y, width, height, 14);
  listBg.lineStyle(2, Theme.folhaEscura, 0.2);
  listBg.strokeRoundedRect(x, y, width, height, 14);
  panel.add(listBg);
  panel.sendToBack(listBg);
  panel.sendToBack(maskGfx);

  let offset = 0;
  let maxOffset = 0;
  let dragging = false;
  let dragStartY = 0;
  let dragStartOffset = 0;

  const hitZone = scene.add.zone(x + width / 2, y + height / 2, width, height)
    .setInteractive({ useHandCursor: true });
  panel.add(hitZone);

  const setOffset = (next) => {
    offset = Phaser.Math.Clamp(next, 0, maxOffset);
    content.y = -offset;
  };

  const wheelHandler = (pointer, _dx, dy) => {
    if (maxOffset <= 0) return;
    const bounds = hitZone.getBounds();
    if (!bounds.contains(pointer.x, pointer.y)) return;
    setOffset(offset + dy * 0.5);
  };

  hitZone.on('pointerdown', (p) => {
    dragging = true;
    dragStartY = p.y;
    dragStartOffset = offset;
  });

  const pointerUp = () => { dragging = false; };
  const pointerMove = (p) => {
    if (!dragging || !p.isDown || maxOffset <= 0) return;
    setOffset(dragStartOffset - (p.y - dragStartY));
  };

  scene.input.on('pointerup', pointerUp);
  scene.input.on('pointermove', pointerMove);
  scene.input.on('wheel', wheelHandler);

  return {
    content,
    setContentHeight(h) {
      maxOffset = Math.max(0, h - height);
      setOffset(offset);
    },
    destroy() {
      scene.input.off('pointerup', pointerUp);
      scene.input.off('pointermove', pointerMove);
      scene.input.off('wheel', wheelHandler);
      hitZone.destroy();
      maskGfx.destroy();
      listBg.destroy();
      scrollRoot.destroy();
    },
  };
}

function createRankingRow(scene, {
  width, rowH, rank, entry, isYou, s, bodySize, smallSize, sessionToken,
}) {
  const row = scene.add.container(0, 0);
  const pad = Math.round(10 * s);
  const innerW = width;
  const innerH = rowH;

  const bg = scene.add.graphics();
  bg.fillStyle(isYou ? 0xE2F4D3 : 0xFFFDF6, 1);
  bg.fillRoundedRect(0, 0, innerW, innerH, 12);
  bg.lineStyle(isYou ? 3 : 2, isYou ? Theme.folhaEscura : 0xD8C9A8, isYou ? 1 : 0.85);
  bg.strokeRoundedRect(0, 0, innerW, innerH, 12);
  row.add(bg);

  const rankX = pad + Math.round(16 * s);
  const avatarX = pad + Math.round(48 * s);
  const avatarSize = Math.round(34 * s);
  const textX = pad + Math.round(82 * s);
  const eyeSize = isYou ? Math.round(36 * s) : 0;
  const timeColW = Math.round(54 * s);
  const rightPad = pad;
  const eyeX = innerW - rightPad - eyeSize / 2;
  const timeX = innerW - rightPad - eyeSize - timeColW / 2 - Math.round(4 * s);
  const maxNameW = timeX - timeColW / 2 - textX - Math.round(8 * s);

  const rankBadge = createRankBadge(scene, rankX, innerH / 2, rank, s);
  const avatar = createPlayerAvatar(scene, avatarX, innerH / 2, avatarSize, { highlight: isYou });

  const nameColor = isYou ? '#1E6A30' : '#3B3024';
  const nameText = scene.add.text(textX, innerH / 2 - Math.round(9 * s), entry.displayName, {
    fontFamily: Theme.fontFamily,
    fontSize: `${bodySize}px`,
    color: nameColor,
    fontStyle: isYou ? 'bold' : 'normal',
  }).setOrigin(0, 0.5);

  if (nameText.width > maxNameW) {
    let trimmed = entry.displayName;
    while (trimmed.length > 1 && nameText.setText(`${trimmed}…`), nameText.width > maxNameW) {
      trimmed = trimmed.slice(0, -1);
    }
  }

  const personText = scene.add.text(textX, innerH / 2 + Math.round(11 * s), entry.personName ?? '', {
    fontFamily: Theme.fontFamily,
    fontSize: `${smallSize}px`,
    color: '#8A7355',
  }).setOrigin(0, 0.5);

  if (personText.width > maxNameW) {
    let trimmed = entry.personName ?? '';
    while (trimmed.length > 1 && personText.setText(`${trimmed}…`), personText.width > maxNameW) {
      trimmed = trimmed.slice(0, -1);
    }
  }

  const timeLabel = scene.add.text(timeX, innerH / 2 - Math.round(7 * s), formatRankTime(entry.bestDurationMs), {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.max(15, Math.round(16 * s))}px`,
    color: isYou ? '#1E6A30' : '#4E9A2E',
    fontStyle: 'bold',
  }).setOrigin(0.5, 0.5);

  const timeHint = scene.add.text(timeX, innerH / 2 + Math.round(11 * s), 'tempo', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(10 * s)}px`,
    color: '#8A7355',
  }).setOrigin(0.5, 0.5);

  row.add([rankBadge, avatar, nameText, personText, timeLabel, timeHint]);

  if (isYou && entry.scoreId && sessionToken) {
    const eyeBtn = createRowEyeButton(scene, eyeX, innerH / 2, s, async () => {
      try {
        const data = await GameApi.fetchScoreFruits(sessionToken, entry.scoreId);
        await openRunRecapModal(scene, {
          points: data?.points ?? entry.bestScore,
          durationMs: data?.durationMs ?? entry.bestDurationMs,
          fruitCounts: data?.fruitCounts ?? {},
        }, { title: 'Frutas que você comeu' });
      } catch {
        showWarningAlert(scene, 'Não foi possível carregar as frutas desta partida.\nJogue de novo até o casulo!');
      }
    });
    row.add(eyeBtn);
  }

  return row;
}

/** Modal de ranking — menor tempo no topo; olho só na sua linha */
export async function openRankingModal(scene, { onClose } = {}) {
  activeModal?.close?.();
  activeModal = null;

  const { width, height } = scene.scale;
  const s = uiScale(scene);
  await Icon.preload(scene, [CLOSE_ICON, TROPHY_ICON, EYE_ICON, ...Object.values(MEDAL_ICONS)]);
  if (!scene.sys.isActive()) return { close: () => {} };

  const playerLabel = GameState.getRankingDisplayName(scene);
  const canAppear = GameState.canAppearInRanking(scene);
  const session = GameState.getPlayerSession(scene);
  const sessionToken = session?.sessionToken ?? null;
  const currentUserId = session?.userId ?? session?.id ?? null;

  const panelW = Math.min(Math.round(width * 0.94), 430);
  const panelH = Math.min(Math.round(height * 0.86), Math.round(height * 0.8));
  const cx = width / 2;
  const cy = height * 0.48;
  const root = scene.add.container(0, 0).setDepth(MODAL_DEPTH);

  const overlay = scene.add.rectangle(cx, height / 2, width, height, 0x061018, 0.72);
  overlay.setInteractive();
  overlay.on('pointerup', () => close());

  const panel = scene.add.container(cx, cy);
  const themed = createThemedPanel(scene, panelW, panelH, s);
  panel.add([themed.shadow, themed.bg]);
  panel.setInteractive(
    new Phaser.Geom.Rectangle(-panelW / 2, -panelH / 2, panelW, panelH),
    Phaser.Geom.Rectangle.Contains,
  );

  const titleSize = Math.max(22, Math.round(26 * s));
  const bodySize = Math.max(14, Math.round(15 * s));
  const smallSize = Math.max(12, Math.round(13 * s));
  const padX = Math.round(18 * s);
  let y = -panelH / 2 + Math.round(18 * s);

  const titleText = 'Ranking NhocNhoc';
  const title = scene.add.text(0, 0, titleText, {
    fontFamily: Theme.fontFamily,
    fontSize: `${titleSize}px`,
    color: '#1E6A30',
    fontStyle: 'bold',
  }).setOrigin(0, 0);

  const trophySize = Math.round(30 * s);
  const titleGap = Math.round(10 * s);
  const rowW = trophySize + titleGap + title.width;
  const titleRow = scene.add.container(0, y);
  const trophy = scene.add.image(-rowW / 2 + trophySize / 2, title.height / 2, TROPHY_ICON.textureKey)
    .setDisplaySize(trophySize, trophySize)
    .setOrigin(0.5);
  title.setPosition(-rowW / 2 + trophySize + titleGap, 0);
  titleRow.add([trophy, title]);
  panel.add(titleRow);
  y += title.height + 4;

  const subtitle = scene.add.text(0, y, 'Quem come mais rápido fica em 1º!', {
    fontFamily: Theme.fontFamily,
    fontSize: `${smallSize}px`,
    color: '#6B4226',
    fontStyle: 'bold',
  }).setOrigin(0.5, 0);
  panel.add(subtitle);
  y += subtitle.height + Math.round(10 * s);

  if (playerLabel) {
    const chipW = Math.min(panelW - padX * 2, Math.round(280 * s));
    const chipH = Math.round(30 * s);
    const youChip = scene.add.graphics();
    youChip.fillStyle(0xE2F4D3, 1);
    youChip.fillRoundedRect(-chipW / 2, y, chipW, chipH, chipH / 2);
    youChip.lineStyle(2, Theme.folhaEscura, 0.5);
    youChip.strokeRoundedRect(-chipW / 2, y, chipW, chipH, chipH / 2);
    panel.add(youChip);

    const youLine = scene.add.text(0, y + chipH / 2, `Você: ${playerLabel}`, {
      fontFamily: Theme.fontFamily,
      fontSize: `${Math.max(14, Math.round(16 * s))}px`,
      color: '#1E6A30',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    panel.add(youLine);
    y += chipH + Math.round(8 * s);

    if (!canAppear) {
      const guestHint = scene.add.text(
        0,
        y,
        `Como ${GUEST_PLAYER_NAME}, você não entra no ranking.\nCrie uma conta para aparecer aqui.`,
        {
          fontFamily: Theme.fontFamily,
          fontSize: `${smallSize}px`,
          color: '#6B4226',
          align: 'center',
          lineSpacing: 4,
        },
      ).setOrigin(0.5, 0);
      panel.add(guestHint);
      y += guestHint.height + 8;
    }
  }

  const listTop = y + Math.round(10 * s);
  const listBottom = panelH / 2 - Math.round(18 * s);
  const listH = Math.max(Math.round(140 * s), listBottom - listTop);
  const listX = -panelW / 2 + padX;
  const listW = panelW - padX * 2;

  const scroll = createScrollableList(scene, panel, {
    x: listX,
    y: listTop,
    width: listW,
    height: listH,
  });

  const statusText = scene.add.text(listW / 2, listH / 2, 'Carregando…', {
    fontFamily: Theme.fontFamily,
    fontSize: `${bodySize}px`,
    color: '#6B4226',
  }).setOrigin(0.5);
  scroll.content.add(statusText);

  const closeBtnSize = Math.round(44 * s);
  const closeInset = Math.round(20 * s);
  const closeBtn = createIconCircleButton(
    scene,
    panelW / 2 - closeInset - closeBtnSize * 0.5,
    -panelH / 2 + closeInset + closeBtnSize * 0.5,
    CLOSE_ICON,
    {
      size: closeBtnSize,
      iconSize: 22,
      absoluteSize: true,
      depth: MODAL_DEPTH + 2,
      onClick: () => close(),
    },
  );
  panel.add(closeBtn);

  root.add([overlay, panel]);

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    if (activeModal?.close === close) activeModal = null;
    playSound(scene, 'clique');
    scroll.destroy();
    closeBtn?.destroy();
    root.destroy();
    onClose?.();
  }

  activeModal = { close };
  scene.events.once('shutdown', () => {
    if (activeModal?.close === close) activeModal = null;
    close();
  });

  if (GameApi.isEnabled()) {
    try {
      const entries = await GameApi.fetchRanking(30);
      if (!closed) renderEntries(entries);
    } catch {
      if (!closed) {
        scroll.content.removeAll(true);
        scroll.content.add(
          scene.add.text(listW / 2, listH / 2, 'Não foi possível carregar o ranking.', {
            fontFamily: Theme.fontFamily,
            fontSize: `${bodySize}px`,
            color: '#6B4226',
          }).setOrigin(0.5),
        );
      }
    }
  } else if (!closed) {
    scroll.content.removeAll(true);
    scroll.content.add(
      scene.add.text(listW / 2, listH / 2, 'Ranking indisponível offline.', {
        fontFamily: Theme.fontFamily,
        fontSize: `${bodySize}px`,
        color: '#6B4226',
      }).setOrigin(0.5),
    );
  }

  function renderEntries(entries) {
    scroll.content.removeAll(true);

    if (!entries?.length) {
      scroll.content.add(
        scene.add.text(listW / 2, listH / 2, 'Ninguém no pódio ainda.\nComplete 100 pontos com uma conta!', {
          fontFamily: Theme.fontFamily,
          fontSize: `${bodySize}px`,
          color: '#6B4226',
          align: 'center',
          lineSpacing: 5,
        }).setOrigin(0.5),
      );
      scroll.setContentHeight(listH);
      return;
    }

    const rowH = Math.max(56, Math.round(60 * s));
    const rowGap = Math.round(8 * s);
    let rowY = 0;

    entries.forEach((entry, index) => {
      const isYou = Boolean(currentUserId && entry.userId === currentUserId);
      const rank = index + 1;
      const row = createRankingRow(scene, {
        width: listW,
        rowH,
        rank,
        entry,
        isYou,
        s,
        bodySize,
        smallSize,
        sessionToken,
      });
      row.setPosition(0, rowY);
      scroll.content.add(row);
      rowY += rowH + rowGap;
    });

    scroll.setContentHeight(rowY);
  }

  return { close };
}
