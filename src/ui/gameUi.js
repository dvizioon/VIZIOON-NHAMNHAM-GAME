import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale } from '../utils/responsive.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { Icon } from './iconify.js';

export const UI_GAME_HEALTH_KEY = 'ui_game_health';
export const UI_GAME_SCORE_KEY = 'ui_game_score';
export const GAME_SCORE_MAX = 50;

/** Health.svg — viewBox 229×54 */
const HEALTH_SVG = { w: 229, h: 54 };
/** Faixa amarela Health.svg — rect y≈12.83, h=31 */
const HEALTH_YELLOW_BAR = { y: 12.8284, h: 31 };
const HEALTH_BAR = { x: 61, w: 164, h: 17, cy: HEALTH_YELLOW_BAR.y + HEALTH_YELLOW_BAR.h / 2 };

/** Score.svg — viewBox 85×240 */
const SCORE_SVG = { w: 85, h: 240 };
/** Tubo interno — alinhado ao retângulo amarelo do Score.svg (29.5, 33×209) */
export const DEFAULT_SCORE_HUD_TUNE = {
  tube: { cx: 47, y: 60, w: 25, h: 188, rx: 15 },
  xNudge: -0.9,
  fillPadTop: 12,
  fillPadBottom: 14,
  fillColor: 0x246f2f,
};

const SCORE_BUBBLE = { x: 46.4, y: 49 };
const HUD_SCALE_MUL = 1.08;
const GAME_UI_BROWN = '#490808';

function resolveScoreHudMetrics(scoreW, scoreH, tune = DEFAULT_SCORE_HUD_TUNE) {
  const tube = tune.tube;
  const tubeNudge = (tune.xNudge / SCORE_SVG.w) * scoreW;
  const tubeLocalX = (tube.cx / SCORE_SVG.w) * scoreW - scoreW / 2 + tubeNudge;
  const tubeLocalW = (tube.w / SCORE_SVG.w) * scoreW;
  const tubeLocalH = (tube.h / SCORE_SVG.h) * scoreH;
  const tubeLocalBottom = ((tube.y + tube.h) / SCORE_SVG.h) * scoreH - scoreH / 2;
  const tubeLocalTop = (tube.y / SCORE_SVG.h) * scoreH - scoreH / 2;
  const tubeRadius = (tube.rx / SCORE_SVG.w) * scoreW;
  const fillPadTop = ((tune.fillPadTop ?? 0) / SCORE_SVG.h) * scoreH;
  const fillPadBottom = ((tune.fillPadBottom ?? 0) / SCORE_SVG.h) * scoreH;
  const tubeFillMaxH = Math.max(2, tubeLocalH - fillPadTop - fillPadBottom);
  const tubeFillBottom = tubeLocalBottom - fillPadBottom;

  return {
    tubeLocalX,
    tubeLocalW,
    tubeLocalH,
    tubeLocalBottom,
    tubeLocalTop,
    tubeRadius,
    tubeFillMaxH,
    tubeFillBottom,
    fillColor: tune.fillColor ?? DEFAULT_SCORE_HUD_TUNE.fillColor,
  };
}

