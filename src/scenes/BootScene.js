import Phaser from 'phaser';
import { SceneKeys, RegistryKeys } from '../config/constants.js';
import { ProceduralAudio } from '../systems/ProceduralAudio.js';
import {
  queueLoadingUiAssets,
  registerLoadingHeadAnim,
} from '../ui/loadingUi.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.BOOT);
  }

  preload() {
    queueLoadingUiAssets(this);
  }

  create() {
    registerLoadingHeadAnim(this);
    this.registry.set(RegistryKeys.AUDIO, new ProceduralAudio(this));
    this.scene.start(SceneKeys.PRELOAD);
  }
}
