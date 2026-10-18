// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
/**
 * The melody is read off the sculpture's silhouette. Each step looks along one direction in a horizontal
 * plane, swept across the half that faces the camera, and marches inward from the block edge to the
 * first point inside the surface: a bulge (large radius) sings high, a dent low, and a direction that
 * finds nothing rests. Plane heights give the voices (middle, top, bottom). Spin turns what the sweep
 * sees; morph changes the field exactly as the shaders do.
 */

export const RING_Y = [0, 0.42, -0.42];
/** Samples per inward march; strands are thin, so they get a finer march. */
const MARCH = 18,
  MARCH_FINE = 40;
export const VOICE_OCTAVE = [1, 2, 0];

/** Cosine-palette luminance of the colour formula at a point (0..1), as the shader colours it. */
export function colourFn(E, g) {
  const U = E.uniforms(g),
    C = E.js(g.c);
  const bs = U[5],
    cmean = U[28],
    cns = U[29],
    cshift = U[15],
    cmix = U[19],
    cspread = U[23];
  const a = [U[8], U[9], U[10]],
    b = [U[12], U[13], U[14]],
    c = [U[16], U[17], U[18]],
    d = [U[20], U[21], U[22]];
  return (x, y, z, m) => {
    const cv = cns > 0 ? Math.min(1.5, Math.max(-1.5, (C(x, y, z, m) - cmean) * cns)) : 0;
    const depth = (0.6 * Math.hypot(x, y, z)) / bs;
    const t = cshift + cspread * (depth + (cv + 0.5 - depth) * cmix);
    let lum = 0;
    const w = [0.2126, 0.7152, 0.0722];
    for (let i = 0; i < 3; i++) {
      const ch = a[i] + b[i] * Math.cos(2 * Math.PI * (c[i] * t + d[i]));
      lum += w[i] * Math.min(1, Math.max(0, ch));
    }
    return lum;
  };
}

/**
 * @returns {(step: number, yaw: number, m: number) => Array<{voice: number, on: boolean, deg: number,
 *   midi: number, vel: number, bright: number}>}
 */
export function makeScanner(E, g, score) {
  const field = E.fieldFn(g),
    lum = colourFn(E, g);
  const bs = E.uniforms(g)[5],
    L = score.scale.length,
    S = score.steps,
    N = score.strands ? MARCH_FINE : MARCH;
  // Strands: let sound start near a filament so they are sparse, not silent.
  const threshold = score.strands ? -score.marginRef * 2 : 0;
  return (step, yaw, m = 0) => {
    let k = ((step % S) + S) % S;
    if (score.palindrome && k >= S / 2) k = S - 1 - k;
    // The camera sits at (sin yaw, ., cos yaw); sweep the facing half from one side to the other.
    const theta = yaw + (k / (S - 1) - 0.5) * Math.PI;
    const sx = Math.sin(theta),
      sz = Math.cos(theta);
    const out = [];
    for (let v = 0; v < score.voices; v++) {
      const y = RING_Y[v] * bs;
      let hitR = 0,
        margin = -Infinity;
      for (let j = 0; j < N; j++) {
        const rad = bs * (1 - j / N);
        const mg = field(rad * sx, y, rad * sz, m);
        if (mg > threshold) {
          hitR = rad;
          margin = mg;
          break;
        }
      }
      const on = hitR > 0;
      const reach = Math.min(0.999, hitR / bs); // silhouette radius, 0..1 of the block
      const deg = Math.floor(reach * L * 2);
      const midi =
        score.root + 12 * VOICE_OCTAVE[v] + score.scale[deg % L] + 12 * Math.floor(deg / L);
      const solid = on ? Math.min(1, Math.max(0, margin / score.marginRef)) : 0;
      out.push({
        voice: v,
        on,
        deg,
        midi,
        vel: 0.4 + 0.6 * solid,
        bright: on ? lum(hitR * sx, y, hitR * sz, m) : 0,
      });
    }
    return out;
  };
}
