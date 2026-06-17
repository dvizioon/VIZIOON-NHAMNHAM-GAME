import { SceneKeys } from '../config/constants.js';

/** Telas iniciais para debug — VITE_SCREEN_INIT no .env (ex.: telalargata) */
const INIT_SCREENS = {
  telalargata: SceneKeys.CATERPILLAR_DEBUG,
  telasapo: SceneKeys.FROG_DEBUG,
  splash: SceneKeys.SPLASH,
};

export function getInitialSceneKey() {
  const raw = import.meta.env.VITE_SCREEN_INIT?.trim().toLowerCase();
  if (raw && INIT_SCREENS[raw]) return INIT_SCREENS[raw];
  return SceneKeys.SPLASH;
}
