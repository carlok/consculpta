// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
import { fbmJS, seedVec, snoise } from './noise.js';
import { clamp } from './rng.js';

/**
 * Compile a formula tree to (x, y, z, m) => number. m is the morph offset the shaders add to every
 * noise lookup's z (gMT3); it defaults to 0, so three-argument callers see the static field.
 */
export function js(n) {
  const P = n.p || [];
  const A = () => js(n.c[0]),
    B = () => js(n.c[1]);
  switch (n.op) {
    case 'x':
      return (x) => x;
    case 'y':
      return (_x, y) => y;
    case 'z':
      return (_x, _y, z) => z;
    case 'r':
      return (x, y, z) => Math.sqrt(x * x + y * y + z * z);
    case 'num': {
      const v = n.v;
      return () => v;
    }
    case 'noise': {
      const f = P[0],
        [sx, sy, sz] = seedVec(P[1]);
      return (x, y, z, m = 0) => snoise(x * f + sx, y * f + sy, z * f + sz + m);
    }
    case 'fbm': {
      const f = P[0],
        o = P[1],
        [sx, sy, sz] = seedVec(P[2]);
      return (x, y, z, m = 0) => fbmJS(x * f + sx, y * f + sy, z * f + sz + m, o);
    }
    case 'sin': {
      const a = A(),
        f = P[0],
        ph = P[1];
      return (x, y, z, m) => Math.sin(f * a(x, y, z, m) + ph);
    }
    case 'abs': {
      const a = A();
      return (x, y, z, m) => Math.abs(a(x, y, z, m));
    }
    case 'neg': {
      const a = A();
      return (x, y, z, m) => -a(x, y, z, m);
    }
    case 'soft': {
      const a = A();
      return (x, y, z, m) => {
        const v = a(x, y, z, m);
        return v / (1 + Math.abs(v));
      };
    }
    case 'gauss': {
      const a = A(),
        k = P[0];
      return (x, y, z, m) => {
        const v = a(x, y, z, m);
        return Math.exp(-k * v * v);
      };
    }
    case 'scale': {
      const a = A(),
        k = P[0];
      return (x, y, z, m) => k * a(x, y, z, m);
    }
    case 'add': {
      const a = A(),
        b = B();
      return (x, y, z, m) => a(x, y, z, m) + b(x, y, z, m);
    }
    case 'sub': {
      const a = A(),
        b = B();
      return (x, y, z, m) => a(x, y, z, m) - b(x, y, z, m);
    }
    case 'mul': {
      const a = A(),
        b = B();
      return (x, y, z, m) => a(x, y, z, m) * b(x, y, z, m);
    }
    case 'min': {
      const a = A(),
        b = B();
      return (x, y, z, m) => Math.min(a(x, y, z, m), b(x, y, z, m));
    }
    case 'max': {
      const a = A(),
        b = B();
      return (x, y, z, m) => Math.max(a(x, y, z, m), b(x, y, z, m));
    }
    case 'smin': {
      const a = A(),
        b = B(),
        k = P[0];
      return (x, y, z, m) => {
        const u = a(x, y, z, m),
          v = b(x, y, z, m);
        const h = clamp(0.5 + (0.5 * (v - u)) / k, 0, 1);
        return v + (u - v) * h - k * h * (1 - h);
      };
    }
    case 'twist': {
      const a = A(),
        k = P[0];
      return (x, y, z, m) => {
        const c = Math.cos(k * y),
          s = Math.sin(k * y);
        return a(c * x - s * z, y, s * x + c * z, m);
      };
    }
    case 'rotx': {
      const a = A(),
        c = Math.cos(P[0]),
        s = Math.sin(P[0]);
      return (x, y, z, m) => a(x, c * y - s * z, s * y + c * z, m);
    }
    case 'roty': {
      const a = A(),
        c = Math.cos(P[0]),
        s = Math.sin(P[0]);
      return (x, y, z, m) => a(c * x + s * z, y, -s * x + c * z, m);
    }
    case 'rotz': {
      const a = A(),
        c = Math.cos(P[0]),
        s = Math.sin(P[0]);
      return (x, y, z, m) => a(c * x - s * y, s * x + c * y, z, m);
    }
    case 'mirx': {
      const a = A();
      return (x, y, z, m) => a(Math.abs(x), y, z, m);
    }
    case 'miry': {
      const a = A();
      return (x, y, z, m) => a(x, Math.abs(y), z, m);
    }
    case 'mirz': {
      const a = A();
      return (x, y, z, m) => a(x, y, Math.abs(z), m);
    }
    case 'warp': {
      const a = A(),
        f = P[0],
        amt = P[1],
        [sx, sy, sz] = seedVec(P[2]);
      return (x, y, z, m = 0) => {
        const qx = x * f + sx,
          qy = y * f + sy,
          qz = z * f + sz + m;
        return a(
          x + amt * snoise(qx, qy, qz),
          y + amt * snoise(qx + 31.4, qy, qz),
          z + amt * snoise(qx, qy + 47.2, qz),
          m,
        );
      };
    }
    case 'zoom': {
      const a = A(),
        s = P[0];
      return (x, y, z, m) => a(x * s, y * s, z * s, m);
    }
  }
  throw new Error('js: unknown op ' + n.op);
}
