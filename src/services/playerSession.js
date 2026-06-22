import {
  GameApi,
  loadStoredSessionToken,
  loadGuestSessionToken,
  storeSessionToken,
  storeGuestSessionToken,
  clearStoredSessionToken,
  clearGuestSessionToken,
} from '../services/gameApi.js';
import { GameState } from '../utils/GameState.js';
import { defaultSettings, SceneKeys } from '../config/constants.js';
import { GUEST_PLAYER_NAME, OFFLINE_PLAYER_NAME, OFFLINE_PLAY_TOKEN } from '../ui/playerNameUi.js';
import {
  cacheAccountProfile,
  clearCachedAccountProfile,
  loadCachedAccountProfile,
  loadLocalSettings,
  saveLocalSettings,
} from '../utils/localPreferences.js';
import { loadOrCreateOfflineGuestCode, clearOfflineGuestCode } from '../utils/guestCode.js';
import { gotoScene } from '../utils/sceneRun.js';
import { sanitizePlayerUsername } from '../utils/username.js';
import { applyMusicVolume } from '../systems/MusicManager.js';

function configEquals(a, b) {
  if (!a || !b) return false;
  return a.volumeMusica === b.volumeMusica
    && a.volumeEfeitos === b.volumeEfeitos
    && Boolean(a.muted) === Boolean(b.muted)
    && a.modo === b.modo;
}

function normalizeGuestSession(session) {
  if (!session?.isGuest) return session;

  if (session.isOfflinePlay || session.sessionToken === OFFLINE_PLAY_TOKEN) {
    return {
      ...session,
      isOfflinePlay: true,
      displayName: OFFLINE_PLAYER_NAME,
      offlineGuestCode: session.offlineGuestCode ?? loadOrCreateOfflineGuestCode(),
      sessionToken: OFFLINE_PLAY_TOKEN,
    };
  }

  const guestRawName = session.guestRawName
    ?? (String(session.displayName ?? '').match(/^guest/i) ? session.displayName : null);

  const needsOfflineCode = !guestRawName
    && (!session.sessionToken || session.sessionToken === 'offline-guest');

  return {
    ...session,
    guestRawName,
    offlineGuestCode: session.offlineGuestCode
      ?? (needsOfflineCode ? loadOrCreateOfflineGuestCode() : null),
    displayName: GUEST_PLAYER_NAME,
    sessionToken: session.sessionToken || loadGuestSessionToken() || 'offline-guest',
  };
}

function applySessionToState(scene, session, { persistAs }) {
  const normalized = normalizeGuestSession(session);
  GameState.setPlayerSession(scene, normalized);

  if (persistAs === 'account') {
    storeSessionToken(session.sessionToken, { persist: true });
    clearGuestSessionToken();
  } else if (persistAs === 'guest') {
    storeGuestSessionToken(normalized.sessionToken ?? '');
    clearStoredSessionToken();
  }

  const localSettings = loadLocalSettings();
  if (localSettings) {
    // Preferências locais sempre vencem: a conexão só "adiciona" (envia ao
    // servidor), nunca sobrescreve o que o jogador ajustou offline.
    GameState.setSettings(scene, localSettings);
    applyMusicVolume(scene);
    if (!session.isGuest && session.sessionToken && !configEquals(localSettings, session.config)) {
      void GameApi.updateConfig(session.sessionToken, {
        volumeMusica: localSettings.volumeMusica,
        volumeEfeitos: localSettings.volumeEfeitos,
        muted: localSettings.muted,
        modo: localSettings.modo,
      }).catch(() => {});
    }
  } else if (session.config) {
    const settings = {
      ...defaultSettings,
      volumeMusica: session.config.volumeMusica,
      volumeEfeitos: session.config.volumeEfeitos,
      muted: session.config.muted,
      modo: session.config.modo,
    };
    GameState.setSettings(scene, settings);
    saveLocalSettings(settings);
    applyMusicVolume(scene);
  } else {
    const settings = { ...defaultSettings };
    GameState.setSettings(scene, settings);
    applyMusicVolume(scene);
  }

  if (session.activePerson?.id) {
    GameState.setActivePersonId(scene, session.activePerson.id);
  }

  if (!session.isGuest) {
    cacheAccountProfile(session);
    GameState.setParentName(scene, session.displayName);
    if (typeof session.age === 'number') GameState.setPlayerAge(scene, session.age);
  }
}

