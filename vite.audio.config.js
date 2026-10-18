// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/audio/browser-entry.js',
      name: 'AUDIO',
      formats: ['iife'],
      fileName: () => 'audio.bundle.js',
    },
    outDir: 'legacy',
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});
