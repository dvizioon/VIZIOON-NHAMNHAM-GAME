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

const PALETTES = {
  macho: {
    g1: '#84C93E',
    g2: '#3F8417',
    border: '#143a08',
    vein: '#1d4a0c',
    veinW: 1.1,
    scent: true,
  },
  femea: {
    g1: '#F7A8C8',
    g2: '#E25B92',
    border: '#5e1230',
    vein: '#7a1f44',
    veinW: 2.4,
    scent: false,
  },
};

const BODY = '#191107';
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
  const spots = SPOTS.map(
    ([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="2.3" fill="#fff"/>`,
  ).join('');
  const scent = p.scent
    ? `<ellipse cx="182" cy="192" rx="6" ry="8" fill="${BODY}"/><ellipse cx="182" cy="192" rx="2.6" ry="3.6" fill="#2c4a14"/>`
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

export function buildButterflyBodySvg() {
  const dots = BODY_DOTS.map(
    ([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="1.7" fill="#fff"/>`,
  ).join('');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">`
    + `<g>`
    + `<ellipse cx="150" cy="178" rx="6.5" ry="42" fill="${BODY}"/>`
    + `<ellipse cx="150" cy="120" rx="11" ry="20" fill="${BODY}"/>`
    + `<circle cx="150" cy="96" r="8" fill="${BODY}"/>`
    + `<circle cx="146.5" cy="95" r="2.4" fill="#070502"/>`
    + `<circle cx="153.5" cy="95" r="2.4" fill="#070502"/>`
    + `<path d="M147,90 C140,78 136,66 132,57" fill="none" stroke="${BODY}" stroke-width="2" stroke-linecap="round"/>`
    + `<path d="M153,90 C160,78 164,66 168,57" fill="none" stroke="${BODY}" stroke-width="2" stroke-linecap="round"/>`
    + `<circle cx="131" cy="56" r="3.4" fill="${BODY}"/>`
    + `<circle cx="169" cy="56" r="3.4" fill="${BODY}"/>`
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
} = {}) {
  const sex = sexFromGenero(genero);
  const wingKey = `bf_wing_${sex}`;
  const bodyKey = 'bf_body_shared';

  await Promise.all([
    loadSvgTexture(scene, wingKey, buildButterflyWingSvg(sex)),
    loadSvgTexture(scene, bodyKey, buildButterflyBodySvg()),
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
      headHeightRatio: 1.62,
      animate: false,
    });
    if (faceWrap) {
      faceWrap.setPosition(0, (HEAD_Y - BODY_CENTER_Y) * unit);
      faceWrap.setScale(unit * 1.42);
      root.add(faceWrap);
    }
  }

  const half = Math.max(120, Math.round(flapMs / 2));
  scene.tweens.add({
    targets: [leftPivot, rightPivot],
    scaleX: { from: 1, to: 0.26 },
    duration: half,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  scene.tweens.add({
    targets: root,
    y: y - 8 * unit,
    duration: flapMs,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  root.setAlpha(0);
  scene.tweens.add({
    targets: root,
    alpha: 1,
    duration: 650,
    ease: 'Sine.easeOut',
  });

  return root;
}
