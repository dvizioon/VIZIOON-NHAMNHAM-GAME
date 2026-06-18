import { RegistryKeys, SceneKeys, defaultSettings } from '../config/constants.js';
import { DEFAULT_GAME_RULES } from '../services/gameRules.js';

/**
 * Pula direto para uma tela após o preload — só dev/debug.
 * No .env: VITE_SCREEN_INIT=<id> (reinicia o `bun run dev` depois de mudar)
 *
 * ids disponíveis:
 * - splash       → tela inicial
 * - telaarvore   → lagarta subindo no tronco (cabeça card de debug)
 * - telasubindo  → alias de telaarvore
 * - telalargata  → debug sprites lagarta (parada/andando/erguida)
 * - telasapo     → debug sapo (atacando + pulando)
 * - telasapoatacando → sapo na árvore (posição/tamanho + animação)
 * - telascore    → debug barra de progresso (score HUD)
 * - game         → gameplay na árvore
 * - egg          → tela do ovo
 */
const INIT_SCREENS = {
  splash: SceneKeys.SPLASH,
  telaarvore: SceneKeys.TRUNK_INTRO,
  telasubindo: SceneKeys.TRUNK_INTRO,
  telatrunk: SceneKeys.TRUNK_INTRO,
  telalargata: SceneKeys.CATERPILLAR_DEBUG,
  telasapo: SceneKeys.FROG_DEBUG,
  telasapoatacando: SceneKeys.FROG_ATTACK_DEBUG,
  telascore: SceneKeys.SCORE_HUD_DEBUG,
  game: SceneKeys.GAME,
  egg: SceneKeys.EGG,
};

const DEBUG_CHILD = {
  id: 'debug',
  nome: 'Lagartinha',
  genero: 'menino',
};

const DEBUG_CUSTOM = {
  cor: { clara: 0x7CB342, escura: 0x5C8F2E },
  chapeu: false,
  oculos: false,
};

export const REGISTRY_DEBUG_CARD_HEAD = 'debugCardHead';

export function getScreenInitId() {
  return import.meta.env.VITE_SCREEN_INIT?.trim().toLowerCase() || '';
}

export function getInitialSceneKey() {
  const raw = getScreenInitId();
  if (raw && INIT_SCREENS[raw]) return INIT_SCREENS[raw];
  return SceneKeys.SPLASH;
}

export function isDebugScreenInit() {
  return Boolean(getScreenInitId() && INIT_SCREENS[getScreenInitId()]);
}

export function usesDebugCardHead() {
  const key = getInitialSceneKey();
  return key === SceneKeys.TRUNK_INTRO && isDebugScreenInit();
}

/** Estado mínimo para telas que normalmente vêm depois do fluxo de login/personagem */
export function seedDebugState(scene) {
  if (!isDebugScreenInit()) return;

  const initialKey = getInitialSceneKey();
  const needsChild = [
    SceneKeys.TRUNK_INTRO,
    SceneKeys.GAME,
    SceneKeys.EGG,
  ].includes(initialKey);

  if (!needsChild) return;

  if (!scene.registry.get(RegistryKeys.CHILD)) {
    scene.registry.set(RegistryKeys.CHILD, { ...DEBUG_CHILD });
  }
  if (!scene.registry.get(RegistryKeys.CUSTOM)) {
    scene.registry.set(RegistryKeys.CUSTOM, { ...DEBUG_CUSTOM });
  }
  if (!scene.registry.get(RegistryKeys.GAME_CONFIG)) {
    scene.registry.set(RegistryKeys.GAME_CONFIG, { ...DEFAULT_GAME_RULES });
  }
  if (scene.registry.get(RegistryKeys.LIVES) == null) {
    scene.registry.set(RegistryKeys.LIVES, DEFAULT_GAME_RULES.maxVidas ?? 3);
  }
  if (!scene.registry.get(RegistryKeys.SETTINGS)) {
    scene.registry.set(RegistryKeys.SETTINGS, { ...defaultSettings });
  }

  if (initialKey === SceneKeys.TRUNK_INTRO) {
    scene.registry.set(REGISTRY_DEBUG_CARD_HEAD, true);
  }
}
