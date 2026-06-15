import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { createButton } from '../ui/createUI.js';
import { FOOD_FRUTAS } from '../config/foodConfig.js';
import {
  GAME_TRUNK_KEY,
  CLIMB_TEX,
  CLIMB_ANIM,
  BG_FADE_SCROLL,
  BG_PARALLAX_RATIO,
  FRUIT_ROW_SPACING,
  FRUIT_ROW_JITTER,
  TRUNK_PLAY_WIDTH_RATIO,
  TRUNK_HEIGHT_BLEED,
  TRUNK_LOOP_SEGMENTS,
  CLIMBER_ANCHOR_Y_RATIO,
  CLIMB_RISE_RATIO,
  FRUIT_TRUNK_INSET,
} from '../config/gameWorldConfig.js';
import {
  drawBoundsHit,
  drawCircleHit,
  getGameObjectCircle,
  isDebugHitboxes,
} from '../utils/debug.js';

/**
 * Gameplay em camadas (tela fixa, mobile):
 * 1. backgroundgame.png — topo da tela
 * 2. tronco.png — centro, desce em loop
 * 3. frutas — surgem no tronco e descem com ele
 * 4. lagarta — fixa na tela, só move lateral
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.GAME);
  }

  init() {
    this.config = null;
    this.child = null;
    this.pontos = 0;
    this.jogoAtivo = false;
    this.comidas = [];
    this.particulas = [];
    this.sapo = null;
    this.trunkScroll = 0;
    this.motion = null;
    this.maxScroll = 0;
    this.tonta = 0;
    this.invulneravel = 0;
    this.gameOverActive = false;
    this.vidas = 0;
    this.maxVidas = 3;
    this.showTutorial = true;
    this.bgImage = null;
    this.trunkContainer = null;
    this.trunkSegs = [];
    this.climber = null;
    this.lagarta = null;
    this.avisoContainer = null;
    this.avisoText = null;
    this.tutorialGroup = null;
    this.nextFruitLocalY = 0;
    this.isClimbing = false;
    this.climbFrameMs = 0;
    this.climbFrameIndex = 0;
  }

  create() {
    this.config = GameState.getConfig(this);
    this.child = GameState.getChild(this);
    this.pontos = 0;
    this.maxVidas = this.config.maxVidas ?? 3;
    this.vidas = GameState.getLives(this) ?? this.maxVidas;
    this.gameOverActive = false;
    this.invulneravel = 0;
    this.trunkScroll = 0;
    this.showTutorial = true;
    this.comidas = [];
    this.particulas = [];

    const { width, height } = this.scale;
    this.maxScroll = height * 5.5;
    this.anchorY = Math.round(height * CLIMBER_ANCHOR_Y_RATIO);
    this.trunkCX = width / 2;
    this.motion = { trunkY: 0, climberY: this.anchorY };

    this.buildBackground(width, height);
    this.buildTrunkLoop(width, height);
    this.ensureClimbAnimation();
    this.buildClimber(width);
    this.buildTutorial(width);
    this.buildAvisoPanel(width, height);

    this.gameplayG = this.add.graphics().setDepth(30).setScrollFactor(0);
    this.sapo = { ativo: false, lado: 1, lingua: 0, estado: 'escondido', timer: 0 };

    this.nextFruitLocalY = -FRUIT_ROW_SPACING;
    this.seedInitialFruits(height);

    this.input.on('pointerdown', (p) => { this.moverPara(p.x); });
    this.input.on('pointermove', (p) => { if (p.isDown) this.moverPara(p.x); });
    this.input.keyboard.on('keydown-LEFT', () => { this.lagarta.alvoX -= 48; });
    this.input.keyboard.on('keydown-RIGHT', () => { this.lagarta.alvoX += 48; });

    this.jogoAtivo = true;

    const delaySapo = this.config.delayInicioSapo ?? 25000;
    this.time.delayedCall(delaySapo, () => {
      this.ativarSapo();
      this.timerSapo = this.time.addEvent({
        delay: this.config.intervaloSapo || 12000,
        loop: true,
        callback: () => this.ativarSapo(),
      });
    });

    this.time.delayedCall(10000, () => this.dismissTutorial());

    if (isDebugHitboxes(this)) {
      this.debugGfx = this.add.graphics().setDepth(250).setScrollFactor(0);
      this.debugDraw = () => this.drawDebugOverlay();
      this.events.on('update', this.debugDraw);
    }

    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  pinHud(...objects) {
    objects.forEach((obj) => {
      if (obj?.setScrollFactor) obj.setScrollFactor(0);
    });
  }

  ensureClimbAnimation() {
    if (!this.textures.exists(CLIMB_TEX)) return;
    if (this.anims.exists(CLIMB_ANIM)) return;

    this.anims.create({
      key: CLIMB_ANIM,
      frames: [
        { key: CLIMB_TEX, frame: 0 },
        { key: CLIMB_TEX, frame: 1 },
      ],
      frameRate: 10,
      repeat: -1,
    });
  }

  playClimbAnimation(active = true) {
    if (!this.climber) return;

    if (this.climber.anims && this.anims.exists(CLIMB_ANIM)) {
      this.climber.anims.timeScale = active ? 1.5 : 0.8;
      if (active || !this.climber.anims.isPlaying) {
        this.climber.anims.play(CLIMB_ANIM);
      }
      return;
    }

    if (!this.climber.setFrame) return;
    const interval = active ? 130 : 220;
    this.climbFrameMs += this.game.loop.delta;
    if (this.climbFrameMs >= interval) {
      this.climbFrameMs = 0;
      this.climbFrameIndex = this.climbFrameIndex === 0 ? 1 : 0;
      this.climber.setFrame(this.climbFrameIndex);
    }
  }

  buildBackground(width, height) {
    // tronco_game.png cobre a tela — sem backgroundgame por cima
    this.bgImage = null;
  }

  buildTrunkLoop(width, height) {
    this.trunkSegs = [];
    this.trunkW = width;
    this.trunkPlayW = Math.round(width * TRUNK_PLAY_WIDTH_RATIO);
    this.trunkCX = width / 2;
    this.trunkH = Math.round(height * TRUNK_HEIGHT_BLEED);

    this.trunkContainer = this.add.container(this.trunkCX, 0)
      .setDepth(12)
      .setScrollFactor(0);

    for (let i = 0; i < TRUNK_LOOP_SEGMENTS; i++) {
      const seg = this.add.image(0, -i * this.trunkH, GAME_TRUNK_KEY)
        .setOrigin(0.5, 0);

      if (this.textures.exists(GAME_TRUNK_KEY)) {
        this.scaleTrunkSegment(seg);
      } else {
        seg.setDisplaySize(this.trunkW, this.trunkH);
        seg.setTint(0x8B5A2B);
      }

      this.trunkContainer.add(seg);
      this.trunkSegs.push(seg);
    }

    this.applyMotion();
  }

  scaleTrunkSegment(seg) {
    seg.setDisplaySize(this.trunkW, this.trunkH);
  }

  applyMotion() {
    if (!this.trunkContainer || !this.motion) return;

    const loop = this.trunkH * this.trunkSegs.length;
    const shift = ((this.motion.trunkY % loop) + loop) % loop;
    this.trunkContainer.y = shift;
    this.trunkScroll = this.motion.trunkY;

    if (this.climber && this.lagarta) {
      this.climber.setPosition(this.lagarta.x, this.motion.climberY);
    }
  }

  getClimberY() {
    return this.motion?.climberY ?? this.anchorY;
  }

  getFruitWorldPos(c) {
    return {
      x: this.trunkCX + c.localX,
      y: this.trunkContainer.y + c.localY,
    };
  }

  buildClimber(width) {
    const climbKey = this.textures.exists(CLIMB_TEX) ? CLIMB_TEX : null;
    const scale = (this.trunkPlayW * 1.15) / 244;

    if (climbKey) {
      this.climber = this.add.sprite(this.trunkCX, this.anchorY, climbKey, 0)
        .setOrigin(0.5, 0.92)
        .setDepth(25)
        .setScale(scale)
        .setScrollFactor(0);
      if (this.anims.exists(CLIMB_ANIM)) {
        this.playClimbAnimation(false);
      }
    } else {
      this.climber = this.add.circle(this.trunkCX, this.anchorY, 22, Theme.folha)
        .setDepth(25)
        .setScrollFactor(0);
    }

    this.lagarta = {
      x: this.trunkCX,
      alvoX: this.trunkCX,
      raio: 26,
      segmentos: 1,
    };
  }

  gerarFrutasAdiante(height) {
    const needAbove = this.motion.trunkY + height * 1.25;
    while (-this.nextFruitLocalY < needAbove) {
      this.spawnFruitRow(this.nextFruitLocalY);
      this.nextFruitLocalY -= FRUIT_ROW_SPACING + Phaser.Math.Between(0, FRUIT_ROW_JITTER);
    }
  }

  seedInitialFruits(height) {
    let localY = Math.round(height * 0.14);
    const stopY = this.anchorY - 64;

    while (localY < stopY) {
      this.spawnFruitRow(localY);
      localY += FRUIT_ROW_SPACING + Phaser.Math.Between(12, FRUIT_ROW_JITTER);
    }

    this.gerarFrutasAdiante(height);
  }

  spawnFruitRow(localY) {
    const count = Phaser.Math.Between(1, 2);
    const lanes = count === 1
      ? [this.pickFruitX()]
      : [this.pickFruitX(-1), this.pickFruitX(1)];

    lanes.forEach((x) => {
      if (!this.textures.exists(FOOD_FRUTAS.key)) return;

      const frame = Phaser.Math.Between(0, FOOD_FRUTAS.frames - 1);
      const size = Math.round(this.trunkW * 0.2 + Math.random() * 8);
      const localX = x - this.trunkCX;
      const sprite = this.add.image(localX, localY, FOOD_FRUTAS.key, frame)
        .setDisplaySize(size, size);

      this.trunkContainer.add(sprite);
      this.comidas.push({ localX, localY, sprite, tipo: 'fruta' });
    });
  }

  pickFruitX(side = 0) {
    const inner = this.trunkPlayW * FRUIT_TRUNK_INSET;
    if (side === 0) return this.trunkCX + Phaser.Math.Between(-inner, inner);
    return this.trunkCX + side * Phaser.Math.Between(inner * 0.35, inner);
  }

  buildTutorial(width) {
    this.tutorialGroup = this.add.container(0, 0).setDepth(200);
    this.pinHud(this.tutorialGroup);

    const hint = this.add.text(width / 2, 100, `🍎 ${this.child.nome}, toque nas frutas e suba!`, {
      fontFamily: Theme.fontFamily,
      fontSize: '16px',
      color: '#3B3024',
      fontStyle: 'bold',
      backgroundColor: '#FFF8E7',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5);
    this.tutorialGroup.add(hint);

    const left = this.add.text(48, this.anchorY, '◀', {
      fontSize: '32px', color: Theme.folhaEscura, fontStyle: 'bold',
    }).setOrigin(0.5);
    const right = this.add.text(width - 48, this.anchorY, '▶', {
      fontSize: '32px', color: Theme.folhaEscura, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tutorialGroup.add([left, right]);
    this.tweens.add({ targets: [left, right], alpha: { from: 0.4, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
  }

  dismissTutorial() {
    if (!this.showTutorial || !this.tutorialGroup) return;
    this.showTutorial = false;
    this.tweens.add({
      targets: this.tutorialGroup,
      alpha: 0,
      duration: 400,
      onComplete: () => this.tutorialGroup?.destroy(),
    });
  }

  buildAvisoPanel(width, height) {
    this.avisoContainer = this.add.container(width / 2, height - 72).setDepth(150).setAlpha(0);
    this.pinHud(this.avisoContainer);

    const bg = this.add.graphics();
    bg.fillStyle(Theme.papel, 0.96);
    bg.lineStyle(4, Theme.folhaEscura, 1);
    bg.fillRoundedRect(-240, -28, 480, 56, 28);
    bg.strokeRoundedRect(-240, -28, 480, 56, 28);
    this.avisoText = this.add.text(0, 0, '', {
      fontFamily: Theme.fontFamily,
      fontSize: '17px',
      color: '#3B3024',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 440 },
    }).setOrigin(0.5);
    this.avisoContainer.add([bg, this.avisoText]);
  }

  moverPara(screenX) {
    if (this.lagarta) {
      this.lagarta.alvoX = screenX;
    }
  }

  ativarSapo() {
    if (!this.jogoAtivo || this.sapo.ativo) return;
    if (this.pontos < (this.config.minComidaAntesSapo ?? 4)) return;

    this.sapo.ativo = true;
    this.sapo.lado = Math.random() < 0.5 ? 0 : 1;
    this.sapo.estado = 'avisando';
    this.sapo.timer = 0;
    this.sapo.lingua = 0;
    this.avisar('sapo');
  }

  avisar(tipo) {
    const nome = this.child.nome;
    const msgs = {
      sapo: `🐸 ${nome}, cuidado! O sapo tá chegando!`,
      cresceu: `✨ Uau ${nome}! A lagartinha cresceu!`,
      sapoHit: `😵 ${nome} levou uma lambida do sapo!`,
      subiu: `⬆️ ${nome} subiu! Nham-nham!`,
    };

    this.avisoText.setText(msgs[tipo] || tipo);
    this.avisoContainer.setAlpha(1);
    this.tweens.killTweensOf(this.avisoContainer);
    this.tweens.add({
      targets: this.avisoContainer,
      alpha: { from: 1, to: 0 },
      delay: 2200,
      duration: 500,
    });
  }

  comer(c) {
    this.dismissTutorial();
    this.pontos = Math.min(this.pontos + 1, this.config.metaComida);
    GameState.setPoints(this, this.pontos);
    playSound(this, 'fruta');

    const pos = this.getFruitWorldPos(c);

    c.sprite?.destroy();
    this.comidas = this.comidas.filter((f) => f !== c);

    this.playClimbAnimation(true);

    for (let i = 0; i < 8; i++) {
      this.particulas.push({
        x: pos.x,
        y: pos.y,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 4,
        vida: 1,
        cor: Theme.fruta,
      });
    }

    if (this.pontos % 4 === 0) {
      playSound(this, 'cresceu');
      this.avisar('cresceu');
      this.lagarta.raio = Math.min(36, this.lagarta.raio + 2);
    } else {
      this.avisar('subiu');
    }

    const climbDelta = FRUIT_ROW_SPACING + Phaser.Math.Between(0, FRUIT_ROW_JITTER * 0.5);
    const { height } = this.scale;
    const targetTrunk = Math.min(this.maxScroll, this.motion.trunkY + climbDelta);
    const targetClimber = Math.max(
      height * 0.18,
      this.motion.climberY - climbDelta * CLIMB_RISE_RATIO,
    );

    this.isClimbing = true;
    this.tweens.killTweensOf(this.motion);
    this.tweens.killTweensOf(this.climber);
    this.playClimbAnimation(true);

    this.tweens.add({
      targets: this.motion,
      trunkY: targetTrunk,
      duration: 520,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this.applyMotion();
        this.playClimbAnimation(true);
      },
    });

    this.tweens.add({
      targets: this.climber,
      y: targetClimber,
      duration: 520,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this.motion.climberY = this.climber.y;
        this.playClimbAnimation(true);
      },
      onComplete: () => {
        this.motion.climberY = targetClimber;
        this.isClimbing = false;
        this.playClimbAnimation(false);
        this.gerarFrutasAdiante(this.scale.height);
      },
    });

    if (this.pontos >= this.config.metaComida) {
      this.jogoAtivo = false;
      this.time.delayedCall(900, () => this.scene.start(SceneKeys.COCOON));
    }
  }

  perderVida(tipo, somId) {
    if (this.invulneravel > 0 || this.gameOverActive) return;

    this.vidas = Math.max(0, this.vidas - 1);
    GameState.setLives(this, this.vidas);
    this.invulneravel = this.config.invulneravelFrames ?? 120;
    playSound(this, somId);
    this.avisar(tipo);

    if (this.vidas <= 0) {
      this.showGameOver();
    }
  }

  showGameOver() {
    this.gameOverActive = true;
    this.jogoAtivo = false;

    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55).setDepth(300);
    this.pinHud(overlay);

    const panel = this.add.graphics().setDepth(301);
    panel.fillStyle(Theme.papel, 1);
    panel.lineStyle(5, Theme.texto, 1);
    panel.fillRoundedRect(width / 2 - 280, height / 2 - 120, 560, 240, 28);
    panel.strokeRoundedRect(width / 2 - 280, height / 2 - 120, 560, 240, 28);
    this.pinHud(panel);

    const title = this.add.text(width / 2, height / 2 - 70, `Ops, ${this.child.nome}! 💔`, {
      fontFamily: Theme.fontFamily,
      fontSize: '38px',
      color: Theme.fruta,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(302);

    const body = this.add.text(width / 2, height / 2 - 20, 'As vidas acabaram!\nMas a lagartinha pode tentar de novo!', {
      fontFamily: Theme.fontFamily,
      fontSize: '20px',
      color: '#3B3024',
      align: 'center',
    }).setOrigin(0.5).setDepth(302);

    this.pinHud(title, body);

    createButton(this, width / 2, height / 2 + 70, 'Tentar de novo 🥚', {
      width: 300,
      fontSize: 24,
      onClick: () => {
        playSound(this, 'clique');
        GameState.initRun(this);
        this.scene.start(SceneKeys.GAME);
      },
    }).setDepth(302);

    this.children.bringToTop(overlay);
  }

  update() {
    if (this.gameOverActive) return;

    if (this.tonta > 0) this.tonta--;
    if (this.invulneravel > 0) this.invulneravel--;

    const { width, height } = this.scale;

    const bgFade = Phaser.Math.Clamp(
      this.motion.trunkY / (height * BG_FADE_SCROLL),
      0,
      1,
    );
    if (this.bgImage?.setAlpha) {
      this.bgImage.setAlpha(Math.max(0.12, 1 - bgFade * 0.98));
    }
    if (this.bgImage?.setY) {
      this.bgImage.y = Math.min(this.motion.trunkY * BG_PARALLAX_RATIO, height * 0.45);
    }

    this.applyMotion();

    const halfTrunk = this.trunkPlayW * 0.5;
    this.lagarta.alvoX = Phaser.Math.Clamp(
      this.lagarta.alvoX,
      this.trunkCX - halfTrunk,
      this.trunkCX + halfTrunk,
    );
    this.lagarta.x += (this.lagarta.alvoX - this.lagarta.x) * 0.14;

    if (this.climber) {
      this.climber.setPosition(this.lagarta.x, this.getClimberY());
      const alpha = this.invulneravel > 0 && Math.floor(this.invulneravel / 6) % 2 ? 0.45 : 1;
      this.climber.setAlpha(alpha);
      this.playClimbAnimation(this.isClimbing);
    }

    for (let i = this.comidas.length - 1; i >= 0; i--) {
      const c = this.comidas[i];
      const pos = this.getFruitWorldPos(c);
      const climberY = this.getClimberY();

      if (pos.y > height + 80) {
        c.sprite?.destroy();
        this.comidas.splice(i, 1);
        continue;
      }

      const dist = Phaser.Math.Distance.Between(pos.x, pos.y, this.lagarta.x, climberY);
      if (!this.isClimbing && dist < this.lagarta.raio + 26) {
        this.comer(c);
        break;
      }
    }

    if (this.sapo.ativo) {
      this.sapo.timer++;
      if (this.sapo.estado === 'avisando' && this.sapo.timer > 55) {
        this.sapo.estado = 'atacando';
        this.sapo.timer = 0;
        playSound(this, 'lingua');
      }
      if (this.sapo.estado === 'atacando') {
        this.sapo.lingua += width * 0.02;
        const px = this.sapo.lado === 0 ? this.sapo.lingua : width - this.sapo.lingua;
        if (
          Math.abs(px - this.lagarta.x) < this.lagarta.raio + 14
          && this.tonta === 0 && this.invulneravel === 0
        ) {
          this.perderVida('sapoHit', 'ai');
          this.tonta = 70;
          this.sapo.estado = 'voltando';
        }
        if (this.sapo.lingua > width * 0.6) this.sapo.estado = 'voltando';
      }
      if (this.sapo.estado === 'voltando') {
        this.sapo.lingua -= width * 0.035;
        if (this.sapo.lingua <= 0) this.sapo.ativo = false;
      }
    }

    for (let i = this.particulas.length - 1; i >= 0; i--) {
      const p = this.particulas[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.vida -= 0.03;
      if (p.vida <= 0) this.particulas.splice(i, 1);
    }

    this.drawGameplayOverlay();
  }

  drawDebugOverlay() {
    const g = this.debugGfx;
    if (!g) return;
    g.clear();

    if (this.trunkContainer?.getBounds) {
      drawBoundsHit(g, this.trunkContainer.getBounds(), 0x8B5A2B, 0.12);
    }

    if (this.climber?.getBounds) {
      drawBoundsHit(g, this.climber.getBounds(), 0x4CAF50, 0.2);
      drawCircleHit(g, getGameObjectCircle(this.climber, 0.38, 0.55), 0x00FF88, 0.25);
    }

    for (const c of this.comidas) {
      if (!c.sprite?.active) continue;
      drawBoundsHit(g, c.sprite.getBounds(), 0xFF9800, 0.15);
      drawCircleHit(g, getGameObjectCircle(c.sprite, 0.34, 0.5), 0xFFD54F, 0.2);
    }
  }

  drawGameplayOverlay() {
    const g = this.gameplayG;
    g.clear();
    this.drawFrog(g);
    this.particulas.forEach((p) => {
      g.fillStyle(p.cor, Math.max(p.vida, 0));
      g.fillCircle(p.x, p.y, 5);
    });
  }

  drawFrog(g) {
    if (!this.sapo.ativo) return;

    const { width } = this.scale;
    const frogY = this.getClimberY();
    const x = this.sapo.lado === 0 ? 0 : width;
    const dir = this.sapo.lado === 0 ? 1 : -1;

    if (this.sapo.lingua > 0) {
      g.lineStyle(14, 0xFF6B8A, 1);
      g.lineBetween(x, frogY, x + dir * this.sapo.lingua, frogY);
      g.fillStyle(0xFF4D73, 1);
      g.fillCircle(x + dir * this.sapo.lingua, frogY, 13);
    }

    const pul = this.sapo.estado === 'avisando' ? Math.sin(this.sapo.timer * 0.3) * 4 : 0;
    g.fillStyle(0x3E8E41, 1);
    g.fillCircle(x, frogY + 10 + pul, 46);
    g.fillCircle(x + dir * 14, frogY - 32 + pul, 16);
    g.fillCircle(x + dir * 42, frogY - 26 + pul, 16);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x + dir * 14, frogY - 32 + pul, 9);
    g.fillCircle(x + dir * 42, frogY - 26 + pul, 9);
    g.fillStyle(0x222222, 1);
    g.fillCircle(x + dir * 16, frogY - 32 + pul, 4);
    g.fillCircle(x + dir * 44, frogY - 26 + pul, 4);
  }

  shutdown() {
    this.timerSapo?.remove();
    if (this.debugDraw) this.events.off('update', this.debugDraw);
    this.debugGfx?.destroy();
    this.comidas.forEach((c) => c.sprite?.destroy());
    this.comidas = [];
  }
}
