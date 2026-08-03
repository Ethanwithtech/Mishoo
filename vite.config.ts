import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Electron loads dist/index.html over file://, so production assets must be
  // relative. build:web can still override this with its explicit subpath.
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'index.html'),
        'extension/popup': resolve(__dirname, 'extension/popup.html'),
        'mishoo-background': resolve(__dirname, 'src/extension/background.ts'),
        'mishoo-content': resolve(__dirname, 'src/extension/content.ts'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
