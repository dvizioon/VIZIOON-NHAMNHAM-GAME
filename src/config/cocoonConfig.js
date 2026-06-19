/** Casulo — mexendo.png: 6 frames (631×1162) — normalizado via tools/normalize_cocoon_wobble.py */
export const COCOON_WOBBLE_KEY = 'cocoon_wobble';
export const COCOON_WOBBLE_PATH = 'assets/sprites/ui/cocoon/mexendo.png';
export const COCOON_TRUNK_KEY = 'cocoon_trunk';
export const COCOON_TRUNK_PATH = 'assets/textures/ui/tronco_horizontal_caido.svg';
export const COCOON_TRUNK_ASPECT = 411 / 735;

export const COCOON_WOBBLE_ANIM = 'cocoon_wobble';
export const COCOON_OPEN_ANIM = 'cocoon_open';
export const COCOON_FRAME_COUNT = 6;
export const COCOON_FRAME_W = 829;
export const COCOON_FRAME_H = 1174;
export const COCOON_WOBBLE_FRAME_RATE = 10;
export const COCOON_OPEN_FRAME_RATE = 12;

export const COCOON_STORY_CARD_Y_RATIO = 0.17;
export const COCOON_HINT_Y_RATIO = 0.9;


export const DEFAULT_COCOON_TUNE = {
  trunkWidthRatio: 1.1,
  trunkYRatio: 0.47,
  cocoonHangXRatio: 0.04,
  cocoonHangYRatio: 0.09,
  cocoonHeightRatio: 0.440,
  cocoonOriginY: 0.04,
  tapHitPadX: 1.12,
  tapHitPadY: 1.05,
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

export function layoutCocoonTrunk(trunkImage, screenWidth, screenHeight, tune = DEFAULT_COCOON_TUNE) {
  if (!trunkImage) return null;
  const widthRatio = tune.trunkWidthRatio ?? DEFAULT_COCOON_TUNE.trunkWidthRatio;
  const yRatio = tune.trunkYRatio ?? DEFAULT_COCOON_TUNE.trunkYRatio;
  const displayW = screenWidth * widthRatio;
  const displayH = displayW * COCOON_TRUNK_ASPECT;
  trunkImage
    .setOrigin(0.5, 0.5)
    .setDisplaySize(displayW, displayH)
    .setPosition(screenWidth / 2, screenHeight * yRatio);
  return { displayW, displayH };
}

export function layoutCocoonOnTrunk(cocoonSprite, trunkImage, screenHeight, tune = DEFAULT_COCOON_TUNE) {
  if (!cocoonSprite) return 1;

  const originY = tune.cocoonOriginY ?? DEFAULT_COCOON_TUNE.cocoonOriginY;
  cocoonSprite.setOrigin(0.5, originY);

  const { height: frameH } = getCocoonFrameSize(cocoonSprite);
  const heightRatio = tune.cocoonHeightRatio ?? DEFAULT_COCOON_TUNE.cocoonHeightRatio;
  const scale = (screenHeight * heightRatio) / frameH;
  cocoonSprite.setScale(scale);
  cocoonSprite.setRoundPixels?.(true);

  if (!trunkImage) {
    cocoonSprite.setPosition(
      Math.round(cocoonSprite.scene.scale.width / 2),
      Math.round(screenHeight * 0.58),
    );
    return scale;
  }

  const hangX = tune.cocoonHangXRatio ?? 0;
  const hangY = tune.cocoonHangYRatio ?? DEFAULT_COCOON_TUNE.cocoonHangYRatio;
  cocoonSprite.setPosition(
    Math.round(trunkImage.x + trunkImage.displayWidth * hangX),
    Math.round(trunkImage.y + trunkImage.displayHeight * hangY),
  );
  return scale;
}

/** Posiciona galho + casulo na tela. */
export function layoutCocoonStage(trunkImage, cocoonSprite, screenWidth, screenHeight, tune = DEFAULT_COCOON_TUNE) {
  layoutCocoonTrunk(trunkImage, screenWidth, screenHeight, tune);
  return layoutCocoonOnTrunk(cocoonSprite, trunkImage, screenHeight, tune);
}

/** @deprecated use layoutCocoonStage */
export function layoutCocoonSprite(sprite, screenWidth, screenHeight, opts = {}) {
  return layoutCocoonOnTrunk(sprite, null, screenHeight, { ...DEFAULT_COCOON_TUNE, ...opts });
}

export function getCocoonTapZone(cocoonSprite, tune = DEFAULT_COCOON_TUNE) {
  if (!cocoonSprite?.active) return null;
  const bounds = cocoonSprite.getBounds();
  const padX = tune.tapHitPadX ?? DEFAULT_COCOON_TUNE.tapHitPadX;
  const padY = tune.tapHitPadY ?? DEFAULT_COCOON_TUNE.tapHitPadY;
  return {
    x: bounds.centerX,
    y: bounds.centerY,
    width: bounds.width * padX,
    height: bounds.height * padY,
  };
}

/** Frame parado — sem loop automático. */
export function showCocoonFrame(sprite, frameIndex) {
  if (!sprite) return;
  sprite.anims?.stop();
  sprite.setAngle(0);
  sprite.setFrame(Math.max(0, Math.min(frameIndex, COCOON_FRAME_COUNT - 1)));
}

/** Garante cortes exatos dos 6 frames — evita “metade de outro casulo” após scale na GPU. */
export function patchCocoonFrames(scene) {
  if (!scene.textures.exists(COCOON_WOBBLE_KEY)) return;

  const tex = scene.textures.get(COCOON_WOBBLE_KEY);
  const source = tex.getSourceImage();
  if (!source?.width || !source?.height) return;

  const totalW = source.width;
  const totalH = source.height;
  const fw = Math.floor(totalW / COCOON_FRAME_COUNT);

  for (let i = 0; i < COCOON_FRAME_COUNT; i++) {
    if (tex.has(i)) tex.remove(i);
    const x = i * fw;
    const w = i === COCOON_FRAME_COUNT - 1 ? totalW - x : fw;
    tex.add(i, 0, x, 0, w, totalH);
  }
}

export function registerCocoonAnimations(scene) {
  if (!scene.textures.exists(COCOON_WOBBLE_KEY)) return;

  if (!scene.anims.exists(COCOON_WOBBLE_ANIM)) {
    scene.anims.create({
      key: COCOON_WOBBLE_ANIM,
      frames: scene.anims.generateFrameNumbers(COCOON_WOBBLE_KEY, {
        start: 0,
        end: COCOON_FRAME_COUNT - 1,
      }),
      frameRate: COCOON_WOBBLE_FRAME_RATE,
      repeat: 0,
    });
  }

  if (!scene.anims.exists(COCOON_OPEN_ANIM) && COCOON_FRAME_COUNT > 2) {
    scene.anims.create({
      key: COCOON_OPEN_ANIM,
      frames: scene.anims.generateFrameNumbers(COCOON_WOBBLE_KEY, {
        start: Math.max(0, COCOON_FRAME_COUNT - 3),
        end: COCOON_FRAME_COUNT - 1,
      }),
      frameRate: COCOON_OPEN_FRAME_RATE,
      repeat: 0,
    });
  }
}
