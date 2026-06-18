/** Casulo — mexendo.png: 4 frames horizontais (cena completa + estágios de abertura) */
export const COCOON_WOBBLE_KEY = 'cocoon_wobble';
export const COCOON_WOBBLE_PATH = 'assets/sprites/ui/cocoon/mexendo.png';
export const COCOON_WOBBLE_ANIM = 'cocoon_wobble';
export const COCOON_OPEN_ANIM = 'cocoon_open';
export const COCOON_FRAME_COUNT = 4;
export const COCOON_FRAME_W = 1525;
export const COCOON_FRAME_H = 1445;
export const COCOON_WOBBLE_FRAME_RATE = 6;
export const COCOON_OPEN_FRAME_RATE = 7;
/** Cobre a área do céu (contain) — deixa o chão visível */
export const COCOON_SCREEN_COVER_MUL = 0.95;
/** Fração inferior reservada pro terreno.png */
export const COCOON_GROUND_RESERVE_RATIO = 0.22;
/** Centro vertical do casulo na tela (maior = mais embaixo) */
export const COCOON_CENTER_Y_RATIO = 0.54;
export const COCOON_STORY_CARD_Y_RATIO = 0.22;
export const COCOON_HINT_Y_RATIO = 0.9;
/** Área clicável sobre o casulo na arte */
export const COCOON_TAP_HIT_W_RATIO = 0.38;
export const COCOON_TAP_HIT_H_RATIO = 0.22;
export const COCOON_TAP_HIT_Y_RATIO = 0.62;

export const DEFAULT_COCOON_TUNE = {
  tapHitWRatio: COCOON_TAP_HIT_W_RATIO,
  tapHitHRatio: COCOON_TAP_HIT_H_RATIO,
  tapHitYRatio: COCOON_TAP_HIT_Y_RATIO,
  storyCardYRatio: COCOON_STORY_CARD_Y_RATIO,
};

export function getCocoonFrameSize(sprite) {
  const fw = sprite?.frame?.width;
  const fh = sprite?.frame?.height;
  return {
    width: fw > 0 ? fw : COCOON_FRAME_W,
    height: fh > 0 ? fh : COCOON_FRAME_H,
  };
}

/** Escala contain + centraliza no céu (chão visível embaixo). */
export function layoutCocoonSprite(sprite, screenWidth, screenHeight, opts = {}) {
  if (!sprite) return 1;
  const mul = opts.coverMul ?? COCOON_SCREEN_COVER_MUL;
  const groundReserve = opts.groundReserve ?? COCOON_GROUND_RESERVE_RATIO;
  const centerYRatio = opts.centerYRatio ?? COCOON_CENTER_Y_RATIO;
  const skyH = screenHeight * (1 - groundReserve);
  const { width: fw, height: fh } = getCocoonFrameSize(sprite);
  const contain = Math.min(screenWidth / fw, skyH / fh) * mul;
  sprite.setPosition(screenWidth / 2, screenHeight * centerYRatio);
  sprite.setScale(contain);
  return contain;
}

/** Frame parado — sem loop automático. */
export function showCocoonFrame(sprite, frameIndex) {
  if (!sprite) return;
  sprite.anims?.stop();
  sprite.setFrame(Math.max(0, Math.min(frameIndex, COCOON_FRAME_COUNT - 1)));
}

export function registerCocoonAnimations(scene) {
  if (!scene.textures.exists(COCOON_WOBBLE_KEY)) return;

  if (!scene.anims.exists(COCOON_OPEN_ANIM) && COCOON_FRAME_COUNT > 2) {
    scene.anims.create({
      key: COCOON_OPEN_ANIM,
      frames: scene.anims.generateFrameNumbers(COCOON_WOBBLE_KEY, {
        start: 2,
        end: COCOON_FRAME_COUNT - 1,
      }),
      frameRate: COCOON_OPEN_FRAME_RATE,
      repeat: 0,
    });
  }
}
