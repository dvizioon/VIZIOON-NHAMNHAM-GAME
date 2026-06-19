import Phaser from 'phaser';

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

export const COCOON_STORY_CARD_Y_RATIO = 0.16;
export const COCOON_HINT_Y_RATIO = 0.95;
export const COCOON_TRUNK_DEPTH = 12;
export const COCOON_SPRITE_DEPTH = 6;
export const COCOON_FROG_DEPTH = 10;
export const COCOON_WOBBLE_FRAME_MS = [100, 95, 90, 95, 100, 105];

/** Um único ciclo do spritesheet — 0→5 e volta ao 0 em cada toque */
export const COCOON_WOBBLE_FRAME_SEQUENCE = [0, 1, 2, 3, 4, 5, 0];
/** 2º toque: mesmo ciclo até o frame aberto (segura no último) */
export const COCOON_OPEN_FRAME_SEQUENCE = [0, 1, 2, 3, 4, 5];
export const COCOON_TAP_WOBBLE_MS = 100;
export const COCOON_OPEN_FRAME_MS = 105;

export const COCOON_FRAME_BODY_OFFSET = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];


export const DEFAULT_COCOON_TUNE = {
  trunkWidthRatio: 1.1,
  trunkYRatio: 0.47,
  cocoonHangXRatio: 0.04,
  cocoonHangYRatio: 0.04,
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
    pinCocoonSprite(
      cocoonSprite,
      Math.round(cocoonSprite.scene.scale.width / 2),
      Math.round(screenHeight * 0.58),
    );
    return scale;
  }

  const hangX = tune.cocoonHangXRatio ?? 0;
  const hangY = tune.cocoonHangYRatio ?? DEFAULT_COCOON_TUNE.cocoonHangYRatio;
  const x = Math.round(trunkImage.x + trunkImage.displayWidth * hangX);
  const y = Math.round(trunkImage.y + trunkImage.displayHeight * hangY);
  pinCocoonSprite(cocoonSprite, x, y);
  return scale;
}

/** Fixa o ponto de pendurar (cabinho) — troca de frame sem deslocar na tela. */
export function pinCocoonSprite(sprite, x, y, frameIndex = 0) {
  if (!sprite) return;
  sprite.setData('cocoonPinX', x);
  sprite.setData('cocoonPinY', y);
  setCocoonFrame(sprite, frameIndex);
}

export function stopCocoonAnim(sprite) {
  if (!sprite) return;
  sprite.getData('cocoonAnimTimer')?.remove?.();
  sprite.setData('cocoonAnimTimer', null);
  sprite.anims?.stop();
}

/** Troca frame compensando o cabinho — corpo parado no galho. */
export function setCocoonFrame(sprite, frameIndex, { keepAnim = false } = {}) {
  if (!sprite) return;

  const pinX = sprite.getData('cocoonPinX');
  const pinY = sprite.getData('cocoonPinY');
  const frame = Phaser.Math.Clamp(frameIndex, 0, COCOON_FRAME_COUNT - 1);

  if (!keepAnim) stopCocoonAnim(sprite);
  sprite.setAngle(0);
  sprite.setFrame(frame);

  if (pinX == null || pinY == null) return;

  const offsets = sprite.scene?.registry?.get('cocoonFrameOffsets') ?? COCOON_FRAME_BODY_OFFSET;
  const off = offsets[frame] ?? { x: 0, y: 0 };
  const scale = sprite.scaleX || 1;
  sprite.setPosition(
    Math.round(pinX - off.x * scale),
    Math.round(pinY - off.y * scale),
  );
}

/** @deprecated use setCocoonFrame */
export function showCocoonFrame(sprite, frameIndex) {
  setCocoonFrame(sprite, frameIndex);
}

export function playCocoonFrameSequence(sprite, scene, frames, {
  onComplete,
  frameMs = COCOON_TAP_WOBBLE_MS,
  frameMsList = null,
  holdLast = false,
} = {}) {
  if (!sprite?.active || !scene || !frames?.length) return;

  stopCocoonAnim(sprite);
  let i = 0;

  const step = () => {
    if (!sprite.active) return;
    setCocoonFrame(sprite, frames[i], { keepAnim: true });
    i += 1;
    if (i >= frames.length) {
      sprite.setData('cocoonAnimTimer', null);
      if (!holdLast) setCocoonFrame(sprite, 0);
      onComplete?.();
      return;
    }
    const prevFrame = frames[i - 1];
    const delay = frameMsList?.[prevFrame] ?? frameMs;
    sprite.setData('cocoonAnimTimer', scene.time.delayedCall(delay, step));
  };

  step();
}

