/** Sapo atacando — atacando.png: 3 frames horizontais (813×876 cada) */
import Phaser from 'phaser';
import { getGroundY } from '../ui/createUI.js';
import { GAME_CLIMBER_Y_LIFT } from './gameWorldConfig.js';

export const FROG_ATTACK_KEY = 'frog_attack';
export const FROG_ATTACK_ANIM = 'frog_attack';
export const FROG_ATTACK_FRAME_COUNT = 3;
export const FROG_ATTACK_FRAME_W = 813;
export const FROG_ATTACK_FRAME_H = 876;
export const FROG_ATTACK_SHEET_W = 2439;
export const FROG_ATTACK_SHEET_H = 876;
export const FROG_ATTACK_PATH = 'assets/sprites/enemies/frog/atacando.png';

/** Ancora no corpo do sapo */
export const FROG_ATTACK_ORIGIN_X = 0.14;
export const FROG_ATTACK_ORIGIN_Y = 0.72;
export const FROG_ATTACK_ANIM_FPS = 20;
/** Duração de cada frame do ataque (ms) — mais rápido e suave */
export const FROG_ATTACK_FRAME_MS = [42, 38, 52];

/** Tempos do sapo no jogo */
export const GAME_SAPO_SOUND_FALLBACK_MS = 1500;
/** Pausa com sapo visível antes de atacar (ms) */
export const GAME_SAPO_AVISO_MS = 1000;
/** @deprecated use GAME_SAPO_AVISO_MS */
export const GAME_SAPO_AVISO_FRAMES = 60;
export const GAME_SAPO_VOLTANDO_FRAMES = 8;

/** Largura do sapo ≈ fração da tela (afinado em telasapoatacando) */
export const GAME_FROG_ATTACK_WIDTH_RATIO = 0.56;
export const GAME_FROG_ATTACK_SCALE_MUL = 0.92;
/** Offset vertical (positivo = desce). Mesmo valor nos dois lados = alinhados */
export const GAME_FROG_Y_OFFSET_PX = -38;
export const GAME_FROG_Y_OFFSET_LEFT_PX = GAME_FROG_Y_OFFSET_PX;
export const GAME_FROG_Y_OFFSET_RIGHT_PX = GAME_FROG_Y_OFFSET_PX;
/** Alcance da língua em direção à lagarta (fração do corpo visível) */
export const GAME_FROG_TONGUE_REACH_MUL = 0.72;
/** Tolerância vertical do hit da língua */
export const GAME_FROG_HIT_Y_TOLERANCE_PX = 95;
/** Inset da borda — afinado em telasapoatacando (esq/dir independentes) */
export const GAME_FROG_EDGE_INSET_LEFT_PX = 18;
export const GAME_FROG_EDGE_INSET_RIGHT_PX = 130;
/** @deprecated use GAME_FROG_EDGE_INSET_RIGHT_PX */
export const GAME_FROG_EDGE_INSET_RIGHT_PAD = GAME_FROG_EDGE_INSET_RIGHT_PX;
/** @deprecated use GAME_FROG_EDGE_INSET_LEFT_PX */
export const GAME_FROG_EDGE_INSET_PX = GAME_FROG_EDGE_INSET_LEFT_PX;

export const DEFAULT_FROG_ATTACK_TUNE = {
  widthRatio: GAME_FROG_ATTACK_WIDTH_RATIO,
  scaleMul: GAME_FROG_ATTACK_SCALE_MUL,
  edgeInsetLeftPx: GAME_FROG_EDGE_INSET_LEFT_PX,
  edgeInsetRightPx: GAME_FROG_EDGE_INSET_RIGHT_PX,
  yOffsetPx: GAME_FROG_Y_OFFSET_PX,
  yOffsetLeftPx: GAME_FROG_Y_OFFSET_LEFT_PX,
  yOffsetRightPx: GAME_FROG_Y_OFFSET_RIGHT_PX,
  tongueReachMulLeft: GAME_FROG_TONGUE_REACH_MUL,
  tongueReachMulRight: GAME_FROG_TONGUE_REACH_MUL,
  tongueHitHalfHLeft: 119,
  tongueHitHalfHRight: 115,
  tongueAnchorShiftLeft: 30,
  tongueAnchorShiftRight: 90,
  tongueExtraPadLeft: 0,
  tongueExtraPadRight: 0,
};

export function getFrogTongueReachMul(fromLeft, tune = DEFAULT_FROG_ATTACK_TUNE) {
  if (fromLeft) return tune.tongueReachMulLeft ?? tune.tongueReachMul ?? GAME_FROG_TONGUE_REACH_MUL;
  return tune.tongueReachMulRight ?? tune.tongueReachMul ?? GAME_FROG_TONGUE_REACH_MUL;
}

