import { describe, expect, it } from 'vitest';
import {
  VICTORY_PHOTO_CAPTURE,
  VICTORY_PHOTO_PREVIEW,
} from '../src/config/victoryPhotoConfig.js';

describe('victoryPhotoConfig', () => {
  it('mantém ratios dentro de faixa segura', () => {
    for (const cfg of [VICTORY_PHOTO_PREVIEW, VICTORY_PHOTO_CAPTURE]) {
      expect(Math.abs(cfg.offsetXRatio)).toBeLessThanOrEqual(0.2);
      expect(Math.abs(cfg.offsetYRatio)).toBeLessThanOrEqual(0.2);
    }
  });

  it('escala preview e fill do export são positivos', () => {
    expect(VICTORY_PHOTO_PREVIEW.scale).toBeGreaterThan(0);
    expect(VICTORY_PHOTO_CAPTURE.fillRatio).toBeGreaterThan(0);
    expect(VICTORY_PHOTO_CAPTURE.fillRatio).toBeLessThanOrEqual(1);
  });
});
