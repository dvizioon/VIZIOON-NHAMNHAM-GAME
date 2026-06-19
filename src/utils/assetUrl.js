/** URL pública de assets/ — respeita VITE_BASE_PATH */
export function resolvePublicAssetUrl(path) {
  const base = import.meta.env.BASE_URL || './';
  const normalized = path.startsWith('assets/') ? path : `assets/${path}`;
  return new URL(normalized, new URL(base, window.location.href)).href;
}
