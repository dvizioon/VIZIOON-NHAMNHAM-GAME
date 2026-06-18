import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale, responsiveWidth } from '../utils/responsive.js';
import { Icon } from './iconify.js';
import { PANEL_CORNER_RADIUS, PANEL_SHADOW_OFFSET } from './settingsUi.js';
import { getGrassTopY, getGroundY, DEPTH_TRUNK } from './createUI.js';
import { FOOD_FRUTAS } from '../config/foodConfig.js';

export const TRUNK_STORY_CARD_Y_RATIO = 0.33;
export const TRUNK_HINT_Y_RATIO = 0.76;
export const TRUNK_CLIMBER_START_Y_RATIO = 0.88;
/** Sobe um pouco no tronco — subida curta, sem precisar de 2ª árvore */
export const TRUNK_CLIMBER_END_Y_RATIO = 0.66;

const STORY_TEXT_COLOR = '#490808';

export const TRUNK_STORY_ICONS = {
  tree: Icon.from('mynaui:tree', { color: '#1E6A30', designSize: 32 }),
  leaf: Icon.from('solar:leaf-linear', { color: '#4E9A2E', designSize: 28 }),
};

export async function preloadTrunkIntroIcons(scene) {
  await Icon.preload(scene, Object.values(TRUNK_STORY_ICONS));
}

function createChildNameBadge(scene, nome, s, genero = 'menino') {
  const fontSize = Math.round(15 * s);
  const padX = Math.round(10 * s);
  const padY = Math.round(4 * s);
  const badgeColor = genero === 'menina' ? 0xd85a96 : Theme.folhaEscura;
  const label = scene.add.text(padX, padY, nome, {
    fontFamily: Theme.fontFamily,
    fontSize: `${fontSize}px`,
    color: '#FFFFFF',
    fontStyle: 'bold',
  }).setOrigin(0, 0);

  const bw = label.width + padX * 2;
  const bh = label.height + padY * 2;
  const bg = scene.add.graphics();
  bg.fillStyle(badgeColor, 1);
  bg.fillRoundedRect(0, 0, bw, bh, Math.round(bh / 2));

  const badge = scene.add.container(0, 0, [bg, label]);
  badge._badgeW = bw;
  badge._badgeH = bh;
  return badge;
}

/** Card temático — história antes de subir na árvore */
export function createTrunkStoryCard(scene, x, y, { nome = 'Lagartinha', genero = 'menino' } = {}) {
  const s = uiScale(scene);
  const isMenina = genero === 'menina';
  const cardW = responsiveWidth(scene, 0.9, 520);
  const padX = Math.round(18 * s);
  const padY = Math.round(14 * s);
  const iconSize = Math.round(44 * s);
  const gap = Math.round(10 * s);
  const textW = cardW - padX * 2 - iconSize - gap;
  const r = Math.round(PANEL_CORNER_RADIUS * (cardW / 400));
  const off = Math.round(PANEL_SHADOW_OFFSET * (cardW / 400));
  const shadowColor = isMenina ? Theme.rosa : Theme.verde;

  const bodyStyle = {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(15 * s)}px`,
    color: STORY_TEXT_COLOR,
    lineSpacing: Math.round(5 * s),
    wordWrap: { width: textW },
  };

  const title = scene.add.text(0, 0, 'Hora de subir!', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.round(20 * s)}px`,
    color: STORY_TEXT_COLOR,
    fontStyle: 'bold',
    wordWrap: { width: textW },
  });

  const line1 = scene.add.text(
    0,
    0,
    'A lagartinha já cresceu bastante nas folhas.',
    bodyStyle,
  );
  const nameBadge = createChildNameBadge(scene, nome, s, genero);
  const line2 = scene.add.text(
    0,
    0,
    'Chegou a hora de subir na árvore e encontrar frutas gostosas!',
    bodyStyle,
  );
  const line3 = scene.add.text(
    0,
    0,
    'Toque na lagartinha embaixo para ela começar a subir.',
    bodyStyle,
  );

  const textBlockH = title.height
    + gap
    + line1.height
    + gap
    + nameBadge._badgeH
    + gap * 0.7
    + line2.height
    + gap
    + line3.height;
  const cardH = textBlockH + padY * 2;

  const treeIcon = scene.add.image(0, 0, TRUNK_STORY_ICONS.tree.textureKey)
    .setDisplaySize(iconSize, iconSize);
  const leafIcon = scene.add.image(0, 0, TRUNK_STORY_ICONS.leaf.textureKey)
    .setDisplaySize(Math.round(iconSize * 0.55), Math.round(iconSize * 0.55))
    .setAlpha(0.85);

  const card = scene.add.container(x, y).setDepth(30);

  const shadow = scene.add.graphics();
  shadow.fillStyle(shadowColor, 1);
  shadow.fillRoundedRect(-cardW / 2 + off, -cardH / 2 + off, cardW, cardH, r);

  const bg = scene.add.graphics();
  bg.fillStyle(Theme.papel, 1);
  bg.lineStyle(Math.max(3, Math.round(3 * s)), Theme.folhaEscura, 1);
  bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, r);
  bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, r);

  const iconX = -cardW / 2 + padX + iconSize / 2;
  const textX = -cardW / 2 + padX + iconSize + gap;
  let ty = -textBlockH / 2;

  title.setPosition(textX, ty).setOrigin(0, 0);
  ty += title.height + gap;
  line1.setPosition(textX, ty).setOrigin(0, 0);
  ty += line1.height + gap;
  nameBadge.setPosition(textX, ty);
  ty += nameBadge._badgeH + gap * 0.7;
  line2.setPosition(textX, ty).setOrigin(0, 0);
  ty += line2.height + gap;
  line3.setPosition(textX, ty).setOrigin(0, 0);

  treeIcon.setPosition(iconX, -Math.round(4 * s));
  leafIcon.setPosition(iconX + Math.round(14 * s), Math.round(20 * s));

  card.add([shadow, bg, treeIcon, leafIcon, title, line1, nameBadge, line2, line3]);
  return card;
}

