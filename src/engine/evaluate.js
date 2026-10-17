// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
import { fbmJS, seedVec, snoise } from './noise.js';
import { clamp } from './rng.js';

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
      return (x, y, z) => snoise(x * f + sx, y * f + sy, z * f + sz);
    }
    case 'fbm': {
      const f = P[0],
        o = P[1],
        [sx, sy, sz] = seedVec(P[2]);
      return (x, y, z) => fbmJS(x * f + sx, y * f + sy, z * f + sz, o);
    }
    case 'sin': {
      const a = A(),
        f = P[0],
        ph = P[1];
      return (x, y, z) => Math.sin(f * a(x, y, z) + ph);
    }
    case 'abs': {
      const a = A();
      return (x, y, z) => Math.abs(a(x, y, z));
    }
    case 'neg': {
      const a = A();
      return (x, y, z) => -a(x, y, z);
    }
    case 'soft': {
      const a = A();
      return (x, y, z) => {
        const v = a(x, y, z);
        return v / (1 + Math.abs(v));
      };
    }
    case 'gauss': {
      const a = A(),
        k = P[0];
      return (x, y, z) => {
        const v = a(x, y, z);
        return Math.exp(-k * v * v);
      };
    }
    case 'scale': {
      const a = A(),
        k = P[0];
      return (x, y, z) => k * a(x, y, z);
    }
    case 'add': {
      const a = A(),
        b = B();
      return (x, y, z) => a(x, y, z) + b(x, y, z);
    }
    case 'sub': {
      const a = A(),
        b = B();
      return (x, y, z) => a(x, y, z) - b(x, y, z);
    }
    case 'mul': {
      const a = A(),
        b = B();
      return (x, y, z) => a(x, y, z) * b(x, y, z);
    }
    case 'min': {
      const a = A(),
        b = B();
      return (x, y, z) => Math.min(a(x, y, z), b(x, y, z));
    }
    case 'max': {
      const a = A(),
        b = B();
      return (x, y, z) => Math.max(a(x, y, z), b(x, y, z));
    }
    case 'smin': {
      const a = A(),
        b = B(),
        k = P[0];
      return (x, y, z) => {
        const u = a(x, y, z),
          v = b(x, y, z);
        const h = clamp(0.5 + (0.5 * (v - u)) / k, 0, 1);
        return v + (u - v) * h - k * h * (1 - h);
      };
    }
    case 'twist': {
      const a = A(),
        k = P[0];
      return (x, y, z) => {
        const c = Math.cos(k * y),
          s = Math.sin(k * y);
        return a(c * x - s * z, y, s * x + c * z);
      };
    }
    case 'rotx': {
      const a = A(),
        c = Math.cos(P[0]),
        s = Math.sin(P[0]);
      return (x, y, z) => a(x, c * y - s * z, s * y + c * z);
    }
    case 'roty': {
      const a = A(),
        c = Math.cos(P[0]),
        s = Math.sin(P[0]);
      return (x, y, z) => a(c * x + s * z, y, -s * x + c * z);
    }
    case 'rotz': {
      const a = A(),
        c = Math.cos(P[0]),
        s = Math.sin(P[0]);
      return (x, y, z) => a(c * x - s * y, s * x + c * y, z);
    }
    case 'mirx': {
      const a = A();
      return (x, y, z) => a(Math.abs(x), y, z);
    }
    case 'miry': {
      const a = A();
      return (x, y, z) => a(x, Math.abs(y), z);
    }
    case 'mirz': {
      const a = A();
      return (x, y, z) => a(x, y, Math.abs(z));
    }
    case 'warp': {
      const a = A(),
        f = P[0],
        m = P[1],
        [sx, sy, sz] = seedVec(P[2]);
      return (x, y, z) => {
        const qx = x * f + sx,
          qy = y * f + sy,
          qz = z * f + sz;
        return a(
          x + m * snoise(qx, qy, qz),
          y + m * snoise(qx + 31.4, qy, qz),
          z + m * snoise(qx, qy + 47.2, qz),
        );
      };
    }
    case 'zoom': {
      const a = A(),
        s = P[0];
      return (x, y, z) => a(x * s, y * s, z * s);
    }
  }
  throw new Error('js: unknown op ' + n.op);
}
