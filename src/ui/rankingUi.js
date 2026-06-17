import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale } from '../utils/responsive.js';
import { Icon } from './iconify.js';
import { createIconCircleButton } from './splashUi.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { GameApi } from '../services/gameApi.js';
import { GUEST_PLAYER_NAME } from './playerNameUi.js';

const MODAL_DEPTH = 220;
const CLOSE_ICON = Icon.from('solar:close-circle-bold', { designSize: 24, color: '#4E9A2E' });

function formatScore(points) {
  return Number(points ?? 0).toLocaleString('pt-BR');
}

/** Modal de ranking — contas registradas na lista; visitante vê o nome "Visitante" */
export async function openRankingModal(scene, { onClose } = {}) {
  const { width, height } = scene.scale;
  const s = uiScale(scene);
  await Icon.preload(scene, [CLOSE_ICON]);

  const playerLabel = GameState.getRankingDisplayName(scene);
  const canAppear = GameState.canAppearInRanking(scene);
  const session = GameState.getPlayerSession(scene);
  const currentUserId = session?.userId ?? session?.id ?? null;

  const panelW = Math.min(Math.round(width * 0.92), 400);
  const panelH = Math.min(height * 0.78, Math.round(height * 0.68));
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
  const bodySize = Math.max(14, Math.round(16 * s));
  const smallSize = Math.max(13, Math.round(15 * s));
  const labelColor = '#4E9A2E';
  const padX = 18;
  let y = -panelH / 2 + 22;

  const title = scene.add.text(0, y, 'Ranking', {
    fontFamily: Theme.fontFamily,
    fontSize: `${titleSize}px`,
    color: labelColor,
    fontStyle: 'bold',
  }).setOrigin(0.5, 0);
  panel.add(title);
  y += title.height + 10;

  if (playerLabel) {
    const youLine = scene.add.text(0, y, `Você: ${playerLabel}`, {
      fontFamily: Theme.fontFamily,
      fontSize: `${Math.max(16, Math.round(18 * s))}px`,
      color: '#3B3024',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    panel.add(youLine);
    y += youLine.height + 6;

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
      y += guestHint.height + 12;
    } else {
      y += 6;
    }
  }

  const listTop = y;
  const listBottom = panelH / 2 - 20;
  const listH = listBottom - listTop;

  const listContainer = scene.add.container(0, 0);
  panel.add(listContainer);

  const statusText = scene.add.text(0, listTop + listH / 2 - 10, 'Carregando…', {
    fontFamily: Theme.fontFamily,
    fontSize: `${bodySize}px`,
    color: '#6B4226',
  }).setOrigin(0.5);
  listContainer.add(statusText);

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

  renderEntries([]);

  if (GameApi.isEnabled()) {
    try {
      const entries = await GameApi.fetchRanking(20);
      if (!closed) renderEntries(entries);
    } catch {
      if (!closed) {
        statusText.setText('Não foi possível carregar o ranking.');
      }
    }
  } else if (!closed) {
    statusText.setText('Ranking indisponível offline.');
  }

  function renderEntries(entries) {
    listContainer.removeAll(true);

    if (!entries?.length) {
      listContainer.add(
        scene.add.text(0, listTop + listH / 2 - 10, 'Nenhuma pontuação ainda.\nJogue com uma conta!', {
          fontFamily: Theme.fontFamily,
          fontSize: `${bodySize}px`,
          color: '#6B4226',
          align: 'center',
          lineSpacing: 5,
        }).setOrigin(0.5),
      );
      return;
    }

    const rowH = Math.max(34, Math.round(38 * s));
    const colRank = -panelW / 2 + padX + 8;
    const colName = colRank + 34;
    const colScore = panelW / 2 - padX - 8;
    let rowY = listTop + 4;

    entries.forEach((entry, index) => {
      const isYou = Boolean(currentUserId && entry.userId === currentUserId);
      const rank = index + 1;
      const nameColor = isYou ? '#1E6A30' : '#3B3024';
      const scoreColor = isYou ? '#4E9A2E' : '#6B4226';

      const rankText = scene.add.text(colRank, rowY, `${rank}º`, {
        fontFamily: Theme.fontFamily,
        fontSize: `${bodySize}px`,
        color: nameColor,
        fontStyle: 'bold',
      }).setOrigin(0, 0);

      const nameText = scene.add.text(colName, rowY, entry.displayName, {
        fontFamily: Theme.fontFamily,
        fontSize: `${bodySize}px`,
        color: nameColor,
        fontStyle: isYou ? 'bold' : 'normal',
      }).setOrigin(0, 0);

      const maxNameW = colScore - colName - 70;
      if (nameText.width > maxNameW) {
        let trimmed = entry.displayName;
        while (trimmed.length > 1 && nameText.setText(`${trimmed}…`), nameText.width > maxNameW) {
          trimmed = trimmed.slice(0, -1);
        }
      }

      const personText = scene.add.text(colName, rowY + nameText.height + 2, entry.personName ?? '', {
        fontFamily: Theme.fontFamily,
        fontSize: `${smallSize}px`,
        color: '#8A7355',
      }).setOrigin(0, 0);

      const scoreText = scene.add.text(colScore, rowY + 6, formatScore(entry.bestScore), {
        fontFamily: Theme.fontFamily,
        fontSize: `${bodySize}px`,
        color: scoreColor,
        fontStyle: 'bold',
      }).setOrigin(1, 0);

      listContainer.add([rankText, nameText, personText, scoreText]);
      rowY += rowH;
    });
  }

  return { close };
}
