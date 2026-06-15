import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState, defaultCustom } from '../utils/GameState.js';
import { createButton, drawEnvironmentLayers, getGroundY, DEPTH_TRUNK } from '../ui/createUI.js';
import { FOOD_FRUTAS } from '../config/foodConfig.js';
import { CaterpillarSprite } from '../entities/CaterpillarSprite.js';
import {
  GAME_TRUNK_KEY,
  TRUNK_PLAY_WIDTH_RATIO,
  FRUIT_EAT_RADIUS_X,
  MAX_BODY_SEGMENTS,
  CLIMB_FRAME_WIDTH,
  DEPTH_LAGARTA,
  DEPTH_FRUIT,
  FRUIT_FALL_INTERVAL_MIN,
  FRUIT_FALL_INTERVAL_MAX,
  FRUIT_TRUNK_INSET,
} from '../config/gameWorldConfig.js';
import {
  drawBoundsHit,
  drawCircleHit,
  getGameObjectCircle,
  isDebugHitboxes,
} from '../utils/debug.js';

/**
 * tronco_game = background fixo
 * lagarta no chão (cresce ao comer, até 6 segmentos)
 * frutas caindo na frente
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.GAME);
  }

  init() {
    this.config = null;
    this.child = null;
    this.custom = null;
    this.pontos = 0;
    this.jogoAtivo = false;
    this.comidas = [];
    this.particulas = [];
    this.sapo = null;
    this.motion = null;
    this.tonta = 0;
    this.invulneravel = 0;
    this.gameOverActive = false;
    this.vidas = 0;
    this.maxVidas = 3;
    this.showTutorial = true;
    this.trunkBg = null;
    this.caterpillarApi = null;
    this.lagarta = null;
    this.avisoContainer = null;
    this.avisoText = null;
    this.tutorialGroup = null;
    this.fruitSpawnTimer = null;
    this._fruitFrameBag = [];
  }

  create() {
    this.config = GameState.getConfig(this);
    this.child = GameState.getChild(this);
    this.custom = GameState.getCustom(this) ?? defaultCustom(this.child);
    this.pontos = 0;
    this.maxVidas = this.config.maxVidas ?? 3;
    this.vidas = GameState.getLives(this) ?? this.maxVidas;
    this.gameOverActive = false;
    this.invulneravel = 0;
    this.showTutorial = true;
    this.comidas = [];
    this.particulas = [];
    this._fruitFrameBag = [];

    const { width, height } = this.scale;
    this.anchorY = Math.round(getGroundY(this));
    this.trunkCX = width / 2;
    this.motion = { climberY: this.anchorY };

    this.buildTrunkBackground(width, height);
    this.buildClimber(width);
    this.buildTutorial(width);
    this.buildAvisoPanel(width, height);

    this.gameplayG = this.add.graphics().setDepth(30).setScrollFactor(0);
    this.sapo = { ativo: false, lado: 1, lingua: 0, estado: 'escondido', timer: 0 };

    this.setupFallingFruits(width, height);

    this.input.on('pointerdown', (p) => {
      this.moverPara(p.x);
      this.tentarComerNoToque(p.x, p.y);
    });
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

  buildTrunkBackground(width, height) {
    this.trunkW = width;
    this.trunkPlayW = Math.round(width * TRUNK_PLAY_WIDTH_RATIO);

    drawEnvironmentLayers(this);

    if (this.textures.exists(GAME_TRUNK_KEY)) {
      this.trunkBg = this.add.image(width / 2, 0, GAME_TRUNK_KEY)
        .setOrigin(0.5, 0)
        .setDepth(DEPTH_TRUNK)
        .setScrollFactor(0)
        .setDisplaySize(width, height);
    } else {
      this.trunkBg = this.add.rectangle(width / 2, height / 2, width, height, 0x8B5A2B)
        .setDepth(DEPTH_TRUNK)
        .setScrollFactor(0);
    }
  }

  buildClimber(width) {
    const climbScale = (this.trunkPlayW * 0.55) / CLIMB_FRAME_WIDTH;

    this.caterpillarApi = CaterpillarSprite.create(
      this,
      this.trunkCX,
      this.anchorY,
      this.child,
      this.custom,
      DEPTH_LAGARTA,
      {
        layout: 'vertical',
        preferClimb: true,
        hideHead: true,
        segmentCount: MAX_BODY_SEGMENTS,
        displayScale: climbScale,
      },
    );

    this.caterpillarApi.setActiveSegmentCount(1);
    this.caterpillarApi.setMoving(false);

    this.lagarta = {
      x: this.trunkCX,
      alvoX: this.trunkCX,
      raio: 28,
      segmentos: 1,
    };
  }

  getHeadPos() {
    if (this.caterpillarApi?.getHeadPosition) {
      return this.caterpillarApi.getHeadPosition();
    }
    return { x: this.lagarta.x, y: this.motion.climberY };
  }

  getClimberY() {
    return this.motion?.climberY ?? this.anchorY;
  }

  pickFruitFrame() {
    if (!this._fruitFrameBag.length) {
      this._fruitFrameBag = Phaser.Utils.Array.Shuffle(
        Array.from({ length: FOOD_FRUTAS.frames }, (_, i) => i),
      );
    }
    return this._fruitFrameBag.pop();
  }

  setupFallingFruits(width, height) {
    if (!this.textures.exists(FOOD_FRUTAS.key)) return;

    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 600, () => this.spawnFallingFruit());
    }

    this.fruitSpawnTimer = this.time.addEvent({
      delay: Phaser.Math.Between(FRUIT_FALL_INTERVAL_MIN, FRUIT_FALL_INTERVAL_MAX),
      loop: true,
      callback: () => {
        this.spawnFallingFruit();
        this.fruitSpawnTimer.delay = Phaser.Math.Between(
          FRUIT_FALL_INTERVAL_MIN,
          FRUIT_FALL_INTERVAL_MAX,
        );
      },
    });
  }

  spawnFallingFruit() {
    if (!this.jogoAtivo || this.comidas.length >= 8) return;

    const { height } = this.scale;
    const x = this.pickFruitX();
    const frame = this.pickFruitFrame();
    const size = Math.round(this.trunkW * 0.19 + Math.random() * 10);
    const startY = Phaser.Math.Between(-180, -40);

    const sprite = this.add.image(x, startY, FOOD_FRUTAS.key, frame)
      .setDisplaySize(size, size)
      .setDepth(DEPTH_FRUIT)
      .setScrollFactor(0);

    const entry = { x, sprite, falling: true };
    this.comidas.push(entry);

    const fallMs = Phaser.Math.Between(3200, 5200);
    this.tweens.add({
      targets: sprite,
      y: height + 100,
      duration: fallMs,
      ease: 'Quad.easeIn',
      rotation: Phaser.Math.FloatBetween(-0.2, 0.2),
      onComplete: () => this.removeFruit(entry),
    });
  }

  removeFruit(entry) {
    const idx = this.comidas.indexOf(entry);
    if (idx >= 0) this.comidas.splice(idx, 1);
    if (entry.sprite?.active) {
      this.tweens.killTweensOf(entry.sprite);
      entry.sprite.destroy();
    }
  }

  pickFruitX(side = 0) {
    const inner = this.trunkPlayW * FRUIT_TRUNK_INSET;
    if (side === 0) return this.trunkCX + Phaser.Math.Between(-inner, inner);
    return this.trunkCX + side * Phaser.Math.Between(inner * 0.35, inner);
  }

  buildTutorial(width) {
    this.tutorialGroup = this.add.container(0, 0).setDepth(200);
    this.pinHud(this.tutorialGroup);

    const hint = this.add.text(width / 2, 100, `🍎 ${this.child.nome}, toque nas frutas!`, {
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

  tentarComerNoToque(px, py) {
    if (!this.jogoAtivo || this.gameOverActive) return;

    let melhor = null;
    let melhorDist = 90;

    for (const c of this.comidas) {
      if (!c.sprite?.active) continue;
      const d = Phaser.Math.Distance.Between(px, py, c.sprite.x, c.sprite.y);
      if (d < melhorDist) {
        melhor = c;
        melhorDist = d;
      }
    }

    if (melhor) {
      this.lagarta.alvoX = melhor.x;
      this.comer(melhor);
    }
  }

  podeComerFruta(sprite) {
    const head = this.getHeadPos();
    return (
      Math.abs(sprite.x - head.x) < FRUIT_EAT_RADIUS_X + 18
      && Math.abs(sprite.y - head.y) < 58
    );
  }

  crescerLagarta() {
    const segs = Math.min(MAX_BODY_SEGMENTS, this.pontos + 1);
    this.caterpillarApi?.setActiveSegmentCount(segs);
    this.lagarta.segmentos = segs;
    this.lagarta.raio = Math.min(38, 24 + this.pontos * 2);
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
      comeu: `😋 ${nome} comeu! Nham-nham!`,
      sapoHit: `😵 ${nome} levou uma lambida do sapo!`,
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
    playSound(this, 'eat');

    const pos = { x: c.sprite.x, y: c.sprite.y };
    this.tweens.killTweensOf(c.sprite);
    c.sprite.destroy();
    this.comidas = this.comidas.filter((f) => f !== c);

    this.caterpillarApi?.playEat?.();

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

    this.crescerLagarta();

    if (this.pontos % 4 === 0) {
      playSound(this, 'cresceu');
      this.avisar('cresceu');
    } else {
      this.avisar('comeu');
    }

    this.spawnFallingFruit();

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
    this.caterpillarApi?.playHurt?.();
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

    const { width } = this.scale;
    const halfTrunk = this.trunkPlayW * 0.5;

    this.lagarta.alvoX = Phaser.Math.Clamp(
      this.lagarta.alvoX,
      this.trunkCX - halfTrunk,
      this.trunkCX + halfTrunk,
    );
    this.lagarta.x += (this.lagarta.alvoX - this.lagarta.x) * 0.14;

    if (this.caterpillarApi) {
      this.caterpillarApi.setPosition(this.lagarta.x, this.getClimberY());
      const alpha = this.invulneravel > 0 && Math.floor(this.invulneravel / 6) % 2 ? 0.45 : 1;
      this.caterpillarApi.setAlpha(alpha);
      this.caterpillarApi.updateWave(this.time.now * 0.001, this.lagarta.alvoX !== this.lagarta.x);
    }

    for (let i = this.comidas.length - 1; i >= 0; i--) {
      const c = this.comidas[i];
      if (!c.sprite?.active) continue;

      if (this.podeComerFruta(c.sprite)) {
        this.comer(c);
        break;
      }
    }

    if (this.sapo.ativo) {
      this.sapo.timer++;
      const head = this.getHeadPos();
      if (this.sapo.estado === 'avisando' && this.sapo.timer > 55) {
        this.sapo.estado = 'atacando';
        this.sapo.timer = 0;
        playSound(this, 'lingua');
      }
      if (this.sapo.estado === 'atacando') {
        this.sapo.lingua += width * 0.02;
        const px = this.sapo.lado === 0 ? this.sapo.lingua : width - this.sapo.lingua;
        if (
          Math.abs(px - head.x) < this.lagarta.raio + 14
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

    if (this.trunkBg?.getBounds) {
      drawBoundsHit(g, this.trunkBg.getBounds(), 0x8B5A2B, 0.08);
    }

    if (this.caterpillarApi?.container?.getBounds) {
      drawBoundsHit(g, this.caterpillarApi.container.getBounds(), 0x4CAF50, 0.2);
      const head = this.getHeadPos();
      drawCircleHit(g, { x: head.x, y: head.y, r: this.lagarta.raio }, 0x00FF88, 0.25);
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
    const head = this.getHeadPos();
    const frogY = head.y;
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
    this.fruitSpawnTimer?.remove();
    if (this.debugDraw) this.events.off('update', this.debugDraw);
    this.debugGfx?.destroy();
    this.comidas.forEach((c) => {
      this.tweens.killTweensOf(c.sprite);
      c.sprite?.destroy();
    });
    this.comidas = [];
    this.caterpillarApi?.destroy?.();
    this.caterpillarApi = null;
  }
}
