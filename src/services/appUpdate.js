import { startApkDownload } from '../config/appLinks.js';
import { isNativeApp, isWebBrowser } from '../utils/platform.js';
import { loadDismissedReleaseVersion, saveDismissedReleaseVersion } from '../utils/localPreferences.js';
import {
  fetchLatestReleaseInfo,
  formatAppVersion,
  getCurrentAppVersion,
  isUpdateAvailable,
} from './releaseUpdate.js';
import { showThematicAlert } from '../ui/thematicAlert.js';
import { openDownloadApkModal } from '../ui/downloadApkModal.js';

/** Avisa sobre nova release — visitante e logado; não bloqueia o jogo */
export async function maybePromptAppUpdate(scene) {
  if (!scene?.add) return;

  const latest = await fetchLatestReleaseInfo();
  if (!latest) return;

  const current = getCurrentAppVersion();
  if (!isUpdateAvailable(current, latest.version)) return;
  if (loadDismissedReleaseVersion() === latest.version) return;

  const message = isNativeApp()
    ? `Tem uma versão nova (${formatAppVersion(latest.version)})!\nToque em baixar para instalar a atualização.`
    : `Tem uma versão nova (${formatAppVersion(latest.version)})!\nBaixe o APK mais recente para jogar com as novidades.`;

  await showThematicAlert(scene, message, {
    type: 'info',
    title: 'Atualização disponível',
    buttonLabel: isNativeApp() ? 'Baixar agora' : 'Ver download',
    dismissOnOverlay: false,
    onClose: () => {
      saveDismissedReleaseVersion(latest.version);
      if (isNativeApp()) {
        startApkDownload(latest.downloadUrl);
        return;
      }
      if (isWebBrowser()) {
        openDownloadApkModal(scene);
      }
    },
  });
}
