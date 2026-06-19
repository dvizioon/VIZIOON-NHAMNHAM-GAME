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

  const url = resolvePublicAssetUrl(path);
  const audio = new Audio();
  audio.preload = 'auto';
  audio.volume = vol;
  activeVoice = audio;

  const tryPlay = () => {
    const promise = audio.play();
    if (promise?.catch) {
      promise.catch(() => {
        const resume = () => {
          audio.play().catch(() => {});
          scene.input.off('pointerdown', resume);
        };
        scene.input.once('pointerdown', resume);
      });
    }
  };

  audio.addEventListener('canplaythrough', tryPlay, { once: true });
  audio.addEventListener('error', () => {
    if (activeVoice === audio) activeVoice = null;
  }, { once: true });
  audio.onended = () => {
    if (activeVoice === audio) activeVoice = null;
  };

  audio.src = url;
  audio.load();
  tryPlay();

  return audio;
}
