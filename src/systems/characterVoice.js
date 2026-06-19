import { getCharacterVoicePath } from '../config/characterUiConfig.js';
import { RegistryKeys } from '../config/constants.js';
import { resolvePublicAssetUrl } from '../utils/assetUrl.js';

let activeVoice = null;

function getEffectVolume(scene) {
  const settings = scene.registry.get(RegistryKeys.SETTINGS) || {};
  if (settings.muted) return 0;
  return settings.volumeEfeitos ?? 0.8;
}

export function stopCharacterVoice() {
  if (!activeVoice) return;
  try {
    activeVoice.pause();
    activeVoice.currentTime = 0;
  } catch {
    // já parado
  }
  activeVoice = null;
}

/** Toca apresentação da criança — HTML5 Audio (MP3 da TTS não decodifica no Web Audio) */
export function playCharacterVoice(scene, crianca) {
  stopCharacterVoice();
  const path = getCharacterVoicePath(crianca);
  if (!path) return null;

  const vol = getEffectVolume(scene);
  if (vol <= 0) return null;

  const audio = new Audio(resolvePublicAssetUrl(path));
  audio.volume = vol;
  activeVoice = audio;

  const play = () => {
    audio.play().catch(() => {});
  };

  if (scene.sound?.locked) {
    scene.sound.once('unlocked', play);
  } else {
    play();
  }

  audio.onended = () => {
    if (activeVoice === audio) activeVoice = null;
  };

  return audio;
}
