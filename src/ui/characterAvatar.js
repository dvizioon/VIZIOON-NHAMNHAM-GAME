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

/** Cabeça da criança (cabeca) sobre o sprite de subindo/climb */
export function attachCharacterCabecaToClimb(scene, container, bodySprite, crianca, scale, headCfg = {}) {
  const textureKey = getCharacterHeadTextureKey(crianca);
  const animKey = getCharacterHeadAnimKey(crianca);
  if (!hasTexture(scene, textureKey) || !bodySprite?.displayHeight) return null;

  const headScaleMul = headCfg.scaleMul ?? 1.48;
  const headScale = scale * headScaleMul;
  const ballTop = headCfg.ballTopRatio ?? 0.54;
  const oy = (headCfg.offsetY ?? 0.12) * bodySprite.displayHeight;
  const ox = (headCfg.offsetX ?? 0) * (bodySprite.displayWidth ?? 0);
  const originX = headCfg.origin?.x ?? 0.5;
  const originY = headCfg.origin?.y ?? 0.84;

  const head = scene.add.sprite(
    ox,
    bodySprite.y - bodySprite.displayHeight * ballTop + oy,
    textureKey,
    headCfg.idleFrame ?? 0,
  );
  head.setOrigin(originX, originY);
  head.setScale(headScale);

  if (scene.anims.exists(animKey)) {
    head.anims.play(animKey);
  }

  container.add(head);
  container.bringToTop(head);
  head.setData('cabecaScaleMul', headScaleMul);
  return head;
}

export function syncCabecaToClimbBody(headSprite, bodySprite, scale, headCfg = {}) {
  if (!headSprite?.active || !bodySprite?.active) return;
  const headScaleMul = headSprite.getData('cabecaScaleMul') ?? headCfg.scaleMul ?? 1.48;
  const headScale = scale * headScaleMul;
  const ballTop = headCfg.ballTopRatio ?? 0.54;
  const oy = (headCfg.offsetY ?? 0.12) * bodySprite.displayHeight;
  const ox = (headCfg.offsetX ?? 0) * (bodySprite.displayWidth ?? 0);
  headSprite.setPosition(
    ox,
    bodySprite.y - bodySprite.displayHeight * ballTop + oy,
  );
  headSprite.setScale(headScale);
}
