/**
 * Iconify — ícones locais via @iconify-json (sem fetch na rede).
 *
 *   const play = Icon.from('solar:play-linear');
 *   await play.load(scene);
 *   scene.add.image(x, y, play.textureKey);
 */

import { getIconData, iconToSVG } from '@iconify/utils';

const COLLECTION_LOADERS = {
  mynaui: () => import('@iconify-json/mynaui/icons.json'),
  solar: () => import('@iconify-json/solar/icons.json'),
  hugeicons: () => import('@iconify-json/hugeicons/icons.json'),
};

const iconSetCache = new Map();
const pendingTextureLoads = new Map();
const ICON_COLOR = '#4E9A2E';

function colorSlug(color = ICON_COLOR) {
  return String(color).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'default';
}

async function getIconSet(collection) {
  if (!iconSetCache.has(collection)) {
    const mod = await COLLECTION_LOADERS[collection]();
    iconSetCache.set(collection, mod.default);
  }
  return iconSetCache.get(collection);
}

export function iconTextureKey(iconId, color = ICON_COLOR) {
  const [collection, name] = iconId.split(':');
  return `icon_${collection}_${name.replace(/-/g, '_')}_${colorSlug(color)}`;
}

/** Conjunto @iconify-json → string SVG pronta para rasterizar */
export function buildIconSvg(iconSet, name, { size = 24, color = ICON_COLOR } = {}) {
  const data = getIconData(iconSet, name);
  if (!data) throw new Error(`Ícone não encontrado: ${name}`);

  const { body, attributes } = iconToSVG(data);
  const viewBox = attributes.viewBox ?? `0 0 ${data.width ?? 24} ${data.height ?? 24}`;
  const coloredBody = body.replace(/currentColor/g, color);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}">${coloredBody}</svg>`;
}

/** SVG string → textura Phaser */
export function loadIconTexture(scene, key, svgRaw, { size = 48 } = {}) {
  if (scene.textures.exists(key)) return Promise.resolve(key);
  if (pendingTextureLoads.has(key)) return pendingTextureLoads.get(key);

  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    const encoded = encodeURIComponent(svgRaw).replace(/'/g, '%27').replace(/"/g, '%22');

    img.onload = () => {
      if (!scene.textures.exists(key)) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        scene.textures.addCanvas(key, canvas);
      }
      pendingTextureLoads.delete(key);
      resolve(key);
    };
    img.onerror = () => {
      pendingTextureLoads.delete(key);
      reject(new Error(`Falha ao carregar ícone: ${key}`));
    };
    img.src = `data:image/svg+xml,${encoded}`;
  });

  pendingTextureLoads.set(key, promise);
  return promise;
}

export class Icon {
  constructor(iconId, { color = ICON_COLOR, designSize = 24 } = {}) {
    this.iconId = iconId;
    this.color = color;
    this.designSize = designSize;
    this.textureKey = iconTextureKey(iconId, color);
  }

  static from(iconId, options) {
    return new Icon(iconId, options);
  }

  async load(scene, { rasterSize = this.designSize * 2 } = {}) {
    const [collection, name] = this.iconId.split(':');
    const iconSet = await getIconSet(collection);
    const svg = buildIconSvg(iconSet, name, {
      size: this.designSize,
      color: this.color,
    });
    return loadIconTexture(scene, this.textureKey, svg, { size: rasterSize });
  }

  static async preload(scene, icons) {
    await Promise.all(
      icons.map((icon) => (icon instanceof Icon ? icon : Icon.from(icon)).load(scene)),
    );
  }
}