function buildScoreHudRoot(scene, scoreX, scoreY, s, tune = DEFAULT_SCORE_HUD_TUNE) {
  const scoreScale = s * 0.8;
  const scoreW = Math.round(SCORE_SVG.w * scoreScale);
  const scoreH = Math.round(SCORE_SVG.h * scoreScale);
  const metrics = resolveScoreHudMetrics(scoreW, scoreH, tune);

  const scoreRoot = scene.add.container(scoreX, scoreY).setScrollFactor(0);
  const scoreFrame = scene.add.image(0, 0, UI_GAME_SCORE_KEY).setDisplaySize(scoreW, scoreH);
  const scoreFill = scene.add.graphics();
  scoreFill.fillStyle(metrics.fillColor, 1);

  const bubble = svgToLocal(SCORE_BUBBLE.x, SCORE_BUBBLE.y, SCORE_SVG.w, SCORE_SVG.h, scoreW, scoreH);
  const scoreLabel = scene.add.text(bubble.x, bubble.y, '0', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.max(18, Math.round(26 * scoreScale))}px`,
    color: '#1E6A30',
    fontStyle: 'bold',
  }).setOrigin(0.5);

  scoreRoot.add([scoreFrame, scoreFill, scoreLabel]);

  return {
    scoreRoot,
    scoreFill,
    scoreLabel,
    scoreW,
    scoreH,
    ...metrics,
  };
}

function svgToLocal(svgX, svgY, svgW, svgH, boxW, boxH) {
  return {
    x: (svgX / svgW) * boxW - boxW / 2,
    y: (svgY / svgH) * boxH - boxH / 2,
  };
}

export const GAME_AVISO_ICONS = {
  sapo: Icon.from('solar:danger-bold', { designSize: 22, color: '#1E6A30' }),
  cresceu: Icon.from('solar:star-bold', { designSize: 22, color: '#1E6A30' }),
  comeu: Icon.from('solar:chef-hat-bold', { designSize: 22, color: '#1E6A30' }),
  sapoHit: Icon.from('solar:sad-circle-bold', { designSize: 22, color: '#D85A96' }),
};

const FRUIT_MULTIPLIER_POOL = [
  { mul: 1, weight: 38 },
  { mul: 2, weight: 34 },
  { mul: 5, weight: 20 },
  { mul: 10, weight: 8 },
];

export const GAME_OVER_ICONS = {
  retry: Icon.from('solar:restart-bold', { designSize: 28, color: '#FFFFFF' }),
  home: Icon.from('mynaui:home', { designSize: 28, color: GAME_UI_BROWN }),
  heart: Icon.from('solar:heart-broken-bold', { designSize: 28, color: '#E84545' }),
};

export function preloadGameIcons(scene) {
  return Icon.preload(scene, [
    ...Object.values(GAME_AVISO_ICONS),
    ...Object.values(GAME_OVER_ICONS),
  ]);
}

export function pickFruitMultiplier() {
  const total = FRUIT_MULTIPLIER_POOL.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Phaser.Math.Between(1, total);
  for (const entry of FRUIT_MULTIPLIER_POOL) {
    roll -= entry.weight;
    if (roll <= 0) return entry.mul;
  }
  return 1;
}

export function segmentsForScore(score, scoreMax = GAME_SCORE_MAX, maxSegments = 6) {
  if (score <= 0) return 1;
  const step = scoreMax / maxSegments;
  return Math.min(maxSegments, 1 + Math.floor(score / step));
}

export function createScoreHudPreview(scene, {
  x,
  y,
  scaleMul = 1.35,
  tune = DEFAULT_SCORE_HUD_TUNE,
  score = 0,
  maxScore = GAME_SCORE_MAX,
  depth = 50,
} = {}) {
  const s = uiScale(scene) * HUD_SCALE_MUL * scaleMul;
  const part = buildScoreHudRoot(scene, x, y, s, tune);
  part.scoreRoot.setDepth(depth);

  const hud = {
    scoreRoot: part.scoreRoot,
    scoreFill: part.scoreFill,
    scoreLabel: part.scoreLabel,
    maxScore,
    tubeLocalX: part.tubeLocalX,
    tubeLocalW: part.tubeLocalW,
    tubeLocalH: part.tubeLocalH,
    tubeLocalBottom: part.tubeLocalBottom,
    tubeLocalTop: part.tubeLocalTop,
    tubeRadius: part.tubeRadius,
    tubeFillMaxH: part.tubeFillMaxH,
    tubeFillBottom: part.tubeFillBottom,
    fillColor: part.fillColor,
  };

  updateGameHudScore(hud, score, maxScore);
  return hud;
}

/**
 * HUD do gameplay — vida (canto sup. esq.) e score termômetro (canto sup. dir.)
 */
export function createGameHud(scene, { maxVidas = 3, maxScore = GAME_SCORE_MAX, scoreTune } = {}) {
  const tune = { ...DEFAULT_SCORE_HUD_TUNE, ...scoreTune, tube: { ...DEFAULT_SCORE_HUD_TUNE.tube, ...scoreTune?.tube } };
  const s = uiScale(scene) * HUD_SCALE_MUL;
  const pad = Math.round(10 * s);
  const hudTop = Math.round(8 * s);
  const depth = 210;

  const container = scene.add.container(0, 0).setDepth(depth).setScrollFactor(0);

  // —— Vida ——
  const healthW = Math.round(HEALTH_SVG.w * s * 0.76);
  const healthH = Math.round(HEALTH_SVG.h * s * 0.76);
  const healthX = pad + healthW / 2;
  const healthY = hudTop + healthH / 2;

  const healthRoot = scene.add.container(healthX, healthY).setScrollFactor(0);
  const healthFrame = scene.add.image(0, 0, UI_GAME_HEALTH_KEY).setDisplaySize(healthW, healthH);

  const barLocalX = (HEALTH_BAR.x / HEALTH_SVG.w) * healthW - healthW / 2;
  const barLocalW = (HEALTH_BAR.w / HEALTH_SVG.w) * healthW;
  const segLocalH = (HEALTH_BAR.h / HEALTH_SVG.h) * healthH;
  const segCenterY = (HEALTH_BAR.cy / HEALTH_SVG.h) * healthH - healthH / 2;
  const segmentW = barLocalW / maxVidas;
  const gap = Math.max(1, Math.round(2 * s));

  const healthSegments = [];
  const healthEmptySlots = [];

  for (let i = 0; i < maxVidas; i += 1) {
    const segCenterX = barLocalX + segmentW * i + segmentW / 2;
    const segW = segmentW - gap;
    const seg = scene.add.rectangle(
      segCenterX,
      segCenterY,
      segW,
      segLocalH,
      0xEA2F2F,
    );
    healthSegments.push(seg);

    const emptySlot = scene.add.rectangle(
      segCenterX,
      segCenterY,
      segW,
      segLocalH,
      0x7A2222,
    ).setVisible(false);
    healthEmptySlots.push(emptySlot);
  }

  healthRoot.add([healthFrame, ...healthSegments, ...healthEmptySlots]);

  // —— Score ——
  const scoreScale = s * 0.8;
  const scoreW = Math.round(SCORE_SVG.w * scoreScale);
  const scoreH = Math.round(SCORE_SVG.h * scoreScale);
  const scoreX = scene.scale.width - pad - scoreW / 2;
  const scoreY = hudTop + scoreH / 2;
  const scorePart = buildScoreHudRoot(scene, scoreX, scoreY, s, tune);

  container.add([healthRoot, scorePart.scoreRoot]);

  const hud = {
    container,
    healthRoot,
    healthSegments,
    healthEmptySlots,
    maxVidas,
    segCenterY,
    scoreRoot: scorePart.scoreRoot,
    scoreFill: scorePart.scoreFill,
    scoreLabel: scorePart.scoreLabel,
    maxScore,
    tubeLocalX: scorePart.tubeLocalX,
    tubeLocalW: scorePart.tubeLocalW,
    tubeLocalH: scorePart.tubeLocalH,
    tubeLocalBottom: scorePart.tubeLocalBottom,
    tubeLocalTop: scorePart.tubeLocalTop,
    tubeRadius: scorePart.tubeRadius,
    tubeFillMaxH: scorePart.tubeFillMaxH,
    tubeFillBottom: scorePart.tubeFillBottom,
    fillColor: scorePart.fillColor,
  };

  updateGameHudHealth(hud, maxVidas, maxVidas);
  updateGameHudScore(hud, 0, maxScore);
  return hud;
}

export function updateGameHudHealth(hud, vidas, maxVidas = hud.maxVidas) {
  const safeVidas = Phaser.Math.Clamp(vidas, 0, maxVidas);
  const segY = hud.segCenterY;

  for (let i = 0; i < maxVidas; i += 1) {
    const alive = i < safeVidas;
    const seg = hud.healthSegments[i];
    const empty = hud.healthEmptySlots[i];
    seg?.setY(segY);
    seg?.setVisible(alive);
    empty?.setY(segY);
    empty?.setVisible(!alive);
  }
}

export function updateGameHudScore(hud, score, maxScore = GAME_SCORE_MAX) {
  const cap = maxScore ?? hud.maxScore ?? GAME_SCORE_MAX;
  const ratio = Phaser.Math.Clamp(score / cap, 0, 1);
  const fillMaxH = hud.tubeFillMaxH ?? hud.tubeLocalH;
  const fillBottom = hud.tubeFillBottom ?? hud.tubeLocalBottom;
  const fillH = Math.max(2, fillMaxH * ratio);
  const fillColor = hud.fillColor ?? DEFAULT_SCORE_HUD_TUNE.fillColor;

  hud.scoreFill.clear();
  hud.scoreFill.fillStyle(fillColor, 1);
  hud.scoreFill.fillRoundedRect(
    hud.tubeLocalX - hud.tubeLocalW / 2,
    fillBottom - fillH,
    hud.tubeLocalW,
    fillH,
    Math.min(hud.tubeRadius, fillH / 2),
  );

  hud.scoreLabel.setText(String(Math.min(cap, Math.round(score))));
}

/** Popup "2x", "5x"… ao comer fruta */
export function showFruitEatPopup(scene, x, y, multiplier) {
  const s = uiScale(scene);
  const label = scene.add.text(x, y - 18, `${multiplier}x`, {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.max(16, Math.round(24 * s))}px`,
    color: '#1E6A30',
    fontStyle: 'bold',
    stroke: '#FFFFFF',
    strokeThickness: Math.round(4 * s),
  }).setOrigin(0.5).setDepth(215).setScrollFactor(0);

  scene.tweens.add({
    targets: label,
    y: y - 52 * s,
    alpha: 0,
    scale: 1.12,
    delay: 520,
    duration: 920,
    ease: 'Cubic.easeOut',
    onComplete: () => label.destroy(),
  });
}

