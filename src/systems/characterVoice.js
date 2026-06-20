import { getCharacterVoicePath } from '../config/characterUiConfig.js';
import { RegistryKeys } from '../config/constants.js';
import { resolvePublicAssetUrl } from '../utils/assetUrl.js';

let activeVoice = null;
let activeVoiceUrl = '';
let playToken = 0;

/** Voz da criança — sempre 100% (só respeita mudo global) */
function getCharacterVoiceVolume(scene) {
  const settings = scene.registry.get(RegistryKeys.SETTINGS) || {};
  if (settings.muted) return 0;
  return 1;
}

export function stopCharacterVoice() {
  playToken += 1;
  if (!activeVoice) return;
  try {
    activeVoice.pause();
    activeVoice.currentTime = 0;
    activeVoice.src = '';
  } catch {
    // já parado
  }
  activeVoice = null;
  activeVoiceUrl = '';
}

/** Toca apresentação da criança — HTML5 Audio (MP3 da TTS não decodifica no Web Audio) */
export function playCharacterVoice(scene, crianca) {
  const path = getCharacterVoicePath(crianca);
  if (!path) return null;

  const vol = getCharacterVoiceVolume(scene);
  if (vol <= 0) return null;

  const url = resolvePublicAssetUrl(path);
  if (activeVoice && activeVoiceUrl === url && !activeVoice.paused) {
    return activeVoice;
  }

  stopCharacterVoice();

  const token = playToken;
  const audio = new Audio();
  audio.preload = 'auto';
  audio.volume = vol;
  activeVoice = audio;
  activeVoiceUrl = url;

  const cleanupIfStale = () => {
    if (token !== playToken) {
      try {
        audio.pause();
        audio.removeAttribute('src');
      } catch {
        /* ignore */
      }
    }
  };

  const tryPlay = () => {
    if (token !== playToken || !scene?.sys?.isActive?.()) {
      cleanupIfStale();
      return;
    }
    const promise = audio.play();
    promise?.catch?.(() => {
      if (token !== playToken) return;
      const resume = () => {
        if (token !== playToken) return;
        audio.play().catch(() => {});
        scene.input?.off?.('pointerdown', resume);
      };
      scene.input?.once?.('pointerdown', resume);
    });
  };

  audio.addEventListener('ended', () => {
    if (activeVoice === audio) {
      activeVoice = null;
      activeVoiceUrl = '';
    }
  }, { once: true });

  audio.addEventListener('error', () => {
    if (activeVoice === audio) {
      activeVoice = null;
      activeVoiceUrl = '';
    }
  }, { once: true });

  audio.src = url;
  tryPlay();

  return audio;
}
