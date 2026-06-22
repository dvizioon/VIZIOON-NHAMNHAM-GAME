const API_BASE = import.meta.env.VITE_GAME_API_URL ?? 'http://localhost:5240';

function headers(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: headers(token),
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const err = new Error(json.message ?? `HTTP ${res.status}`);
    err.status = res.status;
    err.code = json.code;
    throw err;
  }
  return json;
}

/** Cliente da API NHAMNHAM — sessão, config, personagem e score */
export const GameApi = {
  baseUrl: API_BASE,

  isEnabled() {
    return import.meta.env.VITE_GAME_API !== 'false';
  },

  /** Mede latência até /health — funciona mesmo com API desligada (modo offline). */
  async ping({ timeoutMs = 5000 } = {}) {
    const start = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      const ms = Math.round(performance.now() - start);
      if (!res.ok) {
        return { ok: false, ms, error: `HTTP ${res.status}` };
      }
      return { ok: true, ms };
    } catch (err) {
      const ms = Math.round(performance.now() - start);
      return { ok: false, ms, error: err?.message ?? 'offline' };
    } finally {
      clearTimeout(timer);
    }
  },

  async createSession({ name, age }) {
    const json = await request('/api/v1/game/session', {
      method: 'POST',
      body: { name, age },
    });
    return json.data;
  },

  async createGuestSession() {
    const json = await request('/api/v1/game/session/guest', { method: 'POST' });
    return json.data;
  },

  async login(username) {
    const json = await request('/api/v1/game/login', {
      method: 'POST',
      body: { username },
    });
    return json.data;
  },

  async getMe(token) {
    const json = await request('/api/v1/game/me', { token });
    return json.data;
  },

  async updateConfig(token, patch) {
    const json = await request('/api/v1/game/config', {
      method: 'PATCH',
      token,
      body: patch,
    });
    return json.data;
  },

  async selectPerson(token, person) {
    const json = await request('/api/v1/game/persons', {
      method: 'POST',
      token,
      body: {
        personKey: person.id ?? person.personKey,
        nome: person.nome,
        genero: person.genero ?? null,
        custom: person.custom ?? null,
      },
    });
    return json.data;
  },

  async saveScore(token, payload) {
    const json = await request('/api/v1/game/scores', {
      method: 'POST',
      token,
      body: payload,
    });
    return json.data;
  },

  async fetchRanking(limit = 20) {
    const json = await request(`/api/v1/game/ranking?limit=${limit}`);
    return json.data ?? [];
  },

  async fetchScoreFruits(token, scoreId) {
    const json = await request(`/api/v1/game/scores/run/${scoreId}/fruits`, { token });
    return json.data;
  },

  async fetchCharacters() {
    const json = await request('/api/v1/game/characters');
    return json.data ?? [];
  },

  async fetchGameRules() {
    const json = await request('/api/v1/game/rules');
    return json.data ?? null;
  },
};

const STORAGE_KEY = 'nhamnham_session_token';
const GUEST_STORAGE_KEY = 'nhamnham_guest_token';

export function loadStoredSessionToken() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function loadGuestSessionToken() {
  try {
    return localStorage.getItem(GUEST_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function storeSessionToken(token, { persist = true } = {}) {
  try {
    if (persist && token) localStorage.setItem(STORAGE_KEY, token);
    else if (!persist) localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function storeGuestSessionToken(token) {
  try {
    if (token) localStorage.setItem(GUEST_STORAGE_KEY, token);
    else localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function clearStoredSessionToken() {
  storeSessionToken('', { persist: false });
}

export function clearGuestSessionToken() {
  storeGuestSessionToken('');
}
