import Phaser from 'phaser';
import { SceneKeys, RegistryKeys, defaultSettings } from '../config/constants.js';
import { REQUIRED_SOUNDS } from '../config/assets.js';
import { Theme } from '../config/theme.js';
import { uiScale, isPortrait } from '../utils/responsive.js';
import { queueOptionalAssets } from '../systems/AssetLoader.js';
import { queueSpriteAssets, registerSpriteAnimations } from '../systems/SpriteLoader.js';
import { capImageTexture, capSpritesheet } from '../systems/TextureScaler.js';
import { startBgm } from '../systems/MusicManager.js';
import { preloadSplashIcons } from '../ui/splashUi.js';
import { preloadSettingsIcons } from '../ui/settingsUi.js';
import { FOOD_FRUTAS } from '../config/foodConfig.js';
import {
  CHAR_HEADS_KEY,
  CHAR_HEADS_ANIM_KEY,
  CHAR_HEAD_FRAME_W,
  CHAR_HEAD_FRAME_H,
  CHAR_HEAD_FRAME_COUNT,
  getCharacterHeadAnimKey,
  getCharacterHeadSheetKey,
  listCharacterHeadAssets,
  listCharacterFaceAssets,
} from '../config/characterUiConfig.js';
import {
  ENV_SKY_KEY,
  ENV_CLOUD_KEY,
  ENV_GROUND_KEY,
  ENV_SKY_PATH,
  ENV_CLOUD_PATH,
  ENV_GROUND_PATH,
} from '../config/environmentConfig.js';
import { GAME_TRUNK_KEY, INTRO_TRUNK_KEY } from '../config/gameWorldConfig.js';
import criancasData from '../../public/assets/data/criancas.json';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.PRELOAD);
  }

  preload() {
    const { width, height } = this.scale;
    const portrait = isPortrait(this);
    const barW = portrait ? Math.round(width * 0.78) : Math.min(400, Math.round(width * 0.55));
    const barH = Math.max(18, Math.round(barW * 0.07));
    const titleSize = Math.max(28, Math.round((portrait ? width * 0.11 : 42) * (portrait ? 1 : uiScale(this))));
    const titleY = height * (portrait ? 0.42 : 0.5) - 60;

    this.add.text(width / 2, titleY, 'NhamNham!', {
      fontFamily: Theme.fontFamily,
      fontSize: `${titleSize}px`,
      color: '#4E9A2E',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const barY = height * (portrait ? 0.48 : 0.5);
    const box = this.add.graphics();
    box.fillStyle(0x222222, 0.8);
    box.fillRoundedRect(width / 2 - barW / 2 - 10, barY - 10, barW + 20, barH + 20, 8);

    const bar = this.add.graphics();

    this.load.on('progress', (value) => {
      bar.clear();
      bar.fillStyle(Theme.sol, 1);
      bar.fillRoundedRect(width / 2 - barW / 2, barY, barW * value, barH, 6);
    });

    this.load.on('loaderror', () => {
      // sprites do Figma são opcionais até você exportar
    });

    queueOptionalAssets(this);
    this.load.json('sprites', 'assets/data/sprites.json');
    this.load.image(ENV_SKY_KEY, ENV_SKY_PATH);
    this.load.image(ENV_CLOUD_KEY, ENV_CLOUD_PATH);
    this.load.image(ENV_GROUND_KEY, ENV_GROUND_PATH);
    this.load.image('ui_logo', 'assets/textures/ui/logo.svg');
    this.load.image('ui_logo_personagens', 'assets/textures/ui/Logo_personagens.svg');
    this.load.spritesheet('char_heads_kids', 'assets/sprites/characters/cabe%C3%A7a_crian%C3%A7as.png', {
      frameWidth: 641,
      frameHeight: 804,
    });
    this.load.image('ui_button_border', 'assets/textures/ui/BordaButton.svg');
    this.load.image('ui_deco_3folhas', 'assets/textures/ui/3folhas.svg');
    this.load.image(
      'ui_deco_folhas_raizes',
      'assets/textures/ui/2folhas%20+%20raizes.svg',
    );
    this.load.spritesheet(FOOD_FRUTAS.key, 'assets/textures/food/frutas.png', {
      frameWidth: FOOD_FRUTAS.frameWidth,
      frameHeight: FOOD_FRUTAS.frameHeight,
    });
    this.load.image(GAME_TRUNK_KEY, 'assets/textures/ui/tronco_game.png');
    this.load.image(INTRO_TRUNK_KEY, 'assets/textures/ui/tronco_intro.png');
    for (const { key, path } of listCharacterHeadAssets(criancasData)) {
      this.load.spritesheet(key, path, {
        frameWidth: CHAR_HEAD_FRAME_W,
        frameHeight: CHAR_HEAD_FRAME_H,
      });
    }
    for (const { key, path } of listCharacterFaceAssets(criancasData)) {
      this.load.image(key, path);
    }
    for (const [key, url] of Object.entries(REQUIRED_SOUNDS)) {
      this.load.audio(key, url);
    }
    queueSpriteAssets(this);
  }

  async create() {
    registerSpriteAnimations(this);

    // PNGs do Figma passam de 4096px — reduz p/ GPU exibir (antes das animações!)
    capImageTexture(this, ENV_SKY_KEY);
    capImageTexture(this, ENV_GROUND_KEY);
    capImageTexture(this, GAME_TRUNK_KEY);
    capImageTexture(this, INTRO_TRUNK_KEY);
    capSpritesheet(this, FOOD_FRUTAS.key, FOOD_FRUTAS.frameWidth, FOOD_FRUTAS.frameHeight);
    for (const { key } of listCharacterHeadAssets(criancasData)) {
      capSpritesheet(this, key, CHAR_HEAD_FRAME_W, CHAR_HEAD_FRAME_H);
    }
    for (const { key } of listCharacterFaceAssets(criancasData)) {
      capImageTexture(this, key);
    }

    if (this.textures.exists(CHAR_HEADS_KEY) && !this.anims.exists(CHAR_HEADS_ANIM_KEY)) {
      this.anims.create({
        key: CHAR_HEADS_ANIM_KEY,
        frames: this.anims.generateFrameNumbers(CHAR_HEADS_KEY, {
          start: 0,
          end: CHAR_HEAD_FRAME_COUNT - 1,
        }),
        frameRate: 7,
        repeat: -1,
      });
    }

    for (const crianca of criancasData.filter((c) => c.cabeca)) {
      const sheetKey = getCharacterHeadSheetKey(crianca);
      const animKey = getCharacterHeadAnimKey(crianca);
      if (this.textures.exists(sheetKey) && !this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(sheetKey, {
            start: 0,
            end: CHAR_HEAD_FRAME_COUNT - 1,
          }),
          frameRate: 7,
          repeat: -1,
        });
      }
    }

    const criancas = this.cache.json.exists('criancas')
      ? this.cache.json.get('criancas')
      : criancasData;

    const gameConfig = this.cache.json.exists('config')
      ? this.cache.json.get('config')
      : {
          metaComida: 24,
          maxVidas: 3,
          cliquesOvo: 3,
          cliquesCasulo: 2,
          intervaloSapo: 12000,
          delayInicioSapo: 25000,
          minComidaAntesSapo: 4,
          invulneravelFrames: 120,
        };

    this.registry.set(RegistryKeys.CRIANCAS, criancas);
    this.registry.set(RegistryKeys.GAME_CONFIG, gameConfig);
    this.registry.set(RegistryKeys.POINTS, 0);
    this.registry.set(RegistryKeys.LIVES, gameConfig.maxVidas ?? 3);
    this.registry.set(RegistryKeys.SETTINGS, { ...defaultSettings });

    await Promise.all([preloadSplashIcons(this), preloadSettingsIcons(this)]);
    startBgm(this);
    this.scene.start(SceneKeys.SPLASH);
  }
}
