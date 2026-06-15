import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale } from '../utils/responsive.js';
import { hasTexture } from '../systems/AssetLoader.js';

/** Botão estilo folha — reutilizado em todas as telas */
export function createButton(scene, x, y, label, { color = Theme.verde, onClick, width = 280, fontSize = 28 } = {}) {
  const dark = color === Theme.verde ? Theme.folhaEscura : 0xD85A96;
  const container = scene.add.container(x, y);

  const bg = scene.add.graphics();
  const draw = (pressed = false) => {
    bg.clear();
    const offset = pressed ? 5 : 0;
    bg.fillStyle(dark, 1);
    bg.fillRoundedRect(-width / 2, -28 + offset, width, 56, 28);
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-width / 2, -28, width, 56 - offset, 28);
  };
  draw();

  const text = scene.add.text(0, -2, label, {
    fontFamily: Theme.fontFamily,
    fontSize: `${fontSize}px`,
    color: '#ffffff',
    fontStyle: 'bold',
  }).setOrigin(0.5);

  container.add([bg, text]);
  container.setSize(width, 56);
  container.setInteractive({ useHandCursor: true });

  container.on('pointerdown', () => draw(true));
  container.on('pointerup', () => {
    draw(false);
    onClick?.();
  });
  container.on('pointerout', () => draw(false));

  return container;
}

/** Balão de fala temático */
export function createSpeechBubble(scene, x, y, message, maxWidth = 560) {
  const padding = { x: 20, y: 14 };
  const fontSize = Math.max(16, Math.round(21 * uiScale(scene)));
  const text = scene.add.text(0, 0, message, {
    fontFamily: Theme.fontFamily,
    fontSize: `${fontSize}px`,
    color: '#3B3024',
    wordWrap: { width: maxWidth - padding.x * 2 },
    align: 'center',
  }).setOrigin(0.5);

  const w = Math.min(maxWidth, text.width + padding.x * 2);
  const h = text.height + padding.y * 2;

  const bg = scene.add.graphics();
  bg.fillStyle(Theme.papel, 1);
  bg.lineStyle(4, Theme.texto, 1);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, 24);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 24);

  return scene.add.container(x, y, [bg, text]);
}

/** Título com sombra */
export function createTitle(scene, x, y, text, size = 52) {
  return scene.add.text(x, y, text, {
    fontFamily: Theme.fontFamily,
    fontSize: `${size}px`,
    color: '#4E9A2E',
    fontStyle: 'bold',
    align: 'center',
    stroke: '#ffffff',
    strokeThickness: 6,
  }).setOrigin(0.5);
}

/** Fundo 1280×720 — céu + grama/chão em camadas */
export const BACKGROUND_KEY = 'env_background';
export const GROUND_KEY = 'env_ground';
export const DEPTH_SKY = -100;
export const DEPTH_CLOUD = -50;
export const DEPTH_FRUIT = 5;
export const DEPTH_GROUND_FG = 12;
export const DEPTH_CATERPILLAR = 20;
export const DESIGN_SIZE = { width: 1280, height: 720, groundY: 694, grassTopY: 580 };

export function drawSkyBackground(scene) {
  const { width, height } = scene.scale;

  if (hasTexture(scene, BACKGROUND_KEY)) {
    scene.add.image(width / 2, height / 2, BACKGROUND_KEY)
      .setDepth(DEPTH_SKY)
      .setScrollFactor(0)
      .setDisplaySize(width, height);
  } else {
    const g = scene.add.graphics().setDepth(DEPTH_SKY);
    g.fillGradientStyle(Theme.ceuClaro, Theme.ceuClaro, Theme.ceu, Theme.ceu, 1);
    g.fillRect(0, 0, width, height);
  }

  drawGroundForeground(scene);
  return null;
}

/** Grama + chão — na frente das frutas, atrás da lagarta */
export function drawGroundForeground(scene, depth = DEPTH_GROUND_FG) {
  const { width, height } = scene.scale;

  if (!hasTexture(scene, GROUND_KEY)) return null;

  return scene.add.image(width / 2, height / 2, GROUND_KEY)
    .setDepth(depth)
    .setScrollFactor(0)
    .setDisplaySize(width, height);
}

