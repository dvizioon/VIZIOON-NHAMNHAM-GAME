import Phaser from 'phaser';
import { GameState } from '../utils/GameState.js';
import { RegistryKeys } from '../config/constants.js';

export const BGM_KEY = 'bgm';

let bgmWasPlaying = false;

function getMusicVolume(scene) {
  const s = GameState.getSettings(scene);
  if (s.muted) return 0;
  return Phaser.Math.Clamp(s.volumeMusica ?? 0.5, 0, 1);
}

function attachLoopGuard(music) {
  music.setLoop(true);
  music.off('complete');
  music.on('complete', () => {
    if (!music.isPlaying) music.play();
  });
}

function canPlayAudio(scene) {
  return Boolean(scene?.sys?.isActive?.() && scene.cache?.audio?.exists(BGM_KEY) && !scene.sound?.locked);
}

/** Inicia BGM — só depois do desbloqueio (primeiro toque). Retorna true se está tocando. */
export function startBgm(scene) {
  if (!canPlayAudio(scene)) return false;

  let music = scene.registry.get(RegistryKeys.BGM);
  const volume = getMusicVolume(scene);

  if (music?.isPlaying) {
    music.setVolume(volume);
    return true;
  }

  if (music) {
    music.stop();
    music.destroy();
  }

  music = scene.sound.add(BGM_KEY, { loop: true, volume });
  attachLoopGuard(music);
  music.play();
  scene.registry.set(RegistryKeys.BGM, music);
  bgmWasPlaying = true;
  return music.isPlaying;
}

/** Chamado uma vez após o primeiro gesto do usuário (main.js). Retorna true se já tocou. */
export function beginBgmAfterUnlock(scene) {
  if (!scene?.registry) return false;
  return startBgm(scene);
}

/** Garante que a faixa continua — nunca tenta tocar com áudio bloqueado. */
export function ensureBgmPlaying(scene) {
  if (!scene?.sys?.isActive?.()) return;
  if (scene.sound?.locked) return;

  const music = scene.registry.get(RegistryKeys.BGM);
  if (!music?.isPlaying) {
    startBgm(scene);
    return;
  }
  music.setVolume(getMusicVolume(scene));
}

export function stopBgm(scene) {
  const music = scene.registry.get(RegistryKeys.BGM);
  if (!music) return;
  music.stop();
  music.destroy();
  scene.registry.remove(RegistryKeys.BGM);
  bgmWasPlaying = false;
}

export function applyMusicVolume(scene) {
  const music = scene.registry.get(RegistryKeys.BGM);
  if (music) {
    music.setVolume(getMusicVolume(scene));
  }
}

/** Pausa ao sair do app/aba — não toca em segundo plano */
export function pauseBgm(scene) {
  const music = scene?.registry?.get(RegistryKeys.BGM);
  if (!music) {
    bgmWasPlaying = false;
    return;
  }
  bgmWasPlaying = music.isPlaying;
  if (bgmWasPlaying) music.pause();
}

/** Retoma ao voltar pro app, se já foi desbloqueado e estava tocando */
export function resumeBgm(scene) {
  if (!scene?.registry || !bgmWasPlaying) return;
  if (scene.sound?.locked) return;

  const music = scene.registry.get(RegistryKeys.BGM);
  if (!music) return;
  music.setVolume(getMusicVolume(scene));
  if (!music.isPlaying) music.resume();
}
