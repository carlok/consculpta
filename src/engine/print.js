// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
import { round3 } from './rng.js';

function fmtNum(x) {
  const v = round3(x);
  return Object.is(v, -0) ? '0' : String(v);
}
export function print(n) {
  if (n.op === 'num') return fmtNum(n.v);
  const parts = (n.p || []).map(fmtNum).concat((n.c || []).map(print));
  return parts.length ? `${n.op}(${parts.join(', ')})` : n.op;
}
export function pretty(n, ind = '') {
  const flat = print(n);
  if (flat.length + ind.length <= 64 || !n.c?.length) return ind + flat;
  const params = (n.p || []).map(fmtNum);
  const inner = ind + '  ';
  const kids = n.c.map((c) => pretty(c, inner));
  return `${ind}${n.op}(${params.length ? params.join(', ') + ',' : ''}\n${kids.join(',\n')})`;
}
