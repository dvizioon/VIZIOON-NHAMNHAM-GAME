/** Sapo pulando — pulando.png @3x: 4×622×514, spacing 100 (igual folha da lagarta) */
import { getGroundY } from '../ui/createUI.js';
import {
  getCaterpillarWalkBurstAmpPx,
  getCaterpillarSegmentDisplayH,
  SPLASH_CATERPILLAR_SCALE,
  SPLASH_CATERPILLAR_GROUND_OFFSET_RATIO,
  getSplashCaterpillarOpts,
} from './caterpillarConfig.js';

export const FROG_JUMP_KEY = 'frog_jump';
export const FROG_JUMP_ANIM = 'frog_jump';
export const FROG_JUMP_FRAME_COUNT = 4;
export const FROG_JUMP_FRAME_W = 622;
export const FROG_JUMP_FRAME_H = 514;
export const FROG_JUMP_FRAME_SPACING = 100;
export const FROG_JUMP_SHEET_W = 2790;
export const FROG_JUMP_SHEET_H = 514;
export const FROG_JUMP_PATH = 'assets/sprites/enemies/frog/pulando.png';

export const FROG_JUMP_ORIGIN_X = 0.5;
export const FROG_JUMP_ORIGIN_Y = 0.92;
export const FROG_JUMP_REF_FRAME_W = FROG_JUMP_FRAME_W;
export const FROG_JUMP_REF_FRAME_H = FROG_JUMP_FRAME_H;

/** Escala do sapo na splash — um pouco maior que a bolinha da lagarta */
export const SPLASH_FROG_SCALE_MUL = 1.22;

export function getSplashFrogDisplayScale(caterpillarDisplayScale = SPLASH_CATERPILLAR_SCALE) {
  return (getCaterpillarSegmentDisplayH(caterpillarDisplayScale) / FROG_JUMP_FRAME_H)
    * SPLASH_FROG_SCALE_MUL;
}

export const SPLASH_FROG_ENABLED = true;
/** Sapo — leve extra abaixo da lagarta; não colado na borda do chão */
export const FROG_GROUND_EXTRA_RATIO = 0.028;
export const SPLASH_FROG_Y_OFFSET_RATIO = 0.068;
export const SPLASH_FROG_CHANCE = 1;
export const SPLASH_FROG_JUMP_COUNT = 3;
export const SPLASH_FROG_JUMP_MS = 680;
export const SPLASH_FROG_JUMP_MIN_DELAY = 480;
export const SPLASH_FROG_JUMP_MAX_DELAY = 760;
export const SPLASH_FROG_START_DELAY = 320;

/** Arco do pulo = mesma amp. da onda burst da lagarta (px) */
export function getSplashFrogJumpArc(caterpillarDisplayScale = SPLASH_CATERPILLAR_SCALE) {
  return getCaterpillarWalkBurstAmpPx(caterpillarDisplayScale);
}

function splashCaterpillarScale() {
  return getSplashCaterpillarOpts().displayScale;
}

/** Linha Y do sapo — splash e tela jogador (pés no chão) */
export function getSplashFrogGroundY(scene) {
  const { height } = scene.scale;
  return getGroundY(scene) + height * (
    SPLASH_CATERPILLAR_GROUND_OFFSET_RATIO + FROG_GROUND_EXTRA_RATIO
  );
}

/** Escala e arco iguais ao sapo da splash */
export function getSplashFrogSceneScale(caterpillarDisplayScale = splashCaterpillarScale()) {
  return getSplashFrogDisplayScale(caterpillarDisplayScale);
}

export function getSplashFrogSceneJumpArc(caterpillarDisplayScale = splashCaterpillarScale()) {
  return getSplashFrogJumpArc(caterpillarDisplayScale);
}

export const INTRO_FROG_WIDTH_RATIO = 0.2;
export const INTRO_FROG_DEPTH = 24;
export const INTRO_FROG_START_X_RATIO = -0.08;
export const INTRO_FROG_JUMP_W_RATIO = 0.11;
export const INTRO_FROG_JUMP_ARC = 40;
export const INTRO_FROG_JUMP_MS = 520;
export const INTRO_FROG_JUMP_MIN_DELAY = 680;
export const INTRO_FROG_JUMP_MAX_DELAY = 1180;

export function getFrogJumpSheetLoadOpts() {
  return {
    frameWidth: FROG_JUMP_FRAME_W,
    frameHeight: FROG_JUMP_FRAME_H,
    spacing: FROG_JUMP_FRAME_SPACING,
  };
}

/** Mesmo displaySize em todos os frames (grade 622×514) */
export function syncFrogJumpDisplay(sprite) {
  if (!sprite?.frame?.height) return;
  let scale = sprite.getData('frogDisplayScale');
  if (scale == null) {
    scale = Math.abs(sprite.scaleY) || 1;
    sprite.setData('frogDisplayScale', scale);
  }
  sprite.setDisplaySize(FROG_JUMP_FRAME_W * scale, FROG_JUMP_FRAME_H * scale);
}

/** Grade uniforme — spritesheet já traz frames iguais */
export function patchFrogJumpFrames(_scene) {}

export function registerIntroFrogAnimations(scene) {
  if (!scene.textures.exists(FROG_JUMP_KEY) || scene.anims.exists(FROG_JUMP_ANIM)) return;

  scene.anims.create({
    key: FROG_JUMP_ANIM,
    frames: scene.anims.generateFrameNumbers(FROG_JUMP_KEY, {
      start: 0,
      end: FROG_JUMP_FRAME_COUNT - 1,
    }),
    frameRate: 11,
    repeat: 0,
  });
}

/** @deprecated */
export function applyFrogJumpCrop(sprite) {
  syncFrogJumpDisplay(sprite);
}
