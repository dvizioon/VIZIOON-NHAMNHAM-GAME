import { getLoadQueue } from '../config/assets.js';

/**
 * Carrega assets opcionais — ignora erros e registra o que carregou.
 */
/** Carrega JSON obrigatório + assets opcionais (ignora 404) */
export function queueOptionalAssets(scene) {
  const loaded = new Set();
  const failed = new Set();

  scene.load.on('filecomplete', (key) => loaded.add(key));
  scene.load.on('loaderror', (file) => failed.add(file.key));

  for (const item of getLoadQueue()) {
    if (item.type === 'json') {
      scene.load.json(item.key, item.url);
    }
  }

  return { loaded, failed };
}

/** Chame quando arquivos PNG/MP3 forem adicionados em public/assets/ */
export function queueMediaAssets(scene) {
  for (const item of getLoadQueue()) {
    if (item.type === 'image') {
      scene.load.image(item.key, item.url);
    } else if (item.type === 'audio') {
      scene.load.audio(item.key, item.url);
    }
  }
}

export function hasTexture(scene, key) {
  return scene.textures.exists(key) && scene.textures.get(key).key !== '__MISSING';
}
