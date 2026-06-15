import Phaser from 'phaser';
import { SceneKeys, RegistryKeys, defaultSettings } from '../config/constants.js';
import { REQUIRED_SOUNDS } from '../config/assets.js';
import { Theme } from '../config/theme.js';
import { queueOptionalAssets } from '../systems/AssetLoader.js';
import { queueSpriteAssets, registerSpriteAnimations } from '../systems/SpriteLoader.js';
import { capImageTexture, capSpritesheet } from '../systems/TextureScaler.js';
import { startBgm } from '../systems/MusicManager.js';
import { preloadSplashIcons } from '../ui/splashUi.js';
import { preloadSettingsIcons } from '../ui/settingsUi.js';
import criancasData from '../../public/assets/data/criancas.json';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.PRELOAD);
  }

  preload() {
    const { width, height } = this.scale;
    const barW = 400;
    const barH = 28;

    this.add.text(width / 2, height / 2 - 60, 'NhamNham!', {
      fontFamily: Theme.fontFamily,
      fontSize: '42px',
      color: '#4E9A2E',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const box = this.add.graphics();
    box.fillStyle(0x222222, 0.8);
    box.fillRoundedRect(width / 2 - barW / 2 - 10, height / 2 - 10, barW + 20, barH + 20, 8);

    const bar = this.add.graphics();

    this.load.on('progress', (value) => {
      bar.clear();
      bar.fillStyle(Theme.sol, 1);
      bar.fillRoundedRect(width / 2 - barW / 2, height / 2, barW * value, barH, 6);
    });

    this.load.on('loaderror', () => {
      // sprites do Figma são opcionais até você exportar
    });

    queueOptionalAssets(this);
    this.load.json('sprites', 'assets/data/sprites.json');
    this.load.image('env_background', 'assets/textures/environment/Background.png');
    this.load.image('env_ground', 'assets/textures/environment/Grama%20+%20Ch%C3%A3o.png');
    this.load.image('env_cloud', 'assets/textures/environment/cloud.png');
    this.load.image('ui_logo', 'assets/textures/ui/logo.svg');
    this.load.image('ui_button_border', 'assets/textures/ui/BordaButton.svg');
    this.load.image('ui_deco_3folhas', 'assets/textures/ui/3folhas.svg');
    this.load.image(
      'ui_deco_folhas_raizes',
      'assets/textures/ui/2folhas%20+%20raizes.svg',
    );
    this.load.spritesheet('food_frutas', 'assets/textures/food/frutas.png', {
      frameWidth: 898,
      frameHeight: 643,
    });
    for (const [key, url] of Object.entries(REQUIRED_SOUNDS)) {
      this.load.audio(key, url);
    }
    queueSpriteAssets(this);
  }

  async create() {
    registerSpriteAnimations(this);

    // PNGs do Figma passam de 4096px — reduz p/ GPU exibir
    capImageTexture(this, 'env_background');
    capImageTexture(this, 'env_ground');
    capSpritesheet(this, 'food_frutas', 898, 643);

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
          intervaloAranha: 15000,
          delayInicioSapo: 25000,
          delayInicioAranha: 35000,
          intervaloComida: 1800,
          tempoPreso: 90,
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
