import { GameState } from '../utils/GameState.js';
import { measureServerPing } from '../services/serverPing.js';
import { Theme } from '../config/theme.js';
import { uiScale } from '../utils/responsive.js';

const PING_INTERVAL_MS = 5000;
const PING_OK = '#1E6A30';
const PING_WARN = '#C4A035';
const PING_BAD = '#D85A96';

export function shouldShowGamePing(scene) {
  if (GameState.isOfflinePlay(scene)) return false;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  return true;
}

function pingColor(ms) {
  if (ms > 200) return PING_BAD;
  if (ms > 100) return PING_WARN;
  return PING_OK;
}

/** HUD compacto — só aparece com servidor online */
export function createGamePingHud(scene) {
  if (!shouldShowGamePing(scene)) return null;

  const s = uiScale(scene);
  const pad = Math.round(10 * s);
  const hudTop = Math.round(8 * s);
  const fontSize = Math.max(11, Math.round(13 * s));
  const x = pad;
  const y = hudTop + Math.round(58 * s);

  const label = scene.add.text(x, y, '', {
    fontFamily: Theme.fontFamily,
    fontSize: `${fontSize}px`,
    color: PING_OK,
    fontStyle: 'bold',
  }).setOrigin(0, 0).setDepth(215).setScrollFactor(0).setVisible(false);

  let timer = null;
  let measuring = false;

  const applyPing = (ping) => {
    if (!ping?.ok) {
      label.setVisible(false);
      return;
    }
    label.setVisible(true);
    label.setText(`Ping ${ping.ms} ms`);
    label.setColor(pingColor(ping.ms));
  };

  const tick = async () => {
    if (measuring || !scene.sys?.isActive?.()) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      label.setVisible(false);
      return;
    }
    measuring = true;
    try {
      const ping = await measureServerPing(scene);
      if (scene.sys?.isActive?.()) applyPing(ping);
    } finally {
      measuring = false;
    }
  };

  const start = () => {
    applyPing(GameState.getServerPing(scene));
    void tick();
    timer?.remove();
    timer = scene.time.addEvent({
      delay: PING_INTERVAL_MS,
      loop: true,
      callback: () => void tick(),
    });
  };

  const stop = () => {
    timer?.remove();
    timer = null;
  };

  const destroy = () => {
    stop();
    label.destroy();
  };

  return { label, applyPing, start, stop, destroy };
}
