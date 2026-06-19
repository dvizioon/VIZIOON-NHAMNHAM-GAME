/** Debug visual de hitboxes — `?debug=1` força on, `?debug=0` força off */
import { FROG_ATTACK_FRAME_COUNT, getFrogTongueHitZone } from '../config/frogAttackConfig.js';

export const FROG_DEBUG_FREEZE_FRAME = FROG_ATTACK_FRAME_COUNT - 1;

function getRegistry(sceneOrGame) {
  return sceneOrGame?.registry ?? sceneOrGame?.game?.registry;
}

export function isDebugHitboxes(scene) {
  const reg = getRegistry(scene);
  if (reg?.has('debugHitboxes')) {
    return reg.get('debugHitboxes') === true;
  }
  return false;
}

/** Congela o sapo com língua estendida — `?frogFreeze=1` ou tecla P no jogo */
export function isDebugFreezeFrog(scene) {
  const reg = getRegistry(scene);
  if (reg?.has('debugFreezeFrog')) {
    return reg.get('debugFreezeFrog') === true;
  }
  return false;
}

export function setDebugFreezeFrog(game, value) {
  game.registry.set('debugFreezeFrog', value === true);
  return value === true;
}

export function toggleDebugFreezeFrog(game) {
  const next = !isDebugFreezeFrog(game);
  setDebugFreezeFrog(game, next);
  return next;
}

export function initDebugFlags(game) {
  const q = new URLSearchParams(window.location.search);

  if (q.get('debug') === '0' || q.get('debug') === 'false') {
    game.registry.set('debugHitboxes', false);
  } else if (q.get('debug') === '1' || q.get('debug') === 'true') {
    game.registry.set('debugHitboxes', true);
  } else {
    const prodBuild = import.meta.env.VITE_DEBUG === 'false' || import.meta.env.PROD;
    game.registry.set('debugHitboxes', !prodBuild && import.meta.env.DEV);
  }

  if (q.get('frogFreeze') === '0' || q.get('frogFreeze') === 'false') {
    game.registry.set('debugFreezeFrog', false);
  } else if (
    q.get('frogFreeze') === '1'
    || q.get('frogFreeze') === 'true'
    || import.meta.env.VITE_FROG_FREEZE === 'true'
  ) {
    game.registry.set('debugFreezeFrog', true);
  } else {
    game.registry.set('debugFreezeFrog', false);
  }
}

export function drawCircleHit(g, { x, y, r }, color, alpha = 0.35) {
  g.lineStyle(2, color, 0.9);
  g.fillStyle(color, alpha);
  g.fillCircle(x, y, r);
  g.strokeCircle(x, y, r);
}

/** Retângulo de bounds do sprite (respeita rotação, escala e container) */
export function drawBoundsHit(g, bounds, color, alpha = 0.15) {
  g.lineStyle(2, color, 0.85);
  g.fillStyle(color, alpha);
  g.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  g.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
}

/** Debug — zona vermelha da língua + alvos do corpo (verde) */
export function drawFrogTongueHitDebug(g, sprite, fromLeft, extraRadius = 0, targets = null, tune = null) {
  if (!g || !sprite?.active) return;
  const zone = getFrogTongueHitZone(sprite, fromLeft, extraRadius, tune ?? undefined);
  if (!zone) return;

  drawBoundsHit(g, zone, 0xff1744, 0.28);
  g.lineStyle(3, 0xff5252, 0.95);
  g.lineBetween(zone.anchorX, zone.anchorY, zone.tipX, zone.anchorY);
  g.fillStyle(0xffeb3b, 0.9);
  g.fillCircle(zone.tipX, zone.anchorY, 8);

  const list = Array.isArray(targets) ? targets : (targets ? [targets] : []);
  list.forEach((target) => {
    const r = target.r ?? 14;
    drawCircleHit(g, { x: target.x, y: target.y, r }, 0x00e676, 0.28);
    const inside = (
      target.x >= zone.x - r
      && target.x <= zone.x + zone.width + r
      && target.y >= zone.y - r
      && target.y <= zone.y + zone.height + r
    );
    if (inside) {
      g.lineStyle(3, 0x00e676, 1);
      g.strokeCircle(target.x, target.y, r + 4);
    }
  });
}

/** Centro visual via GetBounds — alinhado com rotação/origin */
export function getGameObjectCircle(go, radiusRatio = 0.4, centerYRatio = 0.5) {
  const b = go.getBounds();
  const r = Math.min(b.width, b.height) * radiusRatio;
  return {
    x: b.centerX,
    y: b.y + b.height * centerYRatio,
    r,
  };
}

export function moveGameObjectToHitCircle(go, cx, cy, radiusRatio = 0.4, centerYRatio = 0.5) {
  const current = getGameObjectCircle(go, radiusRatio, centerYRatio);
  go.x += cx - current.x;
  go.y += cy - current.y;
}

export function circlesOverlap(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy) <= a.r + b.r;
}
