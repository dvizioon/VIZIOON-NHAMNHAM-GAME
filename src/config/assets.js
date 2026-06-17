/**
 * Manifesto de assets — adicione arquivos nas pastas public/assets/
 * O loader tenta carregar cada item; se falhar, usa fallback procedural.
 */
export const ASSET_BASE = 'assets';

export const TEXTURES = {
  // Ciclo de vida
  egg: `${ASSET_BASE}/textures/lifecycle/egg.png`,
  eggCracked: `${ASSET_BASE}/textures/lifecycle/egg-cracked.png`,
  cocoon: `${ASSET_BASE}/textures/lifecycle/cocoon.png`,
  butterflyWings: `${ASSET_BASE}/textures/lifecycle/butterfly-wings.png`,

  // Lagarta (6 cores × segmento/cabeça)
  segmentGreen: `${ASSET_BASE}/textures/caterpillar/segment-verde.png`,
  headGreen: `${ASSET_BASE}/textures/caterpillar/head-verde.png`,

  // Comida
  leaf: `${ASSET_BASE}/textures/food/leaf.png`,
  apple: `${ASSET_BASE}/textures/food/apple.png`,
  strawberry: `${ASSET_BASE}/textures/food/strawberry.png`,
  orange: `${ASSET_BASE}/textures/food/orange.png`,

  // Inimigos
  frog: `${ASSET_BASE}/textures/enemies/frog.png`,
  spider: `${ASSET_BASE}/textures/enemies/spider.png`,
  web: `${ASSET_BASE}/textures/enemies/web.png`,

  // Sprites Figma — ver public/assets/data/sprites.json

  // Cenário — ver environmentConfig.js (fundo, nuvem, terreno)
  background: `${ASSET_BASE}/textures/environment/fundo.png`,

  // UI / acessórios
  hat: `${ASSET_BASE}/textures/ui/hat.png`,
  glasses: `${ASSET_BASE}/textures/ui/glasses.png`,
};

/** Sons com arquivo real em public/assets/ — carregados no preload */
export const REQUIRED_SOUNDS = {
  clique: `${ASSET_BASE}/sounds/sfx/pop.mp3`,
  eat: `${ASSET_BASE}/sounds/sfx/eat.mp3`,
  hut: `${ASSET_BASE}/sounds/sfx/hut.mp3`,
  bgm: `${ASSET_BASE}/sounds/music/Pleasant Creek.mp3`,
};

/**
 * SFX opcionais — quando você exportar o .mp3, mova para REQUIRED_SOUNDS
 * ou adicione aqui e em queueOptionalAudio. Sem arquivo → som procedural.
 */
export const OPTIONAL_SOUNDS = {
  crack: `${ASSET_BASE}/sounds/sfx/crack.mp3`,
  egg_crack: `${ASSET_BASE}/sounds/sfx/egg_crack.mp3`,
  nascer: `${ASSET_BASE}/sounds/sfx/nascer.mp3`,
  comer: `${ASSET_BASE}/sounds/sfx/comer.mp3`,
  fruta: `${ASSET_BASE}/sounds/sfx/fruta.mp3`,
  lingua: `${ASSET_BASE}/sounds/sfx/lingua.mp3`,
  teia: `${ASSET_BASE}/sounds/sfx/teia.mp3`,
  ai: `${ASSET_BASE}/sounds/sfx/ai.mp3`,
  cresceu: `${ASSET_BASE}/sounds/sfx/cresceu.mp3`,
  fanfarra: `${ASSET_BASE}/sounds/sfx/fanfarra.mp3`,
};

export const SOUNDS = { ...REQUIRED_SOUNDS, ...OPTIONAL_SOUNDS };

export const DATA = {};

/** Lista plana para o PreloadScene */
export function getLoadQueue() {
  const images = Object.entries(TEXTURES).map(([key, url]) => ({ key, url, type: 'image' }));
  const audio = Object.entries(SOUNDS).map(([key, url]) => ({ key, url, type: 'audio' }));
  const json = Object.entries(DATA).map(([key, url]) => ({ key, url, type: 'json' }));
  return [...json, ...images, ...audio];
}
