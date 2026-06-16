import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale, responsiveWidth } from '../utils/responsive.js';
import { Icon } from './iconify.js';
import { PANEL_CORNER_RADIUS, PANEL_SHADOW_OFFSET } from './settingsUi.js';

export const EGG_STORY_ICONS = {
  egg: Icon.from('mynaui:egg', { color: '#1E6A30', designSize: 32 }),
  leaf: Icon.from('solar:leaf-linear', { color: '#4E9A2E', designSize: 28 }),
  tap: Icon.from('mynaui:mouse-pointer-click', { color: '#1E6A30', designSize: 26 }),
};

export async function preloadEggIcons(scene) {
  await Icon.preload(scene, Object.values(EGG_STORY_ICONS));
}

/** Card — história curta + ícones (sem emoji) */
export function createEggStoryCard(scene, x, y, { nome = 'Lagartinha' } = {}) {
  const s = uiScale(scene);
  const cardW = responsiveWidth(scene, 0.9, 520);
  const padX = Math.round(18 * s);
  const padY = Math.round(14 * s);
  const iconSize = Math.round(44 * s);
  const gap = Math.round(12 * s);
  const r = Math.round(PANEL_CORNER_RADIUS * (cardW / 400));
  const off = Math.round(PANEL_SHADOW_OFFSET * (cardW / 400));

  const title = scene.add.text(0, 0, 'Um ovinho na folha', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(20 * s)}px`,
    color: '#1E6A30',
    fontStyle: 'bold',
  });

  const body = scene.add.text(0, 0, [
    `Numa manhã calma, um ovinho apareceu em cima das folhas.`,
    `${nome} está descansando lá dentro, bem quietinho.`,
    `Toque no ovo com carinho — aos pouquinhos alguém especial vai nascer!`,
  ].join('\n'), {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(15 * s)}px`,
    color: '#3B3024',
    lineSpacing: Math.round(4 * s),
    wordWrap: { width: cardW - padX * 2 - iconSize - gap },
  });

  const hintIcon = scene.add.image(0, 0, EGG_STORY_ICONS.tap.textureKey)
    .setDisplaySize(Math.round(22 * s), Math.round(22 * s));
  const hint = scene.add.text(0, 0, 'Toque no ovo para chocar', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(14 * s)}px`,
    color: '#1E6A30',
    fontStyle: 'bold',
  });

  const textBlockH = title.height + gap * 0.6 + body.height + gap + hint.height;
  const cardH = textBlockH + padY * 2;

  const eggIcon = scene.add.image(0, 0, EGG_STORY_ICONS.egg.textureKey)
    .setDisplaySize(iconSize, iconSize);

  const leafIcon = scene.add.image(0, 0, EGG_STORY_ICONS.leaf.textureKey)
    .setDisplaySize(Math.round(iconSize * 0.55), Math.round(iconSize * 0.55))
    .setAlpha(0.85);

  const card = scene.add.container(x, y).setDepth(20);

  const shadow = scene.add.graphics();
  shadow.fillStyle(Theme.verde, 1);
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
  ty += title.height + gap * 0.6;
  body.setPosition(textX, ty).setOrigin(0, 0);
  ty += body.height + gap;
  hintIcon.setPosition(textX + Math.round(11 * s), ty + hint.height / 2);
  hint.setPosition(textX + Math.round(28 * s), ty).setOrigin(0, 0.5);

  eggIcon.setPosition(iconX, -Math.round(6 * s));
  leafIcon.setPosition(iconX + Math.round(14 * s), Math.round(18 * s));

  card.add([shadow, bg, eggIcon, leafIcon, title, body, hintIcon, hint]);
  return card;
}
