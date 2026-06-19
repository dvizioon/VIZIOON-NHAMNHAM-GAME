import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale, responsiveWidth } from '../utils/responsive.js';
import { Icon } from './iconify.js';
import { PANEL_CORNER_RADIUS, PANEL_SHADOW_OFFSET } from './settingsUi.js';

const COCOON_STORY_TEXT_COLOR = '#490808';

export const COCOON_STORY_ICONS = {
  butterfly: Icon.from('solar:star-bold', { color: '#1E6A30', designSize: 32 }),
  leaf: Icon.from('solar:leaf-linear', { color: '#4E9A2E', designSize: 28 }),
};

export async function preloadCocoonIcons(scene) {
  await Icon.preload(scene, Object.values(COCOON_STORY_ICONS));
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

/** Card — história do casulo */
export function createCocoonStoryCard(scene, x, y, { nome = 'Lagartinha', genero = 'menino' } = {}) {
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
    color: COCOON_STORY_TEXT_COLOR,
    lineSpacing: Math.round(5 * s),
    wordWrap: { width: textW },
  };

  const title = scene.add.text(0, 0, 'Hora da transformação!', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(20 * s)}px`,
    color: COCOON_STORY_TEXT_COLOR,
    fontStyle: 'bold',
    wordWrap: { width: textW },
  });

  const line1 = scene.add.text(
    0,
    0,
    'Depois de comer tantas frutas, a lagartinha fez um casulo no galho.',
    bodyStyle,
  );
  const nameBadge = createChildNameBadge(scene, nome, s, genero);
  const line3 = scene.add.text(
    0,
    0,
    'Toque três vezes no casulo para ajudar a abrir!',
    bodyStyle,
  );

  const textBlockH = title.height
    + gap
    + line1.height
    + gap
    + nameBadge._badgeH
    + gap
    + line3.height;
  const cardH = textBlockH + padY * 2;

  const butterflyIcon = scene.add.image(0, 0, COCOON_STORY_ICONS.butterfly.textureKey)
    .setDisplaySize(iconSize, iconSize);
  const leafIcon = scene.add.image(0, 0, COCOON_STORY_ICONS.leaf.textureKey)
    .setDisplaySize(Math.round(iconSize * 0.55), Math.round(iconSize * 0.55))
    .setAlpha(0.85);

  const card = scene.add.container(x, y).setDepth(30);

  const shadow = scene.add.graphics();
  shadow.fillStyle(shadowColor, 1);
  shadow.fillRoundedRect(-cardW / 2 + off, -cardH / 2 + off, cardW, cardH, r);

  const bg = scene.add.graphics();
  bg.fillStyle(Theme.papel, 1);
  bg.lineStyle(Math.max(3, Math.round(3 * s)), Theme.folhaEscura, 1);
  bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, r);
  bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, r);

  let ty = -cardH / 2 + padY;
  const tx = -cardW / 2 + padX;
  const iconX = cardW / 2 - padX - iconSize / 2;

  title.setPosition(tx, ty);
  ty += title.height + gap;
  line1.setPosition(tx, ty);
  ty += line1.height + gap;
  nameBadge.setPosition(tx, ty);
  ty += nameBadge._badgeH + gap;
  line3.setPosition(tx, ty);

  butterflyIcon.setPosition(iconX, -cardH / 2 + padY + iconSize / 2);
  leafIcon.setPosition(iconX + iconSize * 0.35, -cardH / 2 + padY + iconSize * 0.85);

  card.add([shadow, bg, butterflyIcon, leafIcon, title, line1, nameBadge, line3]);
  return card;
}

export function createCocoonTapHint(scene, x, y) {
  const s = uiScale(scene);
  return scene.add.text(x, y, 'Toque três vezes no casulo', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(17 * s)}px`,
    color: '#FFFFFF',
    fontStyle: 'bold',
    stroke: '#1E6A30',
    strokeThickness: Math.round(4 * s),
  }).setOrigin(0.5).setDepth(32).setAlpha(0.92);
}
