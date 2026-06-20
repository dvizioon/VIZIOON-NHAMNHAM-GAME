import Phaser from 'phaser';
import { SceneKeys, RegistryKeys } from '../config/constants.js';
import { ProceduralAudio } from '../systems/ProceduralAudio.js';
import { GameApi } from '../services/gameApi.js';
import { mapApiCharactersList } from '../services/characterCatalog.js';
import { DEFAULT_GAME_RULES, normalizeGameRules } from '../services/gameRules.js';
import { normalizeCriancasList } from '../config/characterUiConfig.js';
import { applyLoaderBaseUrl, resolvePublicAssetUrl } from '../utils/assetUrl.js';
import {
  queueLoadingUiAssets,
} from '../ui/loadingUi.js';

async function fetchLocalJson(path) {
  try {
    const res = await fetch(resolvePublicAssetUrl(path));
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.BOOT);
  }

  preload() {
    applyLoaderBaseUrl(this.load);
    queueLoadingUiAssets(this);
  }

  create() {
    this.registry.set(RegistryKeys.AUDIO, new ProceduralAudio(this));
    this.loadCatalogAndContinue();
  }

  async loadCatalogAndContinue() {
    let criancas = [];
    let gameConfig = { ...DEFAULT_GAME_RULES };

    const [localCriancas, localRules] = await Promise.all([
      fetchLocalJson('assets/data/criancas.json'),
      fetchLocalJson('assets/data/game-rules.json'),
    ]);

    if (Array.isArray(localCriancas) && localCriancas.length) {
      criancas = localCriancas;
    }
    if (localRules) {
      gameConfig = normalizeGameRules(localRules);
    }

    if (GameApi.isEnabled()) {
      const [charactersResult, rulesResult] = await Promise.allSettled([
        GameApi.fetchCharacters(),
        GameApi.fetchGameRules(),
      ]);

      if (charactersResult.status === 'fulfilled' && charactersResult.value?.length) {
        criancas = mapApiCharactersList(charactersResult.value);
      } else if (charactersResult.status === 'rejected') {
        console.warn('[GameApi] catálogo indisponível', charactersResult.reason?.message);
      }

      if (rulesResult.status === 'fulfilled' && rulesResult.value) {
        gameConfig = normalizeGameRules(rulesResult.value);
      } else if (rulesResult.status === 'rejected') {
        console.warn('[GameApi] regras indisponíveis', rulesResult.reason?.message);
      }
    }

    this.registry.set(RegistryKeys.CRIANCAS, normalizeCriancasList(criancas));
    this.registry.set(RegistryKeys.GAME_CONFIG, gameConfig);
    this.scene.start(SceneKeys.PRELOAD);
  }
}
