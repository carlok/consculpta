// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
export const OPS = {
  x: { kind: 'leaf' },
  y: { kind: 'leaf' },
  z: { kind: 'leaf' },
  r: { kind: 'leaf' },
  num: { kind: 'leaf' },
  noise: {
    kind: 'leaf',
    p: [
      ['f', 0.3, 4],
      ['s', 0, 999, 1],
    ],
  },
  fbm: {
    kind: 'leaf',
    p: [
      ['f', 0.3, 3],
      ['o', 2, 4, 1],
      ['s', 0, 999, 1],
    ],
  },
  sin: {
    kind: 'un',
    p: [
      ['f', 0.5, 8],
      ['ph', -Math.PI, Math.PI],
    ],
  },
  abs: { kind: 'un' },
  neg: { kind: 'un' },
  soft: { kind: 'un' },
  gauss: { kind: 'un', p: [['k', 0.5, 12]] },
  scale: { kind: 'un', p: [['k', -3, 3]] },
  add: { kind: 'bin' },
  sub: { kind: 'bin' },
  mul: { kind: 'bin' },
  min: { kind: 'bin' },
  max: { kind: 'bin' },
  smin: { kind: 'bin', p: [['k', 0.02, 0.6]] },
  twist: { kind: 'sp', p: [['k', -3, 3]] },
  rotx: { kind: 'sp', p: [['a', -Math.PI, Math.PI]] },
  roty: { kind: 'sp', p: [['a', -Math.PI, Math.PI]] },
  rotz: { kind: 'sp', p: [['a', -Math.PI, Math.PI]] },
  mirx: { kind: 'sp' },
  miry: { kind: 'sp' },
  mirz: { kind: 'sp' },
  warp: {
    kind: 'sp',
    p: [
      ['f', 0.2, 2.5],
      ['m', 0.05, 1],
      ['s', 0, 999, 1],
    ],
  },
  zoom: { kind: 'sp', p: [['s', 0.3, 3]] },
};
export const NCHILD = { leaf: 0, un: 1, sp: 1, bin: 2 };
export const BY_KIND = { leaf: [], un: [], bin: [], sp: [] };
for (const k in OPS) if (k !== 'num') BY_KIND[OPS[k].kind].push(k);

export const LANG = `x, y, z           coordinates; the block spans about -1..1
r                 distance from the centre
0.4               a constant
noise(f, s)       3D simplex noise, frequency f, integer seed s
fbm(f, o, s)      fractal noise with o octaves (2-4)
sin(f, ph, a)     sin(f*a + ph)
abs(a)  neg(a)  soft(a) = a/(1+|a|)
gauss(k, a)       exp(-k*a*a)
scale(k, a)       k*a
add sub mul min max (a, b)
smin(k, a, b)     smooth minimum, blend radius k
twist(k, a)       a, in space twisted about the y axis by k rad per unit
rotx roty rotz (angle, a)   a, in rotated space
mirx miry mirz (a)          a, mirrored across an axis plane
warp(f, m, s, a)  a, in space displaced by noise (frequency f, amount m)
zoom(s, a)        a evaluated at p*s`;
