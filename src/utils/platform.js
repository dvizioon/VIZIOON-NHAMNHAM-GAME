import { Capacitor } from '@capacitor/core';

/** APK instalado (Capacitor) — não é o navegador */
export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

/** Site / PWA no navegador — mostra botão de baixar APK */
export function isWebBrowser() {
  return !isNativeApp();
}
