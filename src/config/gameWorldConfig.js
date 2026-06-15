/** Assets e layout — gameplay subida na árvore */
export const GAME_BG_KEY = 'env_game_bg';
export const GAME_TRUNK_KEY = 'env_trunk_game';
export const INTRO_TRUNK_KEY = 'env_trunk_intro';

export const CLIMB_TEX = 'char_default_climb';
/** Mesma chave registrada em sprites.json (2 frames: 0 e 1) */
export const CLIMB_ANIM = 'char_default_climb';

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
/** Lagarta sobe 1:1 com o tronco que desce */
export const CLIMB_RISE_RATIO = 1;
/** Tronco estica um pouco além da tela p/ cobrir o chão */
export const TRUNK_HEIGHT_BLEED = 1.08;
/** Pedaços empilhados no loop vertical */
export const TRUNK_LOOP_SEGMENTS = 2;
/** Lagarta fixa perto do chão (0–1 da altura da tela) */
export const CLIMBER_ANCHOR_Y_RATIO = 0.82;
/** Frutas nascem dentro da largura útil do tronco (0–1) */
export const FRUIT_TRUNK_INSET = 0.32;
