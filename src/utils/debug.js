/** Debug visual de hitboxes — `?debug=1` força on, `?debug=0` força off */
import { getFrogTongueHitZone } from '../config/frogAttackConfig.js';
export function isDebugHitboxes(scene) {
  const reg = scene.registry ?? scene.game?.registry;
  if (reg?.has('debugHitboxes')) {
    return reg.get('debugHitboxes') === true;
  }
  return false;
}

export function initDebugFlags(game) {
  const q = new URLSearchParams(window.location.search);

  if (q.get('debug') === '0' || q.get('debug') === 'false') {
    game.registry.set('debugHitboxes', false);
    return;
  }

  if (q.get('debug') === '1' || q.get('debug') === 'true') {
    game.registry.set('debugHitboxes', true);
    return;
  }

  const prodBuild = import.meta.env.VITE_DEBUG === 'false' || import.meta.env.PROD;
  game.registry.set('debugHitboxes', !prodBuild && import.meta.env.DEV);
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

/** Debug — zona vermelha da língua + linha até a ponta */
export function drawFrogTongueHitDebug(g, sprite, fromLeft, extraRadius = 0, head = null) {
  if (!g || !sprite?.active) return;
  const zone = getFrogTongueHitZone(sprite, fromLeft, extraRadius);
  if (!zone) return;

  drawBoundsHit(g, zone, 0xff1744, 0.28);
  g.lineStyle(3, 0xff5252, 0.95);
  g.lineBetween(zone.anchorX, zone.anchorY, zone.tipX, zone.anchorY);
  g.fillStyle(0xffeb3b, 0.9);
  g.fillCircle(zone.tipX, zone.anchorY, 8);

  if (head) {
    drawCircleHit(g, { x: head.x, y: head.y, r: 14 }, 0x00e676, 0.35);
    const inside = (
      head.x >= zone.x
      && head.x <= zone.x + zone.width
      && head.y >= zone.y
      && head.y <= zone.y + zone.height
    );
    if (inside) {
      g.lineStyle(3, 0x00e676, 1);
      g.strokeCircle(head.x, head.y, 18);
    }
  }
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
