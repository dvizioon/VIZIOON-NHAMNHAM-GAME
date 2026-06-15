/** Escala UI — portrait equilibra largura e altura (sem estourar nem encolher demais) */
export function uiScale(scene) {
  const { width, height } = scene.scale;

  if (height > width) {
    const byWidth = width / 720;
    const byHeight = height / 720;
    return Math.min(Math.max(byWidth, byHeight * 0.82), 1);
  }

  return Math.min(width / 1280, height / 720, 1);
}

/** Cover 1280×720 — preenche tela sem esticar/distortion */
export function coverDisplaySize(viewW, viewH, designW = 1280, designH = 720) {
  const s = Math.max(viewW / designW, viewH / designH);
  return { w: designW * s, h: designH * s };
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