/** Cadastro — cria conta registrada */
export async function bootstrapPlayerSession(scene, { name, age }) {
  if (!GameApi.isEnabled()) return null;

  try {
    const session = await GameApi.createSession({
      name: sanitizePlayerUsername(name),
      age,
    });
    applySessionToState(scene, session, { persistAs: 'account' });
    return session;
  } catch (err) {
    console.warn('[GameApi] cadastro indisponível — modo offline', err.message);
    GameState.setPlayerSession(scene, null);
    return null;
  }
}

/** Visitante — tenta API; se falhar, cai no modo visitante local */
export async function bootstrapGuestSession(scene) {
  const applyOfflineGuest = () => {
    const offline = {
      isGuest: true,
      displayName: GUEST_PLAYER_NAME,
      sessionToken: 'offline-guest',
    };
    GameState.setPlayerSession(scene, offline);
    storeGuestSessionToken('offline-guest');
    const localSettings = loadLocalSettings();
    if (localSettings) GameState.setSettings(scene, localSettings);
    return offline;
  };

  if (!GameApi.isEnabled()) {
    return applyOfflineGuest();
  }

  try {
    const session = await GameApi.createGuestSession();
    applySessionToState(scene, session, { persistAs: 'guest' });
    return session;
  } catch (err) {
    console.warn('[GameApi] visitante indisponível — modo offline', err.message);
    return applyOfflineGuest();
  }
}

/** Jogar offline — sem internet; progresso só no localStorage deste aparelho */
export function bootstrapOfflinePlaySession(scene) {
  const offline = normalizeGuestSession({
    isGuest: true,
    isOfflinePlay: true,
    displayName: OFFLINE_PLAYER_NAME,
    sessionToken: OFFLINE_PLAY_TOKEN,
    offlineGuestCode: loadOrCreateOfflineGuestCode(),
  });

  GameState.setPlayerSession(scene, offline);
  storeGuestSessionToken(OFFLINE_PLAY_TOKEN);
  clearStoredSessionToken();

  const localSettings = loadLocalSettings();
  if (localSettings) {
    GameState.setSettings(scene, localSettings);
  } else {
    GameState.setSettings(scene, { ...defaultSettings });
  }
  applyMusicVolume(scene);
  return offline;
}

/** Login com usuário cadastrado */
export async function loginPlayerSession(scene, username) {
  if (!GameApi.isEnabled()) return null;

  try {
    const session = await GameApi.login(sanitizePlayerUsername(username));
    applySessionToState(scene, session, { persistAs: 'account' });
    return session;
  } catch (err) {
    console.warn('[GameApi] login falhou', err.message);
    return null;
  }
}

/** Restaura conta salva (localStorage) */
export async function restorePlayerSession(scene) {
  if (!GameApi.isEnabled()) return null;

  const token = loadStoredSessionToken();
  if (!token) return null;

  try {
    const session = await GameApi.getMe(token);
    if (session.isGuest) return null;

    applySessionToState(scene, session, { persistAs: 'account' });
    return session;
  } catch (err) {
    const expired = err?.status === 401 || err?.status === 403 || err?.status === 404;
    if (expired) {
      clearStoredSessionToken();
      clearCachedAccountProfile();
      return null;
    }

    const cached = loadCachedAccountProfile();
    const fallback = {
      sessionToken: token,
      isGuest: false,
      displayName: cached?.displayName ?? 'Jogador',
      age: cached?.age ?? null,
    };
    GameState.setPlayerSession(scene, fallback);
    storeSessionToken(token, { persist: true });
    if (cached?.displayName) {
      GameState.setParentName(scene, cached.displayName);
      if (typeof cached.age === 'number') GameState.setPlayerAge(scene, cached.age);
    }
    const localSettings = loadLocalSettings();
    if (localSettings) GameState.setSettings(scene, localSettings);
    return fallback;
  }
}

/** Restaura visitante salvo (localStorage) */
export async function restoreGuestSession(scene) {
  if (GameState.isOnlineConnected(scene)) return null;

  const token = loadGuestSessionToken();
  if (!token) return null;

  if (token === OFFLINE_PLAY_TOKEN) {
    const offline = normalizeGuestSession({
      isGuest: true,
      isOfflinePlay: true,
      displayName: OFFLINE_PLAYER_NAME,
      sessionToken: OFFLINE_PLAY_TOKEN,
    });
    GameState.setPlayerSession(scene, offline);
    const localSettings = loadLocalSettings();
    if (localSettings) GameState.setSettings(scene, localSettings);
    return offline;
  }

  if (token === 'offline-guest') {
    const offline = { isGuest: true, displayName: GUEST_PLAYER_NAME, sessionToken: 'offline-guest' };
    GameState.setPlayerSession(scene, offline);
    const localSettings = loadLocalSettings();
    if (localSettings) GameState.setSettings(scene, localSettings);
    return offline;
  }

  if (!GameApi.isEnabled()) {
    const offline = { isGuest: true, displayName: GUEST_PLAYER_NAME, sessionToken: token };
    GameState.setPlayerSession(scene, offline);
    return offline;
  }

  try {
    const session = await GameApi.getMe(token);
    if (!session.isGuest) {
      clearGuestSessionToken();
      return null;
    }
    applySessionToState(scene, session, { persistAs: 'guest' });
    return session;
  } catch (err) {
    const expired = err?.status === 401 || err?.status === 403 || err?.status === 404;
    if (expired) {
      clearGuestSessionToken();
      return null;
    }

    const fallback = {
      isGuest: true,
      displayName: GUEST_PLAYER_NAME,
      sessionToken: token,
    };
    GameState.setPlayerSession(scene, fallback);
    const localSettings = loadLocalSettings();
    if (localSettings) GameState.setSettings(scene, localSettings);
    return fallback;
  }
}

