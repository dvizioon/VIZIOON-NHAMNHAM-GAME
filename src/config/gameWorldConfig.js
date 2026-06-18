/** Assets e layout — gameplay na árvore */
export const GAME_TRUNK_KEY = 'env_trunk_game';
export const INTRO_TRUNK_KEY = 'env_trunk_intro';

export const CLIMB_TEX = 'char_default_climb';
export const CLIMB_IDLE_TEX = 'char_default_climbIdle';
/** Animação subindo na intro — 5 passos no subindo.png */
export const INTRO_CLIMB_ANIM_FRAMES = [0, 1, 0, 1, 0];
export const INTRO_CLIMB_ANIM_FPS = 5;
/** Quanto o tronco desce na tela enquanto a lagarta sobe (ratio × altura) — pouco = 1 árvore basta */
export const INTRO_TRUNK_CLIMB_DROP_RATIO = 0.07;
/** Mesma chave registrada em sprites.json */
export const CLIMB_ANIM = 'char_default_climb';
/** Dimensões de um frame em subindo.png / parada_subindo.png */
export const CLIMB_FRAME_WIDTH = 702;
export const CLIMB_FRAME_HEIGHT = 681;
/** Intro do tronco — corpo menor na tela */
export const INTRO_CLIMB_SIZE_MUL = 0.86;
/** Tronco — ratio × altura da tela; use Y_OFFSET_PX p/ mexer 1px por vez */
export const INTRO_TRUNK_Y_OFFSET_RATIO = -0.11;
export const INTRO_TRUNK_Y_OFFSET_PX = 5;
export const INTRO_TRUNK_HEIGHT_MUL = 1.05;
/** Cópias empilhadas acima — só precisa se o tronco desce muito (1 = uma árvore só) */
export const INTRO_TRUNK_STACK_SEGMENTS = 1;
/** Micro-ajuste horizontal do corpo no tronco */
export const INTRO_CLIMB_BODY_OFFSET_X = 0;
/** Padding leve na caixa verde p/ dedo (ratio do tamanho do sprite) */
export const INTRO_CLIMBER_TAP_PAD_RATIO = 0.06;
/** Cabeça na intro — ratio × altura do corpo; use offset*Px p/ ajuste de 1px em 1px */
export const INTRO_CLIMB_HEAD_SCALE_MUL = 0.78;
export const INTRO_CLIMB_HEAD_BALL_TOP = 0.5;
export const INTRO_CLIMB_HEAD_OFFSET_Y = -0.30;
export const INTRO_CLIMB_HEAD_OFFSET_X = 0.04;
/** Fininho: cada 1 ≈ 1 pixel na tela (sem o salto de ~35px do 0.01 no ratio) */
export const INTRO_CLIMB_HEAD_OFFSET_Y_PX = -2;
export const INTRO_CLIMB_HEAD_OFFSET_X_PX = -3;

/** Corpo da lagarta no tronco ≈ tamanho da fruta (trunkW × ratio) */
export const CLIMB_BODY_TRUNK_RATIO = 0.17;
/** Cabeça da criança sobre subindo.png — alinhada na bolinha verde */
export const CLIMB_HEAD_SCALE_MUL = 1.58;
export const CLIMB_HEAD_BALL_TOP = 0.29;
export const CLIMB_HEAD_OFFSET_Y = -0.17;
export const CLIMB_HEAD_OFFSET_Y_PX = -17;
export const CLIMB_HEAD_OFFSET_X = 0.01;
export const CLIMB_HEAD_OFFSET_X_PX = -5;
/** Balanço lateral ao mover no tronco */
export const CLIMB_SWAY_X = 9;
export const CLIMB_SWAY_ROT = 0.075;
/** Frame do subindo.png com olho fechado (1 = embaixo) */
export const CLIMB_EYES_CLOSED_FRAME = 1;

/** Cabeça placeholder na intro — VITE_SCREEN_INIT=telaarvore */
export const DEBUG_CARD_HEAD_KEY = 'debug_cabeca_largata_card';
export const DEBUG_CARD_HEAD_PATH = 'assets/sprites/characters/caterpillar/cabeça_largata_card.png';
export const DEBUG_CARD_HEAD_FRAME_W = 620;
export const DEBUG_CARD_HEAD_FRAME_H = 552;
export const DEBUG_CARD_HEAD_FRAME_COUNT = 4;
export const DEBUG_CARD_HEAD_ANIM = 'debug_cabeca_largata_card_idle';
/** frameCrops alinhados — tools/analyze_card_head.py */
export const DEBUG_CARD_HEAD_FRAME_CROPS = [
  { x: 0, y: 2, width: 407, height: 550 },
  { x: 676, y: 8, width: 407, height: 544 },
  { x: 1390, y: 16, width: 407, height: 536 },
  { x: 2085, y: 2, width: 398, height: 550 },
];