export function getFrogTongueHitHalfH(fromLeft, tune = DEFAULT_FROG_ATTACK_TUNE) {
  if (fromLeft) return tune.tongueHitHalfHLeft ?? tune.tongueHitHalfH ?? GAME_FROG_HIT_Y_TOLERANCE_PX;
  return tune.tongueHitHalfHRight ?? tune.tongueHitHalfH ?? GAME_FROG_HIT_Y_TOLERANCE_PX;
}

export function getFrogTongueAnchorShift(fromLeft, tune = DEFAULT_FROG_ATTACK_TUNE) {
  if (fromLeft) return tune.tongueAnchorShiftLeft ?? 0;
  return tune.tongueAnchorShiftRight ?? 0;
}

export function getFrogTongueExtraPad(fromLeft, tune = DEFAULT_FROG_ATTACK_TUNE) {
  if (fromLeft) return tune.tongueExtraPadLeft ?? 0;
  return tune.tongueExtraPadRight ?? 0;
}

/** Y base do sapo — mesma referência p/ esquerda e direita (não sobe com a lagarta). */
export function getGameFrogBaseY(scene, climberLiftRatio = GAME_CLIMBER_Y_LIFT) {
  const { height } = scene.scale;
  return getGroundY(scene) - height * climberLiftRatio;
}

export function getGameFrogYOffset(fromLeft, tune = DEFAULT_FROG_ATTACK_TUNE) {
  if (fromLeft) {
    return tune.yOffsetLeftPx ?? tune.yOffsetPx ?? GAME_FROG_Y_OFFSET_LEFT_PX;
  }
  return tune.yOffsetRightPx ?? tune.yOffsetPx ?? GAME_FROG_Y_OFFSET_RIGHT_PX;
}

export function getGameFrogAnchorY(scene, tune = DEFAULT_FROG_ATTACK_TUNE, climberLiftRatio = GAME_CLIMBER_Y_LIFT, fromLeft = true) {
  return getGameFrogBaseY(scene, climberLiftRatio)
    + getGameFrogYOffset(fromLeft, tune);
}

export function getGameFrogEdgeInset(fromLeft, tune = DEFAULT_FROG_ATTACK_TUNE) {
  if (fromLeft) {
    return tune.edgeInsetLeftPx ?? tune.edgeInsetPx ?? GAME_FROG_EDGE_INSET_LEFT_PX;
  }
  return tune.edgeInsetRightPx ?? tune.edgeInsetPx ?? GAME_FROG_EDGE_INSET_RIGHT_PX;
}

/** Quantos lados no baralho antes de embaralhar de novo (metade esq, metade dir) */
export const GAME_SAPO_SIDE_BAG_SIZE = 8;

/**
 * Esq: origem do sprite no inset (peek da borda esquerda).
 * Dir: origem no inset da direita — mesmo peek do debug (telasapoatacando).
 */
export function getGameFrogAnchorX(screenWidth, fromLeft, spriteWidth, tune = DEFAULT_FROG_ATTACK_TUNE) {
  const inset = getGameFrogEdgeInset(fromLeft, tune);
  const w = spriteWidth || FROG_ATTACK_FRAME_W;
  if (fromLeft) return inset;
  return screenWidth - inset - w * FROG_ATTACK_ORIGIN_X;
}

/** Baralho 50/50 esq-dir embaralhado — alterna sem repetir o mesmo lado sempre */
export function buildSapoSideBag(avoidFirstLado = null) {
  const total = Math.max(2, GAME_SAPO_SIDE_BAG_SIZE);
  const half = Math.floor(total / 2);
  const bag = [
    ...Array(half).fill(0),
    ...Array(total - half).fill(1),
  ];
  Phaser.Utils.Array.Shuffle(bag);

  if (avoidFirstLado != null && bag.length > 1 && bag[0] === avoidFirstLado) {
    const swapIdx = bag.findIndex((lado, i) => i > 0 && lado !== avoidFirstLado);
    if (swapIdx > 0) {
      [bag[0], bag[swapIdx]] = [bag[swapIdx], bag[0]];
    }
  }
  return bag;
}

/** 0 = esquerda, 1 = direita */
export function pickNextSapoLado(rotation, lastLado = null) {
  if (!rotation) return lastLado === 0 ? 1 : 0;
  if (!rotation.bag?.length) {
    rotation.bag = buildSapoSideBag(lastLado);
  }
  return rotation.bag.pop();
}

/**
 * Zona retangular do hit da língua (debug + lógica).
 * Esq: sai do canto esquerdo do sapo em direção à árvore.
 * Dir: espelho — sai do canto direito, sem “grudar” no meio da lagarta.
 */
