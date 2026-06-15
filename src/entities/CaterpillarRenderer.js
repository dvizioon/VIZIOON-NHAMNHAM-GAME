import { Theme } from '../config/theme.js';

/**
 * Desenho procedural da lagarta.
 * A foto da criança vai em overlay separado (attachFaceToScene).
 */
export class CaterpillarRenderer {
  static draw(g, opts) {
    const {
      x, y, raio = 16, segmentos = 4, fase = 0, tremor = 0,
      horizontal = false, cor, chapeu = false, oculos = false,
      skipFace = true,
    } = opts;

    const corC = cor.clara;
    const corE = cor.escura;
    const r = raio;

    for (let i = segmentos; i >= 1; i--) {
      const onda = Math.sin(fase * 0.6 + i) * 6;
      const sx = horizontal ? x - i * (r * 1.5) : x - onda + tremor;
      const sy = horizontal ? y + Math.sin(i) * 3 : y + i * (r * 1.15);
      const segR = r * (1 - i * 0.03);

      g.fillStyle(i % 2 === 0 ? corC : corE, 1);
      g.fillCircle(sx, sy, segR);
      g.lineStyle(3, 0x000000, 0.18);
      g.strokeCircle(sx, sy, segR);

      g.fillStyle(corE, 1);
      g.fillCircle(sx - r * 0.5, sy + r * 0.85, 4);
      g.fillCircle(sx + r * 0.5, sy + r * 0.85, 4);
    }

    const hx = x + tremor;
    const hy = y;
    const hr = r * 1.35;

    g.fillStyle(corC, 1);
    g.fillCircle(hx, hy, hr);
    g.lineStyle(5, corE, 1);
    g.strokeCircle(hx, hy, hr);

    g.lineStyle(4, corE, 1);
    g.beginPath();
    g.moveTo(hx - hr * 0.4, hy - hr * 0.8);
    g.lineTo(hx - hr * 0.5, hy - hr * 1.6);
    g.moveTo(hx + hr * 0.4, hy - hr * 0.8);
    g.lineTo(hx + hr * 0.5, hy - hr * 1.6);
    g.strokePath();

    g.fillStyle(corE, 1);
    g.fillCircle(hx - hr * 0.5, hy - hr * 1.6, 5);
    g.fillCircle(hx + hr * 0.5, hy - hr * 1.6, 5);

    if (!skipFace) {
      CaterpillarRenderer.drawFace(g, hx, hy, hr * 0.82);
    }

    if (oculos) CaterpillarRenderer.drawGlasses(g, hx, hy, hr);
    if (chapeu) CaterpillarRenderer.drawHat(g, hx, hy, hr);

    return { hx, hy, faceRadius: hr * 0.82 };
  }

  static drawFace(g, x, y, raio) {
    g.fillStyle(0xFFE9C9, 1);
    g.fillCircle(x, y, raio);
    g.fillStyle(Theme.texto, 1);
    g.fillCircle(x - raio * 0.35, y - raio * 0.15, raio * 0.12);
    g.fillCircle(x + raio * 0.35, y - raio * 0.15, raio * 0.12);
    g.lineStyle(3, Theme.texto, 1);
    g.beginPath();
    g.arc(x, y + raio * 0.15, raio * 0.4, 0.2, Math.PI - 0.2);
    g.strokePath();
    g.fillStyle(0xF47FB4, 0.5);
    g.fillCircle(x - raio * 0.55, y + raio * 0.15, raio * 0.15);
    g.fillCircle(x + raio * 0.55, y + raio * 0.15, raio * 0.15);
  }

  static drawGlasses(g, x, y, hr) {
    const oy = y - hr * 0.12;
    const or = hr * 0.32;
    g.lineStyle(4, 0x222222, 1);
    g.fillStyle(0x50C8FF, 0.35);
    g.fillCircle(x - hr * 0.38, oy, or);
    g.strokeCircle(x - hr * 0.38, oy, or);
    g.fillCircle(x + hr * 0.38, oy, or);
    g.strokeCircle(x + hr * 0.38, oy, or);
    g.beginPath();
    g.moveTo(x - hr * 0.38 + or, oy);
    g.lineTo(x + hr * 0.38 - or, oy);
    g.strokePath();
  }

  static drawHat(g, x, y, hr) {
    const topo = y - hr * 0.95;
    g.fillStyle(0xE84545, 1);
    g.fillTriangle(x - hr * 0.55, topo, x + hr * 0.55, topo, x, topo - hr * 1.1);
    g.lineStyle(3, 0xB71C1C, 1);
    g.strokeTriangle(x - hr * 0.55, topo, x + hr * 0.55, topo, x, topo - hr * 1.1);
    g.fillStyle(Theme.sol, 1);
    g.fillCircle(x, topo - hr * 1.1, 8);
  }
}
