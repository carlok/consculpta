// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
import { NCHILD, OPS } from './ops.js';
import { clamp, round3 } from './rng.js';

export function parse(src) {
  const toks = [];
  const re = /\s*(?:([A-Za-z_][A-Za-z0-9_]*)|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)|([(),]))/y;
  const s = String(src || '').trim();
  let m,
    last = 0;
  re.lastIndex = 0;
  while (re.lastIndex < s.length) {
    m = re.exec(s);
    if (!m) break;
    toks.push(m[1] ? { id: m[1] } : m[2] ? { num: parseFloat(m[2]) } : { sym: m[3] });
    last = re.lastIndex;
  }
  if (s.slice(last).trim()) throw new Error(`Unexpected text near "${s.slice(last, last + 12)}"`);
  let i = 0;
  const peek = () => toks[i],
    next = () => toks[i++];
  function expr() {
    const t = next();
    if (!t) throw new Error('The formula ends too early.');
    if ('num' in t) return { op: 'num', v: clamp(round3(t.num), -1.5, 1.5), raw: t.num };
    if (!t.id) throw new Error(`Unexpected "${t.sym}".`);
    const op = t.id.toLowerCase();
    const d = OPS[op];
    if (!d || op === 'num') throw new Error(`Unknown function "${t.id}".`);
    const np = (d.p || []).length,
      nc = NCHILD[d.kind];
    if (np + nc === 0) {
      if (peek() && peek().sym === '(') throw new Error(`${op} takes no arguments.`);
      return { op };
    }
    if (!(peek() && peek().sym === '(')) throw new Error(`${op} needs ${np + nc} arguments.`);
    next();
    const args = [];
    if (!(peek() && peek().sym === ')')) {
      for (;;) {
        args.push(expr());
        const sep = next();
        if (!sep) throw new Error(`Missing ")" after ${op}(…`);
        if (sep.sym === ')') break;
        if (sep.sym !== ',') throw new Error(`Expected "," or ")" in ${op}(…).`);
      }
    } else next();
    if (args.length !== np + nc) {
      const names = (d.p || [])
        .map((q) => q[0])
        .concat(nc === 2 ? ['a', 'b'] : nc === 1 ? ['a'] : []);
      throw new Error(`${op} takes ${np + nc} arguments: ${op}(${names.join(', ')}).`);
    }
    const n = { op };
    if (np) {
      n.p = args.slice(0, np).map((a, j) => {
        if (a.op !== 'num') throw new Error(`Argument ${j + 1} of ${op} must be a number.`);
        const [, lo, hi, int] = d.p[j];
        return int ? clamp(Math.round(a.raw), lo, hi) : round3(clamp(a.raw, lo, hi));
      });
    }
    if (nc) n.c = args.slice(np).map(strip);
    return n;
  }
  const strip = (n) => {
    if (n.op === 'num') delete n.raw;
    return n;
  };
  const tree = strip(expr());
  if (i < toks.length) throw new Error('Extra text after the formula.');
  return tree;
}
