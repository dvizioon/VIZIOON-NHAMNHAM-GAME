import Phaser from 'phaser';
import { SceneKeys } from '../config/constants.js';
import { Theme } from '../config/theme.js';
import { showErrorAlert } from '../ui/createUI.js';
import { drawSkyBackground, getGrassTopY } from '../ui/createUI.js';
import { playSound } from '../systems/ProceduralAudio.js';
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
import {
  UI_LOGO_LOGIN_KEY,
  UI_CABECA_LARGATA_KEY,
  preloadLoginUiIcons,
  createLoginAvatar,
  createLoginUsernameField,
  createLoginInfoBox,
  createGuestPlayLink,
  computeLoginLayout,
  createLoginNavButtons,
} from '../ui/loginUi.js';
import {
  bootstrapGuestSession,
  loginPlayerSession,
} from '../services/playerSession.js';

const LOGIN_FROG_DEPTH = 12;

/** Tela Login — conectar conta ou ir para cadastro */
export class LoginScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.LOGIN);
  }

  init() {
    this.loginFrog = null;
    this.frogLoopTimer = null;
    this.frogFromRight = Phaser.Math.Between(0, 1) === 0;
  }

  async create() {
    const { width } = this.scale;
    const s = uiScale(this);
    drawSkyBackground(this);
    await preloadLoginUiIcons(this);
    this.spawnPassingFrog();

    const sidePad = Math.max(8, width * 0.02);
    let logoW = width - sidePad * 2;
    let logoH = logoW * 0.22;

    if (hasTexture(this, UI_LOGO_LOGIN_KEY)) {
      const tex = this.textures.get(UI_LOGO_LOGIN_KEY).getSourceImage();
      const aspect = tex.height / tex.width;
      logoH = logoW * aspect;
      const maxLogoH = this.scale.height * 0.13;
      if (logoH > maxLogoH) {
        logoH = maxLogoH;
        logoW = logoH / aspect;
      }
    }

    const layout = computeLoginLayout(this, logoH, getGrassTopY(this));

    if (hasTexture(this, UI_LOGO_LOGIN_KEY)) {
      this.add.image(width / 2, layout.logoY, UI_LOGO_LOGIN_KEY)
        .setDepth(15)
        .setOrigin(0.5)
        .setDisplaySize(logoW, logoH);
    } else {
      this.add.text(width / 2, layout.logoY, 'Login', {
        fontFamily: Theme.fontFamily,
        fontSize: `${Math.round(44 * s)}px`,
        color: '#4E9A2E',
        fontStyle: 'bold',
        stroke: '#ffffff',
        strokeThickness: 6,
      }).setOrigin(0.5).setDepth(15);
    }

    if (hasTexture(this, UI_CABECA_LARGATA_KEY)) {
      createLoginAvatar(this, width / 2, layout.avatarY, layout.avatarSize).setDepth(16);
    }

    const goCharacter = () => this.scene.start(SceneKeys.CHARACTER);

    const connect = async () => {
      const username = usernameField.getValue();
      if (username.length < 2) return;
      playSound(this, 'clique');
      const ok = await loginPlayerSession(this, username);
      if (ok) {
        goCharacter();
        return;
      }
      await showErrorAlert(this, 'Usuário não encontrado.\nCrie uma conta com o botão (+).');
    };

    const usernameField = createLoginUsernameField(this, width / 2, layout.fieldY, layout.contentW, {
      onSubmit: () => connect(),
    });

    createLoginInfoBox(this, width / 2, layout.infoY, layout.contentW);

    createGuestPlayLink(this, width / 2, layout.guestY, {
      onClick: async () => {
        playSound(this, 'clique');
        await bootstrapGuestSession(this);
        goCharacter();
      },
    });

    createLoginNavButtons(this, width, layout.btnY, layout.btnMetrics, {
      onHome: () => this.scene.start(SceneKeys.SPLASH),
      onRegister: () => this.scene.start(SceneKeys.REGISTER),
    });

    this.input.keyboard.on('keydown-ENTER', () => connect());
  }

  spawnPassingFrog() {
    if (!SPLASH_FROG_ENABLED || !this.textures.exists(FROG_JUMP_KEY)) return;

    this.loginFrog = new SplashFrogChase(this, {
      groundY: getSplashFrogGroundY(this),
      depth: LOGIN_FROG_DEPTH,
      getMatchScale: () => getSplashFrogSceneScale(),
      getJumpArc: () => getSplashFrogSceneJumpArc(),
      onTurnComplete: () => this.scheduleNextFrogPass(),
    });

    this.time.delayedCall(900, () => {
      if (this.loginFrog?.frog?.active) {
        this.loginFrog.startTurn({ exitToRight: this.frogFromRight });
      }
    });
  }

  scheduleNextFrogPass() {
    this.frogLoopTimer?.remove();
    this.frogLoopTimer = this.time.delayedCall(Phaser.Math.Between(2400, 4200), () => {
      if (!this.loginFrog?.frog?.active) return;
      this.frogFromRight = !this.frogFromRight;
      this.loginFrog.startTurn({ exitToRight: this.frogFromRight });
    });
  }

  shutdown() {
    this.frogLoopTimer?.remove();
    this.loginFrog?.destroy();
    this.loginFrog = null;
  }
}
