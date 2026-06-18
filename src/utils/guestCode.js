import { loadGuestSessionToken } from '../services/gameApi.js';

const OFFLINE_CODE_KEY = 'nhamnham_guest_code';
const CHIP_PREFIX = 'visit';
const CODE_LEN = 6;

function randomGuestSuffix() {
  return Math.random().toString(36).slice(2, 2 + CODE_LEN).toLowerCase();
}

export function clearOfflineGuestCode() {
  try {
    sessionStorage.removeItem(OFFLINE_CODE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadOrCreateOfflineGuestCode() {
  try {
    let code = sessionStorage.getItem(OFFLINE_CODE_KEY);
    if (!code || code.length < 4) {
      code = randomGuestSuffix();
      sessionStorage.setItem(OFFLINE_CODE_KEY, code);
    }
    return code.slice(0, CODE_LEN).toLowerCase();
  } catch {
    return randomGuestSuffix();
  }
}

/** Código curto do visitante — ex.: visit_a1b2c3 */
export function formatGuestChipCode(session) {
  const token = session?.sessionToken || loadGuestSessionToken();
  const isGuest = session?.isGuest || Boolean(token);
  if (!isGuest) return null;

  const raw = session?.guestRawName ?? '';
  if (raw) {
    const guestMatch = String(raw).match(/^guest[-_]?([a-z0-9]+)$/i);
    if (guestMatch?.[1]) {
      const suffix = guestMatch[1].replace(/-/g, '').slice(0, CODE_LEN).toLowerCase();
      if (suffix) return `${CHIP_PREFIX}_${suffix}`;
    }
  }

  if (token && token !== 'offline-guest') {
    const suffix = token.replace(/[^a-z0-9]/gi, '').slice(0, CODE_LEN).toLowerCase();
    if (suffix) return `${CHIP_PREFIX}_${suffix}`;
  }

  const offlineCode = session?.offlineGuestCode ?? loadOrCreateOfflineGuestCode();
  const suffix = String(offlineCode).replace(/[^a-z0-9]/gi, '').slice(0, CODE_LEN).toLowerCase()
    || randomGuestSuffix();
  return `${CHIP_PREFIX}_${suffix}`;
}
