import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { CaterpillarSprite } from '../entities/CaterpillarSprite.js';
import { drawHearts, createButton } from '../ui/createUI.js';
import { getParallaxLayers } from '../systems/SpriteLoader.js';

/** Tela 4 — lagarta sobe SOMENTE ao comer folhas */
export class GameScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.GAME);
  }

  init() {
    this.config = null;
    this.custom = null;
    this.child = null;
    this.pontos = 0;
    this.jogoAtivo = false;
    this.lagarta = null;
    this.comidas = [];
    this.particulas = [];
    this.teias = [];
    this.sapo = null;
    this.aranha = null;
    this.scrollY = 0;
    this.scrollState = null;
    this.maxScroll = 0;
    this.tonta = 0;
    this.preso = 0;
    this.invulneravel = 0;
    this.gameOverActive = false;
    this.vidas = 0;
    this.maxVidas = 3;
    this.showTutorial = true;
    this.skyG = null;
    this.scrollLayer = null;
    this.trunkG = null;
    this.groundLayer = null;
    this.caterG = null;
    this.caterpillar = null;
    this.gameplayG = null;
    this.hudBar = null;
    this.hudText = null;
    this.avisoContainer = null;
    this.avisoText = null;
    this.tutorialGroup = null;
  }

  create() {
    this.config = GameState.getConfig(this);
    this.custom = GameState.getCustom(this);
    this.child = GameState.getChild(this);
    this.pontos = 0;
    this.maxVidas = this.config.maxVidas ?? 3;
    this.vidas = GameState.getLives(this) ?? this.maxVidas;
    this.gameOverActive = false;
    this.invulneravel = 0;
    this.scrollY = 0;
    this.scrollState = { y: 0 };
    this.showTutorial = true;

    const { width, height } = this.scale;
    this.maxScroll = height * 2.2;
    this.lagartaBaseY = height - 128;

    this.useProceduralTrunk = true;
    this.skyG = this.add.graphics().setDepth(0);

    this.scrollLayer = this.add.container(0, 0).setDepth(1);
    this.trunkG = this.add.graphics();
    this.scrollLayer.add(this.trunkG);

    this.groundLayer = this.add.container(0, 0).setDepth(3);
    this.parallaxLayers = [];

    this.buildParallax(width, height);
    this.buildGroundFallback(width, height);

    this.gameplayG = this.add.graphics().setDepth(12);

    this.caterpillar = CaterpillarSprite.create(
      this, width / 2, this.lagartaBaseY, this.child, this.custom, 15,
    );

    this.lagarta = {
      x: width / 2,
      alvoX: width / 2,
      y: this.lagartaBaseY,
      segmentos: 6,
      raio: 28,
      fase: 0,
    };

    this.sapo = { ativo: false, lado: 1, y: 0, lingua: 0, estado: 'escondido', timer: 0 };
    this.aranha = { ativa: false, x: 0, y: -80, alvoY: 0, estado: 'escondida', timer: 0 };

    this.buildHUD(width, height);
    this.buildTutorial(width);
    this.buildAvisoPanel(width, height);

    this.input.on('pointerdown', (p) => { this.moverPara(p.x); });
    this.input.on('pointermove', (p) => { if (p.isDown) this.moverPara(p.x); });
    this.input.keyboard.on('keydown-LEFT', () => this.moverPara(this.lagarta.alvoX - 60));
    this.input.keyboard.on('keydown-RIGHT', () => this.moverPara(this.lagarta.alvoX + 60));

    this.jogoAtivo = true;

    this.timerComida = this.time.addEvent({
      delay: this.config.intervaloComida || 1800,
      loop: true,
      callback: () => this.criarComida(),
    });

    const delaySapo = this.config.delayInicioSapo ?? 25000;
    const delayAranha = this.config.delayInicioAranha ?? 35000;

    this.time.delayedCall(delaySapo, () => {
      this.ativarSapo();
      this.timerSapo = this.time.addEvent({
        delay: this.config.intervaloSapo || 12000,
        loop: true,
        callback: () => this.ativarSapo(),
      });
    });

    this.time.delayedCall(delayAranha, () => {
      this.ativarAranha();
      this.timerAranha = this.time.addEvent({
        delay: this.config.intervaloAranha || 15000,
        loop: true,
        callback: () => this.ativarAranha(),
      });
    });

    this.time.delayedCall(10000, () => this.dismissTutorial());
    this.time.delayedCall(2200, () => this.criarComida());
    this.updateHUD();
  }

  /** Camadas do Figma — parallax ao subir */
  buildParallax(width, height) {
    const layers = getParallaxLayers();
    let hasTrunk = false;

    for (const layer of layers) {
      if (!this.textures.exists(layer.key)) continue;

      const img = this.add.image(width / 2, 0, layer.key).setOrigin(0.5, 0);
      img.setDepth(layer.depth ?? 1);

      if (layer.fixed) {
        img.setY(height - (img.height || height));
        img.setScrollFactor(0);
        this.groundLayer.add(img);
      } else {
        img.setDisplaySize(width, img.height || height);
        this.scrollLayer.add(img);
        if (layer.key.includes('trunk')) hasTrunk = true;
      }

      this.parallaxLayers.push({
        sprite: img,
        scrollFactor: layer.scrollFactor ?? 1,
        repeatY: layer.repeatY ?? false,
        fixed: layer.fixed ?? false,
      });
    }

    if (!hasTrunk) {
      this.useProceduralTrunk = true;
    }
  }

  /** Fallback procedural enquanto não tem sprites do Figma */
  buildGroundFallback(width, height) {
    if (this.parallaxLayers.some((l) => l.fixed)) return;

    const soil = this.add.graphics();
    soil.fillStyle(0xC4A574, 1);
    soil.fillRect(0, height - 24, width, 24);
    this.groundLayer.add(soil);

    const grass = this.add.graphics();
    grass.fillStyle(Theme.folha, 1);
    grass.fillRect(0, height - 48, width, 24);
    grass.lineStyle(3, Theme.folhaEscura, 1);
    grass.lineBetween(0, height - 48, width, height - 48);
    this.groundLayer.add(grass);
  }

  buildTutorial(width) {
    this.tutorialGroup = this.add.container(0, 0).setDepth(200);

    const hint = this.add.text(width / 2, 118, `🍃 ${this.child.nome}, arraste ← → e pegue folhas!`, {
      fontFamily: Theme.fontFamily,
      fontSize: '16px',
      color: '#3B3024',
      fontStyle: 'bold',
      backgroundColor: '#FFF8E7',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5);
    this.tutorialGroup.add(hint);

    const y = this.lagartaBaseY;
    const left = this.add.text(48, y, '◀', { fontSize: '36px', color: Theme.folhaEscura, fontStyle: 'bold' }).setOrigin(0.5);
    const right = this.add.text(width - 48, y, '▶', { fontSize: '36px', color: Theme.folhaEscura, fontStyle: 'bold' }).setOrigin(0.5);
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

  /** Barra de evolução vertical — lado direito */
  buildHUD(width, height) {
    this.hearts = drawHearts(this, 20, 22, this.maxVidas, this.vidas);

    const barW = 26;
    const barH = Math.min(height * 0.42, 240);
    const barX = width - 22;
    const barY = 70;

    this.hudBarBg = this.add.graphics().setDepth(100);
    this.hudBarBg.fillStyle(Theme.papel, 1);
    this.hudBarBg.lineStyle(4, Theme.texto, 1);
    this.hudBarBg.fillRoundedRect(barX - barW / 2, barY, barW, barH, 13);
    this.hudBarBg.strokeRoundedRect(barX - barW / 2, barY, barW, barH, 13);

    this.hudBar = this.add.graphics().setDepth(101);
    this.hudBar._barX = barX - barW / 2 + 3;
    this.hudBar._barY = barY + 3;
    this.hudBar._barW = barW - 6;
    this.hudBar._barH = barH - 6;

    this.hudText = this.add.text(width - 52, barY + barH + 12, '', {
      fontFamily: Theme.fontFamily,
      fontSize: '13px',
      color: '#3B3024',
      fontStyle: 'bold',
      align: 'right',
      wordWrap: { width: 90 },
    }).setOrigin(1, 0).setDepth(102);

    this.hudLabel = this.add.text(width - 52, barY - 22, '🐛 Evolução', {
      fontFamily: Theme.fontFamily,
      fontSize: '14px',
      color: Theme.folhaEscura,
      fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(102);
  }

  buildAvisoPanel(width, height) {
    this.avisoContainer = this.add.container(width / 2, height - 72).setDepth(150).setAlpha(0);

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

  moverPara(x) {
    if (this.lagarta && this.preso === 0) {
      this.lagarta.alvoX = x;
    }
  }

  criarComida() {
    if (!this.jogoAtivo) return;
    const { width } = this.scale;
    const fruta = Math.random() < 0.18;

    let x;
    for (let i = 0; i < 10; i++) {
      x = 80 + Math.random() * (width - 160);
      if (Math.abs(x - this.lagarta.x) > 90) break;
    }

    const y = this.lagartaBaseY - 100 - Math.random() * 160;
    let sprite = null;

    if (fruta && this.textures.exists('food_fruit')) {
      sprite = this.add.image(x, y, 'food_fruit').setDepth(11).setScale(0.8);
    } else if (this.textures.exists('food_leaf')) {
      sprite = this.add.sprite(x, y, 'food_leaf').setDepth(11).setScale(0.55);
      if (this.anims.exists('food_leaf_spin')) sprite.play('food_leaf_spin');
    }

    this.comidas.push({
      x, y,
      vel: 0.35 + Math.random() * 0.25,
      tipo: fruta ? 'fruta' : 'folha',
      rot: Math.random() * 6,
      vrot: (Math.random() - 0.5) * 0.03,
      sprite,
    });
  }

  ativarSapo() {
    if (!this.jogoAtivo || this.sapo.ativo) return;
    if (this.pontos < (this.config.minComidaAntesSapo ?? 4)) return;

    this.sapo.ativo = true;
    this.sapo.lado = Math.random() < 0.5 ? 0 : 1;
    this.sapo.y = this.lagartaBaseY;
    this.sapo.estado = 'avisando';
    this.sapo.timer = 0;
    this.sapo.lingua = 0;
    this.avisar('sapo');
  }

  ativarAranha() {
    if (!this.jogoAtivo || this.aranha.ativa) return;
    if (this.pontos < (this.config.minComidaAntesAranha ?? 6)) return;

    const { width } = this.scale;
    this.aranha.ativa = true;
    this.aranha.x = 100 + Math.random() * (width - 200);
    this.aranha.y = 50;
    this.aranha.alvoY = 130 + Math.random() * 60;
    this.aranha.estado = 'descendo';
    this.aranha.timer = 0;
    this.avisar('aranha');
  }

  jogarTeia() {
    playSound(this, 'teia');
    this.teias.push({
      x: this.aranha.x,
      y: this.aranha.y + 30,
      vx: (this.lagarta.x - this.aranha.x) * 0.01,
      vy: 2,
      raio: 20,
    });
  }

  avisar(tipo) {
    const nome = this.child.nome;
    const msgs = {
      sapo: `🐸 ${nome}, cuidado! O sapo tá chegando!`,
      aranha: `🕷️ ${nome}, olha! A Dona Aranha!`,
      cresceu: `✨ Uau ${nome}! A lagartinha cresceu!`,
      sapoHit: `😵 ${nome} levou uma lambida do sapo!`,
      teia: `🕸️ ${nome} ficou presa na teia!`,
      subiu: `⬆️ ${nome} subiu na árvore! Nham-nham!`,
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
    const ganho = c.tipo === 'fruta' ? 3 : 1;
    this.pontos = Math.min(this.pontos + ganho, this.config.metaComida);
    GameState.setPoints(this, this.pontos);
    playSound(this, c.tipo === 'fruta' ? 'fruta' : 'comer');

    c.sprite?.destroy();

    this.caterpillar?.playEat?.();

    for (let i = 0; i < 8; i++) {
      this.particulas.push({
        x: c.x, y: c.y,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 4,
        vida: 1,
        cor: c.tipo === 'fruta' ? Theme.fruta : Theme.folha,
      });
    }

    const novos = 6 + Math.floor((this.pontos / this.config.metaComida) * 4);
    if (novos > this.lagarta.segmentos) {
      this.lagarta.segmentos = Math.min(novos, 10);
      playSound(this, 'cresceu');
      this.avisar('cresceu');
    } else {
      this.avisar('subiu');
    }

    this.lagarta.raio = 16 + (this.pontos / this.config.metaComida) * 8;

    const climbDelta = (ganho / this.config.metaComida) * this.maxScroll;
    this.tweens.killTweensOf(this.scrollState);
    this.tweens.add({
      targets: this.scrollState,
      y: this.scrollState.y + climbDelta,
      duration: 500,
      ease: 'Sine.easeOut',
      onUpdate: () => { this.scrollY = this.scrollState.y; },
    });

    this.updateHUD();

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
    this.hearts?._update(this.vidas);

    if (this.vidas <= 0) {
      this.showGameOver();
    }
  }

  showGameOver() {
    this.gameOverActive = true;
    this.jogoAtivo = false;

    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55).setDepth(300);

    const panel = this.add.graphics().setDepth(301);
    panel.fillStyle(Theme.papel, 1);
    panel.lineStyle(5, Theme.texto, 1);
    panel.fillRoundedRect(width / 2 - 280, height / 2 - 120, 560, 240, 28);
    panel.strokeRoundedRect(width / 2 - 280, height / 2 - 120, 560, 240, 28);

    this.add.text(width / 2, height / 2 - 70, `Ops, ${this.child.nome}! 💔`, {
      fontFamily: Theme.fontFamily,
      fontSize: '38px',
      color: Theme.fruta,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(302);

    this.add.text(width / 2, height / 2 - 20, 'As vidas acabaram!\nMas a lagartinha pode tentar de novo!', {
      fontFamily: Theme.fontFamily,
      fontSize: '20px',
      color: '#3B3024',
      align: 'center',
    }).setOrigin(0.5).setDepth(302);

    createButton(this, width / 2, height / 2 + 70, 'Tentar de novo 🥚', {
      width: 300,
      fontSize: 24,
      onClick: () => {
        playSound(this, 'clique');
        GameState.initRun(this);
        this.scene.start(SceneKeys.EGG);
      },
    }).setDepth(302);

    this.children.bringToTop(overlay);
  }

  updateHUD() {
    const pct = this.pontos / this.config.metaComida;
    const fillH = this.hudBar._barH * pct;
    const bx = this.hudBar._barX;
    const by = this.hudBar._barY + this.hudBar._barH - fillH;

    this.hudBar.clear();
    this.hudBar.fillStyle(Theme.sol, 1);
    this.hudBar.fillRoundedRect(bx, by, this.hudBar._barW, fillH, 10);
    this.hudText.setText(`${this.child.nome}\n${this.pontos}/${this.config.metaComida}`);
  }

  drawTrunk(g, width, totalH) {
    const cx = width / 2;
    g.clear();

    const topW = 50;
    const botW = 96;
    const steps = Math.ceil(totalH / 40);

    for (let i = 0; i < steps; i++) {
      const y0 = i * 40;
      const y1 = y0 + 42;
      const t0 = y0 / totalH;
      const t1 = y1 / totalH;
      const w0 = botW - (botW - topW) * t0;
      const w1 = botW - (botW - topW) * t1;
      const shade = 0.9 + (i % 3) * 0.04;
      const r = Math.min(255, ((Theme.tronco >> 16) & 0xff) * shade);
      const gr = Math.min(255, ((Theme.tronco >> 8) & 0xff) * shade);
      const b = Math.min(255, (Theme.tronco & 0xff) * shade);
      g.fillStyle((r << 16) | (gr << 8) | b, 1);
      g.beginPath();
      g.moveTo(cx - w0 / 2, y0);
      g.lineTo(cx + w0 / 2, y0);
      g.lineTo(cx + w1 / 2, y1);
      g.lineTo(cx - w1 / 2, y1);
      g.closePath();
      g.fillPath();
    }

    g.lineStyle(4, Theme.troncoEscuro, 0.5);
    g.lineBetween(cx - botW / 2 + 5, 0, cx - topW / 2 + 3, totalH);
    g.lineBetween(cx + botW / 2 - 5, 0, cx + topW / 2 - 3, totalH);

    g.fillStyle(Theme.troncoEscuro, 0.8);
    for (let y = 80; y < totalH; y += 190) {
      const t = y / totalH;
      const w = botW - (botW - topW) * t;
      g.fillEllipse(cx - w * 0.2, y, 13, 8);
    }
  }

  update() {
    if (this.gameOverActive) return;

    if (this.tonta > 0) this.tonta--;
    if (this.preso > 0) this.preso--;
    if (this.invulneravel > 0) this.invulneravel--;

    const { width, height } = this.scale;

    this.scrollLayer.y = -this.scrollY;

    for (const layer of this.parallaxLayers) {
      if (layer.fixed) continue;
      layer.sprite.y = -this.scrollY * layer.scrollFactor;
    }

    if (this.preso === 0) {
      this.lagarta.alvoX = Phaser.Math.Clamp(this.lagarta.alvoX, 62, width - 62);
      const prevX = this.lagarta.x;
      this.lagarta.x += (this.lagarta.alvoX - this.lagarta.x) * 0.12;
      this.caterpillar?.setMoving?.(Math.abs(this.lagarta.x - prevX) > 0.5);
    }
    this.lagarta.fase += 0.15;
    this.lagarta.y = this.lagartaBaseY;

    for (let i = this.comidas.length - 1; i >= 0; i--) {
      const c = this.comidas[i];
      c.y += c.vel;
      c.rot += c.vrot;
      if (c.sprite) {
        c.sprite.setPosition(c.x, c.y);
        c.sprite.setAngle(Phaser.Math.RadToDeg(c.rot));
      }
      const head = this.caterpillar?.getHeadPosition?.();
      const hitX = head?.x ?? this.lagarta.x;
      const hitY = head?.y ?? this.lagarta.y;
      const dist = Phaser.Math.Distance.Between(c.x, c.y, hitX, hitY);
      if (dist < this.lagarta.raio + 30) {
        this.comer(c);
        this.comidas.splice(i, 1);
      } else if (c.y > this.lagartaBaseY + 40) {
        c.sprite?.destroy();
        this.comidas.splice(i, 1);
      }
    }

    if (this.sapo.ativo) {
      this.sapo.timer++;
      this.sapo.y = this.lagartaBaseY;
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
          && Math.abs(this.sapo.y - this.lagarta.y) < 50
          && this.tonta === 0 && this.preso === 0 && this.invulneravel === 0
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

    if (this.aranha.ativa) {
      this.aranha.timer++;
      if (this.aranha.estado === 'descendo') {
        this.aranha.y += (this.aranha.alvoY - this.aranha.y) * 0.05;
        if (Math.abs(this.aranha.y - this.aranha.alvoY) < 3) {
          this.aranha.estado = 'mirando';
          this.aranha.timer = 0;
        }
      } else if (this.aranha.estado === 'mirando' && this.aranha.timer > 45) {
        this.jogarTeia();
        this.aranha.estado = 'subindo';
        this.aranha.timer = 0;
      } else if (this.aranha.estado === 'subindo') {
        this.aranha.y -= 1.6;
        if (this.aranha.y < -90) this.aranha.ativa = false;
      }
    }

    for (let i = this.teias.length - 1; i >= 0; i--) {
      const t = this.teias[i];
      t.x += t.vx;
      t.y += t.vy;
      const dist = Phaser.Math.Distance.Between(t.x, t.y, this.lagarta.x, this.lagarta.y);
      if (dist < this.lagarta.raio + t.raio && this.preso === 0 && this.invulneravel === 0) {
        this.preso = this.config.tempoPreso || 90;
        this.perderVida('teia', 'ai');
        this.teias.splice(i, 1);
      } else if (t.y > height + 40) {
        this.teias.splice(i, 1);
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

    this.renderWorld();
  }

  renderWorld() {
    const { width, height } = this.scale;
    const totalH = this.maxScroll + height + 400;

    this.skyG.clear();
    this.skyG.fillGradientStyle(Theme.ceuClaro, Theme.ceuClaro, Theme.ceu, Theme.ceu, 1);
    this.skyG.fillRect(0, 0, width, height);

    if (this.useProceduralTrunk !== false) {
      this.drawTrunk(this.trunkG, width, totalH);
    } else {
      this.trunkG.clear();
    }

    const g = this.gameplayG;
    g.clear();

    this.comidas.forEach((c) => {
      if (!c.sprite) this.drawFoodFallback(g, c);
    });

    this.drawFrog(g);
    this.drawSpider(g);
    this.teias.forEach((t) => this.drawWeb(g, t.x, t.y, t.raio));

    const tremor = this.tonta > 0 ? Math.sin(this.tonta) * 4 : 0;
    const alpha = this.invulneravel > 0 && Math.floor(this.invulneravel / 6) % 2 ? 0.45 : 1;
    this.caterpillar?.setAlpha?.(alpha);

    if (this.caterpillar?.mode === 'filament' || this.caterpillar?.mode === 'sprite') {
      this.caterpillar.setPosition(this.lagarta.x, this.lagarta.y);
      this.caterpillar.updateWave?.(this.lagarta.fase, this.caterpillar.isMoving);
    } else if (this.caterpillar?.mode === 'procedural') {
      this.caterpillar.draw({
        x: this.lagarta.x,
        y: this.lagarta.y,
        raio: this.lagarta.raio,
        segmentos: this.lagarta.segmentos,
        fase: this.lagarta.fase,
        tremor,
      });
    }

    if (this.preso > 0) {
      this.drawWeb(g, this.lagarta.x, this.lagarta.y, this.lagarta.raio * 2);
    }

    this.particulas.forEach((p) => {
      g.fillStyle(p.cor, Math.max(p.vida, 0));
      g.fillCircle(p.x, p.y, 5);
    });
  }

  drawFoodFallback(g, c) {
    g.fillStyle(c.tipo === 'fruta' ? Theme.fruta : Theme.folha, 1);
    g.fillCircle(c.x, c.y, 14);
  }

  drawFrog(g) {
    if (!this.sapo.ativo) return;
    const { width } = this.scale;
    const x = this.sapo.lado === 0 ? 0 : width;
    const dir = this.sapo.lado === 0 ? 1 : -1;

    if (this.sapo.lingua > 0) {
      g.lineStyle(14, 0xFF6B8A, 1);
      g.lineBetween(x, this.sapo.y, x + dir * this.sapo.lingua, this.sapo.y);
      g.fillStyle(0xFF4D73, 1);
      g.fillCircle(x + dir * this.sapo.lingua, this.sapo.y, 13);
    }

    const pul = this.sapo.estado === 'avisando' ? Math.sin(this.sapo.timer * 0.3) * 4 : 0;
    g.fillStyle(0x3E8E41, 1);
    g.fillCircle(x, this.sapo.y + 10 + pul, 46);
    g.fillCircle(x + dir * 14, this.sapo.y - 32 + pul, 16);
    g.fillCircle(x + dir * 42, this.sapo.y - 26 + pul, 16);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x + dir * 14, this.sapo.y - 32 + pul, 9);
    g.fillCircle(x + dir * 42, this.sapo.y - 26 + pul, 9);
    g.fillStyle(0x222222, 1);
    g.fillCircle(x + dir * 16, this.sapo.y - 32 + pul, 4);
    g.fillCircle(x + dir * 44, this.sapo.y - 26 + pul, 4);
  }

  drawSpider(g) {
    if (!this.aranha.ativa) return;
    const a = this.aranha;
    g.lineStyle(3, 0x888888, 1);
    g.lineBetween(a.x, 0, a.x, a.y);
    g.fillStyle(0x3A3A3A, 1);
    g.fillCircle(a.x, a.y + 14, 26);
    g.fillCircle(a.x, a.y - 8, 16);
    g.fillStyle(0xF47FB4, 1);
    g.fillTriangle(a.x - 4, a.y - 20, a.x - 16, a.y - 28, a.x - 16, a.y - 12);
    g.fillTriangle(a.x + 4, a.y - 20, a.x + 16, a.y - 28, a.x + 16, a.y - 12);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(a.x - 6, a.y - 9, 5);
    g.fillCircle(a.x + 6, a.y - 9, 5);
    g.fillStyle(0x000000, 1);
    g.fillCircle(a.x - 6, a.y - 8, 2.5);
    g.fillCircle(a.x + 6, a.y - 8, 2.5);
  }

  drawWeb(g, x, y, raio) {
    g.lineStyle(2.5, 0xffffff, 0.95);
    for (let i = 0; i < 6; i++) {
      const ang = i * Math.PI / 3;
      g.lineBetween(x, y, x + Math.cos(ang) * raio, y + Math.sin(ang) * raio);
    }
    g.strokeCircle(x, y, raio * 0.55);
    g.strokeCircle(x, y, raio);
  }

  shutdown() {
    this.timerComida?.remove();
    this.timerSapo?.remove();
    this.timerAranha?.remove();
    this.comidas.forEach((c) => c.sprite?.destroy());
    this.comidas = [];
  }
}
