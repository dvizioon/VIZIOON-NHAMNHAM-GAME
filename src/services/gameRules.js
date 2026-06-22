/** Regras globais do jogo — fallback se a API estiver offline */
export const DEFAULT_GAME_RULES = {
  metaComida: 50,
  maxVidas: 3,
  cliquesOvo: 4,
  cliquesCasulo: 2,
  intervaloSapo: 6000,
  delayInicioSapo: 5000,
  minComidaAntesSapo: 4,
  invulneravelFrames: 120,
  designWidth: 1280,
  designHeight: 720,
};

export function normalizeGameRules(data) {
  if (!data || typeof data !== 'object') return { ...DEFAULT_GAME_RULES };
  return {
    metaComida: Number(data.metaComida ?? DEFAULT_GAME_RULES.metaComida),
    maxVidas: Number(data.maxVidas ?? DEFAULT_GAME_RULES.maxVidas),
    cliquesOvo: Number(data.cliquesOvo ?? DEFAULT_GAME_RULES.cliquesOvo),
    cliquesCasulo: Math.min(2, Number(data.cliquesCasulo ?? DEFAULT_GAME_RULES.cliquesCasulo)),
    intervaloSapo: Number(data.intervaloSapo ?? DEFAULT_GAME_RULES.intervaloSapo),
    delayInicioSapo: Number(data.delayInicioSapo ?? DEFAULT_GAME_RULES.delayInicioSapo),
    minComidaAntesSapo: Number(data.minComidaAntesSapo ?? DEFAULT_GAME_RULES.minComidaAntesSapo),
    invulneravelFrames: Number(data.invulneravelFrames ?? DEFAULT_GAME_RULES.invulneravelFrames),
    designWidth: Number(data.designWidth ?? DEFAULT_GAME_RULES.designWidth),
    designHeight: Number(data.designHeight ?? DEFAULT_GAME_RULES.designHeight),
  };
}