/** Mesmo ciclo do spritesheet em qualquer toque */
export function playCocoonTapWobble(sprite, scene, _tapIndex, { onComplete } = {}) {
  playCocoonWobbleAnim(sprite, scene, { onComplete });
}

export function playCocoonWobbleAnim(sprite, scene, { onComplete } = {}) {
  playCocoonFrameSequence(sprite, scene, COCOON_WOBBLE_FRAME_SEQUENCE, {
    onComplete,
    frameMsList: COCOON_WOBBLE_FRAME_MS,
  });
}

export function playCocoonOpenAnim(sprite, scene, { onComplete } = {}) {
  playCocoonFrameSequence(sprite, scene, COCOON_OPEN_FRAME_SEQUENCE, {
    onComplete,
    frameMsList: COCOON_WOBBLE_FRAME_MS,
    holdLast: true,
  });
}

function findStemInFrame(imageData, fw, fh, originY) {
  const targetX = Math.round(fw * 0.5);
  const minX = Math.max(0, targetX - 48);
  const maxX = Math.min(fw - 1, targetX + 48);

  for (let y = 0; y < fh; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const alpha = imageData[(y * fw + x) * 4 + 3];
      if (alpha > 12) {
        return { x, y };
      }
    }
  }

  return { x: targetX, y: Math.round(fh * originY) };
}

export function measureCocoonFrameOffsets(scene) {
  if (!scene.textures.exists(COCOON_WOBBLE_KEY)) return COCOON_FRAME_BODY_OFFSET;

  const source = scene.textures.get(COCOON_WOBBLE_KEY).getSourceImage();
  if (!source?.width) return COCOON_FRAME_BODY_OFFSET;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return COCOON_FRAME_BODY_OFFSET;

  const fw = Math.floor(source.width / COCOON_FRAME_COUNT);
  const fh = source.height;
  const originY = DEFAULT_COCOON_TUNE.cocoonOriginY;
  let ref = null;
  const offsets = [];

  for (let i = 0; i < COCOON_FRAME_COUNT; i += 1) {
    canvas.width = fw;
    canvas.height = fh;
    ctx.clearRect(0, 0, fw, fh);
    ctx.drawImage(source, i * fw, 0, fw, fh, 0, 0, fw, fh);
    const stem = findStemInFrame(ctx.getImageData(0, 0, fw, fh).data, fw, fh, originY);
    if (!ref) ref = stem;
    offsets.push({
      x: stem.x - ref.x,
      y: stem.y - ref.y,
    });
  }

  scene.registry.set('cocoonFrameOffsets', offsets);
  return offsets;
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

  const scale = cocoonSprite.scaleX || 1;
  const { width: fw, height: fh } = getCocoonFrameSize(cocoonSprite);
  const displayW = fw * scale;
  const displayH = fh * scale;
  const originY = cocoonSprite.originY ?? tune.cocoonOriginY ?? DEFAULT_COCOON_TUNE.cocoonOriginY;
  const pinX = cocoonSprite.getData('cocoonPinX') ?? cocoonSprite.x;
  const pinY = cocoonSprite.getData('cocoonPinY') ?? cocoonSprite.y;
  const padX = tune.tapHitPadX ?? DEFAULT_COCOON_TUNE.tapHitPadX;
  const padY = tune.tapHitPadY ?? DEFAULT_COCOON_TUNE.tapHitPadY;

  return {
    x: pinX,
    y: pinY + (0.5 - originY) * displayH,
    width: displayW * padX,
    height: displayH * padY,
  };
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
    tex.add(i, 0, i * fw, 0, fw, totalH);
  }

  measureCocoonFrameOffsets(scene);
}

export function registerCocoonAnimations(_scene) {
  // Animação manual via playCocoonWobbleAnim / playCocoonOpenAnim (frames parados no galho).
}