export function getFrogTongueHitZone(sprite, fromLeft, extraRadius = 0, tune = DEFAULT_FROG_ATTACK_TUNE) {
  if (!sprite?.active) return null;

  const w = sprite.displayWidth || FROG_ATTACK_FRAME_W;
  const bodyReach = (1 - FROG_ATTACK_ORIGIN_X) * w;
  const reachMul = getFrogTongueReachMul(fromLeft, tune);
  const sidePad = getFrogTongueExtraPad(fromLeft, tune);
  const maxReach = bodyReach * reachMul + extraRadius + sidePad;
  const safePad = Math.max(12, (extraRadius + sidePad) * 0.45);
  const pinX = sprite.getData('frogPinX') ?? sprite.x;
  const anchorY = sprite.getData('frogPinY') ?? sprite.y;
  const halfH = getFrogTongueHitHalfH(fromLeft, tune);
  const anchorShift = getFrogTongueAnchorShift(fromLeft, tune);

  if (fromLeft) {
    const anchorX = pinX + anchorShift;
    return {
      x: anchorX - safePad,
      y: anchorY - halfH,
      width: maxReach + safePad,
      height: halfH * 2,
      tipX: anchorX + maxReach,
      anchorX,
      anchorY,
    };
  }

  const anchorX = pinX + FROG_ATTACK_ORIGIN_X * w + anchorShift;
  return {
    x: anchorX - maxReach - safePad,
    y: anchorY - halfH,
    width: maxReach + safePad,
    height: halfH * 2,
    tipX: anchorX - maxReach,
    anchorX,
    anchorY,
  };
}

/**
 * Hit da língua — qualquer parte visível da lagarta (cabeça + segmentos do corpo).
 */
export function doesFrogTongueHitCaterpillar(sprite, targets, fromLeft, extraRadius = 0, tune = DEFAULT_FROG_ATTACK_TUNE) {
  if (!sprite?.active || !targets?.length) return false;

  const zone = getFrogTongueHitZone(sprite, fromLeft, extraRadius, tune);
  if (!zone) return false;

  return targets.some((target) => {
    const r = target.r ?? 0;
    const pad = r;
    return (
      target.x >= zone.x - pad
      && target.x <= zone.x + zone.width + pad
      && target.y >= zone.y - pad
      && target.y <= zone.y + zone.height + pad
    );
  });
}

/** @deprecated use doesFrogTongueHitCaterpillar */
export function doesFrogTongueHitHead(sprite, head, fromLeft, extraRadius = 0, tune = DEFAULT_FROG_ATTACK_TUNE) {
  if (!head) return false;
  const r = head.r ?? 14;
  return doesFrogTongueHitCaterpillar(sprite, [{ ...head, r }], fromLeft, extraRadius, tune);
}

/** Corpo alinhado na normalização do spritesheet (tools/normalize_frog_attack.py) */
export const FROG_ATTACK_FRAME_BODY_OFFSET = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

export function getFrogAttackSheetLoadOpts() {
  return {
    frameWidth: FROG_ATTACK_FRAME_W,
    frameHeight: FROG_ATTACK_FRAME_H,
  };
}

export function getGameFrogAttackScale(screenWidth, tune = DEFAULT_FROG_ATTACK_TUNE) {
  const widthRatio = tune.widthRatio ?? GAME_FROG_ATTACK_WIDTH_RATIO;
  const scaleMul = tune.scaleMul ?? GAME_FROG_ATTACK_SCALE_MUL;
  return (screenWidth * widthRatio * scaleMul) / FROG_ATTACK_FRAME_W;
}

export function syncFrogAttackDisplay(sprite, scale) {
  if (!sprite) return;
  sprite.setDisplaySize(FROG_ATTACK_FRAME_W * scale, FROG_ATTACK_FRAME_H * scale);
}

export function registerFrogAttackAnimations(scene) {
  if (!scene.textures.exists(FROG_ATTACK_KEY) || scene.anims.exists(FROG_ATTACK_ANIM)) return;

  scene.anims.create({
    key: FROG_ATTACK_ANIM,
    frames: scene.anims.generateFrameNumbers(FROG_ATTACK_KEY, {
      start: 0,
      end: FROG_ATTACK_FRAME_COUNT - 1,
    }),
    frameRate: FROG_ATTACK_ANIM_FPS,
    repeat: 0,
  });
}

