import Phaser from 'phaser';
import { CaterpillarRenderer } from './CaterpillarRenderer.js';
import {
  getCharacterTextureKeys,
  getSpritesManifest,
  hasCharacterSprite,
} from '../systems/SpriteLoader.js';
import {
  attachCharacterCabecaToClimb,
  syncCabecaToClimbBody,
} from '../ui/characterAvatar.js';
import {
  CLIMB_SWAY_X,
  CLIMB_SWAY_ROT,
} from '../config/gameWorldConfig.js';

/**
 * Lagarta em filamento — várias bolinhas empilhadas (sprites Figma).
 */
export class CaterpillarSprite {
  static create(scene, x, y, child, custom, depth = 15, opts = {}) {
    const cfg = getSpritesManifest().characters?.[child?.id] ?? getSpritesManifest().characters?.default;

    if (hasCharacterSprite(scene, child?.id)) {
      const texKeys = getCharacterTextureKeys(child?.id);
      return CaterpillarSprite.createFilament(scene, x, y, texKeys, cfg, depth, opts, child);
    }

    const g = scene.add.graphics().setDepth(depth);
    return {
      mode: 'procedural',
      graphics: g,
      draw(state) {
        g.clear();
        return CaterpillarRenderer.draw(g, {
          x: state.x,
          y: state.y,
          raio: state.raio,
          segmentos: state.segmentos,
          fase: state.fase,
          tremor: state.tremor ?? 0,
          horizontal: state.horizontal ?? false,
          cor: custom.cor,
          chapeu: custom.chapeu,
          oculos: custom.oculos,
          skipFace: true,
        });
      },
      setPosition() {},
      setMoving() {},
      playEat() {},
      playClimb() {},
      playHurt() {},
      setAlpha(a) { g.setAlpha(a); },
      destroy() { g.destroy(); },
    };
  }

