import { GameApi } from './gameApi.js';
import { GameState } from '../utils/GameState.js';

/** Formata o resultado do ping para exibir na UI */
export function formatServerPingLabel(ping) {
  if (!ping) return 'Servidor: medindo...';
  if (ping.ok) return `Servidor: ${ping.ms} ms`;
  return 'Servidor: offline';
}

/** Mede latência da API e guarda no registry da cena */
export async function measureServerPing(scene) {
  const result = await GameApi.ping();
  if (scene?.registry) {
    GameState.setServerPing(scene, result);
  }
  return result;
}
