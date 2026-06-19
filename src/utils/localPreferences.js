import { defaultSettings } from '../config/constants.js';

const SETTINGS_KEY = 'nhamnham_settings';
const PROFILE_KEY = 'nhamnham_profile_cache';

function normalizeSettings(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    ...defaultSettings,
    volumeMusica: typeof raw.volumeMusica === 'number' ? raw.volumeMusica : defaultSettings.volumeMusica,
    volumeEfeitos: typeof raw.volumeEfeitos === 'number' ? raw.volumeEfeitos : defaultSettings.volumeEfeitos,
    muted: Boolean(raw.muted),
    modo: raw.modo === 'setas' ? 'setas' : 'toque',
  };
}

/** Preferências locais — visitante e fallback offline */
export function loadLocalSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocalSettings(settings) {
  if (!settings) return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      volumeMusica: settings.volumeMusica,
      volumeEfeitos: settings.volumeEfeitos,
      muted: settings.muted,
      modo: settings.modo,
    }));
  } catch {
    /* ignore */
  }
}

export function cacheAccountProfile(session) {
  if (!session || session.isGuest) return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({
      displayName: session.displayName ?? '',
      age: typeof session.age === 'number' ? session.age : null,
    }));
  } catch {
    /* ignore */
  }
}

export function loadCachedAccountProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.displayName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCachedAccountProfile() {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* ignore */
  }
}
