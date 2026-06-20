import { defineConfig } from 'vite';
import { resolve } from 'path';
import Icons from 'unplugin-icons/vite';

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
});
