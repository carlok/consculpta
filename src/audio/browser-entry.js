// SPDX-License-Identifier: Apache-2.0
import { createSonifier, MODES, makeScanner, scoreFor } from './index.js';

/** IIFE entry: exposes the `AUDIO` global for the legacy site. */
const AUDIO = { createSonifier, scoreFor, makeScanner, MODES };

export default AUDIO;

if (typeof globalThis !== 'undefined') {
  /** @type {typeof AUDIO} */
  // @ts-expect-error legacy global for IIFE bundle
  globalThis.AUDIO = AUDIO;
}
