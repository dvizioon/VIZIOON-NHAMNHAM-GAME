import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { drawEnvironmentLayers } from './createUI.js';
import { uiScale } from '../utils/responsive.js';

export function buildVictoryStage(scene) {
  drawEnvironmentLayers(scene, { clouds: true, ground: true });
}

export function createVictoryTitleCard(scene, nome, y, genero = 'menino') {
  const s = uiScale(scene);
  const { width } = scene.scale;
  const isGirl = genero === 'menina';
  const strokeColor = isGirl ? '#D85A96' : '#1E6A30';
  const subtitleColor = isGirl ? '#7a1f44' : '#4C3433';
  const borderColor = isGirl ? Theme.rosa : 0x4C3433;
  const shadowColor = isGirl ? 0xd85a96 : 0x1e6a30;
  const cardW = Math.min(width * 0.92, 520);
  const padY = Math.round(12 * s);
  const padX = Math.round(18 * s);
  const r = Math.round(18 * s);

  const title = scene.add.text(0, 0, `Parabéns, ${nome}!`, {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(30 * s)}px`,
    color: '#FFFFFF',
    fontStyle: 'bold',
    stroke: strokeColor,
    strokeThickness: Math.round(5 * s),
    align: 'center',
    wordWrap: { width: cardW - padX * 2 },
  }).setOrigin(0.5, 0);

  const subtitle = scene.add.text(0, 0, 'Você virou uma linda borboleta!', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(16 * s)}px`,
    color: subtitleColor,
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: cardW - padX * 2 },
  }).setOrigin(0.5, 0);

  const innerH = title.height + Math.round(6 * s) + subtitle.height;
  const cardH = innerH + padY * 2;
  const card = scene.add.container(width / 2, y).setDepth(42).setScrollFactor(0);

  const shadow = scene.add.graphics();
  shadow.fillStyle(shadowColor, 0.18);
  shadow.fillRoundedRect(-cardW / 2 + 4, -cardH / 2 + 5, cardW, cardH, r);

  const bg = scene.add.graphics();
  bg.fillStyle(Theme.papel, 0.94);
  bg.lineStyle(3, borderColor, 1);
  bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, r);
  bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, r);

  title.setPosition(0, -innerH / 2);
  subtitle.setPosition(0, -innerH / 2 + title.height + Math.round(6 * s));

  card.add([shadow, bg, title, subtitle]);
  card.setAlpha(0);
  card.setY(y - 24);
  scene.tweens.add({
    targets: card,
    alpha: 1,
    y,
    duration: 700,
    ease: 'Back.easeOut',
  });

  return card;
}

export function createVictoryDragHint(scene, y, genero = 'menino') {
  const s = uiScale(scene);
  const { width } = scene.scale;
  const isGirl = genero === 'menina';
  const strokeColor = isGirl ? 0xD85A96 : 0x1E6A30;
  const fillColor = isGirl ? 0xD85A96 : 0x1E6A30;
  const padX = Math.round(18 * s);
  const padY = Math.round(10 * s);

  const label = scene.add.text(0, 0, 'Toque na borboleta e arrasta na tela!', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(15 * s)}px`,
    color: '#FFFFFF',
    fontStyle: 'bold',
    align: 'center',
  }).setOrigin(0.5);

  const bubbleW = label.width + padX * 2;
  const bubbleH = label.height + padY * 2;
  const radius = bubbleH / 2;

  const container = scene.add.container(width / 2, y).setDepth(43).setScrollFactor(0).setAlpha(0.92);

  const bg = scene.add.graphics();
  bg.fillStyle(fillColor, 0.9);
  bg.fillRoundedRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, radius);
  bg.lineStyle(Math.round(2 * s), strokeColor, 1);
  bg.strokeRoundedRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, radius);

  container.add([bg, label]);

  const floatTween = scene.tweens.add({
    targets: container,
    y: y - Math.round(5 * s),
    duration: 1200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  let dismissed = false;
  const dismiss = () => {
    if (dismissed || !container.active) return;
    dismissed = true;
    floatTween.stop();
    scene.tweens.add({
      targets: container,
      alpha: 0,
      y: y + Math.round(10 * s),
      duration: 280,
      ease: 'Sine.easeIn',
      onComplete: () => container.destroy(),
    });
  };

  return { container, dismiss };
}

export function spawnVictorySparkles(scene, count = 16) {
  const { width, height } = scene.scale;
  for (let i = 0; i < count; i += 1) {
    const x = Phaser.Math.Between(width * 0.08, width * 0.92);
    const y = Phaser.Math.Between(height * 0.18, height * 0.72);
    const star = scene.add.star(x, y, 4, 3, 7, 0xffffff, 0.85)
      .setDepth(22)
      .setScrollFactor(0)
      .setScale(Phaser.Math.FloatBetween(0.35, 0.7))
      .setAlpha(0);

    scene.tweens.add({
      targets: star,
      alpha: { from: 0, to: 0.9 },
      scale: star.scale * 1.35,
      angle: star.angle + 90,
      duration: Phaser.Math.Between(900, 1600),
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 1400),
      ease: 'Sine.easeInOut',
    });
  }
}