function createGameOverActionButton(scene, x, y, label, iconDef, {
  width,
  fontSize,
  fill,
  dark,
  textColor = '#ffffff',
  onClick,
}) {
  const container = scene.add.container(x, y);
  const btnH = 52;
  const radius = btnH / 2;
  const iconSize = 22;

  const bg = scene.add.graphics();
  const draw = (pressed = false) => {
    bg.clear();
    const offset = pressed ? 4 : 0;
    bg.fillStyle(dark, 1);
    bg.fillRoundedRect(-width / 2, -radius + offset, width, btnH, radius);
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(-width / 2, -radius, width, btnH - offset, radius);
  };
  draw();

  const text = scene.add.text(0, -2, label, {
    fontFamily: Theme.fontFamily,
    fontSize: `${fontSize}px`,
    color: textColor,
    fontStyle: 'bold',
  }).setOrigin(0, 0.5);

  const gap = 8;
  const contentW = iconSize + gap + text.width;
  const contentLeft = -contentW / 2;

  const icon = scene.add.image(contentLeft + iconSize / 2, -1, iconDef.textureKey)
    .setDisplaySize(iconSize, iconSize)
    .setOrigin(0.5);

  text.setX(contentLeft + iconSize + gap);

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

/** Modal de fim de jogo — estilo alerta com Home e Tentar de novo */
export async function showGameOverModal(scene, {
  childName = 'Lagartinha',
  depth = 300,
  onRetry,
  onHome,
} = {}) {
  const { retry: retryIcon, home: homeIcon, heart: heartIcon } = GAME_OVER_ICONS;
  await Icon.preload(scene, [retryIcon, homeIcon, heartIcon]);

  const { width, height } = scene.scale;
  const s = uiScale(scene);
  const panelMaxW = Math.min(width * 0.9, 380);
  const padX = Math.round(22 * s);
  const padTop = Math.round(18 * s);
  const padBottom = Math.round(20 * s);
  const btnH = 52;
  const btnGap = Math.round(12 * s);
  const iconSize = Math.round(Math.min(panelMaxW * 0.14, 48));
  const titleSize = Math.max(20, Math.round(26 * s));
  const bodySize = Math.max(16, Math.round(18 * s));
  const btnFont = Math.max(16, Math.round(18 * s));
  const wrapW = panelMaxW - padX * 2;

  const title = `Ops, ${childName}!`;
  const message = 'As vidas acabaram!\nMas a lagartinha pode tentar de novo!';

  const measureTitle = scene.add.text(0, 0, title, {
    fontFamily: Theme.fontFamily,
    fontSize: `${titleSize}px`,
    color: '#C62828',
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: wrapW },
  }).setOrigin(0.5, 0);

  const measureBody = scene.add.text(0, 0, message, {
    fontFamily: Theme.fontFamily,
    fontSize: `${bodySize}px`,
    color: GAME_UI_BROWN,
    align: 'center',
    wordWrap: { width: wrapW },
    lineSpacing: 6,
  }).setOrigin(0.5, 0);

  const btnW = Math.min((panelMaxW - padX * 2 - btnGap) / 2, 158);
  const contentW = Math.max(
    panelMaxW,
    measureBody.width + padX * 2,
    btnW * 2 + btnGap + padX * 2,
  );
  const boxContentH = padTop + iconSize + 14 + measureTitle.height + 8
    + measureBody.height + btnGap + btnH + padBottom;

  measureTitle.destroy();
  measureBody.destroy();

  const cx = width / 2;
  const cy = height * 0.46;
  const root = scene.add.container(0, 0).setDepth(depth).setScrollFactor(0);

  const overlay = scene.add.rectangle(cx, height / 2, width, height, 0x000000, 0.58);
  overlay.setInteractive({ useHandCursor: false });

  const panel = scene.add.container(cx, cy);
  const boxTop = -boxContentH / 2;

  const panelBg = scene.add.graphics();
  panelBg.fillStyle(Theme.papel, 1);
  panelBg.fillRoundedRect(-contentW / 2, boxTop, contentW, boxContentH, 24);
  panelBg.lineStyle(5, 0xE84545, 1);
  panelBg.strokeRoundedRect(-contentW / 2, boxTop, contentW, boxContentH, 24);
  panel.add(panelBg);

  let textY = boxTop + padTop;
  const alertIcon = scene.add
    .image(0, textY + iconSize / 2, heartIcon.textureKey)
    .setDisplaySize(iconSize, iconSize)
    .setOrigin(0.5);
  panel.add(alertIcon);
  textY += iconSize + 14;

  const titleText = scene.add.text(0, textY, title, {
    fontFamily: Theme.fontFamily,
    fontSize: `${titleSize}px`,
    color: '#C62828',
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: wrapW },
  }).setOrigin(0.5, 0);
  panel.add(titleText);
  textY += titleText.height + 8;

  const bodyText = scene.add.text(0, textY, message, {
    fontFamily: Theme.fontFamily,
    fontSize: `${bodySize}px`,
    color: GAME_UI_BROWN,
    align: 'center',
    wordWrap: { width: wrapW },
    lineSpacing: 6,
  }).setOrigin(0.5, 0);
  panel.add(bodyText);

  const btnY = boxTop + boxContentH - padBottom - btnH / 2;
  const homeBtn = createGameOverActionButton(
    scene,
    -btnW / 2 - btnGap / 2,
    btnY,
    'Home',
    homeIcon,
    {
      width: btnW,
      fontSize: btnFont,
      fill: Theme.papel,
      dark: Theme.folhaEscura,
      textColor: GAME_UI_BROWN,
      onClick: () => {
        playSound(scene, 'clique');
        root.destroy();
        onHome?.();
      },
    },
  );

  const retryBtn = createGameOverActionButton(
    scene,
    btnW / 2 + btnGap / 2,
    btnY,
    'De novo',
    retryIcon,
    {
      width: btnW,
      fontSize: btnFont,
      fill: Theme.botaoVerde,
      dark: Theme.folhaEscura,
      textColor: '#FFFFFF',
      onClick: () => {
        playSound(scene, 'clique');
        root.destroy();
        onRetry?.();
      },
    },
  );

  panel.add([homeBtn, retryBtn]);
  panel.setInteractive(
    new Phaser.Geom.Rectangle(-contentW / 2, boxTop, contentW, boxContentH),
    Phaser.Geom.Rectangle.Contains,
  );

  root.add([overlay, panel]);
  panel.setScale(0.92).setAlpha(0);
  scene.tweens.add({
    targets: panel,
    scale: 1,
    alpha: 1,
    duration: 220,
    ease: 'Back.easeOut',
  });

  return { close: () => root.destroy() };
}
