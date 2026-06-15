/** Mobile portrait — escala pela largura (390pt de referência) */
export function uiScale(scene) {
  const { width, height } = scene.scale;
  const base = width / 390;

  if (height > width) {
    return base;
  }

  return base * 0.85;
}

/** Cover 1280×720 — preenche tela sem esticar */
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

/** Posição Y como % da altura da tela */
export function layoutY(scene, ratio) {
  return scene.scale.height * ratio;
}

/** Posição X como % da largura da tela */
export function layoutX(scene, ratio) {
  return scene.scale.width * ratio;
}

export function isPortrait(scene) {
  return scene.scale.height > scene.scale.width;
}

/** Botão circular — % da largura no celular, px de design no desktop */
export function mobileBtnSize(scene, widthRatio, designPx = 142, minPx = 52) {
  if (isPortrait(scene)) {
    return Math.max(minPx, Math.round(scene.scale.width * widthRatio));
  }
  return designPx;
}

/** Margem/padding — % da largura no celular */
export function mobileMargin(scene, portraitRatio, designPx = 24) {
  if (isPortrait(scene)) {
    return Math.max(12, Math.round(scene.scale.width * portraitRatio));
  }
  return designPx;
}
