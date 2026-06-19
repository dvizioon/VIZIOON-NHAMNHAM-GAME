/**
 * Borboleta animada — port do base/borboleta_verde_macho_rosa_femea_animada.html
 * Pivô das asas no corpo (x=150, y=168 no viewBox 300×300).
 */
import Phaser from 'phaser';
import { createCharacterFace } from './characterAvatar.js';

const VIEW = 300;
const WING_PIVOT_X = 150 / VIEW;
const WING_PIVOT_Y = 168 / VIEW;
const HEAD_Y = 96;
const BODY_CENTER_Y = 150;

/** Cores básicas da marca — modo menino */
const BOY_BRAND = {
  greenDark: '#1E6A30',
  brown: '#4C3433',
  greenLight: '#8CC769',
  yellow: '#EBE350',
};

const PALETTES = {
  macho: {
    g1: BOY_BRAND.greenLight,
    g2: BOY_BRAND.greenDark,
    border: BOY_BRAND.brown,
    vein: BOY_BRAND.greenDark,
    veinW: 1.2,
    spotFill: BOY_BRAND.yellow,
    spotStroke: BOY_BRAND.brown,
    scentFill: BOY_BRAND.brown,
    scentCore: BOY_BRAND.greenDark,
    scent: true,
    body: BOY_BRAND.brown,
    bodyDark: '#3A2625',
    bodyDot: BOY_BRAND.yellow,
  },
  femea: {
    g1: '#F7A8C8',
    g2: '#E25B92',
    border: '#5e1230',
    vein: '#7a1f44',
    veinW: 2.4,
    spotFill: '#fff',
    spotStroke: null,
    scent: false,
    body: '#5E1230',
    bodyDark: '#3A0A1E',
    bodyDot: '#FFFFFF',
  },
};

const FOREWING = 'M148,108 C160,72 205,52 252,66 C272,73 280,97 267,120 C254,142 210,148 175,140 C160,136 150,124 148,112 Z';
const HINDWING = 'M148,134 C172,138 208,150 226,178 C240,200 232,232 204,236 C180,240 158,218 150,188 C147,170 146,150 148,138 Z';

const VEIN_PATHS = [
  'M150,116 C185,100 220,82 248,70',
  'M150,118 C195,108 235,102 266,108',
  'M150,122 C195,122 230,128 252,134',
  'M150,126 C180,134 205,140 224,142',
  'M150,142 C180,150 205,162 222,180',
  'M150,150 C175,164 200,186 214,210',
  'M150,160 C168,182 182,210 192,230',
  'M150,172 C158,192 162,210 160,226',
];

const SPOTS = [
  [246, 73], [263, 92], [265, 112], [251, 131], [226, 141], [201, 144],
  [221, 181], [229, 202], [217, 225], [196, 233], [171, 231],
];

const BODY_DOTS = [
  [146, 114], [154, 114], [150, 123], [146, 131], [154, 131],
  [150, 148], [146, 158], [154, 158], [150, 170], [146, 182], [154, 182], [150, 194],
];

function sexFromGenero(genero) {
  return genero === 'menina' ? 'femea' : 'macho';
}

function halfWingMarkup(sex) {
  const p = PALETTES[sex];
  const veins = VEIN_PATHS.map(
    (d) => `<path d="${d}" fill="none" stroke="${p.vein}" stroke-width="${p.veinW}" stroke-linecap="round"/>`,
  ).join('');
  const spots = SPOTS.map(([cx, cy]) => {
    const stroke = p.spotStroke ? ` stroke="${p.spotStroke}" stroke-width="0.8"` : '';
    return `<circle cx="${cx}" cy="${cy}" r="2.3" fill="${p.spotFill}"${stroke}/>`;
  }).join('');
  const scent = p.scent
    ? `<ellipse cx="182" cy="192" rx="6" ry="8" fill="${p.body}"/>`
      + `<ellipse cx="182" cy="192" rx="4.2" ry="5.8" fill="${p.scentFill}"/>`
      + `<ellipse cx="182" cy="192" rx="2.6" ry="3.6" fill="${p.scentCore}"/>`
    : '';

  return (
    `<path d="${FOREWING}" fill="url(#og${sex})" stroke="${p.border}" stroke-width="6.5" stroke-linejoin="round"/>`
    + `<path d="${HINDWING}" fill="url(#og${sex})" stroke="${p.border}" stroke-width="6.5" stroke-linejoin="round"/>`
    + veins + scent + spots
  );
}

function svgDefs(sex) {
  const p = PALETTES[sex];
  return (
    `<defs><linearGradient id="og${sex}" x1="0" y1="0" x2="0" y2="1">`
    + `<stop offset="0" stop-color="${p.g1}"/><stop offset="1" stop-color="${p.g2}"/></linearGradient></defs>`
  );
}

