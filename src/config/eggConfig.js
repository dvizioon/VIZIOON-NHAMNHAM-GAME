/** Sprites e layout — tela do ovo (chocar) */
export const EGG_WOBBLE_KEY = 'egg_wobble';
export const EGG_CRACK_KEY = 'egg_crack';
export const EGG_OPEN_KEY = 'egg_open';
export const EGG_WOBBLE_ANIM = 'egg_wobble';

export const EGG_WOBBLE_FRAME_COUNT = 7;
export const EGG_WOBBLE_FRAME_W = 664;
export const EGG_WOBBLE_FRAME_H = 804;

export const EGG_CRACK_FRAME_COUNT = 3;
export const EGG_CRACK_FRAME_W = 708;
export const EGG_CRACK_FRAME_H = 804;

export const EGG_OPEN_FRAME_COUNT = 3;
export const EGG_OPEN_FRAME_W = 708;
export const EGG_OPEN_FRAME_H = 804;

export const EGG_CLICKS_TO_HATCH = 3;
export const EGG_WOBBLE_FRAME_RATE = 8;
export const EGG_STORY_CARD_Y_RATIO = 0.20;

export const EGG_LEAVES_X_RATIO = 0.98;
export const EGG_LEAVES_Y_RATIO = 0.67;
export const EGG_LEAVES_WIDTH_RATIO = 0.96;
export const EGG_LEAVES_ORIGIN_X = 0.92;
export const EGG_LEAVES_ORIGIN_Y = 0.56;

/** Ovo no meio da folha horizontal, mais à esquerda */
export const EGG_ON_LEAF_X_MUL = -0.5;
export const EGG_ON_LEAF_Y_MUL = -0.06;
export const EGG_DISPLAY_HEIGHT_RATIO = 0.24;

export const EGG_HATCH_BODY_TEX = 'char_default_rise';
export const EGG_HATCH_BODY_FRAME = 1;
export const EGG_HATCH_BODY_HEIGHT_MUL = 0.88;
export const EGG_HATCH_HEAD_SCALE_MUL = 1.48;

export function registerEggAnimations(scene) {
  if (!scene.textures.exists(EGG_WOBBLE_KEY) || scene.anims.exists(EGG_WOBBLE_ANIM)) return;

  scene.anims.create({
    key: EGG_WOBBLE_ANIM,
    frames: scene.anims.generateFrameNumbers(EGG_WOBBLE_KEY, {
      start: 0,
      end: EGG_WOBBLE_FRAME_COUNT - 1,
    }),
    frameRate: EGG_WOBBLE_FRAME_RATE,
    repeat: -1,
    yoyo: true,
  });
}
