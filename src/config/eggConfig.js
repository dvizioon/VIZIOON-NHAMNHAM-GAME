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

/** 3 frames em ovo_quebrando.png + 1 clique para nascer */
export const EGG_CRACK_CLICKS = EGG_CRACK_FRAME_COUNT;
export const EGG_CLICKS_TO_HATCH = EGG_CRACK_FRAME_COUNT + 1;
export const EGG_WOBBLE_FRAME_RATE = 8;
export const EGG_STORY_CARD_Y_RATIO = 0.20;

/** 3folhas encostadas na borda direita — um pouco acima do chão */
export const EGG_LEAVES_X_RATIO = 1;
export const EGG_LEAVES_Y_RATIO = 0.93;
export const EGG_LEAVES_WIDTH_RATIO = 0.9;
export const EGG_LEAVES_ORIGIN_X = 1;
export const EGG_LEAVES_ORIGIN_Y = 0.94;

/** Ovo em cima da folha (Y negativo = sobe em relação à folha) */
export const EGG_ON_LEAF_X_MUL = -0.5;
export const EGG_ON_LEAF_Y_MUL = -0.42;
export const EGG_DISPLAY_HEIGHT_RATIO = 0.24;

export const EGG_HATCH_NASCENDO_KEY = 'egg_hatch_nascendo';
export const EGG_HATCH_NASCENDO_FRAME_W = 936;
export const EGG_HATCH_NASCENDO_FRAME_H = 738;
/** nascendo.png — frame 0 em cima (mãos up), frame 1 embaixo (mãos down, dentro do ovo) */
export const EGG_HATCH_FRAME_UP = 0;
export const EGG_HATCH_FRAME_DOWN = 1;
export const EGG_HATCH_SHELL_HEIGHT_MUL = 1;
export const EGG_HATCH_BODY_INSIDE_MUL = 0.62;
export const EGG_HATCH_BODY_OUT_MUL = 0.72;
/** Cabeça grande no círculo de cima */
export const EGG_HATCH_FACE_HEIGHT_MUL = 1.08;
export const EGG_HATCH_FACE_HEAD_RATIO = 2.15;
export const EGG_HATCH_FACE_Y_RATIO = 0.52;
/** Mesmo anchor do ovo fechado (ovo_mexendo) */
export const EGG_HATCH_EGG_ORIGIN_X = 0.5;
export const EGG_HATCH_EGG_ORIGIN_Y = 0.72;
export const EGG_HATCH_BODY_ORIGIN_X = 0.5;
export const EGG_HATCH_BODY_ORIGIN_Y = 0.58;
/** Distância entre os 2 círculos — menor = mais colados, movem juntos */
export const EGG_HATCH_BODY_STACK_GAP = 0.20;
/** Casca aberta no mesmo ponto do ovo; personagem sobe dentro dela */
export const EGG_HATCH_SHELL_Y = 0;
/** Personagem dentro da casca — valores negativos sobem (em relação ao ovo) */
export const EGG_HATCH_CHAR_START_Y = -0.35;
export const EGG_HATCH_CHAR_END_Y = -0.49;
export const EGG_HATCH_INSIDE_PAUSE_MS = 700;
export const EGG_HATCH_RISE_MS = 800;

export function registerEggAnimations(scene) {
  if (scene.textures.exists(EGG_WOBBLE_KEY) && !scene.anims.exists(EGG_WOBBLE_ANIM)) {
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
}
