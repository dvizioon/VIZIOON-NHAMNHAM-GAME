import { defaultSettings } from '../config/constants.js';

const SETTINGS_KEY = 'nhamnham_settings';
const PROFILE_KEY = 'nhamnham_profile_cache';
const LAST_RUN_KEY = 'nhamnham_last_run';
const RELEASE_PROMPT_KEY = 'nhamnham_release_prompt';

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

/** Última partida — visitante (local) e conta (cache local da última run) */
export function saveLastRunRecap(recap) {
  if (!recap) return;
  try {
    localStorage.setItem(LAST_RUN_KEY, JSON.stringify({
      points: recap.points ?? 0,
      durationMs: recap.durationMs ?? 0,
      fruitCounts: recap.fruitCounts ?? {},
      genero: recap.genero ?? 'menino',
      personName: recap.personName ?? '',
      finishedAt: recap.finishedAt ?? new Date().toISOString(),
    }));
  } catch {
    /* ignore */
  }
}

export function loadLastRunRecap() {
  try {
    const raw = localStorage.getItem(LAST_RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Evita repetir o aviso da mesma release na splash */
export function loadDismissedReleaseVersion() {
  try {
    return localStorage.getItem(RELEASE_PROMPT_KEY) || '';
  } catch {
    return '';
  }
}

export function saveDismissedReleaseVersion(version) {
  if (!version) return;
  try {
    localStorage.setItem(RELEASE_PROMPT_KEY, String(version));
  } catch {
    /* ignore */
  }
}
