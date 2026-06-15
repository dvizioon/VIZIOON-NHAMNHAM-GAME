/** Debug visual de hitboxes — `?debug=1` força on, `?debug=0` força off */
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
  } else {
    game.registry.set('debugHitboxes', true);
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
  g.lineStyle(1, color, 0.65);
  g.fillStyle(color, alpha);
  g.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  g.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
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
