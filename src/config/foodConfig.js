/** Spritesheet frutas.png — grade 6 colunas × 5 linhas = 30 frutas */
export const FOOD_FRUTAS = {
  key: 'food_frutas',
  cols: 6,
  rows: 5,
  frames: 30,
  frameWidth: 197,
  frameHeight: 224,
  baseDisplayW: 64,
};

/** Nomes por frame (0–29) — ordem da spritesheet frutas.png */
export const FRUIT_LABELS = [
  'Maçã', 'Limão', 'Framboesa', 'Uva', 'Pêssego', 'Ameixa',
  'Coco', 'Abacaxi', 'Vagem', 'Morango', 'Maçã verde', 'Banana',
  'Uva verde', 'Romã', 'Amora', 'Manga', 'Figo', 'Groselha',
  'Mirtilo', 'Lima', 'Melancia', 'Pera', 'Cereja', 'Tangerina',
  'Figo roxo', 'Mirtilos', 'Manga doce', 'Uva vermelha', 'Damasco', 'Kiwi',
];

export function getFruitLabel(frameIndex) {
  const i = Number(frameIndex);
  if (!Number.isFinite(i) || i < 0 || i >= FRUIT_LABELS.length) return 'Fruta';
  return FRUIT_LABELS[i];
}
