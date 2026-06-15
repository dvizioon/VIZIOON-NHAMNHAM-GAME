/** Escala UI — proporcional ao design 1280×720, sem esticar em telas largas */
export function uiScale(scene) {
  return Math.min(scene.scale.width / 1280, scene.scale.height / 720);
}

export function responsiveSize(scene, base) {
  return Math.max(12, Math.round(base * uiScale(scene)));
}

export function responsiveWidth(scene, ratio = 0.85, max = 560) {
  return Math.min(max, Math.round(scene.scale.width * ratio));
}

export function layoutY(scene, ratio) {
  return scene.scale.height * ratio;
}

export function isPortrait(scene) {
  return scene.scale.height > scene.scale.width;
}
