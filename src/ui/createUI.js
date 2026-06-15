import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale, coverDisplaySize } from '../utils/responsive.js';
import { hasTexture } from '../systems/AssetLoader.js';
import { playSound } from '../systems/ProceduralAudio.js';
import {
  ENV_SKY_KEY,
  ENV_CLOUD_KEY,
  ENV_GROUND_KEY,
  TERRENO_GRASS_TOP_RATIO,
  TERRENO_GROUND_LINE_RATIO,
} from '../config/environmentConfig.js';

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

/** Alerta temático — balão + botão OK */
export function showThematicAlert(scene, message, { depth = 260, onClose } = {}) {
  const { width, height } = scene.scale;
  const s = uiScale(scene);
  const root = scene.add.container(0, 0).setDepth(depth);

  const dim = scene.add.rectangle(width / 2, height / 2, width, height, 0x061018, 0.42);
  dim.setInteractive({ useHandCursor: false });

  const panel = scene.add.container(width / 2, height * 0.44);
  const maxW = Math.min(width * 0.84, 330);
  const padX = 22;
  const padTop = 22;

  const body = scene.add.text(0, padTop, message, {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.max(16, Math.round(18 * s))}px`,
    color: Theme.texto,
    align: 'center',
    wordWrap: { width: maxW - padX * 2 },
    lineSpacing: 5,
  }).setOrigin(0.5, 0);

  const boxW = Math.max(body.width + padX * 2, 240);
  const boxH = body.height + padTop + 88;
  const bg = scene.add.graphics();
  bg.fillStyle(Theme.papel, 1);
  bg.lineStyle(4, Theme.folhaEscura, 1);
  bg.fillRoundedRect(-boxW / 2, 0, boxW, boxH, 22);
  bg.strokeRoundedRect(-boxW / 2, 0, boxW, boxH, 22);

  const emoji = scene.add.text(0, -28, '🐛', { fontSize: `${Math.round(30 * s)}px` }).setOrigin(0.5);

  const okBtn = createButton(scene, 0, boxH - 38, 'OK', {
    width: Math.round(boxW * 0.58),
    fontSize: Math.max(18, Math.round(22 * s)),
    onClick: dismiss,
  });

  panel.add([bg, emoji, body, okBtn]);
  root.add([dim, panel]);

  function dismiss() {
    playSound(scene, 'clique');
    root.destroy();
    onClose?.();
  }

  dim.on('pointerup', dismiss);

  panel.setScale(0.9).setAlpha(0);
  scene.tweens.add({
    targets: panel,
    scale: 1,
    alpha: 1,
    duration: 220,
    ease: 'Back.easeOut',
  });

  return { close: dismiss };
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

/** Céu + nuvens + terreno (mobile) */
export const BACKGROUND_KEY = ENV_SKY_KEY;
export const GROUND_KEY = ENV_GROUND_KEY;
export const CLOUD_KEY = ENV_CLOUD_KEY;
export const DEPTH_SKY = -100;
export const DEPTH_CLOUD = -50;
export const DEPTH_GROUND = 4;
export const DEPTH_GROUND_FG = DEPTH_GROUND;
export const DEPTH_TRUNK = 6;
export const DEPTH_FRUIT = 5;
export const DEPTH_CATERPILLAR = 20;
export const DESIGN_SIZE = { width: 1280, height: 720, groundY: 694, grassTopY: 580 };

const CLOUD_BASE_W = 136;
const CLOUD_ASPECT = 106 / 136;
const CLOUD_Y_MIN = 0.06;
const CLOUD_Y_MAX = 0.28;
const CLOUD_SCALE_MIN = 0.48;
const CLOUD_SCALE_MAX = 1.65;

const CLOUD_LANE_COUNT = 5;
const CLOUD_MIN_GAP_MS = 2800;

function cloudLaneY(height, laneIndex) {
  const t = (laneIndex + 0.5) / CLOUD_LANE_COUNT;
  return height * (CLOUD_Y_MIN + (CLOUD_Y_MAX - CLOUD_Y_MIN) * t);
}

function randomCloudSpec(scene, laneIndex = null) {
  const { width, height } = scene.scale;
  const scale = Phaser.Math.FloatBetween(CLOUD_SCALE_MIN, CLOUD_SCALE_MAX);
  const displayW = Math.round(CLOUD_BASE_W * scale * uiScale(scene));
  const displayH = Math.round(displayW * CLOUD_ASPECT);
  const lane = laneIndex ?? Phaser.Math.Between(0, CLOUD_LANE_COUNT - 1);
  const y = cloudLaneY(height, lane) + Phaser.Math.FloatBetween(-8, 8);

  return {
    displayW,
    displayH,
    lane,
    x: -displayW - Phaser.Math.Between(30, 90),
    y,
    duration: Phaser.Math.Between(16000, 34000),
    alpha: Phaser.Math.FloatBetween(0.65, 0.93),
    depth: DEPTH_CLOUD + lane,
  };
}

function pickCloudSpec(scene) {
  const tracker = scene._cloudTracker ?? { active: [] };
  const usedLanes = new Set(tracker.active.map((c) => c.lane));

  const freeLanes = [];
  for (let i = 0; i < CLOUD_LANE_COUNT; i++) {
    if (!usedLanes.has(i)) freeLanes.push(i);
  }

  if (freeLanes.length) {
    const lane = Phaser.Utils.Array.GetRandom(freeLanes);
    return randomCloudSpec(scene, lane);
  }

  return randomCloudSpec(scene);
}

function trackCloud(scene, spec) {
  if (!scene._cloudTracker) scene._cloudTracker = { active: [], lastSpawn: 0 };
  const entry = {
    lane: spec.lane,
    y: spec.y,
    displayW: spec.displayW,
    displayH: spec.displayH,
  };
  scene._cloudTracker.active.push(entry);
  return entry;
}

function untrackCloud(scene, entry) {
  const list = scene._cloudTracker?.active;
  if (!list) return;
  const idx = list.indexOf(entry);
  if (idx >= 0) list.splice(idx, 1);
}


function cloudExitX(scene, displayW) {
  return scene.scale.width + displayW + 60;
}

export function getTerrenoLayout(scene) {
  const { width, height } = scene.scale;

  if (!hasTexture(scene, GROUND_KEY)) {
    return {
      groundY: height * (DESIGN_SIZE.groundY / DESIGN_SIZE.height),
      grassTopY: height * (DESIGN_SIZE.grassTopY / DESIGN_SIZE.height),
      displayH: 0,
      top: height,
    };
  }

  const tex = scene.textures.get(GROUND_KEY).getSourceImage();
  const displayW = width;
  const displayH = (tex.height / tex.width) * displayW;
  const top = height - displayH;

  return {
    groundY: top + displayH * TERRENO_GROUND_LINE_RATIO,
    grassTopY: top + displayH * TERRENO_GRASS_TOP_RATIO,
    displayH,
    top,
  };
}

/** Linha do chão — pés da lagarta */
export function getGroundY(scene) {
  return getTerrenoLayout(scene).groundY;
}

/** Topo da grama — frutas somem ao passar por trás */
export function getGrassTopY(scene) {
  return getTerrenoLayout(scene).grassTopY;
}

function drawSkyLayer(scene) {
  const { width, height } = scene.scale;

  if (hasTexture(scene, BACKGROUND_KEY)) {
    const tex = scene.textures.get(BACKGROUND_KEY).getSourceImage();
    const cover = coverDisplaySize(width, height, tex.width, tex.height);
    scene.add.image(width / 2, height / 2, BACKGROUND_KEY)
      .setDepth(DEPTH_SKY)
      .setScrollFactor(0)
      .setDisplaySize(cover.w, cover.h);
    return;
  }

  const g = scene.add.graphics().setDepth(DEPTH_SKY);
  g.fillGradientStyle(Theme.ceuClaro, Theme.ceuClaro, Theme.ceu, Theme.ceu, 1);
  g.fillRect(0, 0, width, height);
}

function createDriftingCloud(scene, spec) {
  const { x, y, displayW, displayH, alpha, depth } = spec;
  let cloud;
  if (hasTexture(scene, CLOUD_KEY)) {
    cloud = scene.add.image(x, y, CLOUD_KEY).setOrigin(0.5).setAlpha(alpha);
    cloud.setDisplaySize(displayW, displayH);
  } else {
    const size = displayW * 0.45;
    cloud = scene.add.graphics();
    cloud.fillStyle(0xffffff, 0.85);
    cloud.fillCircle(0, 0, size * 0.35);
    cloud.fillCircle(size * 0.3, -size * 0.15, size * 0.45);
    cloud.fillCircle(size * 0.55, 0, size * 0.35);
    cloud.setPosition(x, y);
  }

  cloud.setDepth(depth);
  return cloud;
}

function spawnCloudLoop(scene, delayMs = 0) {
  const spawn = () => {
    if (!scene.sys?.isActive()) return;

    const spec = pickCloudSpec(scene);
    const entry = trackCloud(scene, spec);
    const cloud = createDriftingCloud(scene, spec);

    scene.tweens.add({
      targets: cloud,
      x: cloudExitX(scene, spec.displayW),
      duration: spec.duration,
      onComplete: () => {
        untrackCloud(scene, entry);
        cloud.destroy();
        if (scene.sys?.isActive()) {
          scene.time.delayedCall(Phaser.Math.Between(2500, 6500), () => spawnCloudLoop(scene));
        }
      },
    });
  };

  if (delayMs > 0) scene.time.delayedCall(delayMs, spawn);
  else spawn();
}

/** Nuvens — entram pela esquerda, uma de cada vez em faixas separadas */
export function spawnEnvironmentClouds(scene) {
  scene._cloudTracker = { active: [], lastSpawn: 0 };
  const initial = Phaser.Math.Between(2, 3);

  for (let i = 0; i < initial; i++) {
    spawnCloudLoop(scene, i * Phaser.Math.Between(CLOUD_MIN_GAP_MS, CLOUD_MIN_GAP_MS + 4200));
  }
}

/** terreno.png — chão mobile ancorado embaixo */
export function drawGroundForeground(scene, depth = DEPTH_GROUND) {
  const { width, height } = scene.scale;
  if (!hasTexture(scene, GROUND_KEY)) return null;

  const tex = scene.textures.get(GROUND_KEY).getSourceImage();
  const displayW = width;
  const displayH = (tex.height / tex.width) * displayW;

  return scene.add.image(width / 2, height, GROUND_KEY)
    .setDepth(depth)
    .setScrollFactor(0)
    .setOrigin(0.5, 1)
    .setDisplaySize(displayW, displayH);
}

/** fundo azul + nuvens + terreno */
export function drawEnvironmentLayers(scene, { clouds = true, ground = true } = {}) {
  drawSkyLayer(scene);
  if (clouds) spawnEnvironmentClouds(scene);
  if (ground) drawGroundForeground(scene);
  return null;
}

/** Atalho usado nas telas de menu */
export function drawSkyBackground(scene) {
  drawEnvironmentLayers(scene);
  return null;
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
