import { RegistryKeys, defaultSettings, SceneKeys } from '../config/constants.js';
import { CORES } from '../config/theme.js';

/** Helpers para ler/gravar estado global via registry */
export const GameState = {
  getParentName(scene) {
    return scene.registry.get(RegistryKeys.PARENT_NAME) || '';
  },

  setParentName(scene, name) {
    scene.registry.set(RegistryKeys.PARENT_NAME, name);
  },

  getChild(scene) {
    return scene.registry.get(RegistryKeys.CHILD);
  },

  setChild(scene, child) {
    scene.registry.set(RegistryKeys.CHILD, child);
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
};

export function defaultCustom(child) {
  const cor = child?.genero === 'menina' ? CORES[1] : CORES[0];
  return { cor, chapeu: false, oculos: false };
}
