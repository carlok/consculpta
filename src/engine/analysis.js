// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
import { TAU } from './constants.js';
import { js } from './evaluate.js';
import { val } from './genome.js';
import { print } from './print.js';
import { clamp, mulberry32 } from './rng.js';
import { cost, depth, size } from './tree.js';

export function sdBlock(x, y, z, bound, s) {
  if (bound === 0) return Math.sqrt(x * x + y * y + z * z) - s;
  if (bound === 1) {
    const qx = Math.abs(x) - s * 0.74,
      qy = Math.abs(y) - s * 0.74,
      qz = Math.abs(z) - s * 0.74;
    const ox = Math.max(qx, 0),
      oy = Math.max(qy, 0),
      oz = Math.max(qz, 0);
    return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - s * 0.08;
  }
  const dx = Math.abs(Math.hypot(x, z)) - s * 0.82,
    dy = Math.abs(y) - s * 0.78;
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - s * 0.04;
}
const SC = [Math.cos(0.9), Math.sin(0.9), Math.cos(1.3), Math.sin(1.3)];
export function strandP(x, y, z) {
  const x1 = SC[0] * x - SC[1] * y,
    y1 = SC[1] * x + SC[0] * y,
    z1 = z;
  return [x1 + 0.37, SC[2] * y1 - SC[3] * z1 - 0.61, SC[3] * y1 + SC[2] * z1 + 0.23];
}
const statCache = new Map();
export function stats(g) {
  const bound = val(g.v, 4),
    bs = val(g.v, 5);
  const key = print(g.t) + '|' + print(g.c) + '|' + bound + '|' + bs.toFixed(3);
  if (statCache.has(key)) return statCache.get(key);
  const Ft = js(g.t),
    Fc = js(g.c);
  const r = mulberry32(1234567);
  const pts = [];
  for (let tries = 0; pts.length < 520 && tries < 6000; tries++) {
    const x = (r() * 2 - 1) * 1.15 * bs,
      y = (r() * 2 - 1) * 1.15 * bs,
      z = (r() * 2 - 1) * 1.15 * bs;
    const b = sdBlock(x, y, z, bound, bs);
    if (b < 0) pts.push([x, y, z, b]);
  }
  const vals = pts.map((p) => Ft(p[0], p[1], p[2]));
  let mean = 0;
  for (const v of vals) mean += v;
  mean /= vals.length;
  let vr = 0;
  for (const v of vals) vr += (v - mean) * (v - mean);
  const sd = Math.sqrt(vr / vals.length);
  const cvals = pts.slice(0, 200).map((p) => Fc(p[0], p[1], p[2]));
  let cm = 0;
  for (const v of cvals) cm += v;
  cm /= cvals.length;
  let cv = 0;
  for (const v of cvals) cv += (v - cm) * (v - cm);
  const csd = Math.sqrt(cv / cvals.length);
  let out;
  if (!(sd > 1e-5) || !Number.isFinite(sd) || !Number.isFinite(mean)) {
    out = { ok: false, why: 'flat' };
  } else {
    const ns = 0.25 / sd;
    const grads = [];
    const h = 0.004;
    for (let i = 0; i < 180; i++) {
      const [x, y, z] = pts[i];
      const gx = Ft(x + h, y, z) - Ft(x - h, y, z),
        gy = Ft(x, y + h, z) - Ft(x, y - h, z),
        gz = Ft(x, y, z + h) - Ft(x, y, z - h);
      grads.push((Math.sqrt(gx * gx + gy * gy + gz * gz) / (2 * h)) * ns);
    }
    grads.sort((a, b) => a - b);
    const q = grads[Math.floor(grads.length * 0.98)] || 0;
    const L = Math.max(0.35, q * 1.45);
    out = {
      ok: L < 45,
      why: L < 45 ? '' : 'too fine',
      mean,
      ns,
      L,
      n: pts.map((p, i) => {
        const q = strandP(p[0], p[1], p[2]);
        return [(vals[i] - mean) * ns, p[3], (Ft(q[0], q[1], q[2]) - mean) * ns];
      }),
      cmean: cm,
      cns: csd > 1e-5 && Number.isFinite(csd) ? 0.5 / csd : 0,
    };
  }
  statCache.set(key, out);
  if (statCache.size > 400) statCache.delete(statCache.keys().next().value);
  return out;
}
export function occupancy(g, st) {
  const iso = val(g.v, 0),
    thk = val(g.v, 1),
    mode = val(g.v, 2),
    bands = val(g.v, 3),
    bs = val(g.v, 5),
    fade = val(g.v, 6);
  const strands = val(g.v, 24) === 1,
    ts = thk * 1.5;
  let inside = 0;
  for (const [n0, b, n2] of st.n) {
    const rr = clamp(1 + b / (0.6 * bs), 0, 1);
    const n = n0 - fade * 0.8 * rr * rr;
    if (strands) {
      if (Math.hypot(n - iso, n2 - iso) < ts) inside++;
    } else if (
      mode === 0
        ? n > iso
        : mode === 1
          ? Math.abs(n - iso) < thk
          : Math.abs(Math.sin((n - iso) * bands * TAU)) < thk * 4
    )
      inside++;
  }
  return inside / st.n.length;
}
export function viable(g) {
  if (size(g.t) > 34 || depth(g.t) > 10 || cost(g.t) > 9) return { ok: false, why: 'too big' };
  if (size(g.c) > 12 || cost(g.c) > 3) return { ok: false, why: 'colour too big' };
  const st = stats(g);
  if (!st.ok) return st;
  const occ = occupancy(g, st),
    mode = val(g.v, 2);
  const ok =
    val(g.v, 24) === 1
      ? occ > 0.006 && occ < 0.4
      : mode === 0
        ? occ > 0.02 && occ < 0.72
        : occ > 0.012 && occ < 0.8;
  return { ok, why: ok ? '' : occ <= 0.02 ? 'empty' : 'solid block', occ };
}
export function fitIso(g) {
  const st = stats(g);
  if (!st.ok) return false;
  if (viable(g).ok) return true;
  if (val(g.v, 24) === 1) {
    let best = null,
      bestErr = 1e9;
    for (let a = 0; a <= 8; a++)
      for (let b = 0; b <= 6; b++) {
        g.v[0] = 0.3 + a * 0.05;
        g.v[1] = 0.1 + b * 0.12;
        const err = Math.abs(occupancy(g, st) - 0.02);
        if (err < bestErr) {
          bestErr = err;
          best = [g.v[0], g.v[1]];
        }
      }
    g.v[0] = best[0];
    g.v[1] = best[1];
    return viable(g).ok;
  }
  const target = val(g.v, 2) === 0 ? 0.16 : 0.1;
  let best = null,
    bestErr = 1e9;
  for (let k = 0; k <= 20; k++) {
    g.v[0] = k / 20;
    const occ = occupancy(g, st),
      err = Math.abs(occ - target);
    if (err < bestErr) {
      bestErr = err;
      best = k / 20;
    }
  }
  g.v[0] = best;
  return viable(g).ok;
}
export function uniforms(g) {
  const st = stats(g);
  const v = (i) => val(g.v, i);
  const fade = v(6),
    bs = v(5);
  const G = (st.ok ? st.L : 2) + (fade * 2.7) / bs;
  return new Float32Array([
    v(0),
    v(1),
    v(2),
    v(3),
    v(4),
    bs,
    fade,
    v(22),
    v(7),
    v(8),
    v(9),
    v(23),
    v(10),
    v(11),
    v(12),
    v(19),
    v(13),
    v(14),
    v(15),
    v(20),
    v(16),
    v(17),
    v(18),
    v(21),
    st.ok ? st.mean : 0,
    st.ok ? st.ns : 1,
    G,
    0,
    st.ok ? st.cmean : 0,
    st.ok ? st.cns : 0,
    v(24),
    0,
  ]);
}

