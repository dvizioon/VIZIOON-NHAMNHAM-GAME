import Phaser from 'phaser';
import { hasTexture } from '../systems/AssetLoader.js';
import {
  CHAR_HEAD_FRAME_COUNT,
  CHAR_HEAD_FRAME_W,
  CHAR_HEAD_FRAME_H,
  CHAR_HEAD_TEXTURE_SCALE_MUL,
  CHAR_HEAD_FACE_ORIGIN_X,
  CHAR_HEAD_FACE_ORIGIN_Y,
  CHAR_HEAD_FACE_OFFSET_X,
  CHAR_HEAD_FACE_OFFSET_Y,
  getCharacterHeadAnimKey,
  getCharacterHeadTextureKey,
} from '../config/characterUiConfig.js';

function headDisplaySize(r, headHeightRatio, headWidthRatio) {
  const headH = r * headHeightRatio;
  const aspect = headWidthRatio ?? (CHAR_HEAD_FRAME_W / CHAR_HEAD_FRAME_H);
  return { w: headH * aspect, h: headH };
}

function computeClimbHeadAnchor(bodySprite, headCfg = {}) {
  const ballTop = headCfg.ballTopRatio ?? 0.54;
  const oy = (headCfg.offsetY ?? 0.12) * bodySprite.displayHeight + (headCfg.offsetYPx ?? 0);
  const refW = headCfg.refBodyWidth ?? bodySprite.displayWidth ?? 0;
  const ox = (headCfg.offsetX ?? 0) * refW + (headCfg.offsetXPx ?? 0);
  return {
    x: ox,
    y: bodySprite.y - bodySprite.displayHeight * ballTop + oy,
  };
}

function setClimbHeadLock(headSprite, x, y) {
  headSprite.setData('climbHeadLockX', x);
  headSprite.setData('climbHeadLockY', y);
  headSprite.setPosition(x, y);
  headSprite.rotation = 0;
}

function applyClimbHeadLock(headSprite) {
  const x = headSprite.getData('climbHeadLockX');
  const y = headSprite.getData('climbHeadLockY');
  if (x == null || y == null) return;
  headSprite.setPosition(x, y);
  headSprite.rotation = 0;
}

/** Mesmo truque do CaterpillarSprite — tamanho do frame 0 em todos os frames */
export function normalizeClimbHeadDisplay(headSprite, lockFrame = null) {
  if (!headSprite?.active || !headSprite.frame) return;

  let normH = headSprite.getData('climbHeadNormH');
  if (normH == null) {
    normH = headSprite.displayHeight;
    headSprite.setData('climbHeadNormH', normH);
  }

  const lockIndex = lockFrame ?? headSprite.getData('climbHeadLockFrame') ?? 0;
  const texKey = headSprite.texture?.key;
  if (!texKey || !headSprite.scene?.textures?.exists(texKey)) return;

  const tex = headSprite.scene.textures.get(texKey);
  let fw = headSprite.frame.width;
  let fh = headSprite.frame.height;
  if (tex.has(lockIndex)) {
    const lf = tex.get(lockIndex);
    fw = lf.width;
    fh = lf.height;
  }
  if (!fh) return;
  headSprite.setDisplaySize((fw / fh) * normH, normH);
}

function refreshClimbHeadAfterFrame(headSprite) {
  normalizeClimbHeadDisplay(headSprite);
  applyClimbHeadLock(headSprite);
}

/** Troca de frame da animação não desloca a cabeça — só o desenho muda */
export function bindClimbHeadFrameLock(headSprite) {
  if (!headSprite?.active || headSprite.getData('climbHeadFrameLock')) return;

  const onFrameChange = () => refreshClimbHeadAfterFrame(headSprite);
  headSprite.setData('climbHeadFrameLock', true);
  headSprite.on('animationupdate', onFrameChange);
}

function finalizeClimbHeadAttach(headSprite, bodySprite, headCfg, headScaleMul) {
  if (!headSprite?.active || !bodySprite?.active) return;

  headSprite.setData('climbHeadLockFrame', headCfg.idleFrame ?? 0);
  headSprite.setData('climbHeadNormH', headSprite.displayHeight);
  headSprite.setData('climbHeadRefBodyW', bodySprite.displayWidth ?? 0);
  headSprite.setData('cabecaScaleMul', headScaleMul);

  normalizeClimbHeadDisplay(headSprite);

  const refW = bodySprite.displayWidth ?? 0;
  const anchor = computeClimbHeadAnchor(bodySprite, { ...headCfg, refBodyWidth: refW });
  setClimbHeadLock(headSprite, anchor.x, anchor.y);
  bindClimbHeadFrameLock(headSprite);
}

