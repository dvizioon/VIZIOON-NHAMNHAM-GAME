export const PLAYER_USERNAME_MAX = 10;
export const PLAYER_USERNAME_MIN = 2;

/** Primeiro nome, só letras, máx. 10 — sem espaço, número ou símbolo */
export function sanitizePlayerUsername(raw) {
  const first = String(raw ?? '').trim().split(/\s+/)[0] ?? '';
  const lettersOnly = first
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '');
  return lettersOnly.slice(0, PLAYER_USERNAME_MAX);
}

export function isValidPlayerUsername(raw) {
  return sanitizePlayerUsername(raw).length >= PLAYER_USERNAME_MIN;
}
