function syncCanvasDataUrl(scene) {
  const canvas = scene?.game?.canvas;
  if (!canvas) return null;

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/** Converte Image do snapshot Phaser em data URL PNG. */
export function imageToDataUrl(image) {
  if (!image) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/**
 * Captura o canvas do jogo como data URL PNG.
 * Usa renderer.snapshot (WebGL) — toDataURL direto costuma sair preto.
 */
export function captureGameDataUrl(scene) {
  const renderer = scene?.game?.renderer;
  if (!renderer || typeof renderer.snapshot !== 'function') {
    return Promise.resolve(syncCanvasDataUrl(scene));
  }

  return new Promise((resolve) => {
    try {
      renderer.snapshot((image) => {
        resolve(imageToDataUrl(image) ?? syncCanvasDataUrl(scene));
      }, 'image/png');
    } catch {
      resolve(syncCanvasDataUrl(scene));
    }
  });
}

/** Dispara download de um data URL PNG. */
export function downloadFromDataUrl(dataUrl, filename = 'nhamnham-borboleta.png') {
  if (!dataUrl) return false;

  try {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
    return true;
  } catch {
    return false;
  }
}

/** Salva o canvas do jogo como PNG. */
export async function downloadGameScreenshot(scene, filename = 'nhamnham-borboleta.png') {
  const dataUrl = await captureGameDataUrl(scene);
  return downloadFromDataUrl(dataUrl, filename);
}

function loadDataUrlTexture(scene, key, dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (!scene.textures.exists(key)) {
        scene.textures.addImage(key, img);
      }
      resolve(key);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/** Carrega um snapshot do jogo como textura Phaser (preview no modal de foto). */
export async function loadGameSnapshotTexture(scene, dataUrl) {
  const key = `victory_snap_${Date.now()}`;
  await loadDataUrlTexture(scene, key, dataUrl);
  return key;
}
