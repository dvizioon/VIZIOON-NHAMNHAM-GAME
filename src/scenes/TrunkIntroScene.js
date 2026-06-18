import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { drawEnvironmentLayers, DEPTH_TRUNK } from '../ui/createUI.js';
import {
  drawBoundsHit,
  isDebugHitboxes,
} from '../utils/debug.js';
import {
  attachCharacterCabecaToClimb,
  attachCaterpillarHeadIdleToClimb,
  attachDebugCardHeadToClimb,
  syncCabecaToClimbBody,
} from '../ui/characterAvatar.js';
import { REGISTRY_DEBUG_CARD_HEAD } from '../debug/screenInit.js';
import {
  createTrunkStoryCard,
  createTrunkTapHint,
  preloadTrunkIntroIcons,
  setupTrunkIntroFallingFruits,
  cleanupTrunkIntroFallingFruits,
  TRUNK_STORY_CARD_Y_RATIO,
  TRUNK_HINT_Y_RATIO,
  TRUNK_CLIMBER_START_Y_RATIO,
  TRUNK_CLIMBER_END_Y_RATIO,
} from '../ui/trunkIntroUi.js';
import {
  INTRO_TRUNK_KEY,
  TRUNK_PLAY_WIDTH_RATIO,
  CLIMB_TEX,
  CLIMB_IDLE_TEX,
  CLIMB_ANIM,
  CLIMB_FRAME_WIDTH,
  INTRO_CLIMB_HEAD_SCALE_MUL,
  INTRO_CLIMB_HEAD_BALL_TOP,
  INTRO_CLIMB_HEAD_OFFSET_Y,
  INTRO_CLIMB_HEAD_OFFSET_X,
  INTRO_CLIMB_HEAD_OFFSET_Y_PX,
  INTRO_CLIMB_HEAD_OFFSET_X_PX,
  INTRO_CLIMB_SIZE_MUL,
  INTRO_TRUNK_Y_OFFSET_RATIO,
  INTRO_TRUNK_Y_OFFSET_PX,
  INTRO_TRUNK_HEIGHT_MUL,
  INTRO_TRUNK_STACK_SEGMENTS,
  INTRO_TRUNK_CLIMB_DROP_RATIO,
  INTRO_CLIMB_BODY_OFFSET_X,
  INTRO_CLIMBER_TAP_PAD_RATIO,
  DEBUG_CARD_HEAD_KEY,
  DEBUG_CARD_HEAD_ANIM,
} from '../config/gameWorldConfig.js';

const CLIMB_DURATION_MS = 3600;
const BODY_ORIGIN_Y = 0.92;

