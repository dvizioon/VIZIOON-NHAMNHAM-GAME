/** Links públicos do app — APK, repositório e suporte */
export const APP_GITHUB_REPO = 'https://github.com/dvizioon/VIZIOON-NHOCNHOC-FRONTEND';

export const APP_SUPPORT_EMAIL = 'danielmartinsjob@gmail.com';

export const APP_NAME = 'Nhoc Nhoc! A Lagartinha da Turminha';

export const APP_CREDITS = 'Desenvolvido por Daniel Estevão · DVIZIOON';

/** URL direta do .apk na release mais recente do GitHub */
export const APP_APK_DOWNLOAD_URL =
  import.meta.env.VITE_APK_DOWNLOAD_URL
  || `${APP_GITHUB_REPO}/releases/latest/download/nhocnhoc.apk`;

export const APP_APK_FILENAME = 'nhocnhoc.apk';

export function openExternalUrl(url) {
  if (!url || typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function openSupportEmail(subject = 'Suporte — Nhoc Nhoc') {
  if (typeof window === 'undefined') return;
  const mail = `mailto:${APP_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
  window.location.href = mail;
}

/** URL da App Store (iOS) — opcional via .env */
export const APP_IOS_URL = import.meta.env.VITE_IOS_APP_URL ?? '';

export function startIosDownload() {
  if (APP_IOS_URL) {
    openExternalUrl(APP_IOS_URL);
    return true;
  }
  openSupportEmail('App iOS — Nhoc Nhoc');
  return false;
}

export function startApkDownload(downloadUrl = APP_APK_DOWNLOAD_URL) {
  if (typeof document === 'undefined') return false;

  const link = document.createElement('a');
  link.href = downloadUrl || APP_APK_DOWNLOAD_URL;
  link.setAttribute('download', APP_APK_FILENAME);
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}
