import { RegistryKeys, defaultSettings, SceneKeys } from '../config/constants.js';
import { GUEST_PLAYER_NAME } from '../ui/playerNameUi.js';
import { formatGuestChipCode } from '../utils/guestCode.js';
import { CORES } from '../config/theme.js';
import { loadGuestSessionToken } from '../services/gameApi.js';
import { normalizeCriancaRecord } from '../config/characterUiConfig.js';

/** Helpers para ler/gravar estado global via registry */
export const GameState = {
  getParentName(scene) {
    return scene.registry.get(RegistryKeys.PARENT_NAME) || '';
  },

  setParentName(scene, name) {
    scene.registry.set(RegistryKeys.PARENT_NAME, name);
  },

  getPlayerAge(scene) {
    const stored = scene.registry.get(RegistryKeys.PLAYER_AGE);
    return typeof stored === 'number' ? stored : null;
  },

  setPlayerAge(scene, age) {
    scene.registry.set(RegistryKeys.PLAYER_AGE, age);
  },

  getChild(scene) {
    return scene.registry.get(RegistryKeys.CHILD);
  },

  setChild(scene, child) {
    scene.registry.set(RegistryKeys.CHILD, normalizeCriancaRecord(child));
  },

  getCustom(scene) {
    return scene.registry.get(RegistryKeys.CUSTOM) || defaultCustom();
  },

  setCustom(scene, custom) {
    scene.registry.set(RegistryKeys.CUSTOM, custom);
  },

  getConfig(scene) {
    return scene.registry.get(RegistryKeys.GAME_CONFIG);
  },

  getCriancas(scene) {
    return scene.registry.get(RegistryKeys.CRIANCAS) || [];
  },

  getPoints(scene) {
    return scene.registry.get(RegistryKeys.POINTS) || 0;
  },

  setPoints(scene, points) {
    scene.registry.set(RegistryKeys.POINTS, points);
  },

  getLives(scene) {
    return scene.registry.get(RegistryKeys.LIVES);
  },

  setLives(scene, lives) {
    scene.registry.set(RegistryKeys.LIVES, lives);
  },

  getSettings(scene) {
    return scene.registry.get(RegistryKeys.SETTINGS) || { ...defaultSettings };
  },

  setSettings(scene, settings) {
    scene.registry.set(RegistryKeys.SETTINGS, settings);
  },

  setReturnScene(scene, key) {
    scene.registry.set(RegistryKeys.RETURN_SCENE, key);
  },

  getReturnScene(scene) {
    return scene.registry.get(RegistryKeys.RETURN_SCENE) || SceneKeys.SPLASH;
  },

  getAudio(scene) {
    return scene.registry.get(RegistryKeys.AUDIO);
  },

  resetForNewRun(scene) {
    const config = scene.registry.get(RegistryKeys.GAME_CONFIG);
    scene.registry.set(RegistryKeys.POINTS, 0);
    scene.registry.set(RegistryKeys.LIVES, config?.maxVidas ?? 3);
  },

  initRun(scene) {
    const config = scene.registry.get(RegistryKeys.GAME_CONFIG);
    scene.registry.set(RegistryKeys.POINTS, 0);
    scene.registry.set(RegistryKeys.LIVES, config?.maxVidas ?? 3);
  },

  getPlayerSession(scene) {
    return scene.registry.get(RegistryKeys.PLAYER_SESSION) ?? null;
  },

  setPlayerSession(scene, session) {
    scene.registry.set(RegistryKeys.PLAYER_SESSION, session);
  },

  getActivePersonId(scene) {
    return scene.registry.get(RegistryKeys.ACTIVE_PERSON_ID) ?? null;
  },

  setActivePersonId(scene, personId) {
    scene.registry.set(RegistryKeys.ACTIVE_PERSON_ID, personId);
  },

  isGuestOnline(scene) {
    const session = this.getPlayerSession(scene);
    return Boolean(session?.isGuest);
  },

  isOnlineConnected(scene) {
    const session = this.getPlayerSession(scene);
    return Boolean(session?.sessionToken && !session?.isGuest);
  },

  hasActiveGuestSession(scene) {
    const session = this.getPlayerSession(scene);
    if (session?.isGuest) {
      return Boolean(session.sessionToken || loadGuestSessionToken());
    }
    return Boolean(loadGuestSessionToken());
  },

  /** Nome no chip da splash — visitante: visit_abc123 */
  getSessionChipName(scene) {
    if (this.isOnlineConnected(scene)) {
      return this.getPlayerSession(scene)?.displayName ?? 'Jogador';
    }
    if (this.hasActiveGuestSession(scene)) {
      const session = this.getPlayerSession(scene) ?? { isGuest: true };
      return formatGuestChipCode(session) ?? GUEST_PLAYER_NAME;
    }
    return null;
  },

  /** Nome exibido no ranking: conta → displayName; visitante → "Visitante" */
  getRankingDisplayName(scene) {
    if (this.isOnlineConnected(scene)) {
      return this.getPlayerSession(scene)?.displayName ?? null;
    }
    if (this.hasActiveGuestSession(scene) || this.isGuestOnline(scene)) {
      return GUEST_PLAYER_NAME;
    }
    return null;
  },

  canAppearInRanking(scene) {
    return this.isOnlineConnected(scene);
  },
};

export function defaultCustom(child) {
  const cor = child?.genero === 'menina' ? CORES[1] : CORES[0];
  return { cor, chapeu: false, oculos: false };
}
