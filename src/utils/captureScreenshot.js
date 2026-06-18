/** Salva o canvas do jogo como PNG (botão Foto na vitória). */
export function downloadGameScreenshot(scene, filename = 'nhamnham-borboleta.png') {
  const canvas = scene?.game?.canvas;
  if (!canvas) return false;

  try {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    return true;
  } catch {
    return false;
  }
}
