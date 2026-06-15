import { Icon } from './iconify.js';

export const GAME_AVISO_ICONS = {
  sapo: Icon.from('solar:danger-bold', { designSize: 22, color: '#1E6A30' }),
  cresceu: Icon.from('solar:star-bold', { designSize: 22, color: '#1E6A30' }),
  comeu: Icon.from('solar:chef-hat-bold', { designSize: 22, color: '#1E6A30' }),
  sapoHit: Icon.from('solar:sad-circle-bold', { designSize: 22, color: '#D85A96' }),
};

export function preloadGameIcons(scene) {
  return Icon.preload(scene, Object.values(GAME_AVISO_ICONS));
}
