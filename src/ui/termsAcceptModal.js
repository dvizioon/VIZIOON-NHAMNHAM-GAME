import Phaser from 'phaser';
import { Theme } from '../config/theme.js';
import { uiScale } from '../utils/responsive.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { hasAcceptedOnlineTerms, saveOnlineTermsAccepted } from '../utils/localPreferences.js';

const MODAL_DEPTH = 230;
const TITLE_COLOR = '#ffffff';
const BODY_COLOR = '#3B3024';
const MUTED_COLOR = '#6B4226';
const CHECK_GREEN = Theme.modoVerde;
const CHECK_BORDER = Theme.folhaEscura;

/** Texto único — LGPD, vale para online, offline e visitante */
const TERMS_TEXT = `Este jogo usa alguns dados para funcionar — online, offline ou como visitante.

• Apelido, personagem e progresso da partida.
• Preferências de som, imagens e modo de jogar neste aparelho.
• Sons, músicas e efeitos durante o jogo.

Se você conectar ou entrar como visitante online, parte desses dados pode ir aos nossos servidores (ranking e sincronização).

Offline, tudo fica salvo só neste aparelho.

Tratamos seus dados conforme a LGPD (Lei Geral de Proteção de Dados), usando apenas o necessário. Você pode sair da sessão quando quiser, direto no jogo.`;

const MODE_SUBTITLE = {
  login: 'Conta conectada',
  guest: 'Visitante online',
  register: 'Nova conta',
  offline: 'Modo offline',
};

let activeModal = null;

function createTermsButton(parent, localX, localY, label, {
  width,
  fontSize,
  fill,
  dark,
  textColor,
  enabled = true,
  onClick,
}) {
  const container = parent.scene.add.container(localX, localY);
  parent.add(container);
  const btnH = 52;
  const radius = btnH / 2;
  let isEnabled = enabled;

  const bg = parent.scene.add.graphics();
  const draw = (pressed = false) => {
    bg.clear();
    const alpha = isEnabled ? 1 : 0.45;
    const offset = pressed && isEnabled ? 4 : 0;
    bg.fillStyle(dark, alpha);
    bg.fillRoundedRect(-width / 2, -radius + offset, width, btnH, radius);
    bg.fillStyle(fill, alpha);
    bg.fillRoundedRect(-width / 2, -radius, width, btnH - offset, radius);
  };
  draw();

  const text = parent.scene.add.text(0, -2, label, {
    fontFamily: Theme.fontFamily,
    fontSize: `${fontSize}px`,
    color: textColor,
    fontStyle: 'bold',
  }).setOrigin(0.5);

  container.add([bg, text]);
  container.setSize(width, btnH);

  const bind = () => {
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => draw(true));
    container.on('pointerup', () => {
      draw(false);
      if (isEnabled) onClick?.();
    });
    container.on('pointerout', () => draw(false));
  };

  if (isEnabled) bind();

  return {
    container,
    setEnabled(next) {
      isEnabled = next;
      draw(false);
      container.removeInteractive();
      container.removeAllListeners();
      if (isEnabled) bind();
    },
  };
}

function colorToCss(color) {
  if (typeof color === 'string') return color;
  return `#${color.toString(16).padStart(6, '0')}`;
}

