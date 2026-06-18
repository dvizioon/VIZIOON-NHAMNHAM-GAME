/** Sapo atacando — atacando.png @3x: 4 frames horizontais (901×864 cada) */
import Phaser from 'phaser';

export const FROG_ATTACK_KEY = 'frog_attack';
export const FROG_ATTACK_ANIM = 'frog_attack';
export const FROG_ATTACK_FRAME_COUNT = 4;
export const FROG_ATTACK_FRAME_W = 901;
export const FROG_ATTACK_FRAME_H = 864;
export const FROG_ATTACK_SHEET_W = 3606;
export const FROG_ATTACK_SHEET_H = 864;
export const FROG_ATTACK_PATH = 'assets/sprites/enemies/frog/atacando.png';

/** Ancora no corpo do sapo */
export const FROG_ATTACK_ORIGIN_X = 0.14;
export const FROG_ATTACK_ORIGIN_Y = 0.72;
export const FROG_ATTACK_ANIM_FPS = 14;

/** Tempos do sapo no jogo */
export const GAME_SAPO_SOUND_FALLBACK_MS = 1500;
export const GAME_SAPO_AVISO_FRAMES = 20;
export const GAME_SAPO_VOLTANDO_FRAMES = 10;

/** Escala no jogo */
export const GAME_FROG_ATTACK_WIDTH_RATIO = 0.56;
export const GAME_FROG_ATTACK_SCALE_MUL = 1.12;
/** Altura do sapo procedural antigo (frogY = head.y + 10) */
export const GAME_FROG_Y_OFFSET_PX = 10;
/** Quanto entra da borda — menor = mais colado na lateral */
export const GAME_FROG_EDGE_INSET_PX = 20;

export const DEFAULT_FROG_ATTACK_TUNE = {
  widthRatio: GAME_FROG_ATTACK_WIDTH_RATIO,
  scaleMul: GAME_FROG_ATTACK_SCALE_MUL,
  edgeInsetPx: GAME_FROG_EDGE_INSET_PX,
  yOffsetPx: GAME_FROG_Y_OFFSET_PX,
};

/** Corpo alinhado em cada frame (tools/analyze_frog_attack.py) */
export const FROG_ATTACK_FRAME_BODY_OFFSET = [
  { x: 0, y: 0 },
  { x: 280.3, y: -1.3 },
  { x: 560.5, y: -14.0 },
  { x: 63.5, y: -28.0 },
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
  const gameY = useGameLayout ? (tune.yOffsetPx ?? GAME_FROG_Y_OFFSET_PX) : 0;
  sprite.setPosition(edgeX, y + gameY + yOffset);
  sprite.setFlipX(!fromLeft);
  sprite.setData('frogFromLeft', fromLeft);
  sprite.setData('frogUseGameLayout', useGameLayout);
}

/** Ajusta X para o inset da borda do jogo sem quebrar compensação de frames */
export function applyFrogGameEdgeInset(sprite, screenWidth, fromLeft, tune = DEFAULT_FROG_ATTACK_TUNE) {
  if (!sprite) return;
  const inset = tune.edgeInsetPx ?? GAME_FROG_EDGE_INSET_PX;
  const w = sprite.displayWidth || FROG_ATTACK_FRAME_W;
  const originEdgeX = fromLeft
    ? w * FROG_ATTACK_ORIGIN_X
    : screenWidth - w * (1 - FROG_ATTACK_ORIGIN_X);
  const targetX = fromLeft ? inset : screenWidth - inset;
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

/** Frames 0→1→2→3 no lugar */
export function playFrogAttackAnim(sprite, scene, { onFrame, onComplete } = {}) {
  if (!sprite?.active) return;

  stopFrogAttackAnim(sprite);
  const stepMs = Math.round(1000 / FROG_ATTACK_ANIM_FPS);
  let frame = 0;

  setFrogAttackFrame(sprite, frame);
  onFrame?.(frame);

  const step = () => {
    if (!sprite.active) return;
    frame += 1;
    if (frame >= FROG_ATTACK_FRAME_COUNT) {
      sprite.setData('frogAttackTimer', null);
      onComplete?.();
      return;
    }
    setFrogAttackFrame(sprite, frame);
    onFrame?.(frame);
    sprite.setData('frogAttackTimer', scene.time.delayedCall(stepMs, step));
  };

  sprite.setData('frogAttackTimer', scene.time.delayedCall(stepMs, step));
}

export function frogAttackFrameForProgress(progress) {
  const t = Phaser.Math.Clamp(progress, 0, 1);
  if (t < 0.22) return 0;
  if (t < 0.45) return 1;
  if (t < 0.68) return 2;
  return 3;
}
