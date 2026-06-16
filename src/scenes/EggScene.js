import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { drawEnvironmentLayers } from '../ui/createUI.js';
import { UI_DECO_3FOLHAS_KEY } from '../ui/settingsUi.js';
import { createEggStoryCard, preloadEggIcons } from '../ui/eggUi.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { attachCharacterCabecaToClimb } from '../ui/characterAvatar.js';
import { getSpritesManifest } from '../systems/SpriteLoader.js';
import {
  EGG_WOBBLE_KEY,
  EGG_CRACK_KEY,
  EGG_OPEN_KEY,
  EGG_WOBBLE_ANIM,
  EGG_CLICKS_TO_HATCH,
  EGG_LEAVES_X_RATIO,
  EGG_LEAVES_Y_RATIO,
  EGG_LEAVES_WIDTH_RATIO,
  EGG_LEAVES_ORIGIN_X,
  EGG_LEAVES_ORIGIN_Y,
  EGG_ON_LEAF_X_MUL,
  EGG_ON_LEAF_Y_MUL,
  EGG_STORY_CARD_Y_RATIO,
  EGG_DISPLAY_HEIGHT_RATIO,
  EGG_HATCH_BODY_TEX,
  EGG_HATCH_BODY_FRAME,
  EGG_HATCH_BODY_HEIGHT_MUL,
  EGG_HATCH_HEAD_SCALE_MUL,
} from '../config/eggConfig.js';

/** Tela do ovo — folhas à direita, ovo balançando; 3 toques para chocar */
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

    drawEnvironmentLayers(this, { clouds: false });

    await preloadEggIcons(this);
    createEggStoryCard(this, width / 2, height * EGG_STORY_CARD_Y_RATIO, {
      nome: child?.nome ?? 'Lagartinha',
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

  onEggTap(child) {
    if (this.hatched || !this.eggSprite) return;

    this.cliques++;
    const isLast = this.cliques >= EGG_CLICKS_TO_HATCH;
    playSound(this, isLast ? 'nascer' : 'egg_crack');

    this.eggSprite.anims?.stop();
    this.tweens.killTweensOf(this.eggSprite);

    if (isLast) {
      this.revealHatch(child);
      return;
    }

    if (this.textures.exists(EGG_CRACK_KEY)) {
      this.eggSprite.setTexture(EGG_CRACK_KEY, this.cliques - 1);
      this.fitEggDisplay(this.eggSprite, this.eggDisplayH);
    }

    this.tweens.add({
      targets: this.eggSprite,
      angle: { from: -6, to: 6 },
      duration: 260,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  revealHatch(child) {
    this.hatched = true;
    this.hitArea?.disableInteractive();

    const eggH = this.eggDisplayH;
    const bodyH = Math.round(eggH * EGG_HATCH_BODY_HEIGHT_MUL);
    const frameH = this.textures.get(EGG_HATCH_BODY_TEX)?.get(0)?.height ?? 804;
    const bodyScale = bodyH / frameH;

    this.hatchContainer.removeAll(true);

    let bodySprite = null;
    let shellSprite = null;

    if (this.textures.exists(EGG_OPEN_KEY)) {
      shellSprite = this.add.sprite(0, eggH * 0.1, EGG_OPEN_KEY, 0).setOrigin(0.5, 0.72);
      this.fitEggDisplay(shellSprite, eggH);
      this.hatchContainer.add(shellSprite);
    }

    if (this.textures.exists(EGG_HATCH_BODY_TEX)) {
      bodySprite = this.add
        .sprite(0, eggH * 0.06, EGG_HATCH_BODY_TEX, EGG_HATCH_BODY_FRAME)
        .setOrigin(0.5, 0.92);
      this.fitBodyDisplay(bodySprite, bodyH);
      this.hatchContainer.add(bodySprite);

      const headCfg = {
        ...(getSpritesManifest().characters?.default?.head ?? {}),
        scaleMul: EGG_HATCH_HEAD_SCALE_MUL,
        ballTopRatio: 0.58,
        offsetY: -0.04,
      };
      attachCharacterCabecaToClimb(
        this,
        this.hatchContainer,
        bodySprite,
        child,
        bodyScale,
        headCfg,
      );
    }

    if (shellSprite && bodySprite) {
      this.hatchContainer.sendToBack(shellSprite);
    }

    this.tweens.add({
      targets: this.hatchContainer,
      scaleY: { from: 0.94, to: 1 },
      duration: 360,
      ease: 'Back.easeOut',
    });

    this.time.delayedCall(1800, () => {
      this.cameras.main.fadeOut(450, 0, 0, 0);
      this.time.delayedCall(450, () => {
        GameState.setPoints(this, 0);
        this.scene.start(SceneKeys.TRUNK_INTRO);
      });
    });
  }
}