/** Linha do chão — pés da lagarta */
export function getGroundY(scene) {
  const h = scene.scale.height;
  return (DESIGN_SIZE.groundY / DESIGN_SIZE.height) * h;
}

/** Topo da grama — frutas somem ao passar por trás */
export function getGrassTopY(scene) {
  const h = scene.scale.height;
  return (DESIGN_SIZE.grassTopY / DESIGN_SIZE.height) * h;
}

/** Botão voltar — canto superior esquerdo */
export function createBackButton(scene, onClick) {
  return createButton(scene, 90, 48, '← Voltar', {
    width: 160,
    fontSize: 20,
    onClick,
  }).setDepth(200);
}

/** Ícone de configurações */
export function createSettingsButton(scene, onClick) {
  const pad = Math.max(36, Math.round(48 * uiScale(scene)));
  const btn = scene.add.container(scene.scale.width - pad, pad).setDepth(200);
  const r = Math.max(24, Math.round(32 * uiScale(scene)));
  const bg = scene.add.graphics();
  bg.fillStyle(Theme.papel, 1);
  bg.lineStyle(3, Theme.folhaEscura, 1);
  bg.fillCircle(0, 0, r);
  bg.strokeCircle(0, 0, r);
  const icon = scene.add.graphics();
  icon.lineStyle(2.5, Theme.folhaEscura, 1);
  icon.strokeCircle(0, 0, 10);
  icon.lineBetween(-5, 0, 5, 0);
  icon.lineBetween(0, -5, 0, 5);
  icon.lineBetween(-3.5, -3.5, 3.5, 3.5);
  icon.lineBetween(3.5, -3.5, -3.5, 3.5);
  btn.add([bg, icon]);
  btn.setSize(64, 64);
  btn.setInteractive({ useHandCursor: true });
  btn.on('pointerup', onClick);
  return btn;
}

/** Card de personagem — visual infantil com foto da turminha */
export function createCharacterCard(scene, x, y, crianca, avatarKey) {
  const cardW = 220;
  const cardH = 280;
  const isGirl = crianca.genero === 'menina';
  const accent = isGirl ? Theme.rosa : Theme.verde;
  const accentDark = isGirl ? 0xD85A96 : Theme.folhaEscura;
  const faceBg = isGirl ? 0xFFE3F0 : 0xE8F5DC;

  const card = scene.add.container(x, y);
  card._cardW = cardW;

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.12);
  shadow.fillRoundedRect(-cardW / 2 + 6, -cardH / 2 + 8, cardW, cardH, 28);

  const bg = scene.add.graphics();
  const drawBg = (selected = false) => {
    bg.clear();
    bg.fillStyle(Theme.papel, 1);
    bg.lineStyle(selected ? 6 : 4, selected ? Theme.sol : Theme.texto, 1);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 28);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 28);
    if (selected) {
      bg.lineStyle(3, accent, 0.5);
      bg.strokeRoundedRect(-cardW / 2 - 4, -cardH / 2 - 4, cardW + 8, cardH + 8, 32);
    }
  };
  drawBg(false);
  card._drawBg = drawBg;

  const ring = scene.add.graphics();
  ring.fillStyle(faceBg, 1);
  ring.lineStyle(5, accent, 1);
  ring.fillCircle(0, -30, 62);
  ring.strokeCircle(0, -30, 62);

  let face;
  if (avatarKey && scene.textures.exists(avatarKey)) {
    face = scene.add.image(0, -30, avatarKey).setDisplaySize(110, 110);
  } else {
    face = scene.add.text(0, -30, '🙂', { fontSize: '56px' }).setOrigin(0.5);
  }

  const badge = scene.add.graphics();
  badge.fillStyle(accent, 1);
  badge.fillRoundedRect(-70, 48, 140, 36, 18);
  const nameText = scene.add.text(0, 66, crianca.nome, {
    fontFamily: Theme.fontFamily,
    fontSize: '22px',
    color: '#ffffff',
    fontStyle: 'bold',
  }).setOrigin(0.5);

  const tag = scene.add.text(0, 108, isGirl ? '🌸 Menina' : '🌿 Menino', {
    fontFamily: Theme.fontFamily,
    fontSize: '16px',
    color: accentDark,
    fontStyle: 'bold',
  }).setOrigin(0.5);

  const leafDeco = scene.add.text(-cardW / 2 + 20, -cardH / 2 + 24, '🍃', { fontSize: '22px' });
  const leafDeco2 = scene.add.text(cardW / 2 - 36, cardH / 2 - 36, '🍃', { fontSize: '18px' });

  card.add([shadow, bg, ring, face, badge, nameText, tag, leafDeco, leafDeco2]);
  card.setSize(cardW, cardH);
  card.setInteractive({ useHandCursor: true });

  card.setSelected = (sel) => {
    drawBg(sel);
    scene.tweens.add({
      targets: card,
      scale: sel ? 1.06 : 1,
      duration: 180,
      ease: 'Back.easeOut',
    });
  };

  return card;
}

