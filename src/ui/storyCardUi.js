import { uiScale } from '../utils/responsive.js';

/** Balanço leve do ícone principal + folhinha — cards de história (ovo, tronco, casulo). */
export function startStoryCardIconAnim(scene, mainIcon, leafIcon) {
  if (!scene?.tweens || !mainIcon?.active) return;

  const s = uiScale(scene);
  const mainBob = Math.round(5 * s);
  const mainBaseY = mainIcon.y;

  scene.tweens.add({
    targets: mainIcon,
    y: mainBaseY - mainBob,
    duration: 1300,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  if (leafIcon?.active) {
    scene.tweens.add({
      targets: leafIcon,
      angle: { from: -11, to: 11 },
      duration: 1050,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
