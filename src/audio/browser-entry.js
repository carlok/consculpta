// SPDX-License-Identifier: Apache-2.0
import { createSonifier as base, ensembleFor, MODES, makeScanner, scoreFor } from './index.js';
import { createOrchestra } from './orchestra.js';

/**
 * IIFE entry: exposes the `AUDIO` global for the legacy site. The site injects this bundle on the first
 * Sound click, so Tone.js and the samples cost nothing for visitors who never turn Sound on.
 * @param {{engine: any, baseUrl?: string, audioContext?: AudioContext}} opts audioContext: one created
 *   and resumed inside the click, which Safari requires before Tone starts.
 */
const createSonifier = ({ engine, baseUrl = 'third_party/vcsl/', audioContext }) =>
  base({ engine, createOrchestra: () => createOrchestra({ baseUrl, audioContext }) });

const AUDIO = { createSonifier, scoreFor, makeScanner, ensembleFor, MODES };

export default AUDIO;

if (typeof globalThis !== 'undefined') {
  /** @type {typeof AUDIO} */
  // @ts-expect-error legacy global for IIFE bundle
  globalThis.AUDIO = AUDIO;
}
