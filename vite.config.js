import { defineConfig } from 'vite';
import { resolve } from 'path';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  plugins: [
    Icons({
      compiler: 'raw',
    }),
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
