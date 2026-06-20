import { imageToDataUrl } from './captureScreenshot.js';
import { prepareButterflyPhotoPose } from '../ui/butterflyVisual.js';
import { VICTORY_PHOTO_CAPTURE } from '../config/victoryPhotoConfig.js';

const OUTPUT_SIZE = 512;

function waitFrames(scene, ms = 32) {
  return new Promise((resolve) => {
    scene.time.delayedCall(ms, resolve);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function getOpaqueBounds(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 12) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  return {
    minX,
    minY,
    maxX,
    maxY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
}

async function centerAndScaleButterfly(dataUrl, boxSize, fillRatio = 0.94) {
  if (!dataUrl) return null;

  try {
    const img = await loadImage(dataUrl);
    const src = document.createElement('canvas');
    src.width = img.width;
    src.height = img.height;
    const sctx = src.getContext('2d');
    sctx.drawImage(img, 0, 0);

    const imageData = sctx.getImageData(0, 0, src.width, src.height);
    const bounds = getOpaqueBounds(imageData.data, src.width, src.height);
    if (!bounds) return dataUrl;

    const pad = Math.round(Math.max(bounds.w, bounds.h) * 0.02);
    const cropX = Math.max(0, bounds.minX - pad);
    const cropY = Math.max(0, bounds.minY - pad);
    const cropW = Math.min(src.width - cropX, bounds.w + pad * 2);
    const cropH = Math.min(src.height - cropY, bounds.h + pad * 2);

    const out = document.createElement('canvas');
    out.width = boxSize;
    out.height = boxSize;
    const octx = out.getContext('2d');

    const target = boxSize * fillRatio;
    const scale = Math.min(target / cropW, target / cropH);
    const drawW = cropW * scale;
    const drawH = cropH * scale;

    octx.clearRect(0, 0, boxSize, boxSize);
    const shiftX = boxSize * VICTORY_PHOTO_CAPTURE.offsetXRatio;
    const shiftY = boxSize * VICTORY_PHOTO_CAPTURE.offsetYRatio;
    octx.drawImage(
      src,
      cropX,
      cropY,
      cropW,
      cropH,
      (boxSize - drawW) / 2 + shiftX,
      (boxSize - drawH) / 2 + shiftY,
      drawW,
      drawH,
    );

    return out.toDataURL('image/png');
  } catch {
    return dataUrl;
  }
}

function snapshotRenderTexture(scene, rt) {
  return new Promise((resolve) => {
    scene.time.delayedCall(0, () => {
      try {
        if (typeof rt.snapshot !== 'function') {
          rt.destroy(true);
          resolve(null);
          return;
        }

        rt.snapshot((image) => {
          const dataUrl = imageToDataUrl(image);
          rt.destroy(true);
          resolve(dataUrl);
        }, 'image/png');
      } catch {
        rt.destroy(true);
        resolve(null);
      }
    });
  });
}

/**
 * Renderiza só a borboleta em textura off-screen (fundo transparente).
 * Evita snapshot da tela inteira — não pisca e não captura overlay/UI.
 */
async function captureButterflyToDataUrl(scene, butterfly) {
  const bounds = butterfly.getBounds();
  const pad = Math.max(12, Math.round(Math.max(bounds.width, bounds.height) * 0.06));
  const size = Math.max(64, Math.ceil(Math.max(bounds.width, bounds.height)) + pad * 2);

  const rt = scene.make.renderTexture({ width: size, height: size, add: false }, false);
  if (!rt) return null;

  rt.clear();
  rt.capture(butterfly, { x: size / 2, y: size / 2 });
  rt.render();

  return snapshotRenderTexture(scene, rt);
}

/**
 * @returns {Promise<{ preview: string|null, download: string|null }>}
 */
export async function captureVictoryButterflyPhoto(scene, butterfly) {
  if (!butterfly?.active) return { preview: null, download: null };

  const restorePose = prepareButterflyPhotoPose(butterfly);
  await waitFrames(scene, 32);

  const raw = await captureButterflyToDataUrl(scene, butterfly);

  restorePose();

  if (!raw) return { preview: null, download: null };

  const output = await centerAndScaleButterfly(
    raw,
    OUTPUT_SIZE,
    VICTORY_PHOTO_CAPTURE.fillRatio,
  );

  return { preview: output, download: output };
}
