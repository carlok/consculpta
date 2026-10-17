// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist/site',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: 'src/index.html',
      },
    },
  },
});
