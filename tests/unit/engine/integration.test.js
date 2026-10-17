// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import E from '../../helpers/engine.mjs';

describe('engine integration', () => {
  it('exercises codegen, evaluation, evolution, and palette helpers', () => {
    E.setRandom(E.mulberry32(99));
    const g = E.startGenome();
    const src = E.print(g.t);
    const tree = E.parse(src);
    expect(E.glsl(tree, 'shape')).toContain('float shape(vec3 p)');
    expect(E.js(tree)(0.1, -0.2, 0.3)).toBeTypeOf('number');
    expect(E.fbmJS(0.5, 0.5, 0.5, 3)).toBeTypeOf('number');
    expect(E.palCSS(g.v)).toContain('linear-gradient');
    const v = g.v.slice();
    E.paletteToGenes(
      { a: [0.5, 0.5, 0.5], b: [0.3, 0.3, 0.3], c: [0.8, 0.8, 0.8], d: [0.1, 0.2, 0.3] },
      v,
    );
    expect(E.pretty(tree)).toContain('warp');
    expect(E.depth(tree)).toBeGreaterThan(0);
    expect(E.size(tree)).toBeGreaterThan(0);
    expect(E.cost(tree)).toBeGreaterThan(0);
    const grown = E.grow(2);
    expect(E.print(grown)).toBeTruthy();
    const mut = E.mutate(g, 0.35);
    expect(mut.g).toBeTruthy();
    const child = E.crossover(g, mut.g);
    expect(child === null || E.viable(child).ok).toBe(true);
    expect(E.uniforms(g).length).toBeGreaterThan(20);
    const h = E.cloneG(g);
    E.fitIso(h);
    expect(E.tag(g)).toMatch(/^[0-9A-F]{4}$/);
    expect(E.fmtScalar(0, g.v)).toBeTruthy();
    expect(E.strandP(0.1, 0.2, 0.3).length).toBe(3);
    E.setRandom(E.mulberry32(1));
    const rand = E.randomGenome();
    expect(E.viable(rand).ok).toBe(true);
    const flat = E.parse('0.4');
    const g2 = E.cloneG(g);
    g2.t = flat;
    expect(E.viable(g2).why).toBe('flat');
    expect(E.LANG).toContain('noise');
    expect(E.OPS.noise.kind).toBe('leaf');
  });
});
