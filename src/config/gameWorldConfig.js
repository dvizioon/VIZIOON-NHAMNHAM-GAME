/** Assets e layout — gameplay na árvore */
export const GAME_TRUNK_KEY = 'env_trunk_game';
export const INTRO_TRUNK_KEY = 'env_trunk_intro';

export const CLIMB_TEX = 'char_default_climb';
/** Mesma chave registrada em sprites.json (2 frames verticais: 0 em cima, 1 embaixo) */
export const CLIMB_ANIM = 'char_default_climb';
/** Dimensões de um frame em subindo.png — p/ escala na tela */
export const CLIMB_FRAME_WIDTH = 1028;
export const CLIMB_FRAME_HEIGHT = 738;

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
/** Lagarta sobe na tela ao comer; tronco_game fica parado (background) */
export const CLIMB_RISE_RATIO = 1;
/** Quanto sobe por fruta (px) — passo fixo, não pula até a fruta */
export const CLIMB_STEP_MIN = 46;
export const CLIMB_STEP_MAX = 68;
/** Teto na tela — lagarta não some pelo topo */
export const CLIMBER_MIN_Y_RATIO = 0.2;
/** Lagarta começa bem embaixo na tela (0–1) */
export const CLIMBER_ANCHOR_Y_RATIO = 0.9;
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
export const FRUIT_FALL_INTERVAL_MIN = 2200;
export const FRUIT_FALL_INTERVAL_MAX = 3800;
/** Frutas nascem dentro da largura útil do tronco (0–1) */
export const FRUIT_TRUNK_INSET = 0.32;