/** Tronco desce na tela ao subir; fundo mais devagar (parallax) */
export const BG_PARALLAX_RATIO = 0.38;
/** Após esse scroll, o céu some e fica só o tronco */
export const BG_FADE_SCROLL = 0.45;

/** Distância entre fileiras de fruta (scroll do tronco) */
export const FRUIT_ROW_SPACING = 140;
export const FRUIT_ROW_JITTER = 60;

/** Largura base do tronco em relação à tela (0–1) */
export const TRUNK_WIDTH_RATIO = 1;
/** tronco_game.png já vem no tamanho da tela — sem boost */
export const TRUNK_WIDTH_BOOST = 1;
/** Largura útil p/ frutas/lagarta sobre a arte do tronco (0–1) */
export const TRUNK_PLAY_WIDTH_RATIO = 0.38;
/** Faixa horizontal que a lagarta pode percorrer (0–1 da tela) */
export const CLIMBER_MOVE_WIDTH_RATIO = 0.88;
/** Margem extra nas bordas para o corpo não vazar da tela */
export const CLIMBER_EDGE_PAD_RATIO = 0.025;
/** Lagarta sobe na tela ao comer; tronco_game fica parado (background) */
export const CLIMB_RISE_RATIO = 1;
/** Quanto sobe por fruta (px) — passo fixo, não pula até a fruta */
export const CLIMB_STEP_MIN = 46;
export const CLIMB_STEP_MAX = 68;
/** Teto na tela — lagarta não some pelo topo */
export const CLIMBER_MIN_Y_RATIO = 0.2;
/** Lagarta mais alta na tela — acima do painel de avisos */
export const CLIMBER_ANCHOR_Y_RATIO = 0.82;
/** Alcance horizontal p/ comer fruta */
export const FRUIT_EAT_RADIUS_X = 52;
/** Alcance vertical p/ comer fruta acima da cabeça */
export const FRUIT_EAT_REACH_UP = 130;
/** Máximo de bolinhas do corpo (cabeça + bunda) */
export const MAX_BODY_SEGMENTS = 6;
/** Profundidade: tronco < lagarta < frutas caindo */
export const DEPTH_LAGARTA = 8;
export const DEPTH_FRUIT = 22;
/** Intervalo entre frutas caindo (ms) */
export const FRUIT_FALL_INTERVAL_MIN = 3200;
export const FRUIT_FALL_INTERVAL_MAX = 4800;
/** Máximo de frutas caindo ao mesmo tempo */
export const MAX_FALLING_FRUITS = 3;
export const FRUIT_SPAWN_COOLDOWN_MS = 1600;
/** Margem interna nas bordas da faixa de queda (0–1 de meia-largura útil) */
export const FRUIT_TRUNK_INSET = 0.03;
/** Largura da faixa de queda das frutas (0–1 da tela) */
export const FRUIT_SPAWN_WIDTH_RATIO = 0.9;
/** Faixas horizontais p/ espalhar frutas (não cair tudo no meio) */
export const FRUIT_SPAWN_SLOTS = 7;
/** Física das frutas — queda reta, velocidades lenta / média / rápida */
export const GAME_FRUIT_GRAVITY = 200;
export const GAME_FRUIT_BOUNCE = 0.5;
export const GAME_FRUIT_DRAG = 12;
export const GAME_FRUIT_ANGULAR_DRAG = 0.8;
export const GAME_FRUIT_ROLL_FRICTION = 0.9;
export const GAME_FRUIT_STOP_SPEED = 10;
export const GAME_FRUIT_AIR_SPIN = 55;
/** Cada fruta sorteia um tier — gravidade extra soma na do mundo */
export const GAME_FRUIT_SPEED_TIERS = [
  { id: 'slow', weight: 0.4, gravityExtra: 45, vy: [5, 16], vx: [-24, 24] },
  { id: 'medium', weight: 0.4, gravityExtra: 115, vy: [10, 26], vx: [-40, 40] },
  { id: 'fast', weight: 0.2, gravityExtra: 195, vy: [16, 38], vx: [-58, 58] },
];

export function pickFruitSpeedTier() {
  const roll = Math.random();
  let acc = 0;
  for (const tier of GAME_FRUIT_SPEED_TIERS) {
    acc += tier.weight;
    if (roll <= acc) return tier;
  }
  return GAME_FRUIT_SPEED_TIERS[1];
}
export const GAME_CLIMBER_Y_LIFT = 0.025;
