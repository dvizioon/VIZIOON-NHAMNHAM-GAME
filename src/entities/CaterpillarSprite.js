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
    const frameH = useClimb
      ? climbFrameH
      : (cfg?.sheets?.idle?.frameHeight ?? cfg?.frameHeight ?? 128);
    const segCount = Math.max(6, opts.segmentCount ?? cfg?.segmentCount ?? 6);
    const spacing = frameH * scale * (cfg?.segmentSpacing ?? 0.46);
    const originX = cfg?.origin?.x ?? 0.5;
    const originY = useClimb ? 0.92 : (cfg?.origin?.y ?? 0.5);
    const headOffsetY = layout === 'vertical' ? (segCount - 1) * spacing : 0;
    const headOffsetX = layout === 'horizontal' ? (segCount - 1) * spacing : 0;

    const walkAnimKey = `${texKeys.base}_walk`;
    const idleAnimKey = `${texKeys.base}_idle`;
    const eatAnimKey = `${texKeys.base}_eat`;
    const riseAnimKey = `${texKeys.base}_rising`;
    const climbAnimKey = `${texKeys.base}_climb`;
    const headWalkAnimKey = `${texKeys.base}_headWalk`;
    const headRiseAnimKey = `${texKeys.base}_headRise`;
    const riseFrontCount = cfg?.riseFrontCount ?? 2;
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

    const risePos = (index) => {
      const base = basePos(index);
      const face = facingRight ? 1 : -1;
      const lifts = [1.35, 0.72];
      const lift = lifts[index] ?? 0.65;
      return {
        x: base.x + spacing * 0.14 * face,
        y: base.y - spacing * lift,
      };
    };

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

    for (let i = 0; i < segCount; i++) {
      const fromEnd = segCount - 1 - i;
      const sx = layout === 'horizontal' ? fromEnd * spacing : 0;
      const sy = layout === 'vertical' ? -fromEnd * spacing : 0;
      const seg = scene.add.sprite(sx, sy, defaultTex).setScale(scale);
      seg.setOrigin(originX, originY);

      if (useClimb && scene.textures.exists(texKeys.climb)) {
        playClimbOnSegment(seg, i * 80);
      } else if (scene.anims.exists(idleAnimKey)) {
        seg.play(idleAnimKey);
      } else {
        seg.setFrame(cfg?.animations?.idle?.start ?? 0);
      }

      container.add(seg);
      segments.push({ sprite: seg, index: i });
    }

    let activeSegmentCount = segCount;

    const headCfg = { ...(cfg?.head ?? {}), ...(opts.headCfg ?? {}) };
    const headOriginX = headCfg.origin?.x ?? originX;
    const headOriginY = headCfg.origin?.y ?? originY;
    const headIdleFrame = headCfg.idleFrame ?? 1;
    const headBlinkFrame = headCfg.blinkFrame ?? 3;
    let headBlinkTimer = null;
    let headIsMoving = false;
    let headSprite = null;

    if (!hideHead && scene.textures.exists(texKeys.headWalk)) {
      headSprite = scene.add.sprite(0, 0, texKeys.headWalk, headIdleFrame);
      headSprite.setOrigin(headOriginX, headOriginY);
      headSprite.setScale(scale);
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

    const syncHeadToSegment = (seg, cfgOverride = {}) => {
      if (!headSprite?.active || !seg) return;
      const w = seg.displayWidth;
      const h = seg.displayHeight;
      const ballTop = cfgOverride.ballTopRatio ?? headCfg.ballTopRatio ?? 0.54;
      const oy = (cfgOverride.offsetY ?? headCfg.offsetY ?? 0.12) * h;
      const tipPush = (cfgOverride.tipOffset ?? headCfg.tipOffset ?? 0.65) * spacing;
      const fineX = (cfgOverride.offsetX ?? headCfg.offsetX ?? 0) * w;
      headSprite.setPosition(seg.x + tipPush + fineX, seg.y - h * ballTop + oy);
    };

    const syncHeadToFront = () => syncHeadToSegment(frontSegment());

    const resetHeadFromRise = () => {
      if (!headSprite?.active) return;
      scene.tweens.killTweensOf(headSprite);
      if (scene.textures.exists(texKeys.headWalk)) {
        headSprite.setTexture(texKeys.headWalk, headIdleFrame);
        headSprite.setOrigin(headOriginX, headOriginY);
        headSprite.setScale(scale);
      }
    };

    const playHeadRise = () => {
      if (!headSprite?.active || !scene.textures.exists(texKeys.headRise)) {
        setHeadVisible(false);
        return;
      }
      clearHeadBlink();
      headIsMoving = false;
      headSprite.setVisible(true);
      headSprite.setTexture(texKeys.headRise, 0);
      headSprite.setOrigin(headOriginX, headOriginY);
      headSprite.setScale(scale);
      if (scene.anims.exists(headRiseAnimKey)) {
        headSprite.play(headRiseAnimKey);
      }
      const riseCfg = headCfg.rise ?? {};
      const target = risePos(0);
      const front = frontSegment();
      const h = front?.displayHeight ?? frameH * scale;
      const w = front?.displayWidth ?? frameH * scale;
      const ballTop = riseCfg.ballTopRatio ?? headCfg.ballTopRatio ?? 0.54;
      const oy = (riseCfg.offsetY ?? headCfg.offsetY ?? 0.12) * h;
      const tipPush = (riseCfg.tipOffset ?? headCfg.tipOffset ?? 0.65) * spacing;
      const fineX = (riseCfg.offsetX ?? headCfg.offsetX ?? 0) * w;
      scene.tweens.killTweensOf(headSprite);
      scene.tweens.add({
        targets: headSprite,
        x: target.x + tipPush + fineX,
        y: target.y - h * ballTop + oy,
        duration: 550,
        ease: 'Back.easeOut',
      });
      bringHeadToFront();
    };

    const clearHeadBlink = () => {
      headBlinkTimer?.remove(false);
      headBlinkTimer = null;
    };

    const resumeHeadAnim = () => {
      if (!headSprite?.active || !headSprite.visible) return;
      if (headIsMoving && scene.anims.exists(headWalkAnimKey)) {
        headSprite.play(headWalkAnimKey);
      } else {
        headSprite.anims?.stop();
        headSprite.setFrame(headIdleFrame);
      }
    };

    const playHeadBlink = (onDone) => {
      if (!headSprite?.active || !headSprite.visible) {
        onDone?.();
        return;
      }
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
      if (moving && scene.anims.exists(headWalkAnimKey)) {
        headSprite.play(headWalkAnimKey);
      } else {
        headSprite.anims?.stop();
        headSprite.setFrame(headIdleFrame);
      }
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

    function playSegIdle(sprite) {
      if (scene.textures.exists(texKeys.idle)) {
        sprite.setTexture(texKeys.idle);
      }
      if (scene.anims.exists(idleAnimKey)) {
        sprite.play(idleAnimKey);
      } else {
        sprite.setFrame(cfg?.animations?.idle?.start ?? 0);
      }
    }

    function playSegAnim(sprite, moving, staggerMs = 0, index = 0) {
      const run = () => {
        if (!sprite.active) return;

        if (moving && scene.textures.exists(texKeys.walk)) {
          sprite.setTexture(texKeys.walk);
          if (scene.anims.exists(walkAnimKey)) {
            sprite.play(walkAnimKey);
          } else {
            sprite.setFrame(cfg?.animations?.walk?.start ?? 0);
          }
          return;
        }

        if (scene.textures.exists(texKeys.idle)) {
          sprite.setTexture(texKeys.idle);
        }
        if (scene.anims.exists(idleAnimKey)) {
          sprite.play(idleAnimKey);
        } else {
          sprite.setFrame(cfg?.animations?.idle?.start ?? 0);
        }
      };

      if (staggerMs > 0 && index > 0) {
        scene.time.delayedCall(index * staggerMs, run);
      } else {
        run();
      }
    }

    function isFrontSegment(index) {
      return index < riseFrontCount;
    }

    function sortSegmentDepth() {
      segments.forEach(({ sprite, index }) => {
        if (isFrontSegment(index)) {
          container.bringToTop(sprite);
        } else {
          container.sendToBack(sprite);
        }
      });
      segments
        .filter(({ index }) => isFrontSegment(index))
        .sort((a, b) => a.index - b.index)
        .forEach(({ sprite }) => container.bringToTop(sprite));
      bringHeadToFront();
    }

    const api = {
      mode: 'filament',
      container,
      segments,
      texKeys,
      headOffsetY,
      headOffsetX,
      layout,
      isMoving: false,
      isRising: false,
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
          if (layout === 'horizontal' && moving) {
            const pos = basePos(index);
            sprite.setPosition(pos.x, pos.y);
          }
        });
        setHeadMoving(moving);
        syncHeadToFront();
      },

      /** 2 da frente erguem; 4 de trás ficam paradas — erguendo desenha por cima */
      playRise() {
        if (layout !== 'horizontal') return;
        api.isRising = true;
        api.isMoving = false;
        playHeadRise();

        segments.forEach(({ sprite, index }) => {
          scene.tweens.killTweensOf(sprite);
          sprite.anims?.stop();

          if (isFrontSegment(index)) {
            if (scene.textures.exists(texKeys.rise)) {
              sprite.setTexture(texKeys.rise);
            }
            if (scene.anims.exists(riseAnimKey)) {
              sprite.play(riseAnimKey, true);
            }
            const target = risePos(index);
            scene.tweens.add({
              targets: sprite,
              x: target.x,
              y: target.y,
              duration: 550,
              ease: 'Back.easeOut',
              delay: (riseFrontCount - 1 - index) * 100,
            });
          } else {
            playSegIdle(sprite);
            const target = basePos(index);
            sprite.setPosition(target.x, target.y);
          }
        });

        sortSegmentDepth();
      },

      resetPose() {
        api.isRising = false;
        api.isMoving = false;
        resetHeadFromRise();
        setHeadVisible(true);
        segments.forEach(({ sprite, index }) => {
          scene.tweens.killTweensOf(sprite);
          playSegIdle(sprite);
          const pos = basePos(index);
          sprite.setPosition(pos.x, pos.y);
        });
        setHeadMoving(false);
        syncHeadToFront();
        bringHeadToFront();
      },

      updateWave(fase, moving, moveDelta = 0) {
        if (api.isRising) return;

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
          const wave = moving ? Math.sin(fase * 0.55 + index * 0.65) * 4 : 0;
          if (layout === 'horizontal') {
            const base = basePos(index);
            sprite.y = base.y + wave;
            sprite.x = base.x;
          } else {
            sprite.x = wave;
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

        const walkTo = (targetX, onComplete) => {
          if (!container.active) return;
          api.isRising = false;
          api.setMoving(true);
          const duration = (Math.abs(targetX - container.x) / speed) * 1000;
          moveTween = sceneRef.tweens.add({
            targets: container,
            x: targetX,
            duration: Math.max(duration, 600),
            ease: 'Linear',
            onComplete,
          });
        };

        const finishExit = (fromRight) => {
          walkTo(fromRight ? maxX : minX, () => {
            runCycle(!fromRight);
          });
        };

        const runCycle = (fromRight) => {
          if (!container.active) return;

          setFacing(fromRight);
          const enterX = fromRight ? minX : maxX;
          const centerX = pauseCenterX(fromRight);
          const behavior = pickBehavior();

          if (Math.abs(container.x - enterX) > spacing * 0.5) {
            container.setX(enterX);
          }
          api.resetPose();

          if (behavior === 'pass') {
            walkTo(fromRight ? maxX : minX, () => runCycle(!fromRight));
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

        container.setX(minX);
        runCycle(true);
        api._stopWander = clearWander;
        api._pauseWander = () => {
          clearWander();
          sceneRef.tweens.killTweensOf(container);
          api.setMoving(false);
        };
        api._resumeWander = () => {
          if (!container.active) return;
          finishExit(facingRight);
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

        clearHeadBlink();
        if (headSprite?.active) {
          headSprite.anims?.stop();
          headSprite.setFrame(headBlinkFrame);
          headSprite.setVisible(true);
          bringHeadToFront();
        }

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