export function createTrunkTapHint(scene, x, y) {
  const s = uiScale(scene);
  const hint = scene.add.text(x, y, 'Toque na lagartinha', {
    fontFamily: Theme.fontFamily,
    fontSize: `${Math.max(14, Math.round(16 * s))}px`,
    color: '#1E6A30',
    fontStyle: 'bold',
    backgroundColor: '#FFF8E7CC',
    padding: { x: 12, y: 6 },
  }).setOrigin(0.5).setDepth(28);

  scene.tweens.add({
    targets: hint,
    y: y - Math.round(6 * s),
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  return hint;
}

const FRUIT_DEPTH = DEPTH_TRUNK + 2;
const FOOD_KEY = FOOD_FRUTAS.key;
const FOOD_FRAMES = FOOD_FRUTAS.frames;
const FOOD_ASPECT = FOOD_FRUTAS.frameHeight / FOOD_FRUTAS.frameWidth;
const FOOD_BASE_W = FOOD_FRUTAS.baseDisplayW;

const TRUNK_FRUIT_GRAVITY = 1080;
const TRUNK_FRUIT_BOUNCE = 0.34;
const TRUNK_FRUIT_DRAG = 120;
const TRUNK_FRUIT_ANGULAR_DRAG = 2.8;
const TRUNK_FRUIT_ROLL_FRICTION = 0.9;
const TRUNK_FRUIT_STOP_SPEED = 12;
const TRUNK_FRUIT_MAX_ACTIVE = 8;

function trackTrunkFruit(scene, fruit) {
  scene.fallingFruits = scene.fallingFruits ?? [];
  scene.fallingFruits.push(fruit);
  fruit.once('destroy', () => {
    scene.fallingFruits = (scene.fallingFruits ?? []).filter((f) => f !== fruit);
  });
}

function pickTrunkFruitFrame(scene) {
  scene._fruitFrameBag = scene._fruitFrameBag ?? [];
  if (!scene._fruitFrameBag.length) {
    scene._fruitFrameBag = Phaser.Utils.Array.Shuffle(
      Array.from({ length: FOOD_FRAMES }, (_, i) => i),
    );
  }
  return scene._fruitFrameBag.pop();
}

function getTrunkFruitLandY(scene) {
  const grassY = scene.grassTopY ?? getGrassTopY(scene);
  return grassY + 22;
}

function pickTrunkFruitSpreadX(scene, count) {
  const { width } = scene.scale;
  const pad = 56;
  const minGap = FOOD_BASE_W * 1.05;
  const usable = width - pad * 2;
  const segment = usable / count;
  const xs = [];

  for (let i = 0; i < count; i += 1) {
    const center = pad + segment * i + segment / 2;
    const jitter = Phaser.Math.FloatBetween(-segment * 0.28, segment * 0.28);
    xs.push(Phaser.Math.Clamp(center + jitter, pad, width - pad));
  }

  xs.sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i += 1) {
    if (xs[i] - xs[i - 1] < minGap) {
      xs[i] = Math.min(width - pad, xs[i - 1] + minGap);
    }
  }
  return xs;
}

function ensureTrunkFruitPhysics(scene) {
  if (!scene.trunkFruitGroup) {
    scene.trunkFruitGroup = scene.physics.add.group({
      collideWorldBounds: true,
      bounceX: 0.22,
      bounceY: 0.12,
    });
  }

  if (!scene.trunkGroundBody?.active) {
    const { width, height } = scene.scale;
    const landY = getTrunkFruitLandY(scene);
    scene.trunkGroundBody = scene.add.rectangle(
      width / 2,
      landY + 16,
      width + 240,
      32,
      0x000000,
      0,
    );
    scene.physics.add.existing(scene.trunkGroundBody, true);
    scene.trunkGroundBody.setDepth(FRUIT_DEPTH - 1);
    scene.physics.world.setBounds(0, -height, width, landY + 48);
  }

  scene.physics.world.gravity.y = TRUNK_FRUIT_GRAVITY;

  if (!scene.trunkFruitCollider) {
    scene.trunkFruitCollider = scene.physics.add.collider(
      scene.trunkFruitGroup,
      scene.trunkGroundBody,
      (a, b) => onTrunkFruitGroundHit(scene, a, b),
    );
    scene.physics.add.collider(scene.trunkFruitGroup, scene.trunkFruitGroup);
  }

  if (!scene.trunkFruitUpdate) {
    scene.trunkFruitUpdate = (_time, delta) => updateTrunkFruitPhysics(scene, delta);
    scene.events.on('update', scene.trunkFruitUpdate);
  }
}

function onTrunkFruitGroundHit(scene, a, b) {
  const fruit = a?.getData?.('isTrunkFruit') ? a : b;
  if (!fruit?.body) return;

  const impactY = Math.abs(fruit.body.velocity.y);
  const bounces = (fruit.getData('bounces') ?? 0) + 1;
  fruit.setData('bounces', bounces);

  if (impactY < 60) return;

  const push = Phaser.Math.Clamp(impactY * 0.13, 35, 210);
  const baseDir = Math.sign(fruit.body.velocity.x) || (fruit.x < scene.scale.width / 2 ? -1 : 1);
  const dir = baseDir * Phaser.Math.FloatBetween(0.6, 1);
  fruit.body.velocity.x += dir * push * Phaser.Math.FloatBetween(0.4, 1);
  fruit.setAngularVelocity(fruit.body.velocity.x * 0.018);
  fruit.setData('state', 'rolled');
}

function updateTrunkFruitPhysics(scene, delta) {
  const dt = Math.min(delta, 32) / 1000;
  const landY = getTrunkFruitLandY(scene);

  for (const fruit of [...(scene.fallingFruits ?? [])]) {
    if (!fruit?.active || !fruit.body) continue;

    const onGround = fruit.body.blocked.down
      || fruit.body.touching.down
      || fruit.y >= landY - fruit.displayHeight * 0.25;

    if (onGround || fruit.getData('state') === 'rolled' || fruit.getData('state') === 'settled') {
      if (Math.abs(fruit.body.velocity.x) > TRUNK_FRUIT_STOP_SPEED) {
        fruit.rotation += fruit.body.velocity.x * dt * 0.02;
      }

      fruit.body.velocity.x *= TRUNK_FRUIT_ROLL_FRICTION ** (dt * 60);

      if (Math.abs(fruit.body.velocity.x) < TRUNK_FRUIT_STOP_SPEED) {
        fruit.body.velocity.x = 0;
        fruit.setAngularVelocity(0);
        if (fruit.getData('state') !== 'settled') {
          fruit.setData('state', 'settled');
        }
      }
    }
  }
}

function spawnTrunkFruitAt(scene, x) {
  if (!scene.textures.exists(FOOD_KEY)) return;
  if ((scene.fallingFruits?.length ?? 0) >= TRUNK_FRUIT_MAX_ACTIVE) return;

  ensureTrunkFruitPhysics(scene);

  const { width, height } = scene.scale;
  const frame = pickTrunkFruitFrame(scene);
  const sizeVar = Phaser.Math.FloatBetween(0.72, 1.05);
  const displayW = Math.round(FOOD_BASE_W * sizeVar);
  const displayH = Math.round(displayW * FOOD_ASPECT);
  const lane = Phaser.Math.Between(0, 4);
  const startY = Phaser.Math.Between(-height * 0.68, -height * 0.1) - lane * 36;
  const spawnX = Phaser.Math.Clamp(
    x + Phaser.Math.Between(-width * 0.05, width * 0.05),
    44,
    width - 44,
  );

  const fruit = scene.physics.add.image(spawnX, startY, FOOD_KEY, frame);
  fruit.setDisplaySize(displayW, displayH);
  fruit.setDepth(FRUIT_DEPTH);
  fruit.setBounce(TRUNK_FRUIT_BOUNCE);
  fruit.setDrag(TRUNK_FRUIT_DRAG);
  fruit.setAngularDrag(TRUNK_FRUIT_ANGULAR_DRAG);
  fruit.setCollideWorldBounds(true);
  fruit.setData('isTrunkFruit', true);
  fruit.setData('state', 'falling');
  fruit.setData('bounces', 0);

  const radius = Math.min(displayW, displayH) * 0.36;
  fruit.body.setCircle(
    radius,
    (displayW - radius * 2) / 2,
    (displayH - radius * 2) / 2 + displayH * 0.05,
  );

  fruit.setVelocity(
    Phaser.Math.FloatBetween(-110, 110),
    Phaser.Math.Between(30, 120),
  );
  fruit.setAngularVelocity(Phaser.Math.FloatBetween(-4, 4));

  scene.trunkFruitGroup.add(fruit);
  trackTrunkFruit(scene, fruit);
}

function spawnTrunkFruitWave(scene) {
  const { width } = scene.scale;
  const count = Phaser.Math.Between(1, 3);
  const pad = 64;
  const xs = count === 1
    ? [Phaser.Math.Between(pad, width - pad)]
    : pickTrunkFruitSpreadX(scene, count);

  let accDelay = 0;
  xs.forEach((x) => {
    accDelay += Phaser.Math.Between(480, 920);
    scene.time.delayedCall(accDelay, () => spawnTrunkFruitAt(scene, x));
  });
}

/** Frutas com física — caem, batem no chão e rolam até parar */
export function setupTrunkIntroFallingFruits(scene) {
  if (!scene.textures.exists(FOOD_KEY)) return;

  scene.grassTopY = getGrassTopY(scene);
  scene.groundY = getGroundY(scene);
  scene.fallingFruits = [];
  scene._fruitFrameBag = [];

  spawnTrunkFruitWave(scene);
  scene.fruitSpawnTimer?.remove(false);
  scene.fruitSpawnTimer = scene.time.addEvent({
    delay: Phaser.Math.Between(5200, 7200),
    loop: true,
    callback: () => {
      spawnTrunkFruitWave(scene);
      if (scene.fruitSpawnTimer) {
        scene.fruitSpawnTimer.delay = Phaser.Math.Between(5200, 7200);
      }
    },
  });
}

export function cleanupTrunkIntroFallingFruits(scene) {
  scene.fruitSpawnTimer?.remove(false);
  scene.fruitSpawnTimer = null;

  if (scene.trunkFruitUpdate) {
    scene.events?.off('update', scene.trunkFruitUpdate);
    scene.trunkFruitUpdate = null;
  }

  const world = scene.physics?.world;
  if (world) {
    world.gravity.y = 0;
    const { width = 0, height = 0 } = scene.scale ?? {};
    world.setBounds(0, 0, width, height);
  }

  scene.trunkFruitCollider?.destroy();
  scene.trunkFruitCollider = null;

  for (const fruit of [...(scene.fallingFruits ?? [])]) {
    scene.tweens?.killTweensOf?.(fruit);
    if (fruit?.active) fruit.destroy();
  }
  scene.fallingFruits = [];

  const group = scene.trunkFruitGroup;
  if (group?.children?.length) {
    for (const child of [...group.children]) {
      scene.tweens?.killTweensOf?.(child);
      if (child?.active) child.destroy();
    }
  }
  scene.trunkFruitGroup = null;

  if (scene.trunkGroundBody?.active) {
    scene.trunkGroundBody.destroy();
  }
  scene.trunkGroundBody = null;
  scene._fruitFrameBag = [];
}