/**
 * The shader's field() in JS, for code that needs to know what the sculpture looks like without the GPU
 * (e.g. sound). Returns (x, y, z, m) => margin: positive inside the visible surface, negative outside,
 * in the same units as the iso level. m is the morph offset (S.morphT in the app). Points outside the
 * block return -Infinity. Solid, shell, contour and strand modes follow src/render/glsl/scene.glsl.
 */
export function fieldFn(g) {
  const U = uniforms(g),
    F = js(g.t);
  const iso = U[0],
    thk = U[1],
    mode = U[2],
    bands = U[3],
    bound = U[4],
    bs = U[5],
    fade = U[6],
    mean = U[24],
    ns = U[25],
    strands = U[30] > 0.5;
  return (x, y, z, m = 0) => {
    const b = sdBlock(x, y, z, bound, bs);
    if (b > 0) return -Infinity;
    const rr = clamp(1 + b / (0.6 * bs), 0, 1);
    const n = (F(x, y, z, m) - mean) * ns - fade * 0.8 * rr * rr;
    if (strands) {
      const q = strandP(x, y, z);
      const n2 = (F(q[0], q[1], q[2], m) - mean) * ns;
      return thk * 1.5 - Math.hypot(n - iso, n2 - iso);
    }
    if (mode === 0) return n - iso;
    if (mode === 1) return thk - Math.abs(n - iso);
    return thk * 4 - Math.abs(Math.sin((n - iso) * bands * TAU));
  };
}
