import { GameState } from '../utils/GameState.js';
import { RegistryKeys } from '../config/constants.js';

export const BGM_KEY = 'bgm';

function getMusicVolume(scene) {
  const s = GameState.getSettings(scene);
  if (s.muted) return 0;
  return s.volumeMusica ?? 0.5;
}

function attachLoopGuard(music) {
  music.setLoop(true);
  music.off('complete');
  music.on('complete', () => {
    if (!music.isPlaying) music.play();
  });
}

/** Inicia BGM em loop — SoundManager global (docs/skills/audio-and-sound) */
export function startBgm(scene) {
  if (!scene.cache.audio.exists(BGM_KEY)) return;

  const play = () => {
    let music = scene.registry.get(RegistryKeys.BGM);
    const volume = getMusicVolume(scene);

    if (music?.isPlaying) {
      music.setVolume(volume);
      return;
    }

    if (music) {
      music.stop();
      music.destroy();
    }

    music = scene.sound.add(BGM_KEY, { loop: true, volume });
    attachLoopGuard(music);
    music.play();
    scene.registry.set(RegistryKeys.BGM, music);
  };

  if (scene.sound.locked) {
    scene.sound.once('unlocked', play);
  } else {
    play();
  }
}

/** Garante que a faixa continua — útil após troca de cena */
export function ensureBgmPlaying(scene) {
  const music = scene.registry.get(RegistryKeys.BGM);
  if (!music?.isPlaying) {
    startBgm(scene);
    return;
  }
  music.setVolume(getMusicVolume(scene));
}

export function applyMusicVolume(scene) {
  const music = scene.registry.get(RegistryKeys.BGM);
  if (music) {
    music.setVolume(getMusicVolume(scene));
  }
}
