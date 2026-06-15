/** Chaves do registry global — estado compartilhado entre cenas */
export const RegistryKeys = {
  PARENT_NAME: 'parentName',
  CHILD: 'child',
  CUSTOM: 'custom',
  GAME_CONFIG: 'gameConfig',
  CRIANCAS: 'criancas',
  POINTS: 'points',
  LIVES: 'lives',
  AUDIO: 'audio',
  SETTINGS: 'settings',
  RETURN_SCENE: 'returnScene',
  BGM: 'bgm',
};

export const SceneKeys = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  SPLASH: 'SplashScene',
  NAME: 'NameScene',
  CHARACTER: 'CharacterScene',
  CUSTOMIZE: 'CustomizeScene',
  SETTINGS: 'SettingsScene',
  EGG: 'EggScene',
  GAME: 'GameScene',
  COCOON: 'CocoonScene',
  VICTORY: 'VictoryScene',
};

export const defaultSettings = {
  volumeMusica: 0.5,
  volumeEfeitos: 0.5,
  muted: false,
  modo: 'toque',
};