/** Garante sessão (conta ou visitante) ao trocar de tela */
export async function ensurePlayerSession(scene) {
  const session = GameState.getPlayerSession(scene);

  if (session?.sessionToken && !session.isGuest) {
    return session;
  }

  if (session?.isGuest && session.sessionToken) {
    return session;
  }

  if (loadStoredSessionToken() || loadGuestSessionToken()) {
    return restoreAnyPlayerSession(scene);
  }

  return session;
}

/** Restaura conta ou visitante ao abrir a splash */
export async function restoreAnyPlayerSession(scene) {
  const account = await restorePlayerSession(scene);
  if (account) return account;
  return restoreGuestSession(scene);
}

/** JOGAR — só personagens se conta ou visitante ativo; senão login */
export async function startPlayFromSplash(scene) {
  if (scene._navLock) return;
  await ensurePlayerSession(scene);
  if (!scene.sys?.isActive?.() || scene._navLock) return;
  if (GameState.isOnlineConnected(scene) || GameState.hasActiveGuestSession(scene)) {
    gotoScene(scene, SceneKeys.CHARACTER);
    return;
  }

  gotoScene(scene, SceneKeys.LOGIN);
}

/** Encerra sessão salva */
export function logoutPlayerSession(scene) {
  clearStoredSessionToken();
  clearGuestSessionToken();
  clearCachedAccountProfile();
  clearOfflineGuestCode();
  GameState.setPlayerSession(scene, null);
  GameState.setActivePersonId(scene, null);
  GameState.setParentName(scene, '');
  GameState.setPlayerAge(scene, null);
}

/** Registra personagem escolhido na conta online */
export async function registerSelectedPerson(scene, crianca, custom) {
  const session = GameState.getPlayerSession(scene);
  if (!session?.sessionToken || session.isGuest) return null;

  try {
    const person = await GameApi.selectPerson(session.sessionToken, {
      ...crianca,
      custom,
    });
    GameState.setActivePersonId(scene, person.id);

    try {
      const refreshed = await GameApi.getMe(session.sessionToken);
      GameState.setPlayerSession(scene, refreshed);
    } catch {
      /* mantém sessão anterior */
    }

    return person;
  } catch (err) {
    console.warn('[GameApi] personagem não salvo online', err.message);
    return null;
  }
}

/** Salva pontuação por personagem (conta registrada) */
export async function syncRunScore(scene, { points, livesLeft, levelLabel, won, durationMs }) {
  const session = GameState.getPlayerSession(scene);
  if (!session?.sessionToken || session.isGuest) return null;

  const child = GameState.getChild(scene);

  try {
    return await GameApi.saveScore(session.sessionToken, {
      personId: GameState.getActivePersonId(scene) ?? undefined,
      personKey: child?.id,
      points,
      livesLeft,
      levelLabel,
      won,
      durationMs: durationMs ?? GameState.getRunDurationMs(scene),
      fruitCounts: GameState.getRunStats(scene).fruitCounts ?? {},
    });
  } catch (err) {
    console.warn('[GameApi] score não salvo', err.message);
    return null;
  }
}

/** Sincroniza volume/preferências — local sempre; API só em conta */
export async function syncPlayerConfig(scene, settings) {
  saveLocalSettings(settings);

  const session = GameState.getPlayerSession(scene);
  if (!session?.sessionToken || session.isGuest) return null;

  try {
    return await GameApi.updateConfig(session.sessionToken, {
      volumeMusica: settings.volumeMusica,
      volumeEfeitos: settings.volumeEfeitos,
      muted: settings.muted,
      modo: settings.modo,
    });
  } catch (err) {
    console.warn('[GameApi] config não sincronizada', err.message);
    return null;
  }
}

