/** Sapo pulando — sapo_pulando.png @3x: 4065×603, 4 frames 1014×603, spacing 3 */
export const FROG_JUMP_KEY = 'frog_jump';
export const FROG_JUMP_ANIM = 'frog_jump';
export const FROG_JUMP_FRAME_COUNT = 4;
export const FROG_JUMP_FRAME_W = 1014;
export const FROG_JUMP_FRAME_H = 603;
export const FROG_JUMP_FRAME_SPACING = 3;
export const FROG_JUMP_PATH = 'assets/sprites/enemies/frog/sapo_pulando.png';
/** Recorte leve por frame (evita bleed entre frames) */
export const FROG_JUMP_FRAME_TRIM_LEFT = 4;
export const FROG_JUMP_FRAME_TRIM_RIGHT = 8;
export const FROG_JUMP_FRAME_TRIM_Y = 2;
export const FROG_JUMP_ORIGIN_X = 0.5;
export const FROG_JUMP_ORIGIN_Y = 0.92;

/** Splash: escala base da lagarta × este fator */
export const SPLASH_FROG_SCALE_MUL = 1.22;
/** Sapo na splash — desligado por enquanto */
export const SPLASH_FROG_ENABLED = false;
/** Pés no chão — um pouco abaixo da lagarta (origin diferente) */
export const SPLASH_FROG_GROUND_EXTRA_RATIO = 0.022;
export const SPLASH_FROG_Y_OFFSET_RATIO = 0.068;
/** Chance do sapo aparecer depois que a lagarta sai (0–1) */
export const SPLASH_FROG_CHANCE = 0.32;
/** Pulos para atravessar a tela */
export const SPLASH_FROG_JUMP_COUNT = 3;
/** Timings do sapo na Splash (mais lento que a intro do tronco) */
export const SPLASH_FROG_JUMP_MS = 720;
export const SPLASH_FROG_JUMP_MIN_DELAY = 520;
export const SPLASH_FROG_JUMP_MAX_DELAY = 880;
export const SPLASH_FROG_START_DELAY = 360;

export const INTRO_FROG_WIDTH_RATIO = 0.2;
export const INTRO_FROG_DEPTH = 24;
export const INTRO_FROG_START_X_RATIO = -0.08;
export const INTRO_FROG_JUMP_W_RATIO = 0.11;
export const INTRO_FROG_JUMP_ARC = 52;
export const INTRO_FROG_JUMP_MS = 520;
export const INTRO_FROG_JUMP_MIN_DELAY = 680;
export const INTRO_FROG_JUMP_MAX_DELAY = 1180;

/** Recorta bordas do frame atual — evita aparecer pedaço do frame ao lado */
export function applyFrogJumpCrop(sprite) {
  if (!sprite?.frame?.width) return;

  const fw = sprite.frame.width;
  const fh = sprite.frame.height;
  const scale = fw / FROG_JUMP_FRAME_W;
  const left = Math.max(1, Math.round(FROG_JUMP_FRAME_TRIM_LEFT * scale));
  const right = Math.max(1, Math.round(FROG_JUMP_FRAME_TRIM_RIGHT * scale));
  const top = Math.max(0, Math.round(FROG_JUMP_FRAME_TRIM_Y * scale));
  const cropW = fw - left - right;
  const cropH = fh - top * 2;

  if (cropW <= 0 || cropH <= 0) return;
  sprite.setCrop(left, top, cropW, cropH);
}

export function registerIntroFrogAnimations(scene) {
  if (!scene.textures.exists(FROG_JUMP_KEY) || scene.anims.exists(FROG_JUMP_ANIM)) return;

  scene.anims.create({
    key: FROG_JUMP_ANIM,
    frames: scene.anims.generateFrameNumbers(FROG_JUMP_KEY, {
      start: 0,
      end: FROG_JUMP_FRAME_COUNT - 1,
    }),
    frameRate: 10,
    repeat: 0,
  });
}

export function getFrogJumpSheetLoadOpts() {
  return {
    frameWidth: FROG_JUMP_FRAME_W,
    frameHeight: FROG_JUMP_FRAME_H,
    spacing: FROG_JUMP_FRAME_SPACING,
  };
}
