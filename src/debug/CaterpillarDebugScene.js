import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import { CaterpillarSprite } from '../entities/CaterpillarSprite.js';
import { DEPTH_CATERPILLAR } from '../ui/createUI.js';
import {
  getDebugCaterpillarOpts,
  CATERPILLAR_RISE_OVERRIDES,
} from '../config/caterpillarConfig.js';

const GROUND_OFFSET_RATIO = 0.080;
/** Largura máxima da lagarta na tela — evita cortar nas bordas */
const FIT_WIDTH_RATIO = 0.88;
/** Tempo aprox. do playRise (hold + stagger + move + settle) */
const RISE_CYCLE_MS = 2100;

/** Tela vazia — parada, andando e erguida para ajuste fino de sprites */
export class CaterpillarDebugScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.CATERPILLAR_DEBUG);
    this.animPreviewActive = false;
    this.animTimers = [];
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#E8F9FF');

    const child = { id: 'default' };
    const custom = {
      cor: { clara: 0x7CB342, escura: 0x5C8F2E },
      chapeu: false,
      oculos: false,
    };
    const opts = getDebugCaterpillarOpts();

    const paradaGroundY = height * 0.22;
    const andandoGroundY = height * 0.50;
    const erguidaGroundY = height * 0.78;

    this.drawGroundGuide(paradaGroundY, width);
    this.drawGroundGuide(andandoGroundY, width);
    this.drawGroundGuide(erguidaGroundY, width);

    this.addLabel('Parada', width * 0.5, paradaGroundY - height * 0.07);
    this.addLabel('Andando', width * 0.5, andandoGroundY - height * 0.07);
    this.addLabel('Erguida', width * 0.5, erguidaGroundY - height * 0.07);

    const footY = (groundY) => groundY + height * GROUND_OFFSET_RATIO;
    const centerX = width * 0.5;

    this.parada = CaterpillarSprite.create(
      this,
      0,
      footY(paradaGroundY),
      child,
      custom,
      DEPTH_CATERPILLAR,
      opts,
    );

    this.andando = CaterpillarSprite.create(
      this,
      0,
      footY(andandoGroundY),
      child,
      custom,
      DEPTH_CATERPILLAR,
      opts,
    );

    this.erguida = CaterpillarSprite.create(
      this,
      0,
      footY(erguidaGroundY),
      child,
      custom,
      DEPTH_CATERPILLAR,
      getDebugCaterpillarOpts(CATERPILLAR_RISE_OVERRIDES),
    );

    if (this.parada.mode === 'filament') {
      this.freezeParada();
      this.layoutCaterpillarInView(this.parada, centerX, footY(paradaGroundY), width);
    }
    if (this.andando.mode === 'filament') {
      this.freezeAndando();
      this.layoutCaterpillarInView(this.andando, centerX, footY(andandoGroundY), width);
      this.matchDebugScaleToParada(centerX, footY(andandoGroundY), this.andando);
    }
    if (this.erguida.mode === 'filament') {
      this.erguida.holdRaisedPose?.();
      this.layoutCaterpillarInView(this.erguida, centerX, footY(erguidaGroundY), width);
      this.matchDebugScaleToParada(centerX, footY(erguidaGroundY), this.erguida);
    }

    this.debugCenterX = centerX;
    this.debugViewWidth = width;
    this.debugParadaFootY = footY(paradaGroundY);
    this.debugAndandoFootY = footY(andandoGroundY);
    this.debugErguidaFootY = footY(erguidaGroundY);

    this.createAnimToggleButton(width, height);

    this.events.on('update', (_time, _delta) => {
      const t = this.time.now * 0.001;
      if (this.andando?.isMoving) {
        this.andando.updateWave(t, true);
      }
    });

    this.scale.on('resize', this.onResize, this);
  }

  addLabel(text, x, y) {
    this.add.text(x, y, text, {
      fontFamily: Theme.fontFamily,
      fontSize: '17px',
      color: '#336633',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  onResize() {
    this.scene.restart();
  }

  /** Encaixa na largura da tela, centraliza e alinha os pés no chão */
  layoutCaterpillarInView(api, centerX, targetFootY, viewWidth) {
    if (!api?.container?.active) return;

    api.container.setScale(1);
    api.setPosition(0, targetFootY);

    let bounds = api.container.getBounds();
    const maxW = viewWidth * FIT_WIDTH_RATIO;
    if (bounds.width > maxW) {
      api.container.setScale(maxW / bounds.width);
      api.setPosition(0, targetFootY);
      bounds = api.container.getBounds();
    }

    const dx = centerX - bounds.centerX;
    const dy = targetFootY - bounds.bottom;
    api.setPosition(api.container.x + dx, api.container.y + dy);
  }

  /** Mesmo scale da parada — bolinhas iguais na linha */
  matchDebugScaleToParada(centerX, targetFootY, target = this.erguida) {
    if (!this.parada?.container?.active || !target?.container?.active) return;
    const scale = this.parada.container.scaleX;
    target.container.setScale(scale);
    const bounds = target.container.getBounds();
    const dx = centerX - bounds.centerX;
    const dy = targetFootY - bounds.bottom;
    target.setPosition(target.container.x + dx, target.container.y + dy);
  }

  drawGroundGuide(y, width) {
    const g = this.add.graphics().setDepth(1);
    g.lineStyle(2, 0x8B6914, 0.55);
    g.lineBetween(width * 0.06, y, width * 0.94, y);
    g.lineStyle(1, 0x7CB342, 0.35);
    g.lineBetween(width * 0.06, y - 2, width * 0.94, y - 2);
  }

  createAnimToggleButton(viewWidth, viewHeight) {
    const label = this.add.text(0, 0, '▶  Ver animação', {
      fontFamily: Theme.fontFamily,
      fontSize: '17px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const padX = 28;
    const padY = 14;
    const btnW = label.width + padX * 2;
    const btnH = label.height + padY * 2;
    const bg = this.add.graphics();

    this.animBtn = this.add.container(viewWidth * 0.5, viewHeight - 44, [bg, label])
      .setDepth(50)
      .setSize(btnW, btnH);

    this.animBtn.setInteractive({ useHandCursor: true });
    this.animBtn.on('pointerover', () => this.refreshAnimBtnStyle(true));
    this.animBtn.on('pointerout', () => this.refreshAnimBtnStyle(false));
    this.animBtn.on('pointerdown', () => this.toggleAnimPreview());
    this.animBtnLabel = label;
    this.refreshAnimBtnStyle(false);
  }

  refreshAnimBtnStyle(hover = false) {
    if (!this.animBtnLabel || !this.animBtn) return;
    const padX = 28;
    const padY = 14;
    const btnW = this.animBtnLabel.width + padX * 2;
    const btnH = this.animBtnLabel.height + padY * 2;
    const bg = this.animBtn.list[0];
    bg.clear();
    const fill = this.animPreviewActive
      ? 0x5EA448
      : (hover ? 0x6AAA18 : Theme.botaoVerde);
    bg.fillStyle(fill, 1);
    bg.lineStyle(3, 0x4E7A14, 1);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
    this.animBtn.setSize(btnW, btnH);
  }

  toggleAnimPreview() {
    this.animPreviewActive = !this.animPreviewActive;
    if (this.animPreviewActive) {
      this.animBtnLabel.setText('⏸  Parar animação');
      this.startAnimPreview();
    } else {
      this.animBtnLabel.setText('▶  Ver animação');
      this.stopAnimPreview();
    }
    this.refreshAnimBtnStyle(false);
  }

  clearAnimTimers() {
    this.animTimers.forEach((t) => t?.remove(false));
    this.animTimers = [];
  }

  scheduleAnimTimer(delay, fn) {
    const timer = this.time.delayedCall(delay, fn);
    this.animTimers.push(timer);
    return timer;
  }

  relayoutDebugRow(api, footY) {
    this.layoutCaterpillarInView(api, this.debugCenterX, footY, this.debugViewWidth);
    if (api !== this.parada) {
      this.matchDebugScaleToParada(this.debugCenterX, footY, api);
    }
  }

  startAnimPreview() {
    this.startParadaAnim();
    this.startAndandoAnim();
    this.scheduleErguidaRiseLoop();
  }

  startParadaAnim() {
    const api = this.parada;
    if (api?.mode !== 'filament') return;

    const bodyKey = `${api.texKeys.base}_idleBreathe`;
    const headKey = `${api.texKeys.base}_headIdle`;

    api.segments?.forEach(({ sprite }) => {
      sprite.anims?.stop();
      if (this.anims.exists(bodyKey)) sprite.play(bodyKey);
    });

    if (api.headSprite?.active) {
      api.headSprite.anims?.stop();
      if (this.anims.exists(headKey)) api.headSprite.play(headKey);
    }
  }

  freezeParada() {
    const api = this.parada;
    if (api?.mode !== 'filament') return;
    api.resetPose?.();
    api.segments?.forEach(({ sprite }) => {
      sprite.anims?.stop();
      if (sprite.texture?.has(0)) sprite.setFrame(0);
    });
    api.headSprite?.anims?.stop();
    if (api.headSprite?.texture?.has(0)) api.headSprite.setFrame(0);
  }

  startAndandoAnim() {
    const api = this.andando;
    if (api?.mode !== 'filament') return;
    api.setMoving?.(true);
  }

  freezeAndando() {
    const api = this.andando;
    if (api?.mode !== 'filament') return;
    api.resetPose?.();
    api.setMoving?.(true);
    api.segments?.forEach(({ sprite }) => {
      sprite.anims?.stop();
      if (sprite.texture?.has(0)) sprite.setFrame(0);
    });
    if (api.headSprite?.active) {
      api.headSprite.anims?.stop();
      if (api.headSprite.texture?.has(0)) api.headSprite.setFrame(0);
    }
  }

  scheduleErguidaRiseLoop() {
    if (!this.animPreviewActive) return;

    this.erguida?.resetPose?.();
    this.relayoutDebugRow(this.erguida, this.debugErguidaFootY);

    this.scheduleAnimTimer(180, () => {
      if (!this.animPreviewActive) return;
      this.erguida?.playRise?.();
      this.scheduleAnimTimer(RISE_CYCLE_MS, () => this.scheduleErguidaRiseLoop());
    });
  }

  stopAnimPreview() {
    this.clearAnimTimers();
    this.freezeParada();
    this.freezeAndando();
    this.relayoutDebugRow(this.andando, this.debugAndandoFootY);
    if (this.erguida?.mode === 'filament') {
      this.erguida.holdRaisedPose?.();
      this.relayoutDebugRow(this.erguida, this.debugErguidaFootY);
    }
  }

  shutdown() {
    this.clearAnimTimers();
    this.scale.off('resize', this.onResize, this);
  }
}