/** Slider temático de volume */
export function createVolumeSlider(scene, x, y, label, initial, onChange) {
  const container = scene.add.container(x, y);
  const trackW = 320;

  const title = scene.add.text(-trackW / 2, -28, label, {
    fontFamily: Theme.fontFamily,
    fontSize: '20px',
    color: '#3B3024',
    fontStyle: 'bold',
  });

  const track = scene.add.graphics();
  const fill = scene.add.graphics();
  const knob = scene.add.graphics();

  let value = initial;

  const redraw = () => {
    track.clear();
    track.fillStyle(0xE8F5DC, 1);
    track.lineStyle(3, Theme.folhaEscura, 1);
    track.fillRoundedRect(-trackW / 2, 0, trackW, 20, 10);
    track.strokeRoundedRect(-trackW / 2, 0, trackW, 20, 10);

    fill.clear();
    fill.fillStyle(Theme.verde, 1);
    fill.fillRoundedRect(-trackW / 2, 0, trackW * value, 20, 10);

    const kx = -trackW / 2 + trackW * value;
    knob.clear();
    knob.fillStyle(Theme.sol, 1);
    knob.lineStyle(3, Theme.texto, 1);
    knob.fillCircle(kx, 10, 16);
    knob.strokeCircle(kx, 10, 16);
  };

  redraw();

  const zone = scene.add.zone(0, 10, trackW, 40).setInteractive({ useHandCursor: true });
  zone.on('pointerdown', (p) => update(p.x - x));
  zone.on('pointermove', (p) => {
    if (p.isDown) update(p.x - x);
  });

  function update(localX) {
    value = Phaser.Math.Clamp((localX + trackW / 2) / trackW, 0, 1);
    redraw();
    onChange(value);
  }

  container.add([title, track, fill, knob, zone]);
  return container;
}

/** Card placeholder para opções futuras */
export function createPlaceholderOption(scene, x, y, icon, title, subtitle) {
  const w = 360;
  const h = 72;
  const g = scene.add.graphics();
  g.fillStyle(Theme.papel, 0.85);
  g.lineStyle(3, Theme.folhaEscura, 0.4);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16);

  scene.add.text(x - w / 2 + 24, y - 8, icon, { fontSize: '28px' }).setOrigin(0, 0.5);
  scene.add.text(x - w / 2 + 64, y - 14, title, {
    fontFamily: Theme.fontFamily,
    fontSize: '18px',
    color: '#3B3024',
    fontStyle: 'bold',
  }).setOrigin(0, 0.5);
  scene.add.text(x - w / 2 + 64, y + 12, subtitle, {
    fontFamily: Theme.fontFamily,
    fontSize: '14px',
    color: '#888888',
  }).setOrigin(0, 0.5);

  return g;
}

/** Corações de vida no HUD */
export function drawHearts(scene, x, y, total, current) {
  const container = scene.add.container(x, y).setDepth(102);
  container._update = (cur) => {
    container.removeAll(true);
    for (let i = 0; i < total; i++) {
      const heart = scene.add.text(i * 36, 0, i < cur ? '❤️' : '🖤', {
        fontSize: '28px',
      }).setOrigin(0, 0.5);
      container.add(heart);
    }
  };
  container._update(current);
  return container;
}
