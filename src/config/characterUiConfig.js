/** Tela Personagens — grid 2×2, 4 por página */

export const CHAR_TEXT_COLOR = '#490808';

export const UI_LOGO_PERSONAGENS_KEY = 'ui_logo_personagens';

export const CHAR_HEADS_KEY = 'char_heads_kids';

export const CHAR_HEADS_ANIM_KEY = 'char_heads_wiggle';

export const CHAR_HEAD_FRAME_W = 641;

export const CHAR_HEAD_FRAME_H = 804;

/** Cabeças das crianças (childs/*.png): 4 frames colados, sem spacing */
export function getCharacterHeadSheetLoadOpts() {
  return {
    frameWidth: CHAR_HEAD_FRAME_W,
    frameHeight: CHAR_HEAD_FRAME_H,
  };
}

export const CHAR_HEAD_FRAME_COUNT = 4;
export const CHAR_HEADS_ANIM_FRAME_RATE = 7;

export const CHAR_GRID_COLS = 2;

export const CHAR_GRID_ROWS = 2;

export const CHAR_PER_PAGE = CHAR_GRID_COLS * CHAR_GRID_ROWS;



/** Largura de referência do layout mobile (px) */

export const MOBILE_UI_WIDTH = 390;

export function isCriancaAtiva(crianca) {
  return crianca?.ativo !== false;
}

export function filterCriancasAtivas(criancas = []) {
  return criancas.filter(isCriancaAtiva);
}

/** Spritesheet animada da cabeça (4 frames) — padrão ou por criança em criancas.json */

export function getCharacterHeadSheetKey(crianca) {

  if (!crianca?.cabeca) return null;

  return `char_head_${crianca.id}`;

}



export function getCharacterHeadTextureKey(crianca) {

  return getCharacterHeadSheetKey(crianca) ?? CHAR_HEADS_KEY;

}



export function getCharacterHeadAnimKey(crianca) {
  const sheetKey = getCharacterHeadSheetKey(crianca);
  return sheetKey ? `${sheetKey}_wiggle` : CHAR_HEADS_ANIM_KEY;
}

export function getCharacterHeadFrameRate(crianca) {
  if (crianca?.cabecaFrameRate != null) return crianca.cabecaFrameRate;
  return CHAR_HEADS_ANIM_FRAME_RATE;
}



export function listCharacterHeadAssets(criancas = []) {

  return criancas

    .filter((c) => c.cabeca)

    .map((c) => ({

      key: getCharacterHeadSheetKey(c),

      path: c.cabeca.startsWith('assets/') ? c.cabeca : `assets/${c.cabeca}`,

    }));

}



/** Foto estática (textures/) — overlay no jogo, não no card */

export function listCharacterFaceAssets(criancas = []) {

  return criancas

    .filter((c) => c.foto)

    .map((c) => ({

      key: `char_face_${c.id}`,

      path: c.foto.startsWith('assets/') ? c.foto : `assets/${c.foto}`,

    }));

}



export function getCharacterProfile(crianca) {

  const nome = crianca?.nome ?? 'Lagartinha';

  return {

    tipo: crianca?.tipo ?? 'Especial',

    personalidade: crianca?.personalidade

      ?? `${nome} é uma lagartinha da turminha cheia de personalidade. Pronta para comer frutas, crescer e viver grandes aventuras!`,

  };

}