  static createFilament(scene, x, y, texKeys, cfg, depth, opts, child = null) {
    const layout = opts.layout ?? 'vertical';
    const useClimb = opts.preferClimb && layout === 'vertical'
      && scene.textures.exists(texKeys.climb);
    const hideHead = opts.hideHead ?? useClimb;
    const scale = opts.displayScale ?? cfg?.displayScale ?? 1;
    const climbFrameH = cfg?.sheets?.climb?.frameHeight ?? 738;
    const walkSheet = cfg?.sheets?.walk;
    const idleSheet = cfg?.sheets?.idle;
    const frameH = useClimb
      ? climbFrameH
      : (walkSheet?.frameHeight ?? idleSheet?.frameHeight ?? cfg?.frameHeight ?? 128);
    const headWalkFrameH = cfg?.sheets?.headWalk?.frameHeight ?? frameH;
    const normSegH = frameH * scale;
    const normSegW = walkSheet
      ? (walkSheet.frameWidth / walkSheet.frameHeight) * normSegH
      : normSegH;
    const normHeadH = headWalkFrameH * scale;
    const segCount = Math.max(6, opts.segmentCount ?? cfg?.segmentCount ?? 6);
    const spacing = frameH * scale * (cfg?.segmentSpacing ?? 0.46);
    const originX = cfg?.origin?.x ?? 0.5;
    const originY = useClimb ? 0.92 : (cfg?.origin?.y ?? 0.5);
    const headOffsetY = layout === 'vertical' ? (segCount - 1) * spacing : 0;
    const headOffsetX = layout === 'horizontal' ? (segCount - 1) * spacing : 0;

    const walkAnimKey = `${texKeys.base}_walk`;
    const idleAnimKey = `${texKeys.base}_idle`;
    const idleBreatheAnimKey = `${texKeys.base}_idleBreathe`;
    const eatAnimKey = `${texKeys.base}_eat`;
    const riseAnimKey = `${texKeys.base}_rising`;
    const riseMoveAnimKey = `${texKeys.base}_risingMove`;
    const climbAnimKey = `${texKeys.base}_climb`;
    const headWalkAnimKey = `${texKeys.base}_headWalk`;
    const headIdleAnimKey = `${texKeys.base}_headIdle`;
    const headRiseAnimKey = `${texKeys.base}_headRise`;
    const headRiseMoveAnimKey = `${texKeys.base}_headRiseMove`;
    const hasHeadIdleSheet = () => scene.textures.exists(texKeys.headIdle);
    const riseFrontCount = cfg?.riseFrontCount ?? 3;
    const riseHoldFrames = cfg?.riseHoldFrames ?? 3;
    const riseMoveFrames = cfg?.riseMoveFrames ?? 2;
    const bodyIdleFrame = cfg?.bodyIdleFrame ?? cfg?.animations?.idle?.start ?? 0;
    const idleBreatheSpeed = cfg?.idleBreatheSpeed ?? 0.28;
    let idleWavePhase = 0;
    let defaultTex = scene.textures.exists(texKeys.defaultTex)
      ? texKeys.defaultTex
      : texKeys.walk;
    if (useClimb) defaultTex = texKeys.climb;

    const container = scene.add.container(x, y).setDepth(depth);
    const segments = [];

    const basePos = (index) => {
      const bx = layout === 'horizontal' ? (segCount - 1 - index) * spacing : 0;
      const by = layout === 'vertical' ? -index * spacing : 0;
      return { x: bx, y: by };
    };

    let facingRight = true;

    const RISE_DIAG_ANGLE = cfg?.riseDiagAngle ?? 0.48;
    const RISE_DIAG_STEP = cfg?.riseDiagStep ?? 0.98;

    const risePos = (index) => {
      if (index >= riseFrontCount) return basePos(index);
      const face = facingRight ? 1 : -1;
      const pivot = basePos(riseFrontCount);
      const stepsUp = riseFrontCount - index;
      const dist = spacing * RISE_DIAG_STEP * stepsUp;
      return {
        x: pivot.x + face * dist * Math.cos(RISE_DIAG_ANGLE),
        y: pivot.y - dist * Math.sin(RISE_DIAG_ANGLE),
      };
    };

    const riseRotFor = (index) => {
      const face = facingRight ? 1 : -1;
      const stepsUp = riseFrontCount - index;
      return -RISE_DIAG_ANGLE * (stepsUp / riseFrontCount) * face;
    };

    function playSegErguendo(sprite, playAnim = true) {
      if (!sprite?.active) return;
      if (scene.textures.exists(texKeys.rise)) {
        sprite.setTexture(texKeys.rise);
      }
      normalizeSegmentDisplay(sprite, 'rise');
      sprite.anims?.stop();
      if (playAnim && scene.anims.exists(riseMoveAnimKey)) {
        sprite.play(riseMoveAnimKey);
      } else if (sprite.texture?.has(0)) {
        sprite.setFrame(0);
      }
    }

    function playClimbOnSegment(sprite, staggerMs = 0) {
      if (!sprite?.active) return;
      sprite.setTexture(texKeys.climb);
      const run = () => {
        if (!sprite.active) return;
        if (scene.anims.exists(climbAnimKey)) {
          sprite.play(climbAnimKey);
        } else {
          sprite.setFrame(0);
        }
      };
      if (staggerMs > 0) {
        scene.time.delayedCall(staggerMs, run);
      } else {
        run();
      }
    }

    function playClimbOnVisibleSegments(staggerMs = 80) {
      segments.forEach(({ sprite, index }) => {
        if (!sprite.visible) return;
        playClimbOnSegment(sprite, index * staggerMs);
      });
    }

    function segmentSheetForSprite(sprite) {
      const key = sprite?.texture?.key;
      if (key === texKeys.idle) return 'idle';
      if (key === texKeys.rise) return 'rise';
      if (key === texKeys.climb) return 'climb';
      return 'walk';
    }

    function normalizeSegmentDisplay(sprite, sheetName) {
      if (!sprite?.frame?.height) return;
      const name = sheetName ?? segmentSheetForSprite(sprite);
      const sheet = cfg?.sheets?.[name] ?? walkSheet ?? idleSheet;
      if (!sheet) {
        sprite.setDisplaySize(normSegW, normSegH);
        return;
      }
      const w = (sheet.frameWidth / sheet.frameHeight) * normSegH;
      sprite.setDisplaySize(w, normSegH);
    }

    function getSheetAnchorOffsetX(moving) {
      if (useClimb) return 0;
      const key = moving ? 'walk' : 'idle';
      return (cfg?.sheets?.[key]?.anchorOffsetX ?? 0) * spacing;
    }

    function normalizeHeadDisplay(sprite) {
      if (!sprite?.frame?.height) return;
      const fh = sprite.frame.height;
      const fw = sprite.frame.width;
      sprite.setDisplaySize((fw / fh) * normHeadH, normHeadH);
    }

    function snapSegmentToBase(sprite, index, waveY = 0, moving = api?.isMoving ?? false) {
      const pos = basePos(index);
      const anchorOx = getSheetAnchorOffsetX(moving);
      if (layout === 'horizontal') {
        sprite.setPosition(pos.x + anchorOx, pos.y + waveY);
      } else {
        sprite.setPosition(pos.x + waveY + anchorOx, pos.y);
      }
    }

    function playSegmentAnim(sprite, animKey, fallbackFrame = 0) {
      if (!sprite?.active) return;
      if (scene.anims.exists(animKey)) {
        const anim = scene.anims.get(animKey);
        if (anim?.frames?.length) {
          sprite.play(animKey);
          return;
        }
      }
      if (scene.textures.exists(sprite.texture.key) && sprite.texture.has(fallbackFrame)) {
        sprite.anims?.stop();
        sprite.setFrame(fallbackFrame);
      }
    }

    function holdSegIdle(sprite) {
      if (scene.textures.exists(texKeys.idle)) {
        sprite.setTexture(texKeys.idle);
      }
      sprite.anims?.stop();
      if (sprite.texture?.has(bodyIdleFrame)) {
        sprite.setFrame(bodyIdleFrame);
      }
      normalizeSegmentDisplay(sprite, 'idle');
    }

    function playSegParada(sprite, startFrame = 0) {
      if (!sprite?.active) return;
      if (scene.textures.exists(texKeys.idle)) {
        sprite.setTexture(texKeys.idle);
      }
      normalizeSegmentDisplay(sprite, 'idle');
      if (scene.anims.exists(idleBreatheAnimKey)) {
        const anim = scene.anims.get(idleBreatheAnimKey);
        if (anim?.frames?.length) {
          sprite.play(idleBreatheAnimKey, true, startFrame);
          return;
        }
      }
      holdSegIdle(sprite);
    }

    function holdSegRise(sprite) {
      if (!sprite?.active) return;
      if (scene.textures.exists(texKeys.rise)) {
        sprite.setTexture(texKeys.rise);
      }
      normalizeSegmentDisplay(sprite, 'rise');
      sprite.anims?.stop();
      if (scene.anims.exists(riseAnimKey)) {
        sprite.play(riseAnimKey);
      } else {
        sprite.setFrame(0);
      }
    }

    function freezeSegRise(sprite, endFrame = 3) {
      if (!sprite?.active) return;
      sprite.anims?.stop();
      if (sprite.texture?.has(endFrame)) {
        sprite.setFrame(endFrame);
      }
      normalizeSegmentDisplay(sprite, 'rise');
    }

    function syncAllSegParada() {
      segments.forEach(({ sprite }) => playSegParada(sprite, 0));
    }

    function playSegIdle(sprite) {
      playSegParada(sprite, 0);
    }

    for (let i = 0; i < segCount; i++) {
      const fromEnd = segCount - 1 - i;
      const sx = layout === 'horizontal' ? fromEnd * spacing : 0;
      const sy = layout === 'vertical' ? -fromEnd * spacing : 0;
      const seg = scene.add.sprite(sx, sy, defaultTex).setOrigin(originX, originY);

      if (useClimb && scene.textures.exists(texKeys.climb)) {
        playClimbOnSegment(seg, i * 80);
      } else if (scene.textures.exists(defaultTex) && scene.textures.get(defaultTex).has(0)) {
        holdSegIdle(seg);
      }

      container.add(seg);
      segments.push({ sprite: seg, index: i });
    }

    if (!useClimb && segments.length > 0) {
      syncAllSegParada();
    }

    let activeSegmentCount = segCount;

    const headCfg = { ...(cfg?.head ?? {}), ...(opts.headCfg ?? {}) };
    const headOriginX = headCfg.origin?.x ?? originX;
    const headOriginY = headCfg.origin?.y ?? originY;
    const headIdleFrame = headCfg.idleFrame ?? 1;
    const headBlinkFrame = headCfg.blinkFrame ?? 3;
    let headBlinkTimer = null;
    let headIsMoving = false;
    let risingFlag = false;
    let headParadaX = null;
    let headParadaY = null;
    let headSprite = null;

    if (!hideHead && (scene.textures.exists(texKeys.headWalk) || scene.textures.exists(texKeys.headIdle))) {
      const startTex = scene.textures.exists(texKeys.headIdle)
        ? texKeys.headIdle
        : texKeys.headWalk;
      headSprite = scene.add.sprite(0, 0, startTex, 0);
      headSprite.setOrigin(headOriginX, headOriginY);
      normalizeHeadDisplay(headSprite);
      container.add(headSprite);
    }

    const frontSegment = () => {
      if (useClimb && layout === 'vertical') {
        const topIndex = segCount - activeSegmentCount;
        return segments.find(({ index }) => index === topIndex)?.sprite
          ?? segments[segCount - 1]?.sprite;
      }
      return segments.find(({ index }) => index === 0)?.sprite;
    };

    const clearHeadParadaLock = () => {
      headParadaX = null;
      headParadaY = null;
    };

    const lockHeadParadaPosition = () => {
      if (!headSprite?.active || !hasHeadIdleSheet()) return;
      syncHeadToSegment(frontSegment());
      headParadaX = headSprite.x;
      headParadaY = headSprite.y;
    };

    const syncHeadToRiseFront = () => {
      const seg = frontSegment();
      if (!headSprite?.active || !seg) return;
      const riseCfg = headCfg.rise ?? {};
      const h = normSegH;
      const w = seg.displayWidth;
      const tipPush = (riseCfg.tipOffset ?? 0.42) * spacing;
      const fineX = (riseCfg.offsetX ?? 0.05) * w;
      const ballTop = riseCfg.ballTopRatio ?? 0.50;
      const oy = (riseCfg.offsetY ?? 0.02) * h;
      const rot = seg.rotation ?? 0;
      const lx = tipPush + fineX;
      const ly = -h * ballTop + oy;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      headSprite.setPosition(
        seg.x + lx * cos - ly * sin,
        seg.y + lx * sin + ly * cos,
      );
      headSprite.rotation = rot;
    };

    const syncHeadToSegment = (seg, cfgOverride = {}) => {
      if (!headSprite?.active || !seg) return;
      const h = normSegH;
      const w = seg.displayWidth;
      const moving = cfgOverride.moving ?? headIsMoving;
      const ballTop = moving
        ? (cfgOverride.ballTopRatio ?? headCfg.ballTopRatio ?? 0.54)
        : (cfgOverride.ballTopRatio ?? headCfg.ballTopRatioIdle ?? headCfg.ballTopRatio ?? 0.54);
      const oyMul = moving
        ? (headCfg.offsetY ?? 0.12)
        : (headCfg.offsetYIdle ?? headCfg.offsetY ?? 0.12);
      const oy = (cfgOverride.offsetY ?? oyMul) * h;
      const tipBase = moving
        ? (headCfg.tipOffset ?? 0.68)
        : (headCfg.tipOffsetIdle ?? headCfg.tipOffset ?? 0.68);
      const tipPush = (cfgOverride.tipOffset ?? tipBase) * spacing;
      const fineXKey = moving ? 'offsetX' : 'offsetXIdle';
      const fineX = (cfgOverride.offsetX ?? headCfg[fineXKey] ?? headCfg.offsetX ?? 0) * w;
      const useParadaHead = !moving && hasHeadIdleSheet();
      const idleBob = useParadaHead || moving
        ? 0
        : Math.sin(idleWavePhase * idleBreatheSpeed) * h * (headCfg.idleBobMul ?? 0);
      headSprite.setPosition(seg.x + tipPush + fineX, seg.y - h * ballTop + oy + idleBob);
      if (useParadaHead || moving) {
        headSprite.rotation = Phaser.Math.Linear(headSprite.rotation, 0, 0.2);
      } else {
        const swayRot = headCfg.idleSwayRot ?? 0;
        headSprite.rotation = Math.sin(idleWavePhase * idleBreatheSpeed * 1.1) * swayRot;
      }
    };

    const syncHeadToFront = () => {
      if (
        !headIsMoving
        && !risingFlag
        && hasHeadIdleSheet()
        && headParadaX != null
        && headParadaY != null
      ) {
        headSprite.setPosition(headParadaX, headParadaY);
        headSprite.rotation = 0;
        return;
      }
      syncHeadToSegment(frontSegment());
    };

    const resetHeadFromRise = () => {
      if (!headSprite?.active) return;
      scene.tweens.killTweensOf(headSprite);
      headSprite.setOrigin(headOriginX, headOriginY);
      clearHeadParadaLock();
      holdHeadIdle();
      lockHeadParadaPosition();
    };

    const playHeadRise = (movePhase = false) => {
      if (!headSprite?.active) return;
      clearHeadBlink();
      clearHeadParadaLock();
      headIsMoving = false;
      headSprite.setVisible(true);
      scene.tweens.killTweensOf(headSprite);
      headSprite.setOrigin(headOriginX, headOriginY);

      if (!movePhase) return;

      const riseCfg = headCfg.rise ?? {};
      if (scene.textures.exists(texKeys.headRise)) {
        headSprite.setTexture(texKeys.headRise, 0);
        headSprite.setOrigin(headOriginX, riseCfg.originY ?? headOriginY);
        normalizeHeadDisplay(headSprite);
        const moveKey = scene.anims.exists(headRiseMoveAnimKey)
          ? headRiseMoveAnimKey
          : headRiseAnimKey;
        if (scene.anims.exists(moveKey)) {
          headSprite.play(moveKey);
        }
      } else if (scene.textures.exists(texKeys.headWalk)) {
        headSprite.setTexture(texKeys.headWalk, 0);
        normalizeHeadDisplay(headSprite);
      }
      syncHeadToRiseFront();
      bringHeadToFront();
    };

    const clearHeadBlink = () => {
      headBlinkTimer?.remove(false);
      headBlinkTimer = null;
    };

    const headIdleWalkTimeScale = headCfg.idleWalkTimeScale ?? 0.42;

    const playHeadWalkAnim = (timeScale = 1) => {
      if (!headSprite?.active || !headSprite.visible) return;
      if (scene.textures.exists(texKeys.headWalk)) {
        headSprite.setTexture(texKeys.headWalk);
      }
      if (scene.anims.exists(headWalkAnimKey)) {
        headSprite.play(headWalkAnimKey);
        if (headSprite.anims) headSprite.anims.timeScale = timeScale;
      } else {
        headSprite.anims?.stop();
        headSprite.setFrame(0);
      }
      normalizeHeadDisplay(headSprite);
    };

    const playHeadParadaAnim = () => {
      if (!headSprite?.active || !headSprite.visible) return;
      if (hasHeadIdleSheet()) {
        headSprite.setTexture(texKeys.headIdle);
        if (scene.anims.exists(headIdleAnimKey)) {
          const anim = scene.anims.get(headIdleAnimKey);
          if (anim?.frames?.length) {
            headSprite.play(headIdleAnimKey);
            if (headSprite.anims) headSprite.anims.timeScale = 1;
            normalizeHeadDisplay(headSprite);
            return;
          }
        }
        headSprite.anims?.stop();
        headSprite.setFrame(headCfg.paradaFrame ?? 0);
      } else {
        playHeadWalkAnim(headIdleWalkTimeScale);
        return;
      }
      normalizeHeadDisplay(headSprite);
    };

    const holdHeadIdle = () => playHeadParadaAnim();

    const resumeHeadAnim = () => {
      if (!headSprite?.active || !headSprite.visible) return;
      if (headIsMoving) {
        playHeadWalkAnim(1);
      } else {
        holdHeadIdle();
      }
    };

    const playHeadBlink = (onDone) => {
      if (!headSprite?.active || !headSprite.visible) {
        onDone?.();
        return;
      }
      if (!scene.textures.exists(texKeys.headWalk)) {
        onDone?.();
        return;
      }
      headSprite.setTexture(texKeys.headWalk);
      headSprite.anims?.stop();
      headSprite.setFrame(headBlinkFrame);
      scene.time.delayedCall(headCfg.blinkHoldMs ?? 220, () => {
        if (!headSprite?.active || !headSprite.visible) {
          onDone?.();
          return;
        }
        headSprite.setFrame(headCfg.blinkOpenFrame ?? 2);
        scene.time.delayedCall(headCfg.blinkOpenMs ?? 130, () => {
          resumeHeadAnim();
          onDone?.();
        });
      });
    };

    const scheduleHeadBlink = () => {
      clearHeadBlink();
      if (!headSprite?.active || !headSprite.visible) return;
      if (!headIsMoving && hasHeadIdleSheet()) return;
      const wait = Phaser.Math.Between(
        headCfg.blinkMinMs ?? 2400,
        headCfg.blinkMaxMs ?? 5200,
      );
      headBlinkTimer = scene.time.delayedCall(wait, () => {
        playHeadBlink(() => scheduleHeadBlink());
      });
    };

    const setHeadMoving = (moving) => {
      if (!headSprite?.active) return;
      clearHeadBlink();
      headIsMoving = moving;
      if (moving) {
        clearHeadParadaLock();
        playHeadWalkAnim(1);
        headSprite.rotation = 0;
      } else {
        holdHeadIdle();
        lockHeadParadaPosition();
      }
      syncHeadToFront();
      scheduleHeadBlink();
    };

    const setHeadVisible = (visible) => {
      if (headSprite) headSprite.setVisible(visible);
      if (visible) scheduleHeadBlink();
      else clearHeadBlink();
    };

    const bringHeadToFront = () => {
      if (headSprite?.active) container.bringToTop(headSprite);
    };

    if (headSprite) {
      holdHeadIdle();
      lockHeadParadaPosition();
      syncHeadToFront();
      bringHeadToFront();
      scheduleHeadBlink();
    }

    let childHeadSprite = null;
    const syncChildHead = () => {
      if (!childHeadSprite?.active) return;
      const seg = frontSegment();
      if (!seg) return;
      syncCabecaToClimbBody(childHeadSprite, seg, scale, headCfg);
      container.bringToTop(childHeadSprite);
    };

    if (useClimb && child) {
      const topSeg = frontSegment();
      if (topSeg) {
        childHeadSprite = attachCharacterCabecaToClimb(
          scene,
          container,
          topSeg,
          child,
          scale,
          headCfg,
        );
      }
    }

    function playSegAnim(sprite, moving, staggerMs = 0, index = 0) {
      const run = () => {
        if (!sprite.active) return;

        if (moving && scene.textures.exists(texKeys.walk)) {
          sprite.anims?.stop();
          sprite.setTexture(texKeys.walk);
          playSegmentAnim(sprite, walkAnimKey, cfg?.animations?.walk?.start ?? 0);
          normalizeSegmentDisplay(sprite, 'walk');
        } else if (scene.textures.exists(texKeys.idle)) {
          playSegParada(sprite, 0);
        }
      };

      const delay = moving && index > 0 ? index * staggerMs : 0;
      if (delay > 0) {
        scene.time.delayedCall(delay, run);
      } else {
        run();
      }
    }

    function isFrontSegment(index) {
      return index < riseFrontCount;
    }

    /** Frente (index 0) desenha por cima — erguendo na frente do parada */
    function sortSegmentDepth() {
      segments
        .slice()
        .sort((a, b) => a.index - b.index)
        .forEach(({ sprite }) => container.sendToBack(sprite));
      bringHeadToFront();
    }

    const api = {
      mode: 'filament',
      container,
      segments,
      texKeys,
      headOffsetY,
      headOffsetX,
      displayScale: scale,
      segmentFrameH: frameH,
      layout,
      isMoving: false,
      get isRising() { return risingFlag; },
      set isRising(v) { risingFlag = v; },
      isPetting: false,
      facingRight: true,
      headSprite,
      syncHeadToFront,

      getHeadPosition() {
        if (layout === 'horizontal') {
          return { x: container.x + headOffsetX, y: container.y };
        }
        const visibleStack = useClimb
          ? (activeSegmentCount - 1) * spacing
          : headOffsetY;
        return { x: container.x, y: container.y - visibleStack };
      },

      setPosition(nx, ny) {
        container.setPosition(nx, ny);
      },

      setMoving(moving) {
        if (useClimb) {
          if (api.isMoving === moving) return;
          api.isMoving = moving;
          playClimbOnVisibleSegments(moving ? 60 : 80);
          return;
        }
        api.isRising = false;
        if (!moving && api.isMoving === moving) return;
        api.isMoving = moving;
        setHeadVisible(true);
        segments.forEach(({ sprite, index }) => {
          playSegAnim(sprite, moving, moving ? 70 : 0, index);
          snapSegmentToBase(sprite, index, 0, moving);
        });
        if (!moving) {
          syncAllSegParada();
          lockHeadParadaPosition();
        }
        setHeadMoving(moving);
      },

      /** Frente ergue em diagonal: 3 frames parado → 2 frames erguendo + cabeça */
      playRise() {
        if (layout !== 'horizontal') return;
        risingFlag = true;
        api.isMoving = false;
        clearHeadBlink();

        const riseFr = cfg?.animations?.risingMove?.frameRate
          ?? cfg?.animations?.rising?.frameRate
          ?? 7;
        const holdMs = Math.ceil((riseHoldFrames / riseFr) * 1000);
        const riseMs = Math.ceil((riseMoveFrames / riseFr) * 1000);
        const riseEndFrame = cfg?.animations?.risingMove?.frames?.at(-1) ?? 1;

        segments.forEach(({ sprite, index }) => {
          scene.tweens.killTweensOf(sprite);
          sprite.anims?.stop();
          sprite.rotation = 0;
          holdSegIdle(sprite);
          snapSegmentToBase(sprite, index, 0, false);
        });
        sortSegmentDepth();

        if (headSprite?.active) {
          if (hasHeadIdleSheet()) {
            headSprite.setTexture(texKeys.headIdle);
            headSprite.anims?.stop();
            headSprite.setFrame(headCfg.paradaFrame ?? 0);
            normalizeHeadDisplay(headSprite);
          } else {
            holdHeadIdle();
          }
          lockHeadParadaPosition();
        }

        scene.time.delayedCall(holdMs, () => {
          if (!risingFlag) return;
          playHeadRise(true);

          segments.forEach(({ sprite, index }) => {
            if (!isFrontSegment(index)) return;

            playSegErguendo(sprite, index === 0);

            const target = risePos(index);
            scene.tweens.add({
              targets: sprite,
              x: target.x,
              y: target.y,
              rotation: riseRotFor(index),
              duration: riseMs,
              ease: 'Sine.easeOut',
              onUpdate: () => {
                if (index === 0) syncHeadToRiseFront();
                sortSegmentDepth();
              },
              onComplete: () => sortSegmentDepth(),
            });
          });

          sortSegmentDepth();
        });

        scene.time.delayedCall(holdMs + riseMs + 40, () => {
          if (!risingFlag) return;
          segments.forEach(({ sprite, index }) => {
            if (isFrontSegment(index)) freezeSegRise(sprite, riseEndFrame);
          });
          if (headSprite?.active) {
            headSprite.anims?.stop();
            if (scene.textures.exists(texKeys.headRise)) {
              headSprite.setFrame(riseEndFrame);
            }
            normalizeHeadDisplay(headSprite);
            syncHeadToRiseFront();
          }
        });
      },

      resetPose() {
        risingFlag = false;
        api.isMoving = false;
        resetHeadFromRise();
        setHeadVisible(true);
        segments.forEach(({ sprite, index }) => {
          scene.tweens.killTweensOf(sprite);
          sprite.rotation = 0;
          playSegIdle(sprite);
          snapSegmentToBase(sprite, index, 0, false);
        });
        syncAllSegParada();
        setHeadMoving(false);
        lockHeadParadaPosition();
        syncHeadToFront();
        bringHeadToFront();
      },

      updateWave(fase, moving, moveDelta = 0) {
        if (risingFlag) {
          const front = frontSegment();
          const baseY = basePos(0).y;
          const stillHolding = front && Math.abs(front.y - baseY) < 1.5;
          if (
            stillHolding
            && headParadaX != null
            && headParadaY != null
            && headSprite?.active
          ) {
            headSprite.setPosition(headParadaX, headParadaY);
            headSprite.rotation = 0;
          } else {
            syncHeadToRiseFront();
          }
          return;
        }
        idleWavePhase = fase;

        if (useClimb && layout === 'vertical') {
          const isActive = moving || Math.abs(moveDelta) > 0.8;
          const firstVisible = segments.length - activeSegmentCount;
          const swayX = headCfg.swayX ?? CLIMB_SWAY_X;
          const swayRot = headCfg.swayRot ?? CLIMB_SWAY_ROT;

          segments.forEach(({ sprite, index }) => {
            if (!sprite.visible) {
              sprite.x = 0;
              sprite.rotation = 0;
              return;
            }
            const rel = index - firstVisible;
            if (isActive) {
              sprite.x = Math.sin(fase * 6 + rel * 0.9) * swayX;
              sprite.rotation = Math.sin(fase * 5 + rel * 0.75) * swayRot;
            } else {
              sprite.x = Phaser.Math.Linear(sprite.x, 0, 0.14);
              sprite.rotation = Phaser.Math.Linear(sprite.rotation, 0, 0.14);
            }
          });

          if (isActive) {
            const lean = Phaser.Math.Clamp(moveDelta * 0.0011, -0.09, 0.09);
            container.rotation = lean + Math.sin(fase * 7) * 0.035;
          } else {
            container.rotation = Phaser.Math.Linear(container.rotation, 0, 0.12);
          }

          syncChildHead();
          if (childHeadSprite?.active) {
            if (isActive) {
              childHeadSprite.rotation = Math.sin(fase * 6.5) * 0.05;
            } else {
              childHeadSprite.rotation = Phaser.Math.Linear(childHeadSprite.rotation, 0, 0.12);
            }
          }
          return;
        }

        segments.forEach(({ sprite, index }) => {
          const wave = moving
            ? Math.sin(fase * 0.55 + index * 0.65) * 4
            : 0;
          if (layout === 'horizontal') {
            snapSegmentToBase(sprite, index, wave, moving);
          } else {
            sprite.x = wave + getSheetAnchorOffsetX(moving);
          }
        });
        syncHeadToFront();
        syncChildHead();
      },

      playEat() {
        if (useClimb) {
          const top = frontSegment();
          const munch = top ? [top] : segments.map(({ sprite }) => sprite);
          munch.forEach((sprite) => {
            if (!sprite?.active) return;
            scene.tweens.killTweensOf(sprite);
            sprite.setScale(scale * 1.1);
          });
          if (headSprite?.active) {
            scene.tweens.killTweensOf(headSprite);
            headSprite.setScale(scale * 1.1);
          }
          if (childHeadSprite?.active) {
            scene.tweens.killTweensOf(childHeadSprite);
            const mul = childHeadSprite.getData('cabecaScaleMul') ?? 1.48;
            childHeadSprite.setScale(scale * mul * 1.1);
          }
          scene.time.delayedCall(220, () => {
            munch.forEach((sprite) => {
              if (sprite?.active) sprite.setScale(scale);
            });
            if (headSprite?.active) headSprite.setScale(scale);
            if (childHeadSprite?.active) {
              const mul = childHeadSprite.getData('cabecaScaleMul') ?? 1.48;
              childHeadSprite.setScale(scale * mul);
            }
            playClimbOnVisibleSegments(80);
            syncHeadToFront();
            syncChildHead();
          });
          return;
        }
        if (scene.anims.exists(eatAnimKey)) {
          segments.forEach(({ sprite }) => sprite.play(eatAnimKey));
          return;
        }
        segments.forEach(({ sprite }) => {
          sprite.setScale(scale * 1.08);
        });
        scene.time.delayedCall(250, () => {
          segments.forEach(({ sprite }) => sprite.setScale(scale));
        });
      },

      playClimb() {
        if (useClimb) {
          api.isRising = true;
          segments.forEach(({ sprite }) => {
            sprite.setTexture(texKeys.climb);
            if (scene.anims.exists(climbAnimKey)) sprite.play(climbAnimKey);
          });
          scene.time.delayedCall(480, () => { api.isRising = false; });
          return;
        }
        api.playRise();
      },

      playHurt() {
        segments.forEach(({ sprite }) => sprite.setTint(0xffaaaa));
        scene.time.delayedCall(400, () => {
          segments.forEach(({ sprite }) => sprite.clearTint());
        });
      },

      /** Splash: entra → (passa direto | para | ergue) → sai — alterna direção */
      startWander(sceneRef, opts = {}) {
        const screenW = sceneRef.scale.width;
        const offScreen = api.headOffsetX + spacing * 1.2 + (opts.edgePad ?? 60);
        const minX = -offScreen;
        const maxX = screenW + offScreen;
        const speed = opts.speed ?? 90;
        const pauseMs = opts.pauseMs ?? 2500;
        const alternateWithFrog = opts.alternateWithFrog ?? false;
        const frogChance = opts.frogChance ?? 0.32;
        const scaredSpeed = opts.scaredSpeed ?? speed * 2.5;
        let moveTween = null;
        let wanderTimer = null;

        const clearWander = () => {
          moveTween?.stop();
          moveTween = null;
          wanderTimer?.remove(false);
          wanderTimer = null;
        };

        const setFacing = (right) => {
          facingRight = right;
          api.facingRight = right;
          container.setScale(right ? 1 : -1, 1);
        };

        const pauseCenterX = (right) => (
          right
            ? screenW / 2 - api.headOffsetX / 2
            : screenW / 2 + api.headOffsetX / 2
        );

        const pickBehavior = () => {
          const r = Phaser.Math.FloatBetween(0, 1);
          if (r < 0.35) return 'pass';
          if (r < 0.65) return 'pause';
          return 'rise';
        };

        const walkTo = (targetX, onComplete, walkSpeed = speed, ease = 'Linear') => {
          if (!container.active) return;
          api.isRising = false;
          api.setMoving(true);
          const duration = (Math.abs(targetX - container.x) / walkSpeed) * 1000;
          moveTween = sceneRef.tweens.add({
            targets: container,
            x: targetX,
            duration: Math.max(duration, 400),
            ease,
            onComplete,
          });
        };

        const finishExit = (fromRight) => {
          opts.onExitStart?.({ fromRight, x: container.x });
          walkTo(fromRight ? maxX : minX, () => {
            opts.onExitComplete?.({ fromRight });
            runCycle(!fromRight);
          });
        };

        const accelerateScaredExit = (fromRight) => {
          api.setMoving(true);
          opts.onScaredRun?.({ fromRight, x: container.x });
          opts.onExitStart?.({ fromRight, x: container.x, scared: true });

          walkTo(fromRight ? maxX : minX, () => {
            container.setVisible(false);
            opts.onExitComplete?.({ fromRight, scared: true });
            opts.onCaterpillarGone?.({ fromRight });
          }, scaredSpeed, 'Linear');
        };

        const runCycle = (fromRight) => {
          if (!container.active) return;

          opts.onReenter?.({ fromRight });
          setFacing(fromRight);
          const enterX = fromRight ? minX : maxX;
          const centerX = pauseCenterX(fromRight);

          container.setVisible(true);
          if (Math.abs(container.x - enterX) > spacing * 0.5) {
            container.setX(enterX);
          }
          api.resetPose();

          if (alternateWithFrog) {
            walkTo(centerX, () => {
              api.setMoving(false);
              wanderTimer = sceneRef.time.delayedCall(pauseMs, () => {
                api.resetPose();
                const showFrog = Phaser.Math.FloatBetween(0, 1) < frogChance;
                if (showFrog) {
                  accelerateScaredExit(fromRight);
                } else {
                  finishExit(fromRight);
                }
              });
            });
            return;
          }

          const behavior = pickBehavior();

          if (behavior === 'pass') {
            opts.onExitStart?.({ fromRight, x: container.x });
            walkTo(fromRight ? maxX : minX, () => {
              opts.onExitComplete?.({ fromRight });
              runCycle(!fromRight);
            });
            return;
          }

          walkTo(centerX, () => {
            api.setMoving(false);

            if (behavior === 'rise') {
              sceneRef.time.delayedCall(100, () => api.playRise());
            }

            wanderTimer = sceneRef.time.delayedCall(pauseMs, () => {
              api.resetPose();
              finishExit(fromRight);
            });
          });
        };

        api.resumeAfterFrogTurn = (fromRight) => {
          if (!container.active) return;
          runCycle(fromRight);
        };

        container.setX(minX);
        runCycle(opts.startRight ?? true);
        api._stopWander = clearWander;
        api._pauseWander = () => {
          clearWander();
          sceneRef.tweens.killTweensOf(container);
          api.setMoving(false);
        };
        api._resumeWander = () => {
          if (!container.active) return;
          if (alternateWithFrog) {
            accelerateScaredExit(facingRight);
          } else {
            finishExit(facingRight);
          }
        };
        return clearWander;
      },

      /** Toque carinho — ergue a frente e fecha os olhos */
      playPet(opts = {}) {
        if (api.isPetting || layout !== 'horizontal' || useClimb) return;
        const holdMs = opts.holdMs ?? 2800;
        api.isPetting = true;
        api._cancelPet?.();

        api._pauseWander?.();
        api.setMoving(false);
        api.playRise();

        const petTimer = scene.time.delayedCall(holdMs, () => {
          api.isPetting = false;
          api.resetPose();
          opts.onComplete?.();
          api._resumeWander?.();
        });
        api._cancelPet = () => petTimer.remove(false);
      },

      enablePetInteraction(onPet) {
        if (layout !== 'horizontal' || useClimb) return;

        const front = frontSegment();
        const hitH = (front?.displayHeight ?? frameH * scale) * 1.1;
        const hitW = headOffsetX + spacing * 0.45;
        container.setSize(hitW, hitH);
        container.setInteractive(
          new Phaser.Geom.Rectangle(-spacing * 0.06, -hitH, hitW, hitH),
          Phaser.Geom.Rectangle.Contains,
        );
        container.on('pointerup', () => {
          if (api.isPetting) return;
          onPet?.();
          api.playPet();
        });
      },

      setActiveSegmentCount(count) {
        activeSegmentCount = Phaser.Math.Clamp(count, 1, segments.length);
        const firstVisible = segments.length - activeSegmentCount;
        segments.forEach(({ sprite, index }) => {
          sprite.setVisible(index >= firstVisible);
        });
        playClimbOnVisibleSegments(80);
        syncHeadToFront();
        syncChildHead();
        bringHeadToFront();
      },

      getActiveSegmentCount() {
        return activeSegmentCount;
      },

      setAlpha(a) {
        container.setAlpha(a);
      },

      setScale(s) {
        container.setScale(s);
      },

      destroy() {
        api._stopWander?.();
        api._cancelPet?.();
        clearHeadBlink();
        container.destroy();
      },
    };

    return api;
  }
}
