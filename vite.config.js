import { defineConfig } from 'vite';
import { resolve } from 'path';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import Icons from 'unplugin-icons/vite';

function resolveAppVersion() {
  if (process.env.VITE_APP_VERSION) {
    return String(process.env.VITE_APP_VERSION).trim().replace(/^v/i, '');
  }
  try {
    const tag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    return tag.replace(/^v/i, '');
  } catch {
    try {
      const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));
      return pkg.version || '0.0.1';
    } catch {
      return '0.0.1';
    }
  }
}

const appVersion = resolveAppVersion();

function phaserFullReload() {
  return {
    name: 'phaser-full-reload',
    handleHotUpdate({ file, server }) {
      if (!file.replace(/\\/g, '/').includes('/src/')) return;
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  plugins: [
    Icons({
      compiler: 'raw',
    }),
    phaserFullReload(),
  ],
  server: {
    port: process.env.VITE_PORT || 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.{test,spec}.js'],
    setupFiles: ['test/setup.js'],
  },
});
