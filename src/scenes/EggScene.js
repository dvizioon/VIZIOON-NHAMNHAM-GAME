import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { drawEnvironmentLayers } from '../ui/createUI.js';
import { UI_DECO_3FOLHAS_KEY } from '../ui/settingsUi.js';
import { createEggStoryCard, preloadEggIcons } from '../ui/eggUi.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { createCharacterFace } from '../ui/characterAvatar.js';
import {
  CHAR_HEAD_FRAME_W,
  CHAR_HEAD_FRAME_H,
} from '../config/characterUiConfig.js';
import {
  EGG_WOBBLE_KEY,
  EGG_CRACK_KEY,
  EGG_OPEN_KEY,
  EGG_WOBBLE_ANIM,
  EGG_CLICKS_TO_HATCH,
  EGG_CRACK_FRAME_COUNT,
  EGG_LEAVES_X_RATIO,
  EGG_LEAVES_Y_RATIO,
  EGG_LEAVES_WIDTH_RATIO,
  EGG_LEAVES_ORIGIN_X,
  EGG_LEAVES_ORIGIN_Y,
  EGG_ON_LEAF_X_MUL,
  EGG_ON_LEAF_Y_MUL,
  EGG_STORY_CARD_Y_RATIO,
  EGG_DISPLAY_HEIGHT_RATIO,
  EGG_HATCH_NASCENDO_KEY,
  EGG_HATCH_FRAME_UP,
  EGG_HATCH_FRAME_DOWN,
  EGG_HATCH_SHELL_HEIGHT_MUL,
  EGG_HATCH_BODY_INSIDE_MUL,
  EGG_HATCH_BODY_OUT_MUL,
  EGG_HATCH_FACE_HEIGHT_MUL,
  EGG_HATCH_FACE_HEAD_RATIO,
  EGG_HATCH_FACE_Y_RATIO,
  EGG_HATCH_EGG_ORIGIN_X,
  EGG_HATCH_EGG_ORIGIN_Y,
  EGG_HATCH_BODY_ORIGIN_X,
  EGG_HATCH_BODY_ORIGIN_Y,
  EGG_HATCH_BODY_STACK_GAP,
  EGG_HATCH_SHELL_Y,
  EGG_HATCH_CHAR_START_Y,
  EGG_HATCH_CHAR_END_Y,
  EGG_HATCH_INSIDE_PAUSE_MS,
  EGG_HATCH_RISE_MS,
} from '../config/eggConfig.js';

