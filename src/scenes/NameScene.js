import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import { drawSkyBackground, getGrassTopY } from '../ui/createUI.js';
import { playSound } from '../systems/ProceduralAudio.js';
import { GameState } from '../utils/GameState.js';
import { uiScale } from '../utils/responsive.js';
import { hasTexture } from '../systems/AssetLoader.js';
import { SplashFrogChase } from '../systems/SplashFrogChase.js';
import {
  FROG_JUMP_KEY,
  SPLASH_FROG_ENABLED,
  getSplashFrogGroundY,
  getSplashFrogSceneScale,
  getSplashFrogSceneJumpArc,
} from '../config/introFrogConfig.js';
import { UI_LOGO_CADASTRAR_KEY } from '../ui/loginUi.js';
import {
  UI_LOGO_JOGADOR_KEY,
  UI_SAPO_KEY,
  PLAYER_AGE_DEFAULT,
  preloadPlayerNameIcons,
  createRegisterAvatar,
  createPlayerNameField,
  createAgeSlider,
  createPlayerNavButtons,
  computePlayerNameLayout,
} from '../ui/playerNameUi.js';
import { bootstrapPlayerSession } from '../services/playerSession.js';
import { isValidPlayerUsername } from '../utils/username.js';
import { beginSceneRun, isStaleRun, gotoScene } from '../utils/sceneRun.js';
import { ensureOnlineTermsAccepted } from '../ui/termsAcceptModal.js';

const REGISTER_FROG_DEPTH = 12;

/** Tela Cadastro — nome e idade antes de escolher personagem */
export class RegisterScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.REGISTER);
  }

  init() {
    this.nameFrog = null;
    this.frogLoopTimer = null;
    this.frogFromRight = Phaser.Math.Between(0, 1) === 0;
  }

  async create() {
    const run = beginSceneRun(this);
    const { width, height } = this.scale;
    const s = uiScale(this);
    drawSkyBackground(this);
    await preloadPlayerNameIcons(this);
    if (isStaleRun(this, run)) return;
    this.spawnPassingFrog();

    const logoKey = hasTexture(this, UI_LOGO_CADASTRAR_KEY)
      ? UI_LOGO_CADASTRAR_KEY
      : UI_LOGO_JOGADOR_KEY;

    const sidePad = Math.max(8, width * 0.02);
    let logoW = width - sidePad * 2;
    let logoH = logoW * 0.22;

    if (hasTexture(this, logoKey)) {
      const tex = this.textures.get(logoKey).getSourceImage();
      const aspect = tex.height / tex.width;
      logoH = logoW * aspect;
      const maxLogoH = height * 0.13;
      if (logoH > maxLogoH) {
        logoH = maxLogoH;
        logoW = logoH / aspect;
      }
    }

    const layout = computePlayerNameLayout(this, logoH, getGrassTopY(this));

    if (hasTexture(this, logoKey)) {
      this.add.image(width / 2, layout.logoY, logoKey)
        .setDepth(15)
        .setOrigin(0.5)
        .setDisplaySize(logoW, logoH);
    } else {
      this.add.text(width / 2, layout.logoY, 'Cadastro', {
        fontFamily: Theme.fontFamily,
        fontSize: `${Math.round(44 * s)}px`,
        color: '#4E9A2E',
        fontStyle: 'bold',
        stroke: '#ffffff',
        strokeThickness: 6,
      }).setOrigin(0.5).setDepth(15);
    }

    if (hasTexture(this, UI_SAPO_KEY)) {
      createRegisterAvatar(this, width / 2, layout.avatarY, layout.avatarSize).setDepth(16);
    }

    const savedAge = GameState.getPlayerAge(this) ?? PLAYER_AGE_DEFAULT;

    const ageSlider = createAgeSlider(this, width / 2, layout.ageY, savedAge, {
      contentW: layout.contentW,
      onChange: (age) => {
        GameState.setPlayerAge(this, age);
      },
    });

    let nameField;
    let nav;

    const submit = async () => {
      const nome = nameField.getValue();
      if (!isValidPlayerUsername(nome)) return;
      playSound(this, 'clique');
      if (!(await ensureOnlineTermsAccepted(this, { mode: 'register' }))) return;
      GameState.setParentName(this, nome);
      GameState.setPlayerAge(this, ageSlider.getValue());
      await bootstrapPlayerSession(this, {
        name: nome,
        age: ageSlider.getValue(),
      });
      if (isStaleRun(this, run)) return;
      gotoScene(this, SceneKeys.CHARACTER);
    };

    nameField = createPlayerNameField(this, width / 2, layout.fieldY, layout.contentW, {
      onChange: (value) => {
        nav?.setSubmitEnabled(isValidPlayerUsername(value));
      },
    });

    nav = createPlayerNavButtons(this, width, layout.btnY, layout.btnMetrics, {
      onHome: () => gotoScene(this, SceneKeys.LOGIN),
      onSubmit: submit,
      canSubmit: () => isValidPlayerUsername(nameField.getValue()),
    });

    nav.setSubmitEnabled(isValidPlayerUsername(nameField.getValue()));

    ageSlider.root.on('pointerdown', () => nameField.blur());

    this.input.keyboard.on('keydown-ENTER', () => {
      if (isValidPlayerUsername(nameField.getValue())) submit();
    });
  }

  spawnPassingFrog() {
    if (!SPLASH_FROG_ENABLED || !this.textures.exists(FROG_JUMP_KEY)) return;

    this.nameFrog = new SplashFrogChase(this, {
      groundY: getSplashFrogGroundY(this),
      depth: REGISTER_FROG_DEPTH,
      getMatchScale: () => getSplashFrogSceneScale(),
      getJumpArc: () => getSplashFrogSceneJumpArc(),
      onTurnComplete: () => this.scheduleNextFrogPass(),
    });

    this.time.delayedCall(900, () => {
      if (this.nameFrog?.frog?.active) {
        this.nameFrog.startTurn({ exitToRight: this.frogFromRight });
      }
    });
  }

  scheduleNextFrogPass() {
    this.frogLoopTimer?.remove();
    this.frogLoopTimer = this.time.delayedCall(Phaser.Math.Between(2400, 4200), () => {
      if (!this.nameFrog?.frog?.active) return;
      this.frogFromRight = !this.frogFromRight;
      this.nameFrog.startTurn({ exitToRight: this.frogFromRight });
    });
  }

  shutdown() {
    this.frogLoopTimer?.remove();
    this.nameFrog?.destroy();
    this.nameFrog = null;
  }
}

/** @deprecated use RegisterScene */
export const NameScene = RegisterScene;
