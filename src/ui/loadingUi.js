import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale } from '../utils/responsive.js';

export const LOADING_UI_KEYS = {
  ring: 'ui_loading',
  trunkTop: 'ui_trunk_top',
  trunkBottom: 'ui_trunk_bottom',
  headSheet: 'loading_head_walk',
  headAnim: 'loading_head_walk',
};

const HEAD_FRAME_W = 641;
const HEAD_FRAME_H = 804;

export function queueLoadingUiAssets(scene) {
  scene.load.image(LOADING_UI_KEYS.ring, 'assets/textures/ui/Loading.svg');
  scene.load.image(LOADING_UI_KEYS.trunkTop, 'assets/textures/ui/Tronco_Top_Horinzontal.svg');
  scene.load.image(LOADING_UI_KEYS.trunkBottom, 'assets/textures/ui/Tronco_Bottom_Horinzontal.svg');
  scene.load.spritesheet(LOADING_UI_KEYS.headSheet, 'assets/sprites/characters/cabe%C3%A7a_andando.png', {
    frameWidth: HEAD_FRAME_W,
    frameHeight: HEAD_FRAME_H,
  });
}

export function registerLoadingHeadAnim(scene) {
  const { headSheet, headAnim } = LOADING_UI_KEYS;
  if (scene.anims.exists(headAnim) || !scene.textures.exists(headSheet)) return;

  scene.anims.create({
    key: headAnim,
    frames: [0, 1, 2, 1].map((frame) => ({ key: headSheet, frame })),
    frameRate: 7,
    repeat: -1,
  });
}

function fitImageWidth(img, targetW) {
  const ratio = img.height / img.width;
  img.setDisplaySize(targetW, targetW * ratio);
  return img.displayHeight;
}

export function buildLoadingScreen(scene) {
  const { width, height } = scene.scale;
  const s = uiScale(scene);
  const logW = width * 0.94;

  scene.add.rectangle(width / 2, height / 2, width, height, Theme.papel).setDepth(0);

  const topLog = scene.add.image(width / 2, 0, LOADING_UI_KEYS.trunkTop)
    .setOrigin(0.5, 0)
    .setDepth(1);
  const topH = fitImageWidth(topLog, logW);

  const bottomLog = scene.add.image(width / 2, height, LOADING_UI_KEYS.trunkBottom)
    .setOrigin(0.5, 1)
    .setDepth(1);
  fitImageWidth(bottomLog, logW);

  const titleSize = Math.max(34, Math.round(width * 0.1 * s));
  scene.add.text(width / 2, topH + Math.max(18, height * 0.022), 'Nhoc Nhoc!', {
    fontFamily: Theme.fontFamily,
    fontSize: `${titleSize}px`,
    color: '#4E9A2E',
    fontStyle: 'bold',
  }).setOrigin(0.5, 0).setDepth(2);

  const centerY = height * 0.5;
  const ringSize = Math.min(width * 0.56, height * 0.3);

  const ring = scene.add.image(width / 2, centerY, LOADING_UI_KEYS.ring)
    .setDisplaySize(ringSize, ringSize)
    .setDepth(3);

  scene.tweens.add({
    targets: ring,
    angle: 360,
    duration: 3200,
    repeat: -1,
    ease: 'Linear',
  });

  const headW = ringSize * 0.36;
  const headH = headW * (HEAD_FRAME_H / HEAD_FRAME_W);
  const head = scene.add.sprite(width / 2, centerY, LOADING_UI_KEYS.headSheet, 1)
    .setDisplaySize(headW, headH)
    .setDepth(4);

  if (scene.anims.exists(LOADING_UI_KEYS.headAnim)) {
    head.play(LOADING_UI_KEYS.headAnim);
  }

  const pctSize = Math.max(28, Math.round(32 * s));
  const pctText = scene.add.text(width / 2, centerY + ringSize * 0.62 + Math.max(12, height * 0.018), '0%', {
    fontFamily: Theme.fontFamily,
    fontSize: `${pctSize}px`,
    color: '#490808',
    fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(5);

  return {
    setProgress(value) {
      pctText.setText(`${Math.round(Phaser.Math.Clamp(value, 0, 1) * 100)}%`);
    },
  };
}