export function buildButterflyWingSvg(sex) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">`
    + svgDefs(sex)
    + `<g>${halfWingMarkup(sex)}</g></svg>`
  );
}

export function buildButterflyBodySvg(sex) {
  const p = PALETTES[sex];
  const dots = BODY_DOTS.map(
    ([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="1.7" fill="${p.bodyDot}"/>`,
  ).join('');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">`
    + `<g>`
    + `<ellipse cx="150" cy="178" rx="6.5" ry="42" fill="${p.body}"/>`
    + `<ellipse cx="150" cy="120" rx="11" ry="20" fill="${p.body}"/>`
    + `<circle cx="150" cy="96" r="8" fill="${p.body}"/>`
    + `<circle cx="146.5" cy="95" r="2.4" fill="${p.bodyDark}"/>`
    + `<circle cx="153.5" cy="95" r="2.4" fill="${p.bodyDark}"/>`
    + dots
    + `</g></svg>`
  );
}

function loadSvgTexture(scene, key, svgString) {
  if (scene.textures.exists(key)) return Promise.resolve(key);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (!scene.textures.exists(key)) {
        scene.textures.addImage(key, img);
      }
      resolve(key);
    };
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  });
}

/**
 * @returns {Promise<Phaser.GameObjects.Container>}
 */
