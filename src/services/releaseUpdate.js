import { APP_GITHUB_REPO, APP_APK_DOWNLOAD_URL } from '../config/appLinks.js';
import { APP_VERSION } from '../config/appVersion.js';

const REPO_API = APP_GITHUB_REPO.replace('https://github.com/', 'https://api.github.com/repos/');
const RELEASES_LATEST_API = import.meta.env.VITE_GITHUB_RELEASES_API || `${REPO_API}/releases/latest`;
const RELEASES_LIST_API = `${REPO_API}/releases?per_page=20`;
const TAGS_API = `${REPO_API}/tags?per_page=30`;

let cachedLatest = null;

const GH_HEADERS = { Accept: 'application/vnd.github+json' };

async function fetchPublishedRelease() {
  try {
    const res = await fetch(RELEASES_LATEST_API, { headers: GH_HEADERS });
    if (!res.ok) return null;

    const data = await res.json();
    return releasePayloadFromApi(data);
  } catch {
    return null;
  }
}

function releasePayloadFromApi(data) {
  const version = normalizeVersion(data.tag_name);
  const apkAsset = data.assets?.find((asset) => asset.name?.toLowerCase().endsWith('.apk'));
  const downloadUrl = apkAsset?.browser_download_url || APP_APK_DOWNLOAD_URL;

  return {
    version,
    tagName: data.tag_name,
    name: data.name,
    body: data.body,
    publishedAt: data.published_at,
    downloadUrl,
    htmlUrl: data.html_url || `${APP_GITHUB_REPO}/releases/latest`,
    source: 'release',
  };
}

async function fetchBestPublishedRelease() {
  try {
    const res = await fetch(RELEASES_LIST_API, { headers: GH_HEADERS });
    if (!res.ok) return fetchPublishedRelease();

    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) return fetchPublishedRelease();

    let best = null;
    for (const item of items) {
      const payload = releasePayloadFromApi(item);
      if (!payload.version) continue;
      if (!best || compareVersions(payload.version, best.version) > 0) best = payload;
    }
    return best ?? fetchPublishedRelease();
  } catch {
    return fetchPublishedRelease();
  }
}

async function fetchLatestTag() {
  try {
    const res = await fetch(TAGS_API, { headers: GH_HEADERS });
    if (!res.ok) return null;

    const tags = await res.json();
    if (!Array.isArray(tags) || tags.length === 0) return null;

    let best = null;
    for (const tag of tags) {
      const version = normalizeVersion(tag.name);
      if (!version) continue;
      if (!best || compareVersions(version, best.version) > 0) {
        best = {
          version,
          tagName: tag.name,
          htmlUrl: `${APP_GITHUB_REPO}/releases/tag/${encodeURIComponent(tag.name)}`,
          source: 'tag',
        };
      }
    }
    return best;
  } catch {
    return null;
  }
}

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

export function pickHighestVersion(...versions) {
  return versions
    .map((version) => normalizeVersion(version))
    .filter(Boolean)
    .reduce((best, version) => (
      !best || compareVersions(version, best) > 0 ? version : best
    ), null);
}

export function isUpdateAvailable(current = getCurrentAppVersion(), latest) {
  if (!latest) return false;
  const latestVersion = typeof latest === 'string' ? latest : latest.version;
  if (!latestVersion) return false;
  return compareVersions(latestVersion, current) > 0;
}

export async function fetchLatestReleaseInfo({ force = false } = {}) {
  if (cachedLatest && !force) return cachedLatest;

  const [published, latestTag] = await Promise.all([
    fetchBestPublishedRelease(),
    fetchLatestTag(),
  ]);

  const displayVersion = pickHighestVersion(
    latestTag?.version,
    published?.version,
    getCurrentAppVersion(),
  );
  if (!displayVersion) return null;

  const tagName = latestTag?.tagName
    ?? (compareVersions(displayVersion, published?.version) === 0 ? published?.tagName : `v${displayVersion}`);

  cachedLatest = {
    version: displayVersion,
    tagName,
    name: published?.name ?? tagName,
    body: published?.body ?? '',
    publishedAt: published?.publishedAt ?? null,
    downloadUrl: published?.downloadUrl ?? APP_APK_DOWNLOAD_URL,
    htmlUrl: latestTag?.htmlUrl ?? published?.htmlUrl ?? `${APP_GITHUB_REPO}/releases/latest`,
    hasPublishedRelease: Boolean(published),
    hasTag: Boolean(latestTag),
  };
  return cachedLatest;
}
