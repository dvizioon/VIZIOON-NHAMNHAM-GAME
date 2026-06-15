/** Escala UI — proporcional ao design 1280×720; no celular não encolhe demais */
export function uiScale(scene) {
  const { width, height } = scene.scale;
  const fit = Math.min(width / 1280, height / 720, 1);

  if (height > width) {
    const portraitMin = width / 720;
    return Math.max(fit, Math.min(portraitMin, 1));
  }

  return fit;
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
