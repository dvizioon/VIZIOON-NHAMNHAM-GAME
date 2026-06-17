import Phaser from 'phaser';
import { SceneKeys, RegistryKeys } from '../config/constants.js';
import { ProceduralAudio } from '../systems/ProceduralAudio.js';
import { GameApi } from '../services/gameApi.js';
import { mapApiCharactersList } from '../services/characterCatalog.js';
import { DEFAULT_GAME_RULES, normalizeGameRules } from '../services/gameRules.js';
import {
  queueLoadingUiAssets,
} from '../ui/loadingUi.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.BOOT);
  }

  preload() {
    queueLoadingUiAssets(this);
  }

  create() {
    this.registry.set(RegistryKeys.AUDIO, new ProceduralAudio(this));
    this.loadCatalogAndContinue();
  }

  async loadCatalogAndContinue() {
    let criancas = [];
    let gameConfig = { ...DEFAULT_GAME_RULES };

    if (GameApi.isEnabled()) {
      const [charactersResult, rulesResult] = await Promise.allSettled([
        GameApi.fetchCharacters(),
        GameApi.fetchGameRules(),
      ]);

      if (charactersResult.status === 'fulfilled') {
        criancas = mapApiCharactersList(charactersResult.value);
      } else {
        console.warn('[GameApi] catálogo indisponível', charactersResult.reason?.message);
      }

      if (rulesResult.status === 'fulfilled' && rulesResult.value) {
        gameConfig = normalizeGameRules(rulesResult.value);
      } else if (rulesResult.status === 'rejected') {
        console.warn('[GameApi] regras indisponíveis', rulesResult.reason?.message);
      }
    }

    this.registry.set(RegistryKeys.CRIANCAS, criancas);
    this.registry.set(RegistryKeys.GAME_CONFIG, gameConfig);
    this.scene.start(SceneKeys.PRELOAD);
  }
}
