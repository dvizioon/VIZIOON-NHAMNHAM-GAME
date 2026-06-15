import Phaser from 'phaser';
import { hasTexture } from '../systems/AssetLoader.js';
import {
  CHAR_HEAD_FRAME_COUNT,
  CHAR_HEAD_FRAME_W,
  CHAR_HEAD_FRAME_H,
  getCharacterHeadAnimKey,
  getCharacterHeadTextureKey,
} from '../config/characterUiConfig.js';

function headDisplaySize(r, headHeightRatio, headWidthRatio) {
  const headH = r * headHeightRatio;
  const aspect = headWidthRatio ?? (CHAR_HEAD_FRAME_W / CHAR_HEAD_FRAME_H);
  return { w: headH * aspect, h: headH };
}

/** Cabeça animada — padrão ou spritesheet própria da criança (criancas.json → cabeca) */
export function createCharacterFace(scene, crianca, r, frameHint = 0, options = {}) {
  const { headHeightRatio = 2.0, headWidthRatio = null } = options;

  const wrap = scene.add.container(0, 2);
  const frame = Phaser.Math.Wrap(frameHint, 0, CHAR_HEAD_FRAME_COUNT);
  const textureKey = getCharacterHeadTextureKey(crianca);
  const animKey = getCharacterHeadAnimKey(crianca);

  if (hasTexture(scene, textureKey)) {
    const texture = scene.textures.get(textureKey);
    const safeFrame = texture.has(frame) ? frame : 0;
    const head = scene.add.sprite(0, 0, textureKey, safeFrame);
    head.setOrigin(0.5, 0.58);
    const { w, h } = headDisplaySize(r, headHeightRatio, headWidthRatio);
    head.setDisplaySize(w, h);
    if (scene.anims.exists(animKey) && texture.has(safeFrame)) {
      head.anims.play(animKey);
    }
    wrap.add(head);
  } else {
    const emoji = scene.add.text(0, 0, crianca.genero === 'menina' ? '🌸' : '🐛', {
      fontSize: `${Math.round(r * 1.3)}px`,
    }).setOrigin(0.5);
    wrap.add(emoji);
  }

  return wrap;
}
