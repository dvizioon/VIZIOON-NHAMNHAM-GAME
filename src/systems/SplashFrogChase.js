import Phaser from 'phaser';
import {
  FROG_JUMP_KEY,
  FROG_JUMP_ANIM,
  INTRO_FROG_JUMP_ARC,
  SPLASH_FROG_SCALE_MUL,
  SPLASH_FROG_JUMP_COUNT,
  SPLASH_FROG_JUMP_MS,
  SPLASH_FROG_JUMP_MIN_DELAY,
  SPLASH_FROG_JUMP_MAX_DELAY,
  SPLASH_FROG_START_DELAY,
  applyFrogJumpCrop,
  FROG_JUMP_ORIGIN_X,
  FROG_JUMP_ORIGIN_Y,
} from '../config/introFrogConfig.js';
import { playSound } from './ProceduralAudio.js';

/** Turno solo do sapo na Splash — só entra depois que a lagarta saiu da tela */
export class SplashFrogChase {
  constructor(scene, { groundY, getMatchScale, onTurnComplete, depth = 19 }) {
    this.scene = scene;
    this.groundY = groundY;
    this.getMatchScale = getMatchScale;
    this.onTurnComplete = onTurnComplete;
    this.depth = depth;
    this.frog = null;
    this.busy = false;
    this.timers = [];

    if (!scene.textures.exists(FROG_JUMP_KEY)) return;

    this.frog = scene.add
      .sprite(0, groundY, FROG_JUMP_KEY, 0)
      .setOrigin(FROG_JUMP_ORIGIN_X, FROG_JUMP_ORIGIN_Y)
      .setDepth(depth)
      .setVisible(false)
      .setAlpha(0);

    this.syncFrogCrop = () => applyFrogJumpCrop(this.frog);
    this.frog.on(Phaser.Animations.Events.ANIMATION_UPDATE, this.syncFrogCrop);
    applyFrogJumpCrop(this.frog);
  }

  delay(ms, fn) {
    const ev = this.scene.time.delayedCall(ms, fn);
    this.timers.push(ev);
    return ev;
  }

  clearTimers() {
    for (const t of this.timers) t?.remove?.();
    this.timers = [];
  }

  /** Lagarta sumiu — sapo cruza a tela sozinho na mesma carreira (~3 pulos) */
  startTurn({ exitToRight }) {
    if (!this.frog?.active || this.busy) return;

    this.busy = true;
    this.clearTimers();
    this.scene.tweens.killTweensOf(this.frog);

    const { width } = this.scene.scale;
    const groundY = this.groundY;
    const scale = this.getMatchScale?.() ?? 0.108 * SPLASH_FROG_SCALE_MUL;
    const goingRight = exitToRight;
    const startX = goingRight ? -width * 0.12 : width * 1.12;
    const exitX = goingRight ? width * 1.14 : -width * 0.14;
    const jumpTargets = [];

    for (let i = 1; i <= SPLASH_FROG_JUMP_COUNT; i += 1) {
      jumpTargets.push(Phaser.Math.Linear(startX, exitX, i / SPLASH_FROG_JUMP_COUNT));
    }

    let jumpIndex = 0;

    this.frog
      .setScale(scale)
      .setPosition(startX, groundY)
      .setVisible(true)
      .setAlpha(1)
      .setFrame(0)
      .setFlipX(!goingRight);
    applyFrogJumpCrop(this.frog);

    const jumpAcross = () => {
      if (!this.busy || !this.frog?.active) return;

      const nextX = jumpTargets[jumpIndex];
      const final = jumpIndex >= SPLASH_FROG_JUMP_COUNT - 1;
      jumpIndex += 1;

      this.playJump(nextX, {
        final,
        onDone: () => {
          if (!this.busy || !this.frog?.active) return;

          if (final) {
            this.finishTurn(exitToRight);
            return;
          }

          this.delay(
            Phaser.Math.Between(SPLASH_FROG_JUMP_MIN_DELAY, SPLASH_FROG_JUMP_MAX_DELAY),
            jumpAcross,
          );
        },
      });
    };

    this.delay(SPLASH_FROG_START_DELAY, jumpAcross);
  }

  finishTurn(exitToRight) {
    this.busy = false;
    this.clearTimers();

    if (this.frog?.active) {
      this.scene.tweens.killTweensOf(this.frog);
      this.frog.setVisible(false).setAlpha(0).setFrame(0);
    }

    this.onTurnComplete?.({ exitToRight, nextFromRight: !exitToRight });
  }

  playJump(targetX, { final = false, onDone } = {}) {
    if (!this.frog?.active) return;

    const groundY = this.groundY;
    const scale = this.frog.scaleX || this.getMatchScale?.() || 0.108 * SPLASH_FROG_SCALE_MUL;
    const jumpScale = scale / 0.108;
    const arc = (final ? 0.85 : 1.0) * INTRO_FROG_JUMP_ARC * jumpScale;

    this.frog.setFlipX(targetX < this.frog.x);
    this.frog.setFrame(0);
    applyFrogJumpCrop(this.frog);

    if (this.scene.anims.exists(FROG_JUMP_ANIM)) {
      this.frog.anims.play(FROG_JUMP_ANIM);
    }

    let yDone = false;
    let xDone = false;
    const tryDone = () => {
      if (yDone && xDone) onDone?.();
    };

    this.scene.tweens.add({
      targets: this.frog,
      x: targetX,
      duration: SPLASH_FROG_JUMP_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        xDone = true;
        tryDone();
      },
    });

    this.scene.tweens.add({
      targets: this.frog,
      y: groundY - arc,
      duration: SPLASH_FROG_JUMP_MS * 0.42,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (this.frog?.active) {
          this.frog.y = groundY;
          this.frog.setFrame(0);
          applyFrogJumpCrop(this.frog);
        }
        yDone = true;
        tryDone();
      },
    });

    if (!final) {
      playSound(this.scene, 'clique', { volumeMul: 0.24 });
    }
  }

  destroy() {
    this.busy = false;
    this.clearTimers();
    if (this.frog) {
      this.frog.off(Phaser.Animations.Events.ANIMATION_UPDATE, this.syncFrogCrop);
      this.scene.tweens.killTweensOf(this.frog);
      this.frog.destroy();
      this.frog = null;
    }
  }
}
