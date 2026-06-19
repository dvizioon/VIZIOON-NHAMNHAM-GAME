/**
 * Sons procedurais via Web Audio — fallback quando arquivos .mp3 não existem.
 * Compatível com a base v2 (lagarta-comilona-v2.html).
 */
export class ProceduralAudio {
  constructor(scene) {
    this.scene = scene;
    this.ctx = null;
  }

  unlock() {
    if (this.ctx) return;
    const sound = this.scene.sound;
    if (sound?.context) {
      this.ctx = sound.context;
    }
  }

  play(tipo, volumeMul = 1) {
    this.unlock();
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return;
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const settings = this.scene.registry.get('settings') || {};
    if (settings.muted) return;
    const baseVol = (settings.volumeEfeitos ?? 0.8) * volumeMul;

    const t = this.ctx.currentTime;
    const tocar = (f1, f2, dur, vol = 0.25, onda = 'sine', ini = 0) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = onda;
      o.frequency.setValueAtTime(f1, t + ini);
      o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + ini + dur);
      g.gain.setValueAtTime(vol * baseVol, t + ini);
      g.gain.exponentialRampToValueAtTime(0.001, t + ini + dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t + ini);
      o.stop(t + ini + dur + 0.05);
    };

    const handlers = {
      clique: () => tocar(600, 800, 0.08),
      crack: () => tocar(200, 80, 0.15, 0.3, 'square'),
      egg_crack: () => tocar(200, 80, 0.15, 0.3, 'square'),
      nascer: () => {
        tocar(400, 800, 0.2);
        tocar(600, 1200, 0.25, 0.2, 'sine', 0.15);
      },
      comer: () => tocar(700, 1100, 0.1, 0.3),
      eat: () => tocar(700, 1100, 0.1, 0.3),
      hut: () => tocar(520, 820, 0.14, 0.28),
      fruta: () => {
        tocar(600, 900, 0.1);
        tocar(900, 1300, 0.12, 0.25, 'sine', 0.08);
      },
      lingua: () => tocar(300, 150, 0.2, 0.3, 'sawtooth'),
      teia: () => tocar(900, 400, 0.3, 0.2, 'triangle'),
      ai: () => tocar(400, 200, 0.25, 0.3, 'triangle'),
      cresceu: () => {
        tocar(500, 700, 0.1);
        tocar(700, 1000, 0.1, 0.25, 'sine', 0.1);
      },
      jump: () => {
        tocar(280, 420, 0.12, 0.28, 'triangle');
        tocar(420, 260, 0.14, 0.22, 'sine', 0.08);
      },
      increase: () => {
        tocar(440, 620, 0.12, 0.28);
        tocar(620, 880, 0.14, 0.24, 'sine', 0.1);
      },
      point: () => {
        tocar(720, 980, 0.1, 0.3);
        tocar(980, 1240, 0.12, 0.22, 'sine', 0.07);
      },
      countdown: () => {
        tocar(520, 520, 0.08, 0.32, 'square');
        tocar(520, 520, 0.08, 0.32, 'square', 0.72);
        tocar(520, 520, 0.08, 0.32, 'square', 1.44);
      },
      fail: () => {
        tocar(280, 140, 0.22, 0.34, 'sawtooth');
        tocar(220, 110, 0.28, 0.28, 'triangle', 0.14);
      },
      hurt: () => {
        tocar(340, 220, 0.1, 0.32, 'square');
        tocar(260, 180, 0.12, 0.24, 'triangle', 0.08);
      },
      fanfarra: () => [523, 659, 784, 1047].forEach((f, i) => tocar(f, f, 0.25, 0.25, 'triangle', i * 0.16)),
      winner: () => [523, 659, 784, 1047].forEach((f, i) => tocar(f, f, 0.28, 0.28, 'triangle', i * 0.14)),
    };

    handlers[tipo]?.();
  }
}

/** Toca SFX — Phaser SoundManager; fallback procedural se o .mp3 não existir */
export function playSound(scene, key, { volumeMul = 0.6, onComplete } = {}) {
  const settings = scene.registry.get('settings') || { volumeEfeitos: 0.8, muted: false };
  if (settings.muted) {
    onComplete?.();
    return null;
  }

  const vol = (settings.volumeEfeitos ?? 0.8) * volumeMul;

  if (scene.cache.audio.exists(key)) {
    const snd = scene.sound.add(key);
    if (onComplete) {
      snd.once('complete', () => {
        snd.destroy();
        onComplete();
      });
    } else {
      snd.once('complete', () => snd.destroy());
    }
    snd.play({ volume: vol });
    return snd;
  }

  scene.registry.get('audio')?.play(key, vol);
  if (onComplete) {
    scene.time.delayedCall(900, onComplete);
  }
  return null;
}
