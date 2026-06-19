import { loadGuestSessionToken } from '../services/gameApi.js';

const OFFLINE_CODE_KEY = 'nhamnham_guest_code';
const CHIP_PREFIX = 'visit';
const CODE_LEN = 6;

function randomGuestSuffix() {
  return Math.random().toString(36).slice(2, 2 + CODE_LEN).toLowerCase();
}

function cleanSuffix(value) {
  return String(value ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

/** Sufixo estável a partir do token UUID — sempre o mesmo código */
function suffixFromToken(token) {
  if (!token || token === 'offline-guest') return null;
  const clean = cleanSuffix(token);
  if (!clean) return null;
  return clean.length <= CODE_LEN ? clean : clean.slice(-CODE_LEN);
}

export function clearOfflineGuestCode() {
  try {
    localStorage.removeItem(OFFLINE_CODE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadOrCreateOfflineGuestCode() {
  try {
    let code = localStorage.getItem(OFFLINE_CODE_KEY);
    if (!code || code.length < 4) {
      const token = loadGuestSessionToken();
      const fromToken = suffixFromToken(token);
      code = fromToken ?? randomGuestSuffix();
      localStorage.setItem(OFFLINE_CODE_KEY, code);
    }
    return code.slice(0, CODE_LEN).toLowerCase();
  } catch {
    return randomGuestSuffix();
  }
}

/** Código curto do visitante — ex.: visite62afa (sem underscore) */
export function formatGuestChipCode(session) {
  const token = session?.sessionToken || loadGuestSessionToken();
  const isGuest = session?.isGuest || Boolean(token);
  if (!isGuest) return null;

  const raw = session?.guestRawName ?? '';
  const guestMatch = String(raw).match(/^guest[-_]*([a-z0-9]+)$/i);
  if (guestMatch?.[1]) {
    const suffix = cleanSuffix(guestMatch[1]).slice(0, CODE_LEN);
    if (suffix) return `${CHIP_PREFIX}${suffix}`;
  }

  const fromToken = suffixFromToken(token);
  if (fromToken) return `${CHIP_PREFIX}${fromToken}`;

  const offline = cleanSuffix(session?.offlineGuestCode ?? loadOrCreateOfflineGuestCode()).slice(0, CODE_LEN);
  return offline ? `${CHIP_PREFIX}${offline}` : CHIP_PREFIX;
}
