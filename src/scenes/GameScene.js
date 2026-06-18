import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState, defaultCustom } from '../utils/GameState.js';
import { drawEnvironmentLayers, getGroundY, DEPTH_TRUNK } from '../ui/createUI.js';
import { FOOD_FRUTAS } from '../config/foodConfig.js';
import {
  GAME_AVISO_ICONS,
  GAME_SCORE_MAX,
  createGameHud,
  updateGameHudHealth,
  updateGameHudScore,
  showFruitEatPopup,
  pickFruitMultiplier,
  segmentsForScore,
  showGameOverModal,
} from '../ui/gameUi.js';
import { CaterpillarSprite } from '../entities/CaterpillarSprite.js';
import {
  GAME_TRUNK_KEY,
  TRUNK_PLAY_WIDTH_RATIO,
  FRUIT_EAT_RADIUS_X,
  MAX_BODY_SEGMENTS,
  CLIMB_FRAME_HEIGHT,
  CLIMBER_MOVE_WIDTH_RATIO,
  CLIMBER_EDGE_PAD_RATIO,
  CLIMB_BODY_TRUNK_RATIO,
  CLIMB_HEAD_SCALE_MUL,
  CLIMB_HEAD_BALL_TOP,
  CLIMB_HEAD_OFFSET_Y,
  CLIMB_HEAD_OFFSET_Y_PX,
  CLIMB_HEAD_OFFSET_X,
  CLIMB_HEAD_OFFSET_X_PX,
  CLIMB_SWAY_X,
  CLIMB_SWAY_ROT,
  DEPTH_LAGARTA,
  DEPTH_FRUIT,
  FRUIT_FALL_INTERVAL_MIN,
  FRUIT_FALL_INTERVAL_MAX,
  MAX_FALLING_FRUITS,
  FRUIT_SPAWN_COOLDOWN_MS,
  FRUIT_TRUNK_INSET,
  FRUIT_SPAWN_WIDTH_RATIO,
  GAME_FRUIT_GRAVITY,
  GAME_FRUIT_BOUNCE,
  GAME_FRUIT_DRAG,
  GAME_FRUIT_ANGULAR_DRAG,
  GAME_FRUIT_STOP_SPEED,
  GAME_FRUIT_AIR_SPIN,
  pickFruitSpeedTier,
} from '../config/gameWorldConfig.js';
import {
  FROG_ATTACK_KEY,
  FROG_ATTACK_FRAME_COUNT,
  FROG_ATTACK_ORIGIN_X,
  FROG_ATTACK_ORIGIN_Y,
  DEFAULT_FROG_ATTACK_TUNE,
  getGameFrogAttackScale,
  getGameFrogBaseY,
  getGameFrogYOffset,
  pickNextSapoLado,
  syncFrogAttackDisplay,
  anchorFrogAttackSprite,
  playFrogAttackAnim,
  stopFrogAttackAnim,
  setFrogAttackFrame,
  doesFrogTongueHitHead,
  GAME_SAPO_SOUND_FALLBACK_MS,
  GAME_SAPO_AVISO_MS,
  GAME_SAPO_VOLTANDO_FRAMES,
} from '../config/frogAttackConfig.js';
import {
  drawBoundsHit,
  drawCircleHit,
  drawFrogTongueHitDebug,
  getGameObjectCircle,
  isDebugHitboxes,
} from '../utils/debug.js';
import { stopBgm, ensureBgmPlaying } from '../systems/MusicManager.js';

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
    this.frutasComidas = 0;
    this.gameHud = null;
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
    this.avisoRow = null;
    this.avisoIcon = null;
    this.avisoText = null;
    this.tutorialGroup = null;
    this.fruitSpawnTimer = null;
    this._pendingFruitTimers = [];
    this._fruitFrameBag = [];
    this._lastFruitSpawnAt = 0;
    this.ready = false;
  }

  create() {
    stopBgm(this);

    this.config = GameState.getConfig(this);
    this.child = GameState.getChild(this);
    this.custom = GameState.getCustom(this) ?? defaultCustom(this.child);
    this.pontos = 0;
    this.frutasComidas = 0;
    this.maxVidas = this.config.maxVidas ?? 3;
    this.scoreMax = GAME_SCORE_MAX;
    this.vidas = GameState.getLives(this) ?? this.maxVidas;
    this.gameOverActive = false;
    this.invulneravel = 0;
    this.showTutorial = true;
    this.comidas = [];
    this.particulas = [];
    this._fruitFrameBag = [];

    const { width, height } = this.scale;
    this.refreshFrogAnchorY();
    this.trunkCX = width / 2;
    this.motion = { climberY: this.anchorY };

    this.buildTrunkBackground(width, height);
    this.buildClimber(width);
    this.playIntroReveal();
    this.buildGameHud();
    this.buildTutorial(width);
    this.buildAvisoPanel(width, height);

    this.gameplayG = this.add.graphics().setDepth(30).setScrollFactor(0);
    if (import.meta.env.DEV) {
      this.frogHitDbgGfx = this.add.graphics().setDepth(252).setScrollFactor(0);
    }
    this.frogSprite = null;
    this.sapo = {
      ativo: false,
      avisoSom: false,
      lado: 1,
      lingua: 0,
      estado: 'escondido',
      timer: 0,
      frogAnchorY: null,
      attackAnchored: false,
      avisandoAnchored: false,
      voltandoAnchored: false,
      attackId: 0,
      lastLado: null,
      layoutLado: null,
      frogLayoutWidth: 0,
    };
    this.sapoSomFallback = null;
    this.sapoSideRotation = { bag: [] };

    this.setupFallingFruits(width, height);

    this.input.on('pointerdown', (p) => {
      if (!this.jogoAtivo) return;
      this.climberLastPointerX = p.x;
      this.climberIsDragging = false;
      this.moverPara(p.x);
    });
    this.input.on('pointermove', (p) => {
      if (!this.jogoAtivo || !p.isDown) return;
      if (Math.abs(p.x - this.climberLastPointerX) > 2) {
        this.climberIsDragging = true;
      }
      this.climberLastPointerX = p.x;
      this.moverPara(p.x);
    });
    this.input.on('pointerup', () => {
      this.climberIsDragging = false;
    });
    this.input.keyboard.on('keydown-LEFT', () => {
      if (!this.lagarta || !this.jogoAtivo) return;
      this.climberIsDragging = true;
      this.lagarta.alvoX -= 48;
    });
    this.input.keyboard.on('keydown-RIGHT', () => {
      if (!this.lagarta || !this.jogoAtivo) return;
      this.climberIsDragging = true;
      this.lagarta.alvoX += 48;
    });
    this.input.keyboard.on('keyup-LEFT', () => { this.climberIsDragging = false; });
    this.input.keyboard.on('keyup-RIGHT', () => { this.climberIsDragging = false; });

    this.jogoAtivo = false;
    this.introClimbing = false;
    this.climberIsDragging = false;
    this.climberLastPointerX = 0;

    const delaySapo = this.config.delayInicioSapo ?? 14000;
    this.time.delayedCall(delaySapo, () => {
      this.ativarSapo();
      this.timerSapo = this.time.addEvent({
        delay: this.config.intervaloSapo || 9000,
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
    this.ready = true;
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

  playIntroReveal() {
    const api = this.caterpillarApi;
    if (!api?.container) {
      this.playGameCountdown();
      return;
    }

    const centerX = this.trunkCX;
    this.lagarta.x = centerX;
    this.lagarta.alvoX = centerX;

    const { height } = this.scale;
    const riseOffset = Math.round(height * 0.28);
    const startY = this.anchorY + riseOffset;
    this.motion.climberY = startY;
    api.setPosition(centerX, startY);
    api.setMoving(false);

    this.time.delayedCall(80, () => {
      api.setAlpha(1);
      this.introClimbing = true;
      api.setMoving(true);

      this.tweens.add({
        targets: this.motion,
        climberY: this.anchorY,
        duration: 1050,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
          this.lagarta.x = centerX;
          this.lagarta.alvoX = centerX;
          api.setPosition(centerX, this.motion.climberY);
        },
        onComplete: () => {
          this.introClimbing = false;
          api.setMoving(false);
          this.lagarta.x = centerX;
          this.lagarta.alvoX = centerX;
          api.setPosition(centerX, this.anchorY);
          this.playGameCountdown();
        },
      });
    });
  }

  playGameCountdown() {
    const steps = ['3', '2', '1'];
    const cx = this.scale.width / 2;
    const cy = Math.round(this.anchorY - this.scale.height * 0.22);
    let index = 0;

    playSound(this, 'countdown');

    const showStep = () => {
      if (index >= steps.length) {
        this.startGameplay();
        return;
      }

      const label = this.add.text(cx, cy, steps[index], {
        fontFamily: Theme.fontFamily,
        fontSize: '72px',
        color: '#1E6A30',
        fontStyle: 'bold',
        stroke: '#FFFFFF',
        strokeThickness: 10,
      }).setOrigin(0.5).setDepth(220).setScrollFactor(0).setScale(0.4).setAlpha(0);

      this.tweens.add({
        targets: label,
        scale: 1.15,
        alpha: 1,
        duration: 260,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: label,
            scale: 1.35,
            alpha: 0,
            duration: 300,
            delay: 200,
            onComplete: () => {
              label.destroy();
              index += 1;
              showStep();
            },
          });
        },
      });
    };

    showStep();
  }

  startGameplay() {
    const cx = this.trunkCX;
    if (this.lagarta) {
      this.lagarta.x = cx;
      this.lagarta.alvoX = cx;
    }
    this.caterpillarApi?.setPosition(cx, this.getClimberY());
    this.jogoAtivo = true;
    this.time.delayedCall(400, () => this.spawnFruitWave());
  }

  buildGameHud() {
    if (!this.textures.exists('ui_game_health') || !this.textures.exists('ui_game_score')) return;

    this.gameHud = createGameHud(this, {
      maxVidas: this.maxVidas,
      maxScore: this.scoreMax,
    });
    this.pinHud(this.gameHud.container);
  }

  buildClimber(width) {
    const bodySize = this.trunkW * CLIMB_BODY_TRUNK_RATIO;
    const climbScale = bodySize / CLIMB_FRAME_HEIGHT;

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
        headCfg: {
          scaleMul: CLIMB_HEAD_SCALE_MUL,
          ballTopRatio: CLIMB_HEAD_BALL_TOP,
          offsetY: CLIMB_HEAD_OFFSET_Y,
          offsetYPx: CLIMB_HEAD_OFFSET_Y_PX,
          offsetX: CLIMB_HEAD_OFFSET_X,
          offsetXPx: CLIMB_HEAD_OFFSET_X_PX,
        },
      },
    );

    this.caterpillarApi.setActiveSegmentCount(1);
    this.caterpillarApi.setMoving(false);
    this.caterpillarApi.setAlpha(0);

    this.lagarta = {
      x: this.trunkCX,
      alvoX: this.trunkCX,
      raio: Math.round(bodySize * 0.42),
      segmentos: 1,
    };
  }

  getHeadPos() {
    if (this.caterpillarApi?.getHeadPosition) {
      return this.caterpillarApi.getHeadPosition();
    }
    return { x: this.lagarta?.x ?? this.trunkCX, y: this.motion.climberY };
  }

  getFrogBaseY() {
    return Math.round(getGameFrogBaseY(this));
  }

  refreshFrogAnchorY() {
    this.anchorY = this.getFrogBaseY();
  }

  getFrogLockY() {
    return this.sapo?.frogAnchorY ?? this.getFrogBaseY();
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

    this.fruitSpawnTimer = this.time.addEvent({
      delay: Phaser.Math.Between(FRUIT_FALL_INTERVAL_MIN, FRUIT_FALL_INTERVAL_MAX),
      loop: true,
      callback: () => {
        if (!this.jogoAtivo) return;
        this.spawnFruitWave();
        this.fruitSpawnTimer.delay = Phaser.Math.Between(
          FRUIT_FALL_INTERVAL_MIN,
          FRUIT_FALL_INTERVAL_MAX,
        );
      },
    });
  }

  countFallingFruits() {
    return this.comidas.filter((c) => c.falling && c.sprite?.active).length;
  }

  fruitSpawnBounds() {
    const { width } = this.scale;
    const span = width * FRUIT_SPAWN_WIDTH_RATIO;
    const edgePad = width * 0.04;
    return {
      minX: Math.round(this.trunkCX - span / 2 + edgePad),
      maxX: Math.round(this.trunkCX + span / 2 - edgePad),
    };
  }

  fruitMinSeparation() {
    return Math.round(this.trunkW * CLIMB_BODY_TRUNK_RATIO * 0.42);
  }

  getFruitLandY() {
    return this.anchorY - 6;
  }

  getFruitDespawnY() {
    return this.getFruitLandY() + 72;
  }

  setupFruitPhysics() {
    const { width, height } = this.scale;
    const boundsTop = -height * 1.5;
    const boundsH = height * 2.8;

    this.physics.world.gravity.y = GAME_FRUIT_GRAVITY;
    this.physics.world.setBounds(0, boundsTop, width, boundsH);

    if (!this.fruitGroup || typeof this.fruitGroup.add !== 'function') {
      this.fruitFruitCollider?.destroy?.();
      this.fruitGroup = this.physics.add.group({
        collideWorldBounds: false,
      });

      this.fruitFruitCollider = this.physics.add.collider(
        this.fruitGroup,
        this.fruitGroup,
        this.onFruitFruitHit,
        null,
        this,
      );
    }
  }

  onFruitFruitHit(obj1, obj2) {
    const f1 = obj1?.body?.immovable ? obj2 : obj1;
    const f2 = f1 === obj1 ? obj2 : obj1;
    if (!f1?.body || !f2?.body || f1.body.immovable || f2.body.immovable) return;

    const rel = Math.hypot(
      f1.body.velocity.x - f2.body.velocity.x,
      f1.body.velocity.y - f2.body.velocity.y,
    );
    if (rel < 18) return;

    const spin = rel * 0.01 * Phaser.Math.FloatBetween(-1, 1);
    f1.setAngularVelocity((f1.body.angularVelocity ?? 0) + spin);
    f2.setAngularVelocity((f2.body.angularVelocity ?? 0) - spin);

    const e1 = this.comidas.find((c) => c.sprite === f1);
    const e2 = this.comidas.find((c) => c.sprite === f2);
    if (e1) e1.falling = true;
    if (e2) e2.falling = true;
  }

  applyFruitLaunchVelocity(sprite, tier, spawn) {
    const drift = spawn?.drift ?? Phaser.Math.FloatBetween(-1, 1);
    const vy = Phaser.Math.Between(tier.vy[0], tier.vy[1]);
    const vx = Phaser.Math.FloatBetween(tier.vx[0], tier.vx[1]) + drift * 14;
    sprite.setVelocity(vx, vy);
    sprite.body.setGravityY(tier.gravityExtra);
    sprite.setData('speedTier', tier.id);
    sprite.setAngularVelocity(vx * 0.018);
  }

  updateFruitPhysics(delta) {
    if (!this.fruitGroup) return;

    const despawnY = this.getFruitDespawnY();
    const { width, height } = this.scale;

    for (const entry of [...this.comidas]) {
      const fruit = entry.sprite;
      if (!fruit?.active || !fruit.body) continue;

      if (fruit.y > despawnY || fruit.y > height + 40 || fruit.x < -120 || fruit.x > width + 120) {
        this.removeFruit(entry);
        continue;
      }

      const vx = fruit.body.velocity.x;
      const vy = fruit.body.velocity.y;
      const speed = Math.hypot(vx, vy);
      const size = fruit.displayWidth || 48;

      entry.falling = vy > 8 || speed > GAME_FRUIT_STOP_SPEED;

      fruit.setDepth(DEPTH_FRUIT + Math.round(fruit.y * 0.08));

      if (speed > 18) {
        const airSpin = (vx / Math.max(size, 1)) * GAME_FRUIT_AIR_SPIN;
        fruit.setAngularVelocity(
          Phaser.Math.Linear(fruit.body.angularVelocity ?? 0, airSpin, 0.04),
        );
      }
    }
  }

  pickFruitSpawnPoint(blockedExtra = [], preferredLaneX = null) {
    const { width, height } = this.scale;
    const { minX, maxX } = this.fruitSpawnBounds();
    const span = maxX - minX;
    const minSepBase = this.fruitMinSeparation();
    const minSepX = minSepBase * 1.05;
    const minSepY = minSepBase * 0.95;
    const minY = Math.round(-height * 0.72);
    const maxY = Math.round(-height * 0.06);

    const laneXs = [
      minX + span * 0.1,
      minX + span * 0.32,
      minX + span * 0.5,
      minX + span * 0.68,
      minX + span * 0.9,
    ];
    const laneOrder = preferredLaneX != null
      ? [preferredLaneX]
      : Phaser.Utils.Array.Shuffle([...laneXs]);

    const isFree = (x, y) => {
      const sprites = [
        ...blockedExtra,
        ...this.comidas.map((c) => c.sprite).filter((s) => s?.active),
      ];
      return !sprites.some((s) => {
        const dx = Math.abs(s.x - x) / minSepX;
        const dy = Math.abs(s.y - y) / minSepY;
        return Math.hypot(dx, dy) < 1;
      });
    };

    for (const laneX of laneOrder) {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const jitter = Phaser.Math.Between(-Math.round(span * 0.04), Math.round(span * 0.04));
        const x = Phaser.Math.Clamp(Math.round(laneX + jitter), minX, maxX);
        const y = Phaser.Math.Between(minY, maxY);
        if (!isFree(x, y)) continue;
        const drift = Phaser.Math.Clamp((x - (minX + span / 2)) / (span / 2), -1, 1);
        return { x, y, drift };
      }
    }

    return null;
  }

  spawnFruitWave() {
    if (!this.jogoAtivo) return;

    const now = this.time.now;
    if (now - this._lastFruitSpawnAt < FRUIT_SPAWN_COOLDOWN_MS) return;

    const room = MAX_FALLING_FRUITS - this.countFallingFruits();
    if (room <= 0) return;

    const batch = Phaser.Math.Between(1, room);
    const { minX, maxX } = this.fruitSpawnBounds();
    const span = maxX - minX;
    const waveLanes = Phaser.Utils.Array.Shuffle([
      minX + span * 0.1,
      minX + span * 0.32,
      minX + span * 0.5,
      minX + span * 0.68,
      minX + span * 0.9,
    ]).slice(0, batch);
    const yStep = this.fruitMinSeparation() * 0.9;
    const usedPoints = [];
    let spawned = 0;

    for (let i = 0; i < batch; i += 1) {
      const point = this.pickFruitSpawnPoint(usedPoints, waveLanes[i]);
      if (!point) continue;
      point.y -= Math.round(i * yStep);
      usedPoints.push({ x: point.x, y: point.y });
      const timer = this.time.delayedCall(i * 900, () => {
        if (!this.scene?.isActive() || !this.jogoAtivo) return;
        this.dropFruitAt(point);
      });
      this._pendingFruitTimers.push(timer);
      spawned += 1;
    }

    if (spawned > 0) this._lastFruitSpawnAt = now;
  }

  dropFruitAt(spawn) {
    if (!this.jogoAtivo || !this.scene?.isActive() || !this.textures.exists(FOOD_FRUTAS.key)) return;

    this.setupFruitPhysics();
    if (!this.fruitGroup?.add) return;

    const { width } = this.scale;
    const frame = this.pickFruitFrame();
    const size = Math.round(this.trunkW * 0.15 + Phaser.Math.Between(4, 18));
    const { minX, maxX } = this.fruitSpawnBounds();
    const spawnX = Phaser.Math.Clamp(
      spawn.x + Phaser.Math.Between(-Math.round(width * 0.04), Math.round(width * 0.04)),
      minX - 40,
      maxX + 40,
    );
    const spawnY = spawn.y;

    const sprite = this.physics.add.image(spawnX, spawnY, FOOD_FRUTAS.key, frame);
    sprite.setDisplaySize(size, size);
    sprite.setDepth(DEPTH_FRUIT + Math.round(spawnY * 0.08));
    sprite.setScrollFactor(0);
    sprite.setBounce(GAME_FRUIT_BOUNCE);
    sprite.setDrag(GAME_FRUIT_DRAG);
    sprite.setAngularDrag(GAME_FRUIT_ANGULAR_DRAG);
    sprite.setCollideWorldBounds(false);
    sprite.setData('fruitState', 'falling');

    const tier = pickFruitSpeedTier();
    const radius = size * 0.38;
    const inset = (size - radius * 2) / 2;
    sprite.body.setCircle(radius, inset, inset);
    this.applyFruitLaunchVelocity(sprite, tier, { ...spawn, x: spawnX });

    this.fruitGroup.add(sprite);

    const entry = {
      x: spawnX,
      sprite,
      falling: true,
      multiplier: pickFruitMultiplier(),
    };
    this.comidas.push(entry);
  }

  spawnFallingFruit() {
    this.spawnFruitWave();
  }

  removeFruit(entry) {
    const idx = this.comidas.indexOf(entry);
    if (idx >= 0) this.comidas.splice(idx, 1);
    if (entry.sprite?.active) {
      this.tweens.killTweensOf(entry.sprite);
      if (this.fruitGroup?.contains(entry.sprite)) {
        this.fruitGroup.remove(entry.sprite, true, true);
      } else {
        entry.sprite.destroy();
      }
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

    const hint = this.add.text(width / 2, 100, `${this.child.nome}, mova a lagartinha!`, {
      fontFamily: Theme.fontFamily,
      fontSize: '16px',
      color: '#3B3024',
      fontStyle: 'bold',
      backgroundColor: '#FFF8E7',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5);
    this.tutorialGroup.add(hint);
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
    const padX = 14;
    const padBottom = 18;
    const panelW = Math.min(width - padX * 2, 340);
    const panelH = 52;
    const iconSize = 22;

    this.avisoPanelW = panelW;
    this.avisoContainer = this.add.container(
      padX + panelW / 2,
      height - padBottom - panelH / 2,
    ).setDepth(150).setAlpha(0);
    this.pinHud(this.avisoContainer);

    const bg = this.add.graphics();
    bg.fillStyle(Theme.papel, 0.96);
    bg.lineStyle(3, Theme.folhaEscura, 1);
    bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, panelH / 2);
    bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, panelH / 2);

    this.avisoRow = this.add.container(0, 0);
    this.avisoIcon = this.add.image(0, 0, GAME_AVISO_ICONS.comeu.textureKey)
      .setDisplaySize(iconSize, iconSize)
      .setOrigin(0.5);
    this.avisoText = this.add.text(0, 0, '', {
      fontFamily: Theme.fontFamily,
      fontSize: '16px',
      color: '#3B3024',
      fontStyle: 'bold',
      align: 'left',
    }).setOrigin(0, 0.5);

    this.avisoRow.add([this.avisoIcon, this.avisoText]);
    this.avisoContainer.add([bg, this.avisoRow]);
  }

  layoutAvisoContent(tipo, msg) {
    const iconDef = GAME_AVISO_ICONS[tipo] ?? GAME_AVISO_ICONS.comeu;
    const iconSize = 22;
    const gap = 10;
    const maxTextW = this.avisoPanelW - iconSize - gap - 36;

    this.avisoIcon.setTexture(iconDef.textureKey).setDisplaySize(iconSize, iconSize);
    this.avisoText.setText(msg);
    this.avisoText.setWordWrapWidth(maxTextW, true);

    const textW = Math.min(this.avisoText.width, maxTextW);
    const totalW = iconSize + gap + textW;

    this.avisoIcon.setX(-totalW / 2 + iconSize / 2);
    this.avisoText.setX(-totalW / 2 + iconSize + gap);
  }

  climberBodyHalfWidth() {
    const bodyW = this.trunkW * CLIMB_BODY_TRUNK_RATIO;
    return Math.round(bodyW * 0.5 + CLIMB_SWAY_X + 10);
  }

  resolveClimberMoveBounds(width) {
    const bodyHalf = this.climberBodyHalfWidth()
      + Math.max(12, Math.round(width * CLIMBER_EDGE_PAD_RATIO));
    const ratioHalf = (width * CLIMBER_MOVE_WIDTH_RATIO) * 0.5;
    let minX = Math.round(this.trunkCX - ratioHalf);
    let maxX = Math.round(this.trunkCX + ratioHalf);
    minX = Math.max(bodyHalf, minX);
    maxX = Math.min(width - bodyHalf, maxX);
    if (minX > maxX) {
      const cx = Math.round(this.trunkCX);
      minX = cx - 12;
      maxX = cx + 12;
    }
    return { minX, maxX, bodyHalf };
  }

  moverPara(screenX) {
    if (!this.lagarta) return;
    const { width } = this.scale;
    const { minX, maxX } = this.resolveClimberMoveBounds(width);
    this.lagarta.alvoX = Phaser.Math.Clamp(screenX, minX, maxX);
  }

  podeComerFruta(sprite) {
    const head = this.getHeadPos();
    return (
      Math.abs(sprite.x - head.x) < FRUIT_EAT_RADIUS_X + 18
      && Math.abs(sprite.y - head.y) < 58
    );
  }

  crescerLagarta() {
    if (!this.lagarta) return;
    const segs = segmentsForScore(this.pontos, this.scoreMax, MAX_BODY_SEGMENTS);
    if (segs === this.lagarta.segmentos) return;

    this.caterpillarApi?.setActiveSegmentCount(segs);
    this.lagarta.segmentos = segs;
    const bodySize = this.trunkW * CLIMB_BODY_TRUNK_RATIO;
    this.lagarta.raio = Math.min(bodySize * 0.55, bodySize * 0.42 + (segs - 1) * 8);
  }

  ativarSapo() {
    if (!this.jogoAtivo || this.sapo.ativo || this.sapo.avisoSom) return;
    if (this.frutasComidas < (this.config.minComidaAntesSapo ?? 4)) return;

    this.sapoSomFallback?.remove();
    this.sapoSomFallback = null;
    this.sapo.avisoSom = true;
    this.sapo.spawned = false;
    this.avisar('sapo');

    const mostrarSapo = () => {
      if (!this.jogoAtivo || this.sapo.ativo || this.sapo.spawned) {
        this.sapo.avisoSom = false;
        return;
      }
      this.sapoSomFallback?.remove();
      this.sapoSomFallback = null;
      this.sapo.spawned = true;
      this.sapo.avisoSom = false;
      this.sapo.ativo = true;
      this.sapo.lado = pickNextSapoLado(this.sapoSideRotation, this.sapo.lastLado);
      this.sapo.estado = 'avisando';
      this.sapo.timer = 0;
      this.sapo.avisandoAt = this.time.now;
      this.sapo.lingua = 0;
      this.sapo.frogAnchorY = this.getFrogBaseY();
      this.sapo.attackAnchored = false;
      this.sapo.avisandoAnchored = false;
      this.sapo.voltandoAnchored = false;
      this.sapo.layoutLado = null;
      this.sapo.frogLayoutWidth = 0;
      this.bumpSapoAttackId();
      if (this.frogSprite?.active) {
        stopFrogAttackAnim(this.frogSprite);
        this.frogSprite.setVisible(false);
      }
    };

    const fallbackMs = GAME_SAPO_SOUND_FALLBACK_MS;
    playSound(this, 'aiolhaosapo', { volumeMul: 0.85, onComplete: mostrarSapo });
    this.sapoSomFallback = this.time.delayedCall(fallbackMs, mostrarSapo);
  }

  bumpSapoAttackId() {
    this.sapo.attackId = (this.sapo.attackId ?? 0) + 1;
    return this.sapo.attackId;
  }

  avisar(tipo, extra = {}) {
    const nome = this.child.nome;
    const pts = extra.points ?? 1;
    const msgs = {
      sapo: `Ei ${nome}, sapo na área!`,
      cresceu: `${nome} cresceu! +1 bolinha`,
      comeu: `${nome} +${pts} pts`,
      sapoHit: `${nome} -1 vida`,
    };

    this.layoutAvisoContent(tipo, msgs[tipo] || tipo);
    this.avisoContainer.setAlpha(1);
    this.tweens.killTweensOf(this.avisoContainer);
    this.tweens.add({
      targets: this.avisoContainer,
      alpha: { from: 1, to: 0 },
      delay: tipo === 'comeu' ? 3400 : (tipo === 'sapo' ? 1200 : 2200),
      duration: 500,
    });
  }

  comer(c) {
    this.dismissTutorial();
    const mult = c.multiplier ?? pickFruitMultiplier();
    this.frutasComidas += 1;
    this.pontos = Math.min(this.pontos + mult, GAME_SCORE_MAX);
    GameState.setPoints(this, this.pontos);
    playSound(this, 'eat');
    playSound(this, 'point', { volumeMul: 0.85 });

    const pos = { x: c.sprite.x, y: c.sprite.y };
    this.tweens.killTweensOf(c.sprite);
    c.sprite.destroy();
    this.comidas = this.comidas.filter((f) => f !== c);

    showFruitEatPopup(this, pos.x, pos.y, mult);
    if (this.gameHud) {
      updateGameHudScore(this.gameHud, this.pontos);
    }

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

    const prevSegs = this.lagarta.segmentos;
    this.crescerLagarta();

    if (this.lagarta.segmentos > prevSegs) {
      playSound(this, 'increase');
      this.avisar('cresceu');
    } else {
      this.avisar('comeu', { points: mult });
    }

    this.time.delayedCall(FRUIT_SPAWN_COOLDOWN_MS, () => this.spawnFallingFruit());

    if (this.pontos >= GAME_SCORE_MAX) {
      this.jogoAtivo = false;
      this.time.delayedCall(900, () => this.scene.start(SceneKeys.COCOON));
    }
  }

  perderVida(tipo) {
    if (this.invulneravel > 0 || this.gameOverActive) return;

    this.vidas = Math.max(0, this.vidas - 1);
    GameState.setLives(this, this.vidas);
    if (this.gameHud) {
      updateGameHudHealth(this.gameHud, this.vidas, this.maxVidas);
    }
    this.invulneravel = this.config.invulneravelFrames ?? 120;
    playSound(this, 'hurt');
    this.caterpillarApi?.playHurt?.();
    this.avisar(tipo);

    if (this.vidas <= 0) {
      this.showGameOver();
    }
  }

  showGameOver() {
    this.gameOverActive = true;
    this.jogoAtivo = false;
    ensureBgmPlaying(this);
    playSound(this, 'fail');

    showGameOverModal(this, {
      childName: this.child.nome,
      onRetry: () => {
        GameState.initRun(this);
        this.scene.start(SceneKeys.GAME);
      },
      onHome: () => {
        this.scene.start(SceneKeys.SPLASH);
      },
    });
  }

  update() {
    if (!this.ready || !this.lagarta || this.gameOverActive) return;

    if (this.tonta > 0) this.tonta--;
    if (this.invulneravel > 0) this.invulneravel--;

    const { width } = this.scale;
    const { minX, maxX } = this.resolveClimberMoveBounds(width);
    this.climberMoveMinX = minX;
    this.climberMoveMaxX = maxX;

    this.lagarta.alvoX = Phaser.Math.Clamp(
      this.lagarta.alvoX,
      minX,
      maxX,
    );
    this.lagarta.x += (this.lagarta.alvoX - this.lagarta.x) * 0.24;
    this.lagarta.x = Phaser.Math.Clamp(this.lagarta.x, minX, maxX);

    if (this.caterpillarApi) {
      const moveDelta = this.lagarta.alvoX - this.lagarta.x;
      const easingMove = Math.abs(moveDelta) > 1.2;
      const isMoving = this.introClimbing
        || (this.jogoAtivo && (this.climberIsDragging || easingMove));
      this.caterpillarApi.setPosition(this.lagarta.x, this.getClimberY());
      this.caterpillarApi.setMoving(isMoving);
      const alpha = this.invulneravel > 0 && Math.floor(this.invulneravel / 6) % 2 ? 0.45 : 1;
      this.caterpillarApi.setAlpha(alpha);
      this.caterpillarApi.updateWave(this.time.now * 0.001, isMoving, moveDelta);
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
      if (this.sapo.estado === 'avisando'
        && this.time.now - (this.sapo.avisandoAt ?? 0) >= GAME_SAPO_AVISO_MS) {
        this.sapo.estado = 'atacando';
        this.sapo.timer = 0;
        if (this.sapo.frogAnchorY == null) this.sapo.frogAnchorY = this.getFrogBaseY();
        this.sapo.attackAnchored = false;
        this.sapo.avisandoAnchored = false;
        this.sapo.voltandoAnchored = false;
        playSound(this, 'lingua');
      }
      if (this.sapo.estado === 'voltando' && this.sapo.timer > GAME_SAPO_VOLTANDO_FRAMES) {
        this.sapo.lastLado = this.sapo.lado;
        this.sapo.ativo = false;
        this.sapo.frogAnchorY = null;
        this.sapo.attackAnchored = false;
        this.sapo.avisandoAnchored = false;
        this.sapo.voltandoAnchored = false;
        this.sapo.layoutLado = null;
        this.sapo.frogLayoutWidth = 0;
        this.bumpSapoAttackId();
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
    this.drawFrogHitDebug();
    this.updateFrogSprite();
    this.updateFruitPhysics(this.game.loop.delta);
  }

  ensureFrogSprite() {
    if (!this.textures.exists(FROG_ATTACK_KEY)) return;

    const screenW = this.scale.width;
    const scale = getGameFrogAttackScale(screenW, DEFAULT_FROG_ATTACK_TUNE);
    if (this.frogSprite?.active) {
      const prevScale = this.frogSprite.getData('frogAttackScale');
      syncFrogAttackDisplay(this.frogSprite, scale);
      this.frogSprite.setData('frogAttackScale', scale);
      if (prevScale != null && prevScale !== scale) {
        this.sapo.avisandoAnchored = false;
        this.sapo.attackAnchored = false;
        this.sapo.voltandoAnchored = false;
      }
      return;
    }

    this.frogSprite = this.add.sprite(0, 0, FROG_ATTACK_KEY, 0)
      .setOrigin(FROG_ATTACK_ORIGIN_X, FROG_ATTACK_ORIGIN_Y)
      .setDepth(40)
      .setScrollFactor(0)
      .setVisible(false);
    syncFrogAttackDisplay(this.frogSprite, scale);
    this.frogSprite.setData('frogAttackScale', scale);
  }

  checkSapoHitOnAttackFrame() {
    if (this.sapo.estado !== 'atacando' || this.tonta > 0 || this.invulneravel > 0) return;

    const spr = this.frogSprite;
    if (!spr?.active) return;

    const head = this.getHeadPos();
    const fromLeft = this.sapo.lado === 0;
    const hitPad = Math.round((this.lagarta?.raio ?? 40) * 0.35);

    if (!doesFrogTongueHitHead(spr, head, fromLeft, hitPad)) return;

    this.perderVida('sapoHit');
    this.tonta = 70;
    stopFrogAttackAnim(spr);
    this.sapo.estado = 'voltando';
    this.sapo.attackAnchored = false;
    this.sapo.voltandoAnchored = false;
    this.sapo.timer = 0;
  }

  beginSapoAttackAnim() {
    const spr = this.frogSprite;
    if (!spr?.active) return;
    const attackId = this.sapo.attackId;

    playFrogAttackAnim(spr, this, {
      attackId,
      onFrame: () => {
        if (this.sapo.attackId !== attackId) return;
        this.checkSapoHitOnAttackFrame();
      },
      onComplete: () => {
        if (this.sapo.attackId !== attackId) return;
        if (this.sapo?.estado === 'atacando') {
          this.sapo.estado = 'voltando';
          this.sapo.attackAnchored = false;
          this.sapo.voltandoAnchored = false;
          this.sapo.timer = 0;
        }
      },
    });
  }

  anchorFrogForSapo(spr, { screenWidth, y, fromLeft, yOffset = 0 }) {
    stopFrogAttackAnim(spr);
    anchorFrogAttackSprite(spr, {
      screenWidth,
      y,
      fromLeft,
      yOffset,
      useGameLayout: true,
      tune: DEFAULT_FROG_ATTACK_TUNE,
    });
    this.sapo.layoutLado = this.sapo.lado;
  }

  nudgeFrogPulse(spr, baseY, pulse) {
    if (!spr?.active) return;
    const pinX = spr.getData('frogPinX');
    const pinY = spr.getData('frogPinY');
    if (pinX == null || pinY == null) return;

    const yOffset = getGameFrogYOffset(spr.getData('frogFromLeft') ?? true, DEFAULT_FROG_ATTACK_TUNE);
    const targetY = baseY + yOffset + pulse;
    const dy = targetY - pinY;
    if (Math.abs(dy) < 0.01) return;

    spr.y += dy;
    spr.setData('frogPinY', pinY + dy);
    const frameIndex = spr.frame?.name ?? spr.frame?.index ?? 0;
    setFrogAttackFrame(spr, Number(frameIndex));
  }

  updateFrogSprite() {
    if (!this.sapo?.ativo) {
      if (this.frogSprite?.active) {
        this.bumpSapoAttackId();
        stopFrogAttackAnim(this.frogSprite);
        this.frogSprite.setVisible(false);
      }
      return;
    }

    this.ensureFrogSprite();
    const spr = this.frogSprite;
    if (!spr?.active) return;

    const { width } = this.scale;
    const fromLeft = this.sapo.lado === 0;
    const frogY = this.getFrogLockY();
    const ladoMudou = this.sapo.layoutLado != null && this.sapo.layoutLado !== this.sapo.lado;
    const layoutWidth = this.sapo.frogLayoutWidth ?? 0;
    const layoutChanged = layoutWidth !== width;
    if (layoutChanged) {
      this.sapo.frogLayoutWidth = width;
      this.refreshFrogAnchorY();
      if (this.sapo.frogAnchorY != null) this.sapo.frogAnchorY = this.anchorY;
    }

    spr.setVisible(true);

    if (this.sapo.estado === 'avisando') {
      const pul = Math.sin(this.sapo.timer * 0.5) * 3;
      if (!this.sapo.avisandoAnchored || ladoMudou || layoutChanged) {
        this.anchorFrogForSapo(spr, {
          screenWidth: width,
          y: frogY,
          fromLeft,
          yOffset: pul,
        });
        this.sapo.avisandoAnchored = true;
      } else {
        this.nudgeFrogPulse(spr, frogY, pul);
      }
      this.sapo.attackAnchored = false;
      return;
    }

    if (this.sapo.estado === 'atacando') {
      if (ladoMudou || layoutChanged) {
        this.sapo.attackAnchored = false;
        this.bumpSapoAttackId();
      }
      if (this.sapo.frogAnchorY == null) this.sapo.frogAnchorY = frogY;
      if (!this.sapo.attackAnchored) {
        this.anchorFrogForSapo(spr, {
          screenWidth: width,
          y: this.sapo.frogAnchorY,
          fromLeft,
        });
        this.sapo.attackAnchored = true;
        this.beginSapoAttackAnim();
      }
      return;
    }

    if (!this.sapo.voltandoAnchored || ladoMudou || layoutChanged) {
      this.anchorFrogForSapo(spr, {
        screenWidth: width,
        y: frogY,
        fromLeft,
      });
      this.sapo.voltandoAnchored = true;
    }
    const backFrame = this.sapo.timer > 4 ? (this.sapo.timer > 7 ? 0 : 1) : 2;
    setFrogAttackFrame(spr, backFrame);
  }

  drawDebugOverlay() {
    const g = this.debugGfx;
    if (!g) return;
    g.clear();

    if (this.trunkBg?.getBounds) {
      drawBoundsHit(g, this.trunkBg.getBounds(), 0x8B5A2B, 0.08);
    }

    if (this.climberMoveMinX != null && this.climberMoveMaxX != null) {
      const { height } = this.scale;
      const zoneW = this.climberMoveMaxX - this.climberMoveMinX;
      drawBoundsHit(g, {
        x: this.climberMoveMinX,
        y: 0,
        width: zoneW,
        height,
      }, 0x2196F3, 0.07);
      g.lineStyle(2, 0x2196F3, 0.9);
      g.lineBetween(this.climberMoveMinX, 0, this.climberMoveMinX, height);
      g.lineBetween(this.climberMoveMaxX, 0, this.climberMoveMaxX, height);
    }

    const fruitBounds = this.fruitSpawnBounds?.();
    if (fruitBounds) {
      const { height } = this.scale;
      const fruitTop = Math.round(height * 0.12);
      const fruitH = Math.round(height * 0.78);
      drawBoundsHit(g, {
        x: fruitBounds.minX,
        y: fruitTop,
        width: fruitBounds.maxX - fruitBounds.minX,
        height: fruitH,
      }, 0xFF9800, 0.06);
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

    if (this.sapo?.ativo && this.frogSprite?.active) {
      const fromLeft = this.sapo.lado === 0;
      const hitPad = Math.round((this.lagarta?.raio ?? 40) * 0.35);
      drawFrogTongueHitDebug(g, this.frogSprite, fromLeft, hitPad, this.getHeadPos());
    }
  }

  /** Dev — hitbox da língua sempre visível com sapo ativo */
  drawFrogHitDebug() {
    const g = this.frogHitDbgGfx;
    if (!g) return;
    g.clear();
    if (!this.sapo?.ativo || !this.frogSprite?.active) return;

    const fromLeft = this.sapo.lado === 0;
    const hitPad = Math.round((this.lagarta?.raio ?? 40) * 0.35);
    drawFrogTongueHitDebug(g, this.frogSprite, fromLeft, hitPad, this.getHeadPos());
  }

  drawGameplayOverlay() {
    const g = this.gameplayG;
    g.clear();
    this.particulas.forEach((p) => {
      g.fillStyle(p.cor, Math.max(p.vida, 0));
      g.fillCircle(p.x, p.y, 5);
    });
  }

  shutdown() {
    this.ready = false;
    ensureBgmPlaying(this);
    this.timerSapo?.remove();
    this.sapoSomFallback?.remove();
    this.sapoSomFallback = null;
    this.fruitSpawnTimer?.remove();
    this._pendingFruitTimers?.forEach((timer) => timer?.remove?.());
    this._pendingFruitTimers = [];
    if (this.debugDraw) this.events.off('update', this.debugDraw);
    this.debugGfx?.destroy();
    this.frogHitDbgGfx?.destroy();
    this.comidas.forEach((c) => {
      this.tweens.killTweensOf(c.sprite);
      if (c.sprite?.active) {
        if (this.fruitGroup?.contains(c.sprite)) {
          this.fruitGroup.remove(c.sprite, true, true);
        } else {
          c.sprite.destroy();
        }
      }
    });
    this.comidas = [];
    this.fruitGroup?.clear(true, true);
    this.fruitFruitCollider = null;
    this.fruitGroup = null;
    if (this.physics?.world) this.physics.world.gravity.y = 0;
    this.caterpillarApi?.destroy?.();
    this.caterpillarApi = null;
    this.lagarta = null;
    this.gameHud?.container?.destroy?.();
    this.gameHud = null;
    this.frogSprite?.destroy();
    this.frogSprite = null;
  }
}
