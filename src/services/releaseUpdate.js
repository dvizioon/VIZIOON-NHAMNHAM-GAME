import { APP_GITHUB_REPO, APP_APK_DOWNLOAD_URL } from '../config/appLinks.js';
import { APP_VERSION } from '../config/appVersion.js';

const RELEASES_API = import.meta.env.VITE_GITHUB_RELEASES_API
  || `${APP_GITHUB_REPO.replace('https://github.com/', 'https://api.github.com/repos/')}/releases/latest`;

let cachedLatest = null;

export function normalizeVersion(tag) {
  return String(tag ?? '').trim().replace(/^v/i, '');
}

export function formatAppVersion(version = APP_VERSION) {
  const normalized = normalizeVersion(version);
  return normalized ? `v${normalized}` : 'v?';
}

export function getCurrentAppVersion() {
  return normalizeVersion(APP_VERSION);
}

export function compareVersions(a, b) {
  const pa = normalizeVersion(a).split('.').map((n) => Number(n) || 0);
  const pb = normalizeVersion(b).split('.').map((n) => Number(n) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

export function isUpdateAvailable(current = getCurrentAppVersion(), latest) {
  if (!latest) return false;
  return compareVersions(latest, current) > 0;
}

export async function fetchLatestReleaseInfo({ force = false } = {}) {
  if (cachedLatest && !force) return cachedLatest;

  try {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const version = normalizeVersion(data.tag_name);
    const apkAsset = data.assets?.find((asset) => asset.name?.toLowerCase().endsWith('.apk'));
    const downloadUrl = apkAsset?.browser_download_url || APP_APK_DOWNLOAD_URL;

    cachedLatest = {
      version,
      tagName: data.tag_name,
      name: data.name,
      body: data.body,
      publishedAt: data.published_at,
      downloadUrl,
      htmlUrl: data.html_url || `${APP_GITHUB_REPO}/releases/latest`,
    };
    return cachedLatest;
  } catch {
    return null;
  }
}
