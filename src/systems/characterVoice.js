import { getCharacterVoicePath } from '../config/characterUiConfig.js';
import { RegistryKeys } from '../config/constants.js';
import { resolvePublicAssetUrl } from '../utils/assetUrl.js';

let activeVoice = null;
let activeVoiceUrl = '';
let playToken = 0;
let pendingResume = null;

function clearPendingResume() {
  if (!pendingResume) return;
  const { scene, handler } = pendingResume;
  pendingResume = null;
  try {
    scene?.input?.off?.('pointerdown', handler);
  } catch {
    /* ignore */
  }
}

/**
 * Cancela só o retry pendente de autoplay (sem cortar a voz já tocando).
 * Usado ao abrir o modal: evita que o próximo toque (ex.: botão JOGAR)
 * re-dispare a apresentação da criança.
 */
export function cancelPendingCharacterVoice() {
  clearPendingResume();
}

/** Voz da criança — sempre 100% (só respeita mudo global) */
function getCharacterVoiceVolume(scene) {
  const settings = scene.registry.get(RegistryKeys.SETTINGS) || {};
  if (settings.muted) return 0;
  return 1;
}

export function stopCharacterVoice() {
  playToken += 1;
  clearPendingResume();
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
      // Falhou (autoplay bloqueado). Reagenda só UMA vez, no próximo gesto,
      // e mantém referência para poder cancelar — senão o listener "sequestra"
      // o próximo toque (ex.: botão JOGAR) e a voz toca de novo e corta.
      if (token !== playToken) return;
      clearPendingResume();
      const resume = () => {
        clearPendingResume();
        if (token !== playToken) return;
        audio.play().catch(() => {});
      };
      pendingResume = { scene, handler: resume };
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
