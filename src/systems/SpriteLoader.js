import spritesManifest from '../../public/assets/data/sprites.json';

/** Carrega spritesheets + animações do manifest (Figma exports) */
export function queueSpriteAssets(scene) {
  const loaded = [];

  for (const [charId, cfg] of Object.entries(spritesManifest.characters ?? {})) {
    if (loadCharacterSheets(scene, charId, cfg)) {
      loaded.push(`char_${charId}`);
    }
  }

  for (const layer of spritesManifest.environment?.parallax ?? []) {
    if (loadImageIfExists(scene, layer.key, layer.file)) {
      loaded.push(layer.key);
    }
  }

  const food = spritesManifest.environment?.food ?? {};
  if (food.leaf && loadSpritesheet(scene, 'food_leaf', food.leaf)) {
    loaded.push('food_leaf');
  }
  if (food.fruit?.file && loadImageIfExists(scene, 'food_fruit', food.fruit.file)) {
    loaded.push('food_fruit');
  }

  for (const [id, cfg] of Object.entries(spritesManifest.enemies ?? {})) {
    if (loadSpritesheet(scene, `enemy_${id}`, cfg)) {
      loaded.push(`enemy_${id}`);
    }
  }

  return loaded;
}

function assetUrl(relativePath) {
  return `assets/${relativePath}`;
}

function loadImageIfExists(scene, key, relativePath) {
  if (!relativePath) return false;
  scene.load.image(key, assetUrl(relativePath));
  return true;
}

function loadSpritesheet(scene, key, cfg) {
  if (!cfg?.spritesheet || !cfg.frameWidth || !cfg.frameHeight) return false;
  scene.load.spritesheet(key, assetUrl(cfg.spritesheet), {
    frameWidth: cfg.frameWidth,
    frameHeight: cfg.frameHeight,
  });
  return true;
}

function loadCharacterSheets(scene, charId, cfg) {
  if (cfg?.sheets) {
    let any = false;
    for (const [sheetName, sheetCfg] of Object.entries(cfg.sheets)) {
      if (loadSpritesheet(scene, `char_${charId}_${sheetName}`, sheetCfg)) {
        any = true;
      }
    }
    return any;
  }
  return loadSpritesheet(scene, `char_${charId}`, cfg);
}

/** Registra animações após o preload — chamar no create da primeira cena de jogo */
export function registerSpriteAnimations(scene) {
  for (const [charId, cfg] of Object.entries(spritesManifest.characters ?? {})) {
    registerCharacterAnimations(scene, charId, cfg);
  }

  const leaf = spritesManifest.environment?.food?.leaf;
  if (leaf?.animation && scene.textures.exists('food_leaf')) {
    const a = leaf.animation;
    scene.anims.create({
      key: 'food_leaf_spin',
      frames: scene.anims.generateFrameNumbers('food_leaf', { start: a.start, end: a.end }),
      frameRate: a.frameRate ?? 8,
      repeat: a.repeat ?? -1,
    });
  }

  for (const [id, cfg] of Object.entries(spritesManifest.enemies ?? {})) {
    registerAnims(scene, `enemy_${id}`, cfg.animations);
  }
}

function registerCharacterAnimations(scene, charId, cfg) {
  const baseKey = `char_${charId}`;

  if (cfg?.sheets && cfg?.animations) {
    for (const [animName, def] of Object.entries(cfg.animations)) {
      const sheetName = def.sheet ?? animName;
      const texKey = `${baseKey}_${sheetName}`;
      if (!scene.textures.exists(texKey)) continue;

      const fullKey = `${baseKey}_${animName}`;
      if (scene.anims.exists(fullKey)) continue;

      const frames = Array.isArray(def.frames)
        ? def.frames.map((frame) => ({ key: texKey, frame }))
        : scene.anims.generateFrameNumbers(texKey, { start: def.start, end: def.end });

      scene.anims.create({
        key: fullKey,
        frames,
        frameRate: def.frameRate ?? 8,
        repeat: def.repeat ?? -1,
      });
    }
    return;
  }

  registerAnims(scene, baseKey, cfg.animations);
}

function registerAnims(scene, textureKey, animations) {
  if (!animations || !scene.textures.exists(textureKey)) return;

  for (const [animKey, def] of Object.entries(animations)) {
    const fullKey = `${textureKey}_${animKey}`;
    if (scene.anims.exists(fullKey)) continue;
    scene.anims.create({
      key: fullKey,
      frames: scene.anims.generateFrameNumbers(textureKey, { start: def.start, end: def.end }),
      frameRate: def.frameRate ?? 8,
      repeat: def.repeat ?? -1,
    });
  }
}

export function getCharacterSpriteKey(childId) {
  const id = childId && spritesManifest.characters?.[childId] ? childId : 'default';
  return `char_${id}`;
}

export function getCharacterTextureKeys(childId) {
  const id = childId && spritesManifest.characters?.[childId] ? childId : 'default';
  const base = `char_${id}`;
  const cfg = spritesManifest.characters?.[id] ?? spritesManifest.characters?.default;

  if (cfg?.sheets) {
    return {
      base,
      walk: `${base}_walk`,
      idle: `${base}_idle`,
      rise: `${base}_rise`,
      headWalk: `${base}_headWalk`,
      headRise: `${base}_headRise`,
      defaultTex: `${base}_idle`,
    };
  }

  return { base, walk: base, idle: base, rise: base, defaultTex: base };
}

export function hasCharacterSprite(scene, childId) {
  const keys = getCharacterTextureKeys(childId);
  if (keys.walk !== keys.idle) {
    return scene.textures.exists(keys.idle) || scene.textures.exists(keys.walk);
  }
  return scene.textures.exists(keys.base);
}

export function getParallaxLayers() {
  return spritesManifest.environment?.parallax ?? [];
}

export function getSpritesManifest() {
  return spritesManifest;
}
