/**
 * Lagarta horizontal — mesmos ajustes da tela debug (telalargata).
 * sprites.json guarda rise/walk/crops; aqui spacing/scale por contexto.
 */

/** Parada + andando + erguida (filamento) — 5 corpo + cabeça = 6 */
export const CATERPILLAR_FILAMENT_OPTS = {
  layout: 'horizontal',
  segmentCount: 5,
  segmentSpacing: 0.56,
  segmentDisplayPad: 0.02,
  segmentFrameOffsetX: 0,
  segmentFrameOffsetY: 0,
  /** Balanço ao andar — reto ou onda por trecho */
  walkWaveNormalAmpY: 0,
  walkWaveBurstAmpY: 0.062,
  walkWaveNormalAmpRot: 0,
  walkWaveBurstAmpRot: 0.035,
  walkWaveSpeed: 7.5,
  walkWavePhaseStep: 0.78,
  /** Chance de balançar neste trecho (senão anda reto) */
  walkWaveLegSwayChance: 0.42,
};

/** Splash — escala no chão do terreno */
export const SPLASH_CATERPILLAR_SCALE = 0.172;
export const SPLASH_CATERPILLAR_GROUND_OFFSET_RATIO = 0.054;
/** Altura do frame de corpo (parada/andando) — p/ converter amp em px */
export const CATERPILLAR_BODY_FRAME_H = 510;

/** Amplitude da onda “burst” ao andar, em pixels de tela */
export function getCaterpillarWalkBurstAmpPx(displayScale = SPLASH_CATERPILLAR_SCALE) {
  return CATERPILLAR_BODY_FRAME_H * displayScale * CATERPILLAR_FILAMENT_OPTS.walkWaveBurstAmpY;
}

/** Altura visível de uma bolinha do corpo (parada/andando) */
export function getCaterpillarSegmentDisplayH(displayScale = SPLASH_CATERPILLAR_SCALE) {
  const pad = CATERPILLAR_FILAMENT_OPTS.segmentDisplayPad ?? 0.02;
  return CATERPILLAR_BODY_FRAME_H * displayScale * (1 - pad);
}

/** Erguida — valores finos da telalargata (playRise / pet na splash) */
export const CATERPILLAR_RISE_OVERRIDES = {
  riseDiagAngle: 0.62,
  riseDiagSpacingMul: 0.85,
  riseGroundSep: 0.28,
  riseLiftScale: 0.78,
  riseYOffset: 0.05,
  risePoseFrame: 0,
  riseDisplaySizeMul: 0.86,
  riseRotScale: 0,
  riseDisplayMatchIdle: true,
};

export function getSplashCaterpillarOpts(overrides = {}) {
  return {
    ...CATERPILLAR_FILAMENT_OPTS,
    displayScale: SPLASH_CATERPILLAR_SCALE,
    ...CATERPILLAR_RISE_OVERRIDES,
    ...overrides,
  };
}

/** Debug telalargata — maior p/ inspecionar */
export const DEBUG_CATERPILLAR_SCALE = 0.26;

export function getDebugCaterpillarOpts(overrides = {}) {
  return {
    ...CATERPILLAR_FILAMENT_OPTS,
    displayScale: DEBUG_CATERPILLAR_SCALE,
    ...overrides,
  };
}

/** @deprecated use CATERPILLAR_RISE_OVERRIDES */
export const CATERPILLAR_RISE_DEBUG_OVERRIDES = CATERPILLAR_RISE_OVERRIDES;
