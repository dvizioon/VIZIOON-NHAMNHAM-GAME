import Phaser from 'phaser';
import { SceneKeys, RegistryKeys } from '../config/constants.js';
import { ProceduralAudio } from '../systems/ProceduralAudio.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.BOOT);
  }

  create() {
    this.registry.set(RegistryKeys.AUDIO, new ProceduralAudio(this));
    this.scene.start(SceneKeys.PRELOAD);
  }
}