export async function createAnimatedButterfly(scene, x, y, {
  genero = 'menino',
  displaySize = 300,
  depth = 25,
  child = null,
  flapMs = 600,
  flyable = false,
  faceScaleMul = 1.42,
  headHeightRatio = 1.62,
} = {}) {
  const sex = sexFromGenero(genero);
  const wingKey = sex === 'macho' ? 'bf_wing_macho_brand' : `bf_wing_${sex}`;
  const bodyKey = `bf_body_${sex}_brand`;

  await Promise.all([
    loadSvgTexture(scene, wingKey, buildButterflyWingSvg(sex)),
    loadSvgTexture(scene, bodyKey, buildButterflyBodySvg(sex)),
  ]);

  const unit = displaySize / VIEW;
  const root = scene.add.container(x, y).setDepth(depth);

  const leftPivot = scene.add.container(0, 0);
  const leftWing = scene.add.image(0, 0, wingKey)
    .setOrigin(WING_PIVOT_X, WING_PIVOT_Y)
    .setScale(unit)
    .setFlipX(true);
  leftPivot.add(leftWing);

  const rightPivot = scene.add.container(0, 0);
  const rightWing = scene.add.image(0, 0, wingKey)
    .setOrigin(WING_PIVOT_X, WING_PIVOT_Y)
    .setScale(unit);
  rightPivot.add(rightWing);

  const body = scene.add.image(0, 0, bodyKey)
    .setOrigin(0.5, 0.5)
    .setScale(unit);

  root.add([leftPivot, rightPivot, body]);

  if (child) {
    const faceWrap = createCharacterFace(scene, child, 22, 0, {
      headHeightRatio,
      animate: true,
    });
    if (faceWrap) {
      faceWrap.setPosition(0, (HEAD_Y - BODY_CENTER_Y) * unit);
      faceWrap.setScale(unit * faceScaleMul);
      root.add(faceWrap);
    }
  }

  const half = Math.max(120, Math.round(flapMs / 2));
  const flapTween = scene.tweens.add({
    targets: [leftPivot, rightPivot],
    scaleX: { from: 1, to: 0.26 },
    duration: half,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  if (!flyable) {
    scene.tweens.add({
      targets: root,
      y: y - 8 * unit,
      duration: flapMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  root.setData('bfFlapTween', flapTween);
  root.setData('bfWingPivots', [leftPivot, rightPivot]);
  root.setData('bfDisplayUnit', unit);

  if (!flyable) {
    root.setAlpha(0);
    scene.tweens.add({
      targets: root,
      alpha: 1,
      duration: 650,
      ease: 'Sine.easeOut',
    });
  }

  return root;
}

function setButterflyFlapSpeed(root, flapMs) {
  const tween = root?.getData?.('bfFlapTween');
  if (!tween) return;
  tween.timeScale = Phaser.Math.Clamp(600 / flapMs, 0.45, 2.5);
}

/**
 * Borboleta estilo borboleta_voando_controlavel.html — segue o dedo/mouse e volta ao centro ao soltar.
 * @returns {Promise<Phaser.GameObjects.Container>}
 */
export async function createFlyableButterfly(scene, x, y, options = {}) {
  const displaySize = options.displaySize ?? 280;
  const homeX = options.homeX ?? x;
  const homeY = options.homeY ?? y;
  const homeScale = options.homeScale ?? 1;
  const root = await createAnimatedButterfly(scene, x, y, { ...options, displaySize, flyable: true });

  const state = {
    heading: 0,
    targetX: homeX,
    targetY: homeY,
    homeX,
    homeY,
    homeScale,
    ready: false,
    followLerp: 0.07,
    returnLerp: 0.09,
  };

  const clampTarget = (px, py) => {
    const { width, height } = scene.scale;
    const pad = Math.max(28, displaySize * 0.14);
    const maxY = height * 0.82;
    return {
      x: Phaser.Math.Clamp(px, pad, width - pad),
      y: Phaser.Math.Clamp(py, pad, maxY),
    };
  };

  const isOverButtons = (pointer) => pointer.y > scene.scale.height * 0.84;

  const isPointerOnButterfly = (pointer) => {
    const bounds = root.getBounds();
    return bounds.contains(pointer.x, pointer.y);
  };

  let dragging = false;
  let touched = false;

  const onPointerDown = (pointer) => {
    if (!state.ready || isOverButtons(pointer)) return;
    if (!isPointerOnButterfly(pointer)) return;

    if (!touched) {
      touched = true;
      options.onFirstTouch?.();
    }

    dragging = true;
    const p = clampTarget(pointer.x, pointer.y);
    state.targetX = p.x;
    state.targetY = p.y;
  };

  const onPointerMove = (pointer) => {
    if (!state.ready || !dragging || isOverButtons(pointer)) return;
    const p = clampTarget(pointer.x, pointer.y);
    state.targetX = p.x;
    state.targetY = p.y;
  };

  const onPointerUp = () => {
    if (!state.ready) return;
    dragging = false;
    state.targetX = homeX;
    state.targetY = homeY;
  };

  scene.input.on('pointerdown', onPointerDown);
  scene.input.on('pointermove', onPointerMove);
  scene.input.on('pointerup', onPointerUp);

  const shortAngle = (from, to) => {
    const delta = ((to - from + 540) % 360) - 180;
    return from + delta * 0.15;
  };

  const onUpdate = () => {
    if (!root.active || !state.ready) return;

    const distHome = Math.hypot(root.x - homeX, root.y - homeY);
    const targetHome = Math.hypot(state.targetX - homeX, state.targetY - homeY) < 1;
    const lerp = targetHome && distHome > 3 ? state.returnLerp : state.followLerp;

    const dx = state.targetX - root.x;
    const dy = state.targetY - root.y;
    root.x += dx * lerp;
    root.y += dy * lerp;

    const vx = dx * lerp;
    const vy = dy * lerp;
    const speed = Math.hypot(vx, vy);

    if (speed > 0.4) {
      const want = Phaser.Math.RadToDeg(Math.atan2(vy, vx)) + 90;
      state.heading = shortAngle(state.heading, want);
    } else {
      state.heading = shortAngle(state.heading, 0);
    }
    root.setAngle(state.heading);

    const flapMs = Phaser.Math.Clamp(650 - speed * 32, 200, 680);
    setButterflyFlapSpeed(root, flapMs);

    const moveScale = homeScale + Math.min(speed * 0.014, 0.14);
    const nearHome = Math.hypot(root.x - homeX, root.y - homeY) < 4
      && Math.abs(state.targetX - homeX) < 1
      && Math.abs(state.targetY - homeY) < 1;
    if (nearHome && speed < 0.35) {
      root.setScale(Phaser.Math.Linear(root.scaleX, homeScale, 0.12));
      if (Math.abs(root.scaleX - homeScale) < 0.01) root.setScale(homeScale);
    } else if (speed > 0.25) {
      root.setScale(moveScale);
    }
  };

  scene.events.on('update', onUpdate);
  root.setData('bfFlightCleanup', () => {
    scene.events.off('update', onUpdate);
    scene.input.off('pointerdown', onPointerDown);
    scene.input.off('pointermove', onPointerMove);
    scene.input.off('pointerup', onPointerUp);
  });
  root.setData('bfStartFlight', () => {
    state.ready = true;
    state.targetX = homeX;
    state.targetY = homeY;
    root.setPosition(homeX, homeY);
    root.setScale(homeScale);
    root.setAngle(0);
  });

  return root;
}

export function destroyFlyableButterfly(root) {
  root?.getData?.('bfFlightCleanup')?.();
  root?.getData?.('bfFlapTween')?.stop?.();
}

/** Pausa o bater de asas e abre as asas para foto. */
export function prepareButterflyPhotoPose(root) {
  if (!root?.active) return () => {};

  const flapTween = root.getData('bfFlapTween');
  const pivots = root.getData('bfWingPivots') ?? [];
  const saved = {
    flapWasPlaying: flapTween?.isPlaying?.() ?? false,
    pivotScales: pivots.map((p) => ({ x: p.scaleX, y: p.scaleY })),
  };

  flapTween?.pause();
  pivots.forEach((p) => p.setScale(1, 1));

  return () => {
    pivots.forEach((p, i) => {
      const scale = saved.pivotScales[i];
      if (scale) p.setScale(scale.x, scale.y);
    });
    if (saved.flapWasPlaying) flapTween?.resume();
  };
}
