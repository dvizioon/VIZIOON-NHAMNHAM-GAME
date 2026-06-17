import Phaser from 'phaser';
import { SceneKeys } from './constants.js';
import { BootScene } from '../scenes/BootScene.js';
import { PreloadScene } from '../scenes/PreloadScene.js';
import { SplashScene } from '../scenes/SplashScene.js';
import { RegisterScene } from '../scenes/NameScene.js';
import { LoginScene } from '../scenes/LoginScene.js';
import { CharacterScene } from '../scenes/CharacterScene.js';
import { SettingsScene } from '../scenes/SettingsScene.js';
import { EggScene } from '../scenes/EggScene.js';
import { GameScene } from '../scenes/GameScene.js';
import { TrunkIntroScene } from '../scenes/TrunkIntroScene.js';
import { CocoonScene } from '../scenes/CocoonScene.js';
import { VictoryScene } from '../scenes/VictoryScene.js';
import { CaterpillarDebugScene } from '../debug/CaterpillarDebugScene.js';
import { FrogDebugScene } from '../debug/FrogDebugScene.js';

export function createGameConfig() {
  return {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#E8F9FF',
    title: 'Nhoc Nhoc! A Lagartinha da Turminha',
    version: '0.1.0',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: 390,
      height: 844,
      expandParent: true,
    },
    input: {
      activePointers: 2,
      touch: { capture: true },
    },
    audio: {
      disableWebAudio: false,
      noAudio: false,
    },
    loader: {
      maxParallelDownloads: 16,
      crossOrigin: 'anonymous',
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false,
      },
    },
    scene: [
      BootScene,
      PreloadScene,
      SplashScene,
      LoginScene,
      RegisterScene,
      CharacterScene,
      SettingsScene,
      EggScene,
      TrunkIntroScene,
      GameScene,
      CocoonScene,
      VictoryScene,
      CaterpillarDebugScene,
      FrogDebugScene,
    ],
  };
}

export { SceneKeys };
