// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/render/browser-entry.js',
      name: 'RENDER',
      formats: ['iife'],
      fileName: () => 'render.bundle.js',
    },
    outDir: 'legacy',
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});
