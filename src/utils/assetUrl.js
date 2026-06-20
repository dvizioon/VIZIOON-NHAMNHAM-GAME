/** URL pública de assets/ — respeita VITE_BASE_PATH (GitHub Pages em subpasta) */
export function getPublicBaseUrl() {
  const base = import.meta.env.BASE_URL || './';
  return new URL(base, window.location.href).href;
}

export function resolvePublicAssetUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path) || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }

  const normalized = String(path).replace(/^\//, '');
  return new URL(normalized, getPublicBaseUrl()).href;
}

/** Phaser Loader — prefixa assets/ com a base do deploy (/repo/ no GitHub Pages) */
export function applyLoaderBaseUrl(loader) {
  loader?.setBaseURL?.(import.meta.env.BASE_URL || './');
}