/** Tronco intro — parada_subindo.png → toque → subindo.png (5 passos) */
export class TrunkIntroScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.TRUNK_INTRO);
  }

  init() {
    this.climbing = false;
    this.storyCard = null;
    this.hintText = null;
    this.climberContainer = null;
    this.bodySprite = null;
    this.headSprite = null;
    this.climbScale = 1;
    this.pulseTween = null;
    this.idleTexKey = CLIMB_IDLE_TEX;
    this.climbTexKey = CLIMB_TEX;
    this.trunkImage = null;
    this.trunkContainer = null;
    this.trunkSegments = [];
    this.trunkStartY = 0;
    this._onClimbBodyFrame = null;
    this.tapHitRect = null;
  }

  async create() {
    const { width, height } = this.scale;
    const child = GameState.getChild(this);
    const nome = child?.nome ?? 'Lagartinha';
    const genero = child?.genero ?? 'menino';

    drawEnvironmentLayers(this);
    setupTrunkIntroFallingFruits(this);

    this.trunkStartY = Math.round(height * INTRO_TRUNK_Y_OFFSET_RATIO) + INTRO_TRUNK_Y_OFFSET_PX;
    this.buildIntroTrunk(width, height);

    await preloadTrunkIntroIcons(this);
    this.storyCard = createTrunkStoryCard(this, width / 2, height * TRUNK_STORY_CARD_Y_RATIO, {
      nome,
      genero,
    });

    this.buildClimber(width, height, child);

    const hintY = Math.min(
      height * TRUNK_HINT_Y_RATIO,
      this.climberContainer.y - (this.bodySprite?.displayHeight ?? 80) * 0.55,
    );
    this.hintText = createTrunkTapHint(this, width / 2, hintY);

    this.physics.world.drawDebug = false;
    if (isDebugHitboxes(this)) {
      this.debugGfx = this.add.graphics().setDepth(250).setScrollFactor(0);
      this.debugDraw = () => this.drawIntroDebug();
      this.events.on('update', this.debugDraw);
    }

    this.events.once('shutdown', () => this.cleanupIntro());
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  drawIntroDebug() {
    const g = this.debugGfx;
    if (!g) return;
    g.clear();

    if (this.trunkImage?.active) {
      drawBoundsHit(g, this.trunkImage.getBounds(), 0x8B5A2B, 0.1);
    }
    for (const seg of this.trunkSegments ?? []) {
      if (seg !== this.trunkImage && seg?.active) {
        drawBoundsHit(g, seg.getBounds(), 0x8B5A2B, 0.06);
      }
    }
    if (this.climberContainer?.active) {
      drawBoundsHit(g, this.climberContainer.getBounds(), 0x4CAF50, 0.18);
    }
    if (this.bodySprite?.active) {
      drawBoundsHit(g, this.bodySprite.getBounds(), 0x66BB6A, 0.22);
    }
    if (this.headSprite?.active) {
      drawBoundsHit(g, this.headSprite.getBounds(), 0x00FF88, 0.2);
    }
    if (this.tapHitRect) {
      const r = this.tapHitRect;
      const wx = this.climberContainer.x + r.x;
      const wy = this.climberContainer.y + r.y;
      g.lineStyle(2, 0x2266dd, 0.92);
      g.strokeRect(wx, wy, r.w, r.h);
      g.fillStyle(0x4488ff, 0.22);
      g.fillRect(wx, wy, r.w, r.h);
    }
    if (this.storyCard?.active) {
      drawBoundsHit(g, this.storyCard.getBounds(), 0xFF9800, 0.12);
    }
  }

  cleanupIntro() {
    cleanupTrunkIntroFallingFruits(this);
    if (this._onClimbBodyFrame && this.bodySprite) {
      this.bodySprite.off('animationupdate', this._onClimbBodyFrame);
    }
    this._onClimbBodyFrame = null;
    if (this.debugDraw) this.events.off('update', this.debugDraw);
    this.debugGfx?.destroy();
    this.debugGfx = null;
    this.debugDraw = null;
  }

  buildIntroTrunk(width, height) {
    if (!this.textures.exists(INTRO_TRUNK_KEY)) return;

    const trunkW = width;
    const trunkH = Math.round(height * INTRO_TRUNK_HEIGHT_MUL);

    this.trunkContainer = this.add.container(width / 2, 0).setDepth(DEPTH_TRUNK);
    this.trunkSegments = [];

    for (let i = 0; i < INTRO_TRUNK_STACK_SEGMENTS; i += 1) {
      const seg = this.add.image(0, this.trunkStartY - i * trunkH, INTRO_TRUNK_KEY)
        .setOrigin(0.5, 0)
        .setDisplaySize(trunkW, trunkH);
      this.trunkContainer.add(seg);
      this.trunkSegments.push(seg);
    }

    this.trunkImage = this.trunkSegments[0];
  }

  getHeadCfg() {
    return {
      scaleMul: INTRO_CLIMB_HEAD_SCALE_MUL,
      ballTopRatio: INTRO_CLIMB_HEAD_BALL_TOP,
      offsetY: INTRO_CLIMB_HEAD_OFFSET_Y,
      offsetX: INTRO_CLIMB_HEAD_OFFSET_X,
      offsetYPx: INTRO_CLIMB_HEAD_OFFSET_Y_PX,
      offsetXPx: INTRO_CLIMB_HEAD_OFFSET_X_PX,
      origin: { x: 0.5, y: 0.84 },
      idleFrame: 0,
      animate: true,
    };
  }

  resolveIdleTexKey() {
    if (this.textures.exists(this.idleTexKey)) return this.idleTexKey;
    if (this.textures.exists(this.climbTexKey)) return this.climbTexKey;
    return null;
  }

  attachHead(child) {
    const headCfg = this.getHeadCfg();

    if (this.registry.get(REGISTRY_DEBUG_CARD_HEAD)) {
      return attachDebugCardHeadToClimb(
        this,
        this.climberContainer,
        this.bodySprite,
        this.climbScale,
        {
          ...headCfg,
          textureKey: DEBUG_CARD_HEAD_KEY,
          animKey: DEBUG_CARD_HEAD_ANIM,
        },
      );
    }

    const criancaHead = attachCharacterCabecaToClimb(
      this,
      this.climberContainer,
      this.bodySprite,
      child,
      this.climbScale,
      headCfg,
    );
    if (criancaHead) return criancaHead;

    return attachCaterpillarHeadIdleToClimb(
      this,
      this.climberContainer,
      this.bodySprite,
      this.climbScale,
      headCfg,
    );
  }

  playHeadIdleAnim() {
    if (!this.headSprite?.active) return;
    const headCfg = this.getHeadCfg();
    const animKey = this.registry.get(REGISTRY_DEBUG_CARD_HEAD)
      ? DEBUG_CARD_HEAD_ANIM
      : 'char_default_headIdle';
    if (this.anims.exists(animKey)) {
      this.headSprite.anims.play(animKey);
    }
    syncCabecaToClimbBody(this.headSprite, this.bodySprite, this.climbScale, headCfg);
  }

  getClimberTapHit() {
    const parts = [this.bodySprite, this.headSprite].filter((s) => s?.active);
    if (!parts.length) {
      return { x: -40, y: -90, w: 80, h: 100 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const sprite of parts) {
      const w = sprite.displayWidth;
      const h = sprite.displayHeight;
      const left = sprite.x - w * sprite.originX;
      const top = sprite.y - h * sprite.originY;
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, left + w);
      maxY = Math.max(maxY, top + h);
    }

    const pad = Math.max(maxX - minX, maxY - minY) * INTRO_CLIMBER_TAP_PAD_RATIO;
    return {
      x: minX - pad,
      y: minY - pad,
      w: (maxX - minX) + pad * 2,
      h: (maxY - minY) + pad * 2,
    };
  }

  applyClimberTapHit() {
    if (!this.climberContainer) return;
    this.tapHitRect = this.getClimberTapHit();
    const { x, y, w, h } = this.tapHitRect;
    this.climberContainer.setInteractive(
      new Phaser.Geom.Rectangle(x, y, w, h),
      Phaser.Geom.Rectangle.Contains,
    );
    this.climberContainer.input.cursor = 'pointer';
    this.climberContainer.off('pointerdown', this.startClimb, this);
    this.climberContainer.on('pointerdown', this.startClimb, this);
  }

  buildClimber(width, height, child) {
    const startY = Math.round(height * TRUNK_CLIMBER_START_Y_RATIO);
    this.climbScale = (width * TRUNK_PLAY_WIDTH_RATIO * INTRO_CLIMB_SIZE_MUL) / CLIMB_FRAME_WIDTH;

    this.climberContainer = this.add.container(width / 2, startY).setDepth(25);

    const idleKey = this.resolveIdleTexKey();
    if (idleKey) {
      this.bodySprite = this.add.sprite(INTRO_CLIMB_BODY_OFFSET_X, 0, idleKey, 0)
        .setOrigin(0.5, BODY_ORIGIN_Y)
        .setScale(this.climbScale);

      this.climberContainer.add(this.bodySprite);
      this.headSprite = this.attachHead(child);
      this.playHeadIdleAnim();
    } else {
      this.bodySprite = this.add.circle(0, 0, 36, 0x7cb342);
      this.climberContainer.add(this.bodySprite);
    }

    this.applyClimberTapHit();
  }

  switchToClimbSprite() {
    if (!this.bodySprite?.active || !this.textures.exists(this.climbTexKey)) return;

    const prevFootY = this.bodySprite.y;
    const prevX = this.bodySprite.x;
    this.bodySprite.setTexture(this.climbTexKey, 0);
    this.bodySprite.setOrigin(0.5, BODY_ORIGIN_Y);
    this.bodySprite.setScale(this.climbScale);
    this.bodySprite.setPosition(prevX, prevFootY);

    const headCfg = this.getHeadCfg();
    if (this.headSprite && this.bodySprite) {
      this.headSprite.setData('climbHeadRefBodyW', this.bodySprite.displayWidth);
      syncCabecaToClimbBody(this.headSprite, this.bodySprite, this.climbScale, headCfg);
      this.playHeadIdleAnim();
    }
  }

  playClimbAnim() {
    if (!this.bodySprite?.anims) return;
    this.switchToClimbSprite();
    if (this.anims.exists(CLIMB_ANIM)) {
      this.bodySprite.anims.play(CLIMB_ANIM);
      if (this.bodySprite.anims) {
        this.bodySprite.anims.timeScale = 1;
      }
    }

    this._onClimbBodyFrame = () => {
      if (this.headSprite && this.bodySprite) {
        syncCabecaToClimbBody(
          this.headSprite,
          this.bodySprite,
          this.climbScale,
          this.getHeadCfg(),
        );
      }
    };
    this.bodySprite.off('animationupdate', this._onClimbBodyFrame);
    this.bodySprite.on('animationupdate', this._onClimbBodyFrame);
  }

  startClimb() {
    if (this.climbing || !this.climberContainer) return;
    this.climbing = true;
    playSound(this, 'hut');

    this.pulseTween?.stop();
    this.climberContainer.setScale(1);
    this.climberContainer.disableInteractive();

    const fadeTargets = [this.storyCard, this.hintText].filter(Boolean);
    if (fadeTargets.length) {
      this.tweens.add({
        targets: fadeTargets,
        alpha: 0,
        duration: 320,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.storyCard?.destroy();
          this.hintText?.destroy();
          this.storyCard = null;
          this.hintText = null;
        },
      });
    }

    this.playClimbAnim();

    const headCfg = this.getHeadCfg();
    const startX = this.climberContainer.x;
    const endY = Math.round(this.scale.height * TRUNK_CLIMBER_END_Y_RATIO);
    const trunkDrop = Math.round(this.scale.height * INTRO_TRUNK_CLIMB_DROP_RATIO);

    if (this.trunkContainer?.active) {
      this.tweens.add({
        targets: this.trunkContainer,
        y: trunkDrop,
        duration: CLIMB_DURATION_MS,
        ease: 'Sine.easeInOut',
      });
    }

    this.tweens.add({
      targets: this.climberContainer,
      y: endY,
      duration: CLIMB_DURATION_MS,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (this.headSprite && this.bodySprite) {
          syncCabecaToClimbBody(this.headSprite, this.bodySprite, this.climbScale, headCfg);
        }
      },
      onComplete: () => {
        this.climberContainer.x = startX;
        this.finishIntro();
      },
    });
  }

  finishIntro() {
    this.bodySprite?.anims?.stop();
    playSound(this, 'clique');

    this.time.delayedCall(500, () => {
      this.cameras.main.fadeOut(450, 0, 0, 0);
      this.time.delayedCall(450, () => {
        this.scene.start(SceneKeys.GAME);
      });
    });
  }
}