/** Tela do ovo — folhas à direita, ovo balançando; 3 toques quebrando + 1 para nascer */
export class EggScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.EGG);
  }

  init() {
    this.cliques = 0;
    this.hatched = false;
    this.eggSprite = null;
    this.hitArea = null;
    this.hatchContainer = null;
    this.eggDisplayH = 0;
  }

  async create() {
    const { width, height } = this.scale;
    const child = GameState.getChild(this);

    drawEnvironmentLayers(this, { clouds: true });

    await preloadEggIcons(this);
    createEggStoryCard(this, width / 2, height * EGG_STORY_CARD_Y_RATIO, {
      nome: child?.nome ?? 'Lagartinha',
      genero: child?.genero ?? 'menino',
    });

    const leafW = Math.round(width * EGG_LEAVES_WIDTH_RATIO);
    const leafH = Math.round(leafW * (307 / 378));
    const leafX = width * EGG_LEAVES_X_RATIO;
    const leafY = height * EGG_LEAVES_Y_RATIO;

    if (this.textures.exists(UI_DECO_3FOLHAS_KEY)) {
      this.add
        .image(leafX, leafY, UI_DECO_3FOLHAS_KEY)
        .setDisplaySize(leafW, leafH)
        .setOrigin(EGG_LEAVES_ORIGIN_X, EGG_LEAVES_ORIGIN_Y)
        .setDepth(5);
    }

    const eggX = leafX + leafW * EGG_ON_LEAF_X_MUL;
    const eggY = leafY + leafH * EGG_ON_LEAF_Y_MUL;
    this.eggDisplayH = Math.round(height * EGG_DISPLAY_HEIGHT_RATIO);

    this.hatchContainer = this.add.container(eggX, eggY).setDepth(10);

    if (this.textures.exists(EGG_WOBBLE_KEY)) {
      this.eggSprite = this.add.sprite(0, 0, EGG_WOBBLE_KEY, 0).setOrigin(0.5, 0.72);
      this.fitEggDisplay(this.eggSprite, this.eggDisplayH);
      this.hatchContainer.add(this.eggSprite);

      if (this.anims.exists(EGG_WOBBLE_ANIM)) {
        this.eggSprite.anims.play(EGG_WOBBLE_ANIM);
      }
    }

    const hitW = this.eggDisplayH * 0.85;
    const hitH = this.eggDisplayH * 1.05;
    const hitCy = eggY - this.eggDisplayH * 0.2;
    this.hitArea = this.add
      .zone(eggX, hitCy, hitW, hitH)
      .setInteractive({ useHandCursor: true })
      .setDepth(15);
    this.hitArea.on('pointerup', () => this.onEggTap(child));

    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  fitEggDisplay(sprite, targetH) {
    const frame = sprite.frame;
    const ratio = frame?.height ? frame.height / frame.width : 804 / 664;
    sprite.setDisplaySize(targetH / ratio, targetH);
  }

  fitBodyDisplay(sprite, targetH) {
    const fh = sprite.frame?.height ?? 804;
    const fw = sprite.frame?.width ?? 653;
    sprite.setDisplaySize(targetH * (fw / fh), targetH);
  }

  syncHatchFace(bodyUp, faceWrap, baseBodyH, bodyScale = 1) {
    if (!bodyUp || !faceWrap) return;

    const bodyH = baseBodyH * bodyScale;
    const gap = baseBodyH * EGG_HATCH_BODY_STACK_GAP * bodyScale;
    const faceH = baseBodyH * EGG_HATCH_FACE_HEIGHT_MUL * bodyScale;
    const faceW = faceH * (CHAR_HEAD_FRAME_W / CHAR_HEAD_FRAME_H);
    const head = faceWrap.list?.[0];

    if (head?.setDisplaySize) {
      head.setDisplaySize(faceW, faceH);
    }

    faceWrap.setScale(1);
    faceWrap.setPosition(0, -gap - bodyH * EGG_HATCH_FACE_Y_RATIO);
  }

  startHatchRise(charWrap, bodyStack, bodyUp, faceWrap, bodyInsideH, bodyOutH, endY) {
    const scaleTo = bodyOutH / bodyInsideH;

    this.tweens.add({
      targets: charWrap,
      y: endY,
      duration: EGG_HATCH_RISE_MS,
      ease: 'Sine.easeOut',
    });

    this.tweens.add({
      targets: bodyStack,
      scale: scaleTo,
      duration: EGG_HATCH_RISE_MS,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this.syncHatchFace(bodyUp, faceWrap, bodyInsideH, bodyStack.scale);
      },
    });
  }

  layoutHatchBodies(bodyUp, bodyDown, bodyH) {
    const gap = bodyH * EGG_HATCH_BODY_STACK_GAP;
    bodyUp.setPosition(0, -gap);
    bodyDown.setPosition(0, gap);
  }

  onEggTap(child) {
    if (this.hatched || !this.eggSprite) return;

    this.cliques++;
    const crackFrame = this.cliques - 1;
    const isLast = this.cliques >= EGG_CLICKS_TO_HATCH;
    playSound(this, isLast ? 'nascer' : 'egg_crack');

    this.eggSprite.anims?.stop();
    this.tweens.killTweensOf(this.eggSprite);

    if (isLast) {
      this.revealHatch(child);
      return;
    }

    if (crackFrame < EGG_CRACK_FRAME_COUNT) {
      this.showCrackFrame(crackFrame);
    }

    this.tweens.add({
      targets: this.eggSprite,
      angle: { from: -6, to: 6 },
      duration: 260,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.eggSprite) this.eggSprite.setAngle(0);
      },
    });
  }

  showCrackFrame(frameIndex) {
    if (!this.textures.exists(EGG_CRACK_KEY) || !this.eggSprite) return;

    const frame = Phaser.Math.Clamp(frameIndex, 0, EGG_CRACK_FRAME_COUNT - 1);
    this.eggSprite.setTexture(EGG_CRACK_KEY);
    this.eggSprite.setFrame(frame);
    this.fitEggDisplay(this.eggSprite, this.eggDisplayH);
  }

  revealHatch(child) {
    this.hatched = true;
    this.hitArea?.disableInteractive();

    const eggH = this.eggDisplayH;
    const shellH = Math.round(eggH * EGG_HATCH_SHELL_HEIGHT_MUL);
    const bodyInsideH = Math.round(eggH * EGG_HATCH_BODY_INSIDE_MUL);
    const bodyOutH = Math.round(eggH * EGG_HATCH_BODY_OUT_MUL);
    const shellY = eggH * EGG_HATCH_SHELL_Y;
    const startY = eggH * EGG_HATCH_CHAR_START_Y;
    const endY = eggH * EGG_HATCH_CHAR_END_Y;

    this.hatchContainer.removeAll(true);

    let bodyDown = null;
    let bodyUp = null;
    let bodyStack = null;
    let charWrap = null;
    let faceWrap = null;
    let shellSprite = null;

    if (this.textures.exists(EGG_HATCH_NASCENDO_KEY)) {
      charWrap = this.add.container(0, startY);
      bodyStack = this.add.container(0, 0);

      bodyDown = this.add
        .sprite(0, 0, EGG_HATCH_NASCENDO_KEY, EGG_HATCH_FRAME_DOWN)
        .setOrigin(EGG_HATCH_BODY_ORIGIN_X, EGG_HATCH_BODY_ORIGIN_Y);
      bodyUp = this.add
        .sprite(0, 0, EGG_HATCH_NASCENDO_KEY, EGG_HATCH_FRAME_UP)
        .setOrigin(EGG_HATCH_BODY_ORIGIN_X, EGG_HATCH_BODY_ORIGIN_Y);

      this.fitBodyDisplay(bodyDown, bodyInsideH);
      this.fitBodyDisplay(bodyUp, bodyInsideH);
      this.layoutHatchBodies(bodyUp, bodyDown, bodyInsideH);

      bodyStack.add([bodyDown, bodyUp]);

      const faceH = bodyInsideH * EGG_HATCH_FACE_HEIGHT_MUL;
      const faceR = faceH / EGG_HATCH_FACE_HEAD_RATIO;
      faceWrap = createCharacterFace(this, child, faceR, 0, {
        headHeightRatio: EGG_HATCH_FACE_HEAD_RATIO,
      });
      this.syncHatchFace(bodyUp, faceWrap, bodyInsideH);

      charWrap.add([bodyStack, faceWrap]);
      this.hatchContainer.add(charWrap);
    }

    if (this.textures.exists(EGG_OPEN_KEY)) {
      shellSprite = this.add
        .sprite(0, shellY, EGG_OPEN_KEY, 0)
        .setOrigin(EGG_HATCH_EGG_ORIGIN_X, EGG_HATCH_EGG_ORIGIN_Y);
      this.fitEggDisplay(shellSprite, shellH);
      this.hatchContainer.add(shellSprite);
      this.hatchContainer.bringToTop(shellSprite);
    }

    if (charWrap && bodyStack && bodyUp && faceWrap) {
      this.time.delayedCall(EGG_HATCH_INSIDE_PAUSE_MS, () => {
        this.startHatchRise(
          charWrap,
          bodyStack,
          bodyUp,
          faceWrap,
          bodyInsideH,
          bodyOutH,
          endY,
        );
      });
    }

    this.tweens.add({
      targets: this.hatchContainer,
      scaleY: { from: 0.96, to: 1 },
      duration: 400,
      ease: 'Back.easeOut',
    });

    this.time.delayedCall(2400, () => {
      this.cameras.main.fadeOut(450, 0, 0, 0);
      this.time.delayedCall(450, () => {
        GameState.setPoints(this, 0);
        this.scene.start(SceneKeys.TRUNK_INTRO);
      });
    });
  }
}
