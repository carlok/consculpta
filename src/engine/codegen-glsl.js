// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
import { seedVec } from './noise.js';

const F = (x) => {
  let s = (Math.round(x * 10000) / 10000).toString();
  if (!/[.e]/.test(s)) s += '.0';
  return s;
};
const V3 = (a) => `vec3(${a.map(F).join(', ')})`;
export function glsl(tree, name) {
  const lines = [];
  let k = 0;
  function g(n, pv) {
    const a = () => g(n.c[0], pv),
      b = () => g(n.c[1], pv);
    const P = n.p || [];
    const emit = (e) => {
      const v = 'v' + k++;
      lines.push(`float ${v} = ${e};`);
      return v;
    };
    const space = (e) => {
      const q = 'q' + k++;
      lines.push(`vec3 ${q} = ${e};`);
      return g(n.c[0], q);
    };
    switch (n.op) {
      case 'x':
        return pv + '.x';
      case 'y':
        return pv + '.y';
      case 'z':
        return pv + '.z';
      case 'r':
        return `length(${pv})`;
      case 'num':
        return F(n.v);
      case 'noise':
        return emit(`snoise(${pv}*${F(P[0])} + ${V3(seedVec(P[1]))} + gMT3)`);
      case 'fbm':
        return emit(`fbmN(${pv}*${F(P[0])} + ${V3(seedVec(P[2]))} + gMT3, ${P[1]})`);
      case 'sin': {
        const x = a();
        return emit(`sin(${F(P[0])}*${x} + ${F(P[1])})`);
      }
      case 'abs': {
        const x = a();
        return emit(`abs(${x})`);
      }
      case 'neg': {
        const x = a();
        return emit(`-(${x})`);
      }
      case 'soft': {
        const x = a();
        return emit(`${x}/(1.0 + abs(${x}))`);
      }
      case 'gauss': {
        const x = a();
        return emit(`exp(-${F(P[0])}*${x}*${x})`);
      }
      case 'scale': {
        const x = a();
        return emit(`${F(P[0])}*${x}`);
      }
      case 'add': {
        const x = a(),
          y = b();
        return emit(`${x} + ${y}`);
      }
      case 'sub': {
        const x = a(),
          y = b();
        return emit(`${x} - ${y}`);
      }
      case 'mul': {
        const x = a(),
          y = b();
        return emit(`${x}*${y}`);
      }
      case 'min': {
        const x = a(),
          y = b();
        return emit(`min(${x}, ${y})`);
      }
      case 'max': {
        const x = a(),
          y = b();
        return emit(`max(${x}, ${y})`);
      }
      case 'smin': {
        const x = a(),
          y = b();
        return emit(`sminF(${x}, ${y}, ${F(P[0])})`);
      }
      case 'twist':
        return space(`twistP(${pv}, ${F(P[0])})`);
      case 'rotx':
        return space(`rotX(${pv}, ${F(P[0])})`);
      case 'roty':
        return space(`rotY(${pv}, ${F(P[0])})`);
      case 'rotz':
        return space(`rotZ(${pv}, ${F(P[0])})`);
      case 'mirx':
        return space(`vec3(abs(${pv}.x), ${pv}.yz)`);
      case 'miry':
        return space(`vec3(${pv}.x, abs(${pv}.y), ${pv}.z)`);
      case 'mirz':
        return space(`vec3(${pv}.xy, abs(${pv}.z))`);
      case 'warp':
        return space(`warpP(${pv}, ${F(P[0])}, ${F(P[1])}, ${V3(seedVec(P[2]))} + gMT3)`);
      case 'zoom':
        return space(`${pv}*${F(P[0])}`);
    }
    throw new Error('codegen: unknown op ' + n.op);
  }
  const out = g(tree, 'p');
  return `float ${name}(vec3 p){\n  ${lines.join('\n  ')}${lines.length ? '\n  ' : ''}return ${out};\n}`;
}
