// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/engine/browser-entry.js',
      name: 'ENGINE',
      formats: ['iife'],
      fileName: () => 'engine.bundle.js',
    },
    outDir: 'legacy',
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});
