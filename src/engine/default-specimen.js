// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
import { cloneG, decode } from './genome.js';

/** nsb3 genome for the maintainer showcase specimen (see docs/fixtures/default-specimen-39E1.glsl). */
export const DEFAULT_SPECIMEN_CODE =
  'nsb3.eyJmIjoic29mdCh0d2lzdCgxLjQsIGFkZChhYnMoeCksIHN1Yih6b29tKDIuNDAzLCBzbWluKDAuNDE2LCByb3R5KDIuNDI2LCBmYm0oMS41NTUsIDIsIDU2OCkpLCBmYm0oMS42MSwgMywgMzU1KSkpLCBub2lzZSgwLjk5MiwgNCkpKSkpIiwiYyI6Im11bCgtMC40NTksIHopIiwidiI6IjUwNWM1YTAwMGQ1NjAwMGVkZGE3MmFiMmY5OGUyNTJlZWZiYWI3NGU5ZWQ1MTA5MjAyNzU0M2UxMjliYjZjY2MwMzViOTFlMjQwMCJ9';

/**
 * Short tag from {@link DEFAULT_SPECIMEN_CODE} via `tag()` (FNV-1a of the full `nsb3` string).
 * The maintainer shader export is labelled **39E1** in its filename/comment; that label is not `tag()`.
 */
export const DEFAULT_SPECIMEN_TAG = '74C8';

/** Four-digit label on the maintainer GLSL export (`docs/fixtures/default-specimen-39E1.glsl`). */
export const DEFAULT_SPECIMEN_EXPORT_LABEL = '39E1';

export const DEFAULT_SPECIMEN_SHAPE =
  'soft(twist(1.4, add(abs(x), sub(zoom(2.403, smin(0.416, roty(2.426, fbm(1.555, 2, 568)), fbm(1.61, 3, 355))), noise(0.992, 4)))))';

export const DEFAULT_SPECIMEN_COLOUR = 'mul(-0.459, z)';

/** Shader `P[]` rows from the maintainer export (analysis row 6–7 may differ slightly in GRAD). */
export const DEFAULT_SPECIMEN_P = [
  [-0.0931, 0.1281, 0, 7],
  [0, 1.0823, 0.653, 0.3578],
  [0.5674, 0.6899, 0.6537, 0.7396],
  [0.2233, 0.5433, 0.4364, 0.6083],
  [1.5793, 1.4655, 0.3499, 0.4249],
  [0.0095, 0.3289, 0.8796, 1.1011],
  [0.1341, 0.8911, 23.9178, 0],
  [0.0198, 2.278, 0, 0],
];

/** Initial orbit when no saved session (matches shader export comment). */
export const DEFAULT_CAMERA = { yaw: 4.4434, pitch: 0.3615, dist: 3.55 };

export function defaultSpecimenGenome() {
  const g = decode(DEFAULT_SPECIMEN_CODE);
  if (!g) throw new Error('DEFAULT_SPECIMEN_CODE is invalid');
  return cloneG(g);
}
