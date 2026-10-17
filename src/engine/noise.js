// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
import { round3 } from './rng.js';

const mod289 = (x) => x - Math.floor(x * (1 / 289)) * 289;
const permute = (x) => mod289((x * 34 + 10) * x);
/**
 * @param {number} vx
 * @param {number} vy
 * @param {number} vz
 * @param {boolean} [gpuLattice=true] When true, lattice scale uses `Math.fround` to match GLSL float32.
 */
export function snoise(vx, vy, vz, gpuLattice = true) {
  const Cx = 1 / 6,
    Cy = 1 / 3;
  const s = (vx + vy + vz) * Cy;
  let ix = Math.floor(vx + s),
    iy = Math.floor(vy + s),
    iz = Math.floor(vz + s);
  const t = (ix + iy + iz) * Cx;
  const x0x = vx - ix + t,
    x0y = vy - iy + t,
    x0z = vz - iz + t;
  const gx = x0x >= x0y ? 1 : 0,
    gy = x0y >= x0z ? 1 : 0,
    gz = x0z >= x0x ? 1 : 0;
  const lx = 1 - gx,
    ly = 1 - gy,
    lz = 1 - gz;
  const i1x = Math.min(gx, lz),
    i1y = Math.min(gy, lx),
    i1z = Math.min(gz, ly);
  const i2x = Math.max(gx, lz),
    i2y = Math.max(gy, lx),
    i2z = Math.max(gz, ly);
  const X = [x0x, x0x - i1x + Cx, x0x - i2x + Cy, x0x - 0.5];
  const Y = [x0y, x0y - i1y + Cx, x0y - i2y + Cy, x0y - 0.5];
  const Z = [x0z, x0z - i1z + Cx, x0z - i2z + Cy, x0z - 0.5];
  ix = mod289(ix);
  iy = mod289(iy);
  iz = mod289(iz);
  const oz = [0, i1z, i2z, 1],
    oy = [0, i1y, i2y, 1],
    ox = [0, i1x, i2x, 1];
  const n_ = gpuLattice ? Math.fround(0.142857142857) : 0.142857142857;
  const nsx = n_ * 2;
  const nsy = n_ * 0.5 - 1;
  const nsz = n_; // float32 like the GPU, so 7*n_ floors to 1
  let sum = 0;
  for (let k = 0; k < 4; k++) {
    const p = permute(permute(permute(iz + oz[k]) + iy + oy[k]) + ix + ox[k]);
    const j = p - 49 * Math.floor(p * nsz * nsz);
    const x_ = Math.floor(j * nsz),
      y_ = Math.floor(j - 7 * x_);
    const gxk = x_ * nsx + nsy,
      gyk = y_ * nsx + nsy;
    const h = 1 - Math.abs(gxk) - Math.abs(gyk);
    const sh = h <= 0 ? -1 : 0;
    let px = gxk + (Math.floor(gxk) * 2 + 1) * sh,
      py = gyk + (Math.floor(gyk) * 2 + 1) * sh,
      pz = h;
    const nrm = 1.79284291400159 - 0.85373472095314 * (px * px + py * py + pz * pz);
    px *= nrm;
    py *= nrm;
    pz *= nrm;
    let m = Math.max(0.5 - (X[k] * X[k] + Y[k] * Y[k] + Z[k] * Z[k]), 0);
    m = m * m;
    sum += m * m * (px * X[k] + py * Y[k] + pz * Z[k]);
  }
  return 105 * sum;
}
export function fbmJS(x, y, z, o) {
  let a = 1,
    s = 0,
    n = 0;
  for (let i = 0; i < o; i++) {
    s += a * snoise(x, y, z);
    n += a;
    x = x * 2 + 17.13;
    y = y * 2 + 5.71;
    z = z * 2 + 11.37;
    a *= 0.5;
  }
  return s / n;
}
export function seedVec(s) {
  return [
    round3(((s * 0.6180339887) % 1) * 40 + 3),
    round3(((s * 0.4142135624) % 1) * 40 + 5),
    round3(((s * 0.7320508076) % 1) * 40 + 7),
  ];
}
