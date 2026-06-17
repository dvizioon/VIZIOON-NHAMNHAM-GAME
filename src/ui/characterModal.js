import Phaser from 'phaser';
import { Theme } from '../config/theme.js';

import { uiScale } from '../utils/responsive.js';

import { createButton, showWarningAlert } from './createUI.js';

import { createIconCircleButton } from './splashUi.js';

import { Icon } from './iconify.js';

import { getCharacterProfile, CHAR_TEXT_COLOR } from '../config/characterUiConfig.js';

import { createCharacterFace } from './characterAvatar.js';

import { playSound } from '../systems/ProceduralAudio.js';



const MODAL_DEPTH = 180;

const CLOSE_ICON = Icon.from('solar:close-circle-bold', { designSize: 24, color: '#4E9A2E' });

const CUSTOMIZE_ICON = Icon.from('solar:palette-bold', { designSize: 24, color: '#1E6A30' });



function buildModalAvatar(scene, crianca, r, frameHint) {

  const accent = crianca.genero === 'menina' ? Theme.rosa : Theme.verde;

  const wrap = scene.add.container(0, 0);



  const shadow = scene.add.graphics();

  shadow.fillStyle(0x000000, 0.12);

  shadow.fillCircle(4, 6, r + 10);



  const base = scene.add.graphics();

  base.fillStyle(0xffffff, 1);

  base.fillCircle(0, 0, r + 8);

  base.lineStyle(5, Theme.folhaEscura, 0.25);

  base.strokeCircle(0, 0, r + 8);



  const ring = scene.add.graphics();

  ring.fillStyle(accent, 0.18);

  ring.lineStyle(6, accent, 1);

  ring.fillCircle(0, 0, r);

  ring.strokeCircle(0, 0, r);



  const face = createCharacterFace(scene, crianca, r, frameHint, {
    headHeightRatio: 2.3,
  });



  wrap.add([shadow, base, ring, face]);

  return wrap;

}



/** Modal — clique fora fecha; dentro do painel não */

