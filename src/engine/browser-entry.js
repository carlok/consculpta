// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
/** IIFE entry: exposes the legacy `ENGINE` global for the static site. */
import * as api from './index.js';

const ENGINE = { ...api, setRandom: api.setRandom, mulberry32: api.mulberry32 };
export default ENGINE;

if (typeof globalThis !== 'undefined') {
  globalThis.ENGINE = ENGINE;
}
