/**
 * Ajuste fino — borboleta no modal de foto (vitória).
 * Valores em ratio (0.1 = 10% do tamanho do quadro).
 *
 * offsetXRatio: negativo = esquerda | positivo = direita
 * offsetYRatio: negativo = cima     | positivo = baixo
 * scale / fillRatio: maior = borboleta maior dentro do quadro
 */

/** Preview no modal (xadrez + borda verde) */
export const VICTORY_PHOTO_PREVIEW = {
  offsetXRatio: -0.010,
  offsetYRatio: 0.035,
  scale: 1.06,
};

/** PNG exportado (baixar / imprimir) */
export const VICTORY_PHOTO_CAPTURE = {
  offsetXRatio: 0.008,
  offsetYRatio: 0.018,
  fillRatio: 0.99,
};
