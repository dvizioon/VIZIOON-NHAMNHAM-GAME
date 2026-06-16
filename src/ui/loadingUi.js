import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale } from '../utils/responsive.js';

export const LOADING_UI_KEYS = {
  logo: 'ui_logo_sem_tronco',
  ring: 'ui_loading',
  trunkTop: 'ui_trunk_top',
  trunkBottom: 'ui_trunk_bottom',
  headSheet: 'loading_head_walk',
};

const HEAD_FRAME_W = 575;
const HEAD_FRAME_H = 502;
const HEAD_SHEET_SPACING = 100;
const HEAD_IDLE_FRAME = 0;
const HEAD_BLINK_FRAME = 3;
const HEAD_BLINK_OPEN_FRAME = 2;
const HEAD_BLINK_MIN_MS = 4500;
const HEAD_BLINK_MAX_MS = 9000;
const HEAD_BLINK_HOLD_MS = 220;
const HEAD_BLINK_OPEN_MS = 130;
/** Pivot visual da cabeça no anel (arte não fica no centro geométrico do frame) */
const HEAD_ORIGIN_X = 0.43;
const HEAD_ORIGIN_Y = 0.58;
const HEAD_CENTER_OFFSET_X = 0.04;
const HEAD_CENTER_OFFSET_Y = -0.05;
/** Empurra anel + % um pouco pra cima dentro da faixa útil */
const LOADING_CENTER_SHIFT_RATIO = -0.032;
const LOADING_CONTENT_PAD_RATIO = 0.022;
/** % mais abaixo do anel */
const LOADING_PCT_GAP_RATIO = 0.34;
const LOADING_PCT_EXTRA_DOWN_RATIO = 0.045;
/** Tronco de baixo desgruda da borda */
const LOADING_BOTTOM_TRUNK_INSET_RATIO = 0.028;

export function queueLoadingUiAssets(scene) {
  scene.load.image(LOADING_UI_KEYS.logo, 'assets/textures/ui/LogoSemTronco.svg');
  scene.load.image(LOADING_UI_KEYS.ring, 'assets/textures/ui/Loading.svg');
  scene.load.image(LOADING_UI_KEYS.trunkTop, 'assets/textures/ui/Tronco_Top_Horinzontal.svg');
  scene.load.image(LOADING_UI_KEYS.trunkBottom, 'assets/textures/ui/Tronco_Bottom_Horinzontal.svg');
  scene.load.spritesheet(
    LOADING_UI_KEYS.headSheet,
    'assets/sprites/characters/caterpillar/cabe%C3%A7a_andando.png',
    {
      frameWidth: HEAD_FRAME_W,
      frameHeight: HEAD_FRAME_H,
      spacing: HEAD_SHEET_SPACING,
    },
  );
}

function startLoadingHeadBlink(scene, head) {
  let blinkTimer = null;

  const clearBlink = () => {
    blinkTimer?.remove(false);
    blinkTimer = null;
  };

  const scheduleBlink = () => {
    clearBlink();
    blinkTimer = scene.time.delayedCall(
      Phaser.Math.Between(HEAD_BLINK_MIN_MS, HEAD_BLINK_MAX_MS),
      () => {
        head.setFrame(HEAD_BLINK_FRAME);
        scene.time.delayedCall(HEAD_BLINK_HOLD_MS, () => {
          if (!head.active) return;
          head.setFrame(HEAD_BLINK_OPEN_FRAME);
          scene.time.delayedCall(HEAD_BLINK_OPEN_MS, () => {
            if (!head.active) return;
            head.setFrame(HEAD_IDLE_FRAME);
            scheduleBlink();
          });
        });
      },
    );
  };

  head.setFrame(HEAD_IDLE_FRAME);
  scheduleBlink();
  scene.events.once('shutdown', clearBlink);
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

  const bottomInset = Math.max(10, height * LOADING_BOTTOM_TRUNK_INSET_RATIO);
  const bottomLog = scene.add.image(width / 2, height - bottomInset, LOADING_UI_KEYS.trunkBottom)
    .setOrigin(0.5, 1)
    .setDepth(1);
  fitImageWidth(bottomLog, logW);

  const logoW = width * 0.72;
  const logo = scene.add.image(width / 2, topH + Math.max(14, height * 0.018), LOADING_UI_KEYS.logo)
    .setOrigin(0.5, 0)
    .setDepth(2);
  fitImageWidth(logo, logoW);

  const contentPad = Math.max(10, height * LOADING_CONTENT_PAD_RATIO);
  const contentTop = logo.y + logo.displayHeight + contentPad;
  const contentBottom = bottomLog.y - bottomLog.displayHeight - contentPad;
  const centerY = (contentTop + contentBottom) / 2 + height * LOADING_CENTER_SHIFT_RATIO;
  const ringSize = Math.min(width * 0.56, (contentBottom - contentTop) * 0.72);

  const ring = scene.add.image(width / 2, centerY, LOADING_UI_KEYS.ring)
    .setOrigin(0.5, 0.5)
    .setDisplaySize(ringSize, ringSize)
    .setDepth(3);

  scene.tweens.add({
    targets: ring,
    angle: 360,
    duration: 3200,
    repeat: -1,
    ease: 'Linear',
  });

  const headW = ringSize * 0.44;
  const headH = headW * (HEAD_FRAME_H / HEAD_FRAME_W);
  const hasHeadSheet = scene.textures.exists(LOADING_UI_KEYS.headSheet)
    && scene.textures.get(LOADING_UI_KEYS.headSheet).frameTotal > 0;

  if (hasHeadSheet) {
    const head = scene.add.sprite(
      width / 2 + headW * HEAD_CENTER_OFFSET_X,
      centerY + headH * HEAD_CENTER_OFFSET_Y,
      LOADING_UI_KEYS.headSheet,
      HEAD_IDLE_FRAME,
    )
      .setOrigin(HEAD_ORIGIN_X, HEAD_ORIGIN_Y)
      .setDisplaySize(headW, headH)
      .setDepth(4);
    startLoadingHeadBlink(scene, head);
  }

  const pctSize = Math.max(28, Math.round(32 * s));
  const pctY = Math.min(
    centerY
      + ringSize * 0.5
      + ringSize * LOADING_PCT_GAP_RATIO
      + Math.max(16, height * LOADING_PCT_EXTRA_DOWN_RATIO),
    contentBottom - pctSize * 0.55,
  );
  const pctText = scene.add.text(width / 2, pctY, '0%', {
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
