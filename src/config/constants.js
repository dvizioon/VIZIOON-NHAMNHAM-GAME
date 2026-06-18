/** Chaves do registry global — estado compartilhado entre cenas */
export const RegistryKeys = {
  PARENT_NAME: 'parentName',
  PLAYER_AGE: 'playerAge',
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
  PLAYER_SESSION: 'playerSession',
  ACTIVE_PERSON_ID: 'activePersonId',
};

export const SceneKeys = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  SPLASH: 'SplashScene',
  LOGIN: 'LoginScene',
  REGISTER: 'RegisterScene',
  NAME: 'RegisterScene',
  CHARACTER: 'CharacterScene',
  CUSTOMIZE: 'CustomizeScene',
  SETTINGS: 'SettingsScene',
  EGG: 'EggScene',
  GAME: 'GameScene',
  TRUNK_INTRO: 'TrunkIntroScene',
  COCOON: 'CocoonScene',
  VICTORY: 'VictoryScene',
  CATERPILLAR_DEBUG: 'CaterpillarDebugScene',
  FROG_DEBUG: 'FrogDebugScene',
  FROG_ATTACK_DEBUG: 'FrogAttackDebugScene',
  SCORE_HUD_DEBUG: 'ScoreHudDebugScene',
};

export const defaultSettings = {
  volumeMusica: 0.5,
  volumeEfeitos: 0.5,
  muted: false,
  modo: 'toque',
};