function createDomTermsCheckbox(scene, {
  panelOriginX,
  panelOriginY,
  x,
  y,
  rowW,
  rowH,
  checkSize,
  checkGap,
  labelText,
  bodySize,
  onChange,
  onCleanup,
}) {
  const wrap = document.createElement('label');
  wrap.setAttribute('data-terms-check', '1');

  const input = document.createElement('input');
  input.type = 'checkbox';

  const box = document.createElement('span');
  box.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.textContent = labelText;

  wrap.append(input, box, text);
  document.body.appendChild(wrap);

  const paintBox = () => {
    box.textContent = input.checked ? '✓' : '';
    box.style.background = input.checked ? colorToCss(CHECK_GREEN) : '#FBF7E8';
  };

  const syncBounds = () => {
    const worldX = panelOriginX + x;
    const worldY = panelOriginY + y - rowH / 2;
    const rect = canvasToDomRect(scene, worldX, worldY, rowW, rowH);
    const sy = rect.scaleY;
    const domBody = Math.max(14, Math.round(bodySize * sy));
    const domCheck = Math.max(28, Math.round(checkSize * sy));
    const domGap = Math.round(checkGap * sy);

    wrap.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      z-index: 10002;
      pointer-events: auto;
      touch-action: manipulation;
      display: flex;
      align-items: center;
      gap: ${domGap}px;
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      font-family: ${Theme.fontFamily}, 'Comic Sans MS', sans-serif;
    `;

    input.style.cssText = `
      position: absolute;
      opacity: 0;
      width: ${domCheck}px;
      height: ${domCheck}px;
      margin: 0;
      cursor: pointer;
      flex-shrink: 0;
    `;

    box.style.cssText = `
      width: ${domCheck}px;
      height: ${domCheck}px;
      flex-shrink: 0;
      box-sizing: border-box;
      border: 3px solid ${colorToCss(CHECK_BORDER)};
      border-radius: ${Math.max(5, Math.round(domCheck * 0.18))}px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: ${Math.max(16, Math.round(domCheck * 0.72))}px;
      font-weight: 700;
      line-height: 1;
      pointer-events: none;
    `;

    text.style.cssText = `
      flex: 1;
      min-width: 0;
      color: ${BODY_COLOR};
      font-size: ${domBody}px;
      font-weight: 700;
      line-height: 1.35;
    `;

    paintBox();
  };

  let inputReady = false;
  scene.time.delayedCall(120, () => {
    inputReady = true;
  });

  const onInput = (event) => {
    if (!inputReady || !event.isTrusted) return;
    paintBox();
    playSound(scene, 'clique');
    onChange?.(input.checked);
  };

  input.addEventListener('change', onInput);
  syncBounds();
  scene.scale.on('resize', syncBounds);

  onCleanup?.(() => {
    input.removeEventListener('change', onInput);
    scene.scale.off('resize', syncBounds);
    wrap.remove();
  });

  return {
    syncBounds,
    isChecked: () => input.checked,
    setChecked: (value) => {
      input.checked = Boolean(value);
      paintBox();
      onChange?.(input.checked);
    },
  };
}

function canvasToDomRect(scene, worldX, worldY, worldW, worldH) {
  const canvas = scene.game.canvas;
  const canvasRect = canvas.getBoundingClientRect();
  const sx = canvasRect.width / scene.scale.width;
  const sy = canvasRect.height / scene.scale.height;
  return {
    left: canvasRect.left + worldX * sx,
    top: canvasRect.top + worldY * sy,
    width: worldW * sx,
    height: worldH * sy,
    scaleY: sy,
  };
}

function createScrollableTermsView(panel, scene, {
  x,
  y,
  width,
  height,
  text,
  fontSize,
  padding,
  panelOriginX,
  panelOriginY,
  onCleanup,
}) {
  const scrollArea = scene.add.container(x, y);
  panel.add(scrollArea);

  const bg = scene.add.graphics();
  bg.fillStyle(0xFBF7E8, 1);
  bg.fillRoundedRect(0, 0, width, height, 10);
  bg.lineStyle(2, Theme.folhaEscura, 0.4);
  bg.strokeRoundedRect(0, 0, width, height, 10);
  scrollArea.add(bg);

  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-terms-scroll', '1');
  const scrollDiv = document.createElement('div');
  const hintEl = document.createElement('div');
  hintEl.textContent = '↕ arraste para ler';
  wrapper.append(scrollDiv, hintEl);
  document.body.appendChild(wrapper);

  const syncBounds = () => {
    const worldX = panelOriginX + x;
    const worldY = panelOriginY + y;
    const rect = canvasToDomRect(scene, worldX, worldY, width, height);
    const domFont = Math.max(11, Math.round(fontSize * rect.scaleY));
    const pad = Math.round(padding * rect.scaleY);
    const hintFont = Math.max(10, Math.round(fontSize * 0.82 * rect.scaleY));
    wrapper.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      box-sizing: border-box;
      margin: 0;
      border: none;
      border-radius: 10px;
      background: transparent;
      z-index: 10001;
      pointer-events: none;
      touch-action: pan-y;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;
    scrollDiv.style.cssText = `
      flex: 1 1 auto;
      min-height: 0;
      box-sizing: border-box;
      padding: ${Math.round(pad * 1.35)}px ${pad}px ${Math.round(pad * 0.75)}px;
      margin: 0;
      border: none;
      background: transparent;
      color: ${BODY_COLOR};
      font-family: ${Theme.fontFamily}, 'Comic Sans MS', sans-serif;
      font-size: ${domFont}px;
      line-height: 1.45;
      overflow-x: hidden;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      pointer-events: auto;
      touch-action: pan-y;
      white-space: pre-wrap;
      word-wrap: break-word;
      scrollbar-width: thin;
    `;
    scrollDiv.textContent = text;
    hintEl.style.cssText = `
      flex: 0 0 auto;
      text-align: center;
      font-family: ${Theme.fontFamily}, 'Comic Sans MS', sans-serif;
      font-size: ${hintFont}px;
      font-weight: 700;
      color: ${MUTED_COLOR};
      padding: 0 0 6px;
      display: none;
    `;
    requestAnimationFrame(() => {
      const needsScroll = scrollDiv.scrollHeight > scrollDiv.clientHeight + 2;
      hintEl.style.display = needsScroll ? 'block' : 'none';
    });
  };

  syncBounds();
  scene.scale.on('resize', syncBounds);

  onCleanup?.(() => {
    scene.scale.off('resize', syncBounds);
    wrapper.remove();
  });

  return { view: scrollArea, contentH: height, syncBounds };
}

function drawWindowChrome(gfx, panelW, panelH, titleBarH) {
  const x = -panelW / 2;
  const y = -panelH / 2;
  const bodyTop = y + titleBarH;

  gfx.fillStyle(Theme.folhaEscura, 1);
  gfx.fillRoundedRect(x - 3, y - 3, panelW + 6, panelH + 6, 14);
  gfx.fillStyle(Theme.papel, 1);
  gfx.fillRoundedRect(x, y, panelW, panelH, 12);
  gfx.fillStyle(Theme.botaoVerde, 1);
  gfx.fillRect(x, y, panelW, titleBarH);
  gfx.lineStyle(3, Theme.folhaEscura, 1);
  gfx.lineBetween(x, bodyTop, x + panelW, bodyTop);
  gfx.lineStyle(4, Theme.folhaEscura, 1);
  gfx.strokeRoundedRect(x, y, panelW, panelH, 12);
}

/** Modal estilo janela — aceite LGPD (online, offline e visitante) */
export function openTermsAcceptModal(scene, { mode = 'login', onAccept, onCancel } = {}) {
  activeModal?.close?.(false);
  activeModal = null;

  const { width, height } = scene.scale;
  const s = uiScale(scene);
  const panelW = Math.min(Math.round(width * 0.92), 420);
  const titleBarH = Math.max(44, Math.round(50 * s));
  const bodyPad = Math.max(14, Math.round(16 * s));
  const bodySize = Math.max(14, Math.round(16 * s));
  const clauseSize = Math.max(13, Math.round(15 * s));
  const titleSize = Math.max(18, Math.round(22 * s));
  const subtitleSize = Math.max(14, Math.round(16 * s));
  const innerW = panelW - bodyPad * 2 - 24;
  const checkRowH = Math.max(32, Math.round(36 * s));
  const btnGap = Math.max(10, Math.round(12 * s));
  const btnH = 52;
  const bottomPad = Math.max(18, Math.round(22 * s));

  const panelH = Math.min(Math.round(height * 0.86), Math.round(height * 0.86));
  const bodyTop = -panelH / 2 + titleBarH;
  const innerTop = bodyTop + bodyPad + 8;
  const scrollCheckGap = Math.max(22, Math.round(26 * s));
  const footerReserve = scrollCheckGap + checkRowH + 12 + btnH * 2 + btnGap + bottomPad;

  let closed = false;
  const cleanupFns = [];

  const cx = width / 2;
  const cy = height * 0.5;
  const root = scene.add.container(0, 0).setDepth(MODAL_DEPTH);

  const overlay = scene.add.rectangle(cx, height / 2, width, height, 0x061018, 0.78);
  overlay.setInteractive();

  const panel = scene.add.container(cx, cy);
  const chrome = scene.add.graphics();
  drawWindowChrome(chrome, panelW, panelH, titleBarH);
  panel.add(chrome);

  const titleBarText = scene.add.text(0, -panelH / 2 + titleBarH / 2, 'Combinado!', {
    fontFamily: Theme.fontFamily,
    fontSize: `${titleSize}px`,
    color: TITLE_COLOR,
    fontStyle: 'bold',
  }).setOrigin(0.5);
  panel.add(titleBarText);

  let y = innerTop;

  const subtitle = scene.add.text(0, y, MODE_SUBTITLE[mode] ?? MODE_SUBTITLE.login, {
    fontFamily: Theme.fontFamily,
    fontSize: `${subtitleSize}px`,
    color: Theme.folhaEscura,
    align: 'center',
    fontStyle: 'bold',
  }).setOrigin(0.5, 0);
  panel.add(subtitle);
  y += subtitle.height + 6;

  const intro = scene.add.text(0, y, 'Leia e aceite para continuar:', {
    fontFamily: Theme.fontFamily,
    fontSize: `${bodySize}px`,
    color: MUTED_COLOR,
    align: 'center',
  }).setOrigin(0.5, 0);
  panel.add(intro);
  y += intro.height + 10;

  const scrollTopY = y;
  const scrollBottomY = panelH / 2 - footerReserve;
  const innerH = Math.max(120, scrollBottomY - scrollTopY);

  const termsScroll = createScrollableTermsView(panel, scene, {
    x: -innerW / 2,
    y: scrollTopY,
    width: innerW,
    height: innerH,
    text: TERMS_TEXT,
    fontSize: clauseSize,
    padding: 12,
    panelOriginX: cx,
    panelOriginY: cy,
    onCleanup: (fn) => cleanupFns.push(fn),
  });

  y = scrollTopY + innerH + scrollCheckGap;

  const checkSize = Math.max(28, Math.round(32 * s));
  const checkGap = Math.round(10 * s);
  const rowLeft = -panelW / 2 + bodyPad;
  const rowW = panelW - bodyPad * 2;
  const rowY = y + checkRowH / 2;

  const acceptBtnRef = { ctrl: null };

  const termsCheck = createDomTermsCheckbox(scene, {
    panelOriginX: cx,
    panelOriginY: cy,
    x: rowLeft,
    y: rowY,
    rowW,
    rowH: checkRowH,
    checkSize,
    checkGap,
    labelText: 'Li e aceito o combinado',
    bodySize,
    onChange: (checked) => {
      acceptBtnRef.ctrl?.setEnabled(checked);
    },
    onCleanup: (fn) => cleanupFns.push(fn),
  });

  y += checkRowH + 12;

  const btnW = Math.min(panelW - bodyPad * 2, 300);
  const btnFont = Math.max(16, Math.round(18 * s));
  const acceptY = y + btnH / 2;
  const cancelY = acceptY + btnH + btnGap;

  acceptBtnRef.ctrl = createTermsButton(panel, 0, acceptY, 'Aceitar e continuar', {
    width: btnW,
    fontSize: btnFont,
    fill: Theme.botaoVerde,
    dark: Theme.folhaEscura,
    textColor: '#ffffff',
    enabled: false,
    onClick: () => close(true, true),
  });

  createTermsButton(panel, 0, cancelY, 'Voltar', {
    width: btnW,
    fontSize: btnFont,
    fill: 0xFBF7E8,
    dark: Theme.folhaEscura,
    textColor: MUTED_COLOR,
    onClick: () => close(true, false),
  });

  root.add([overlay, panel]);
  termsScroll.syncBounds();
  termsCheck.syncBounds();
  scene.time.delayedCall(50, () => {
    termsScroll.syncBounds();
    termsCheck.syncBounds();
  });

  function close(playClick, accepted) {
    if (closed) return;
    closed = true;
    cleanupFns.forEach((fn) => fn());
    if (activeModal?.close === close) activeModal = null;
    if (playClick) playSound(scene, 'clique');
    root.destroy();
    if (accepted) {
      saveOnlineTermsAccepted();
      onAccept?.();
    } else {
      onCancel?.();
    }
  }

  const handle = { close: (playClick = false) => close(playClick, false) };
  activeModal = handle;
  scene.events.once('shutdown', () => {
    if (activeModal === handle) activeModal = null;
    close(false, false);
  });

  return handle;
}

/** Retorna true se já aceitou ou aceitou agora no modal */
export function ensureOnlineTermsAccepted(scene, { mode = 'login' } = {}) {
  if (hasAcceptedOnlineTerms()) return Promise.resolve(true);

  return new Promise((resolve) => {
    if (!scene.sys?.isActive?.()) {
      resolve(false);
      return;
    }
    // Abre no frame seguinte — evita o clique que abriu o modal vazar pro checkbox/DOM
    scene.time.delayedCall(80, () => {
      if (!scene.sys?.isActive?.()) {
        resolve(false);
        return;
      }
      openTermsAcceptModal(scene, {
        mode,
        onAccept: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  });
}
