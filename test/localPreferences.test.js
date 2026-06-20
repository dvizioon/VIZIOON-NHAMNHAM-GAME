import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/config/constants.js';
import {
  loadLocalSettings,
  saveLocalSettings,
  loadDismissedReleaseVersion,
  saveDismissedReleaseVersion,
} from '../src/utils/localPreferences.js';

describe('localPreferences — settings', () => {
  it('salva e carrega preferências locais', () => {
    saveLocalSettings({
      volumeMusica: 0.25,
      volumeEfeitos: 0.8,
      muted: true,
      modo: 'setas',
    });

    const loaded = loadLocalSettings();
    expect(loaded).toEqual({
      ...defaultSettings,
      volumeMusica: 0.25,
      volumeEfeitos: 0.8,
      muted: true,
      modo: 'setas',
    });
  });

  it('normaliza modo inválido para toque', () => {
    saveLocalSettings({ ...defaultSettings, modo: 'invalido' });
    expect(loadLocalSettings()?.modo).toBe('toque');
  });

  it('retorna null quando não há dados', () => {
    expect(loadLocalSettings()).toBeNull();
  });
});

describe('localPreferences — release prompt', () => {
  it('persiste versão dispensada na splash', () => {
    saveDismissedReleaseVersion('1.2.3');
    expect(loadDismissedReleaseVersion()).toBe('1.2.3');
  });
});
