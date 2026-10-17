// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.js'],
      exclude: ['src/engine/browser-entry.js', 'src/engine/types.js'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      thresholds: {
        lines: 90,
        branches: 85,
      },
    },
  },
});