export async function openCharacterDetailModal(scene, crianca, {

  onPlay,

  onClose,

  frameHint = 0,

} = {}) {

  const { width, height } = scene.scale;

  const s = uiScale(scene);

  const profile = getCharacterProfile(crianca);



  await Icon.preload(scene, [CLOSE_ICON, CUSTOMIZE_ICON]);



  const panelW = Math.min(Math.round(width * 0.88), 360);

  const avatarR = Math.round(panelW * 0.18);

  const bioFont = Math.max(15, Math.round(17 * s));

  const bioWrap = panelW * 0.82;



  const measureBio = scene.add.text(0, 0, profile.personalidade, {

    fontFamily: Theme.fontFamily,

    fontSize: `${bioFont}px`,

    wordWrap: { width: bioWrap },

    lineSpacing: 6,

  }).setVisible(false);

  const bioH = measureBio.height;

  measureBio.destroy();



  const btnH = 56;

  const navBtnSize = 52;

  const actionsGap = 28;

  const topPad = 22;

  const bottomPad = 20;

  const panelH = Math.min(

    height * 0.68,

    Math.max(

      Math.round(height * 0.5),

      topPad + avatarR * 2 + 34 + 26 + 16 + 12 + bioH + actionsGap + btnH + bottomPad,

    ),

  );



  const cx = width / 2;

  const cy = height * 0.46;

  const root = scene.add.container(0, 0).setDepth(MODAL_DEPTH);



  const overlay = scene.add.rectangle(cx, height / 2, width, height, 0x061018, 0.68);

  overlay.setInteractive({ useHandCursor: false });



  const panel = scene.add.container(cx, cy);

  const panelBg = scene.add.graphics();

  panelBg.fillStyle(Theme.papel, 1);

  panelBg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 26);

  panelBg.lineStyle(5, Theme.folhaEscura, 1);

  panelBg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 26);



  panel.add(panelBg);

  panel.setSize(panelW, panelH);

  panel.setInteractive(

    new Phaser.Geom.Rectangle(-panelW / 2, -panelH / 2, panelW, panelH),

    Phaser.Geom.Rectangle.Contains,

  );



  const top = -panelH / 2;



  const closeBtn = createIconCircleButton(

    scene,

    panelW / 2 - 28,

    top + 28,

    CLOSE_ICON,

    {

      size: 44,

      iconSize: 24,

      fillColor: Theme.papel,

      borderScale: 0.92,

      showBorder: true,

      borderTint: Theme.folhaEscura,

      absoluteSize: true,

      depth: 0,

      onClick: () => {

        playSound(scene, 'clique');

        close();

      },

    },

  );

  panel.add(closeBtn);



  const avatar = buildModalAvatar(scene, crianca, avatarR, frameHint);

  const avatarY = top + topPad + avatarR;

  avatar.setY(avatarY);

  panel.add(avatar);



  const nameText = scene.add.text(0, avatarY + avatarR + 22, crianca.nome, {

    fontFamily: Theme.fontFamily,

    fontSize: `${Math.max(24, Math.round(28 * s))}px`,

    color: CHAR_TEXT_COLOR,

    fontStyle: 'bold',

    align: 'center',

  }).setOrigin(0.5);

  panel.add(nameText);



  const tipoText = scene.add.text(0, nameText.y + 24, profile.tipo, {

    fontFamily: Theme.fontFamily,

    fontSize: `${Math.max(14, Math.round(16 * s))}px`,

    color: CHAR_TEXT_COLOR,

    fontStyle: 'bold',

    align: 'center',

    letterSpacing: 1,

  }).setOrigin(0.5);

  panel.add(tipoText);



  const dividerY = tipoText.y + 16;

  const divider = scene.add.graphics();

  divider.lineStyle(2, CHAR_TEXT_COLOR, 0.2);

  divider.lineBetween(-panelW * 0.36, dividerY, panelW * 0.36, dividerY);

  panel.add(divider);



  const bioText = scene.add.text(0, dividerY + 12, profile.personalidade, {

    fontFamily: Theme.fontFamily,

    fontSize: `${bioFont}px`,

    color: CHAR_TEXT_COLOR,

    align: 'center',

    wordWrap: { width: bioWrap },

    lineSpacing: 6,

  }).setOrigin(0.5, 0);

  panel.add(bioText);



  const actionsY = panelH / 2 - bottomPad - btnH / 2;

  const playW = Math.round(panelW * 0.52);

  const btnGap = 14;

  const rowW = playW + btnGap + navBtnSize;

  const playX = -rowW / 2 + playW / 2;

  const customX = rowW / 2 - navBtnSize / 2;



  const playBtn = createButton(scene, playX, actionsY, 'JOGAR', {

    width: playW,

    fontSize: Math.max(22, Math.round(26 * s)),

    color: Theme.verde,

    onClick: () => {

      playSound(scene, 'clique');

      close(true);

      onPlay?.();

    },

  });

  panel.add(playBtn);



  const customBtn = createIconCircleButton(scene, customX, actionsY, CUSTOMIZE_ICON, {

    size: navBtnSize,

    iconSize: 24,

    fillColor: Theme.sol,

    borderScale: 1,

    showBorder: true,

    borderTint: Theme.folhaEscura,

    absoluteSize: true,

    depth: 0,

    onClick: () => {

      playSound(scene, 'clique');

      void showWarningAlert(

        scene,

        'Customização ainda não está disponível!\nEm breve você poderá deixar sua lagartinha ainda mais especial.',

        { depth: MODAL_DEPTH + 20 },

      );

    },

  });

  panel.add(customBtn);



  root.add([overlay, panel]);



  overlay.setAlpha(0);

  panel.setScale(0.88).setAlpha(0);

  scene.tweens.add({ targets: overlay, alpha: 1, duration: 220, ease: 'Sine.easeOut' });

  scene.tweens.add({ targets: panel, alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut' });



  let closed = false;

  function close(immediate = false) {

    if (closed) return;

    closed = true;

    if (immediate) {

      root.destroy();

      onClose?.();

      return;

    }

    scene.tweens.add({

      targets: [overlay, panel],

      alpha: 0,

      duration: 180,

      onComplete: () => {

        root.destroy();

        onClose?.();

      },

    });

  }



  overlay.on('pointerup', () => {

    playSound(scene, 'clique');

    close();

  });



  return { close };

}

