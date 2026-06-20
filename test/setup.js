import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('location', {
    href: 'http://localhost:5173/',
    origin: 'http://localhost:5173',
  });
});
