import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale, responsiveWidth } from '../utils/responsive.js';
import { Icon } from './iconify.js';
import { PANEL_CORNER_RADIUS, PANEL_SHADOW_OFFSET } from './settingsUi.js';
import { startStoryCardIconAnim } from './storyCardUi.js';

const EGG_STORY_TEXT_COLOR = '#490808';

export const EGG_STORY_ICONS = {
  egg: Icon.from('mynaui:egg', { color: '#1E6A30', designSize: 32 }),
  leaf: Icon.from('solar:leaf-linear', { color: '#4E9A2E', designSize: 28 }),
};

export async function preloadEggIcons(scene) {
  await Icon.preload(scene, Object.values(EGG_STORY_ICONS));
}

function createChildNameBadge(scene, nome, s, genero = 'menino') {
  const fontSize = Math.round(15 * s);
  const padX = Math.round(10 * s);
  const padY = Math.round(4 * s);
  const badgeColor = genero === 'menina' ? 0xd85a96 : Theme.folhaEscura;
  const label = scene.add.text(padX, padY, nome, {
    fontFamily: Theme.fontFamily,
    fontSize: `${fontSize}px`,
    color: '#FFFFFF',
    fontStyle: 'bold',
  }).setOrigin(0, 0);

  const bw = label.width + padX * 2;
  const bh = label.height + padY * 2;
  const bg = scene.add.graphics();
  bg.fillStyle(badgeColor, 1);
  bg.fillRoundedRect(0, 0, bw, bh, Math.round(bh / 2));

  const badge = scene.add.container(0, 0, [bg, label]);
  badge._badgeW = bw;
  badge._badgeH = bh;
  return badge;
}

/** Card — história curta + ícones (sem emoji) */
export function createEggStoryCard(scene, x, y, { nome = 'Lagartinha', genero = 'menino' } = {}) {
  const s = uiScale(scene);
  const isMenina = genero === 'menina';
  const cardW = responsiveWidth(scene, 0.9, 520);
  const padX = Math.round(18 * s);
  const padY = Math.round(14 * s);
  const iconSize = Math.round(44 * s);
  const gap = Math.round(10 * s);
  const textW = cardW - padX * 2 - iconSize - gap;
  const r = Math.round(PANEL_CORNER_RADIUS * (cardW / 400));
  const off = Math.round(PANEL_SHADOW_OFFSET * (cardW / 400));
  const shadowColor = isMenina ? Theme.rosa : Theme.verde;

  const bodyStyle = {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(15 * s)}px`,
    color: EGG_STORY_TEXT_COLOR,
    lineSpacing: Math.round(5 * s),
    wordWrap: { width: textW },
  };

  const title = scene.add.text(0, 0, 'Um ovinho na folha', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(20 * s)}px`,
    color: EGG_STORY_TEXT_COLOR,
    fontStyle: 'bold',
    wordWrap: { width: textW },
  });

  const line1 = scene.add.text(
    0,
    0,
    'Numa manhã calma, um ovinho apareceu em cima das folhas.',
    bodyStyle,
  );
  const nameBadge = createChildNameBadge(scene, nome, s, genero);
  const line2 = scene.add.text(
    0,
    0,
    'Está descansando lá dentro, bem quietinho.',
    bodyStyle,
  );
  const line3 = scene.add.text(
    0,
    0,
    'Toque no ovo com carinho. Aos pouquinhos alguém especial vai nascer!',
    bodyStyle,
  );

  const textBlockH = title.height
    + gap
    + line1.height
    + gap
    + nameBadge._badgeH
    + gap * 0.7
    + line2.height
    + gap
    + line3.height;
  const cardH = textBlockH + padY * 2;

  const eggIcon = scene.add.image(0, 0, EGG_STORY_ICONS.egg.textureKey)
    .setDisplaySize(iconSize, iconSize);
  const leafIcon = scene.add.image(0, 0, EGG_STORY_ICONS.leaf.textureKey)
    .setDisplaySize(Math.round(iconSize * 0.55), Math.round(iconSize * 0.55))
    .setAlpha(0.85);

  const card = scene.add.container(x, y).setDepth(12);

  const shadow = scene.add.graphics();
  shadow.fillStyle(shadowColor, 1);
  shadow.fillRoundedRect(-cardW / 2 + off, -cardH / 2 + off, cardW, cardH, r);

  const bg = scene.add.graphics();
  bg.fillStyle(Theme.papel, 1);
  bg.lineStyle(Math.max(3, Math.round(3 * s)), Theme.folhaEscura, 1);
  bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, r);
  bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, r);

  const iconX = -cardW / 2 + padX + iconSize / 2;
  const textX = -cardW / 2 + padX + iconSize + gap;
  let ty = -textBlockH / 2;

  title.setPosition(textX, ty).setOrigin(0, 0);
  ty += title.height + gap;
  line1.setPosition(textX, ty).setOrigin(0, 0);
  ty += line1.height + gap;
  nameBadge.setPosition(textX, ty);
  ty += nameBadge._badgeH + gap * 0.7;
  line2.setPosition(textX, ty).setOrigin(0, 0);
  ty += line2.height + gap;
  line3.setPosition(textX, ty).setOrigin(0, 0);

  eggIcon.setPosition(iconX, -Math.round(4 * s));
  leafIcon.setPosition(iconX + Math.round(14 * s), Math.round(20 * s));

  card.add([shadow, bg, eggIcon, leafIcon, title, line1, nameBadge, line2, line3]);
  startStoryCardIconAnim(scene, eggIcon, leafIcon);
  return card;
}
