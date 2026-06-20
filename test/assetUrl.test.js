import { describe, expect, it, vi } from 'vitest';
import { resolvePublicAssetUrl } from '../src/utils/assetUrl.js';

describe('resolvePublicAssetUrl', () => {
  it('mantém URLs absolutas', () => {
    expect(resolvePublicAssetUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(resolvePublicAssetUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('resolve caminho relativo com a base do Vite', () => {
    vi.stubGlobal('import.meta', { env: { BASE_URL: '/repo/' } });
    const url = resolvePublicAssetUrl('assets/sounds/sfx/pop.mp3');
    expect(url).toContain('assets/sounds/sfx/pop.mp3');
  });

  it('remove barra inicial do path', () => {
    const url = resolvePublicAssetUrl('/assets/icon.png');
    expect(url).toContain('assets/icon.png');
    expect(url).not.toContain('//assets');
  });
});