/** Cabeça animada — padrão ou spritesheet própria da criança (criancas.json → cabeca) */
export function createCharacterFace(scene, crianca, r, frameHint = 0, options = {}) {
  const {
    headHeightRatio = 2.0,
    headWidthRatio = null,
    originX = CHAR_HEAD_FACE_ORIGIN_X,
    originY = CHAR_HEAD_FACE_ORIGIN_Y,
    offsetX = CHAR_HEAD_FACE_OFFSET_X,
    offsetY = CHAR_HEAD_FACE_OFFSET_Y,
    animate = true,
  } = options;

  const wrap = scene.add.container(0, 0);
  const frame = Phaser.Math.Wrap(frameHint, 0, CHAR_HEAD_FRAME_COUNT);
  const textureKey = getCharacterHeadTextureKey(crianca);
  const animKey = getCharacterHeadAnimKey(crianca);

  if (hasTexture(scene, textureKey)) {
    const texture = scene.textures.get(textureKey);
    const safeFrame = texture.has(frame) ? frame : 0;
    const head = scene.add.sprite(0, 0, textureKey, safeFrame);
    const { w, h } = headDisplaySize(r, headHeightRatio, headWidthRatio);
    head.setOrigin(originX, originY);
    head.setDisplaySize(w, h);
    head.setPosition(w * offsetX, h * offsetY);
    if (animate && scene.anims.exists(animKey) && texture.has(safeFrame)) {
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

/** Cabeça card de debug — intro via VITE_SCREEN_INIT */
export function attachDebugCardHeadToClimb(scene, container, bodySprite, scale, headCfg = {}) {
  const textureKey = headCfg.textureKey;
  const animKey = headCfg.animKey;
  if (!textureKey || !hasTexture(scene, textureKey) || !bodySprite?.displayHeight) return null;

  const headScaleMul = (headCfg.scaleMul ?? 1.48) * CHAR_HEAD_TEXTURE_SCALE_MUL;
  const headScale = scale * headScaleMul;
  const anchor = computeClimbHeadAnchor(bodySprite, headCfg);
  const originX = headCfg.origin?.x ?? 0.5;
  const originY = headCfg.origin?.y ?? 0.84;

  const head = scene.add.sprite(anchor.x, anchor.y, textureKey, headCfg.idleFrame ?? 0);
  head.setOrigin(originX, originY);
  head.setScale(headScale);

  if (animKey && scene.anims.exists(animKey)) {
    head.anims.play(animKey);
  }

  container.add(head);
  container.bringToTop(head);
  head.setData('cabecaScaleMul', headScaleMul);
  finalizeClimbHeadAttach(head, bodySprite, headCfg, headScaleMul);
  return head;
}

const INTRO_CATERPILLAR_HEAD_TEX = 'char_default_headIdle';
const INTRO_CATERPILLAR_HEAD_ANIM = 'char_default_headIdle';

/** Cabeça da lagarta (cabeça_parada) — balanço idle sobre o corpo climb */
export function attachCaterpillarHeadIdleToClimb(scene, container, bodySprite, scale, headCfg = {}) {
  const textureKey = headCfg.textureKey ?? INTRO_CATERPILLAR_HEAD_TEX;
  const animKey = headCfg.animKey ?? INTRO_CATERPILLAR_HEAD_ANIM;
  if (!hasTexture(scene, textureKey) || !bodySprite?.displayHeight) return null;

  const headScaleMul = (headCfg.scaleMul ?? 0.95) * CHAR_HEAD_TEXTURE_SCALE_MUL;
  const headScale = scale * headScaleMul;
  const anchor = computeClimbHeadAnchor(bodySprite, headCfg);
  const originX = headCfg.origin?.x ?? 0.5;
  const originY = headCfg.origin?.y ?? 0.84;

  const head = scene.add.sprite(anchor.x, anchor.y, textureKey, headCfg.idleFrame ?? 0);
  head.setOrigin(originX, originY);
  head.setScale(headScale);

  if (headCfg.animate !== false && animKey && scene.anims.exists(animKey)) {
    head.anims.play(animKey);
  }

  container.add(head);
  container.bringToTop(head);
  head.setData('cabecaScaleMul', headScaleMul);
  finalizeClimbHeadAttach(head, bodySprite, headCfg, headScaleMul);
  return head;
}

/** Cabeça da criança (cabeca) sobre o sprite de subindo/climb */
export function attachCharacterCabecaToClimb(scene, container, bodySprite, crianca, scale, headCfg = {}) {
  const textureKey = getCharacterHeadTextureKey(crianca);
  const animKey = getCharacterHeadAnimKey(crianca);
  if (!hasTexture(scene, textureKey) || !bodySprite?.displayHeight) return null;

  const headScaleMul = (headCfg.scaleMul ?? 1.48) * CHAR_HEAD_TEXTURE_SCALE_MUL;
  const headScale = scale * headScaleMul;
  const anchor = computeClimbHeadAnchor(bodySprite, headCfg);
  const originX = headCfg.origin?.x ?? 0.5;
  const originY = headCfg.origin?.y ?? 0.84;

  const head = scene.add.sprite(anchor.x, anchor.y, textureKey, headCfg.idleFrame ?? 0);
  head.setOrigin(originX, originY);
  head.setScale(headScale);

  if (scene.anims.exists(animKey)) {
    head.anims.play(animKey);
  }

  container.add(head);
  container.bringToTop(head);
  head.setData('cabecaScaleMul', headScaleMul);
  finalizeClimbHeadAttach(head, bodySprite, headCfg, headScaleMul);
  return head;
}

export function syncCabecaToClimbBody(headSprite, bodySprite, scale, headCfg = {}) {
  if (!headSprite?.active || !bodySprite?.active) return;
  const refW = headSprite.getData('climbHeadRefBodyW') ?? bodySprite.displayWidth ?? 0;
  const anchor = computeClimbHeadAnchor(bodySprite, { ...headCfg, refBodyWidth: refW });
  setClimbHeadLock(headSprite, anchor.x, anchor.y);
  normalizeClimbHeadDisplay(headSprite);
}