/** Posiciona o sapo na borda — arte olha para a direita */
export function layoutFrogAttackSprite(sprite, {
  screenWidth,
  y,
  fromLeft,
  yOffset = 0,
  useGameLayout = false,
  tune = DEFAULT_FROG_ATTACK_TUNE,
} = {}) {
  if (!sprite) return;
  const w = sprite.displayWidth || FROG_ATTACK_FRAME_W;
  const edgeX = fromLeft
    ? w * FROG_ATTACK_ORIGIN_X
    : screenWidth - w * (1 - FROG_ATTACK_ORIGIN_X);
  const gameY = useGameLayout ? getGameFrogYOffset(fromLeft, tune) : 0;
  sprite.setPosition(edgeX, y + gameY + yOffset);
  sprite.setFlipX(!fromLeft);
  sprite.setData('frogFromLeft', fromLeft);
  sprite.setData('frogUseGameLayout', useGameLayout);
}

/** Ajusta X para o inset da borda do jogo sem quebrar compensação de frames */
export function applyFrogGameEdgeInset(sprite, screenWidth, fromLeft, tune = DEFAULT_FROG_ATTACK_TUNE) {
  if (!sprite) return;
  const w = sprite.displayWidth || FROG_ATTACK_FRAME_W;
  const originEdgeX = fromLeft
    ? w * FROG_ATTACK_ORIGIN_X
    : screenWidth - w * (1 - FROG_ATTACK_ORIGIN_X);
  const targetX = getGameFrogAnchorX(screenWidth, fromLeft, w, tune);
  sprite.x += targetX - originEdgeX;
}

/** Troca frame compensando deslocamento da arte — corpo parado */
export function setFrogAttackFrame(sprite, frameIndex) {
  if (!sprite) return;
  const frame = Phaser.Math.Clamp(frameIndex, 0, FROG_ATTACK_FRAME_COUNT - 1);
  const pinX = sprite.getData('frogPinX');
  const pinY = sprite.getData('frogPinY');
  const fromLeft = sprite.getData('frogFromLeft');
  if (pinX == null || pinY == null) return;

  sprite.anims?.stop();
  sprite.setFrame(frame);

  const off = FROG_ATTACK_FRAME_BODY_OFFSET[frame] ?? { x: 0, y: 0 };
  const scale = sprite.displayWidth / FROG_ATTACK_FRAME_W;
  const dx = off.x * scale;
  const dy = off.y * scale;
  const compX = fromLeft ? pinX - dx : pinX + dx;
  sprite.setPosition(compX, pinY - dy);
}

export function anchorFrogAttackSprite(sprite, {
  screenWidth,
  y,
  fromLeft,
  yOffset = 0,
  useGameLayout = false,
  tune = DEFAULT_FROG_ATTACK_TUNE,
} = {}) {
  layoutFrogAttackSprite(sprite, { screenWidth, y, fromLeft, yOffset, useGameLayout, tune });
  if (useGameLayout) {
    applyFrogGameEdgeInset(sprite, screenWidth, fromLeft, tune);
  }
  sprite.setData('frogPinX', sprite.x);
  sprite.setData('frogPinY', sprite.y);
  setFrogAttackFrame(sprite, 0);
}

export function stopFrogAttackAnim(sprite) {
  if (!sprite) return;
  const timer = sprite.getData('frogAttackTimer');
  timer?.remove?.();
  sprite.setData('frogAttackTimer', null);
  sprite.anims?.stop();
}

/** Frames 0→1→2 no lugar */
export function playFrogAttackAnim(sprite, scene, { attackId, onFrame, onComplete } = {}) {
  if (!sprite?.active) return;

  stopFrogAttackAnim(sprite);
  const id = attackId ?? 0;
  sprite.setData('frogAttackId', id);
  const fallbackMs = Math.round(1000 / FROG_ATTACK_ANIM_FPS);
  let frame = 0;

  const frameDelay = (index) => FROG_ATTACK_FRAME_MS[index] ?? fallbackMs;

  setFrogAttackFrame(sprite, frame);
  onFrame?.(frame);

  const step = () => {
    if (!sprite.active || sprite.getData('frogAttackId') !== id) return;
    frame += 1;
    if (frame >= FROG_ATTACK_FRAME_COUNT) {
      sprite.setData('frogAttackTimer', null);
      if (sprite.getData('frogAttackId') === id) onComplete?.();
      return;
    }
    setFrogAttackFrame(sprite, frame);
    onFrame?.(frame);
    const delay = frameDelay(frame);
    sprite.setData('frogAttackTimer', scene.time.delayedCall(delay, step));
  };

  sprite.setData('frogAttackTimer', scene.time.delayedCall(frameDelay(0), step));
}

export function frogAttackFrameForProgress(progress) {
  const t = Phaser.Math.Clamp(progress, 0, 1);
  if (t < 0.34) return 0;
  if (t < 0.67) return 1;
  return 2;
}
