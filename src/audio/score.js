// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
/**
 * Genome -> static musical parameters (a "score"). Pure; recomputed whenever the parent changes.
 * Uses the same normalised uniforms as the shader (ENGINE.uniforms), so what you hear tracks what renders.
 */

export const MODES = {
  lydian: [0, 2, 4, 6, 7, 9, 11],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  majorPenta: [0, 2, 4, 7, 9],
  minorPenta: [0, 3, 5, 7, 10],
};
/** Low palette contrast reads bright, high contrast dark. */
const BRIGHT_TO_DARK = ['lydian', 'ionian', 'mixolydian', 'dorian', 'aeolian'];
const TEXTURES = ['sustain', 'arp', 'pulse'];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/** Walk a formula tree for spatial frequency (noise and warp frequencies times enclosing zooms),
 * symmetry (mirror ops), distortion (warps) and the strongest twist. */
export function treeCues(t) {
  const freqs = [];
  let mirrors = 0,
    warps = 0,
    twist = 0;
  (function walk(n, s) {
    const p = n.p || [];
    let scale = s;
    if (n.op === 'noise' || n.op === 'fbm') freqs.push(p[0] * s);
    else if (n.op === 'warp') {
      warps++;
      freqs.push(p[0] * s);
    } else if (n.op === 'zoom') scale = s * p[0];
    else if (n.op === 'mirx' || n.op === 'miry' || n.op === 'mirz') mirrors++;
    else if (n.op === 'twist') twist = Math.max(twist, Math.abs(p[0]));
    for (const c of n.c || []) walk(c, scale);
  })(t, 1);
  const meanF = freqs.length ? freqs.reduce((a, b) => a + b, 0) / freqs.length : 1;
  return { meanF, mirrors, warps, twist, noiseLeaves: freqs.length };
}

/**
 * @param {any} E the engine (ENGINE global or src/engine/index.js)
 * @param {{t: any, c: any, v: number[]}} g genome
 */
export function scoreFor(E, g) {
  const U = E.uniforms(g);
  const cues = treeCues(g.t);
  const strands = U[30] > 0.5,
    mode = U[2],
    block = U[4];
  const avg = (i) => (U[i] + U[i + 1] + U[i + 2]) / 3;
  const contrast = clamp((avg(12) - 0.15) / 0.4, 0, 1); // palette b (amplitude)
  const hue = (((U[15] + avg(20)) % 1) + 1) % 1; // hue shift + palette phase d
  const pc = Math.floor(hue * 12) % 12;
  const modeName = strands
    ? contrast < 0.5
      ? 'majorPenta'
      : 'minorPenta'
    : BRIGHT_TO_DARK[Math.min(4, Math.floor(contrast * 5))];
  const bs = U[5],
    gloss = U[7];
  return {
    pc,
    root: 40 + pc + Math.round((1.1 - bs) * 8), // a bigger block sits lower
    mode: modeName,
    scale: MODES[modeName],
    steps: 16,
    stepDur: 1 / clamp(1 + cues.meanF * 0.35, 1.2, 3.2), // finer noise -> faster steps
    swing: clamp(cues.twist / 3, 0, 1) * 0.22,
    texture: strands ? 'sparse' : TEXTURES[mode],
    timbre: block === 1 ? 'pluck' : 'pad',
    membrane: block === 2,
    voices: clamp(1 + Math.floor(E.cost(g.t) / 3), 1, 3),
    bands: U[3],
    palindrome: cues.mirrors > 0,
    detune: Math.min(14, cues.warps * 6),
    attack: 0.02 + U[6] * 0.7, // edge fade softens attacks
    cutoff: 700 + gloss * 4300,
    reverb: 0.55 - gloss * 0.3,
    pan: Math.sin(U[11]) * 0.45, // light angle
    marginRef: strands ? U[1] * 1.5 : mode === 0 ? 0.5 : mode === 1 ? U[1] : U[1] * 4,
    strands,
  };
}
