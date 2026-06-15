import { hasTexture } from './AssetLoader.js';

const DEFAULT_MAX = 2048;

/** Reduz imagens grandes para caber na GPU (WebGL max ~4096) */
export function capImageTexture(scene, key, maxDim = DEFAULT_MAX) {
  if (!hasTexture(scene, key)) return false;

  const source = scene.textures.get(key).getSourceImage();
  const w = source.width;
  const h = source.height;
  if (Math.max(w, h) <= maxDim) return true;

  const scale = maxDim / Math.max(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);

  scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
  return true;
}

/** Reduz spritesheet mantendo a grade de frames */
export function capSpritesheet(scene, key, frameWidth, frameHeight, maxDim = DEFAULT_MAX) {
  if (!hasTexture(scene, key)) return null;

  const source = scene.textures.get(key).getSourceImage();
  const w = source.width;
  const h = source.height;
  const scale = Math.max(w, h) > maxDim ? maxDim / Math.max(w, h) : 1;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);

  const fw = Math.round(frameWidth * scale);
  const fh = Math.round(frameHeight * scale);

  scene.textures.remove(key);
  scene.textures.addSpriteSheet(key, canvas, { frameWidth: fw, frameHeight: fh });

  return { frameWidth: fw, frameHeight: fh };
}
