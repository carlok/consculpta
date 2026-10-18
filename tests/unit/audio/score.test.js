// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { MODES, scoreFor, treeCues } from '../../../src/audio/score.js';
import * as E from '../../../src/engine/index.js';

const withGene = (g, i, v) => ({ ...g, v: Object.assign(g.v.slice(), { [i]: v }) });

describe('audio/score', () => {
  const g = E.defaultSpecimenGenome();

  it('is deterministic for a genome and stays in musical ranges', () => {
    const a = scoreFor(E, g),
      b = scoreFor(E, g);
    expect(a).toEqual(b);
    expect(a.pc).toBeGreaterThanOrEqual(0);
    expect(a.pc).toBeLessThan(12);
    expect(MODES[a.mode]).toEqual(a.scale);
    expect(1 / a.stepDur).toBeGreaterThanOrEqual(1.2);
    expect(1 / a.stepDur).toBeLessThanOrEqual(3.2);
    expect(a.voices).toBeGreaterThanOrEqual(1);
    expect(a.voices).toBeLessThanOrEqual(3);
  });

  it('maps surface to texture and block to timbre', () => {
    expect(scoreFor(E, withGene(g, 2, 0.1)).texture).toBe('sustain');
    expect(scoreFor(E, withGene(g, 2, 0.5)).texture).toBe('arp');
    expect(scoreFor(E, withGene(g, 2, 0.9)).texture).toBe('pulse');
    expect(scoreFor(E, withGene(g, 24, E.STRANDS_ON)).texture).toBe('sparse');
    expect(scoreFor(E, withGene(g, 4, 0.1)).timbre).toBe('pad');
    expect(scoreFor(E, withGene(g, 4, 0.5)).timbre).toBe('pluck');
    const drum = scoreFor(E, withGene(g, 4, 0.9));
    expect(drum.membrane).toBe(true);
    expect(drum.timbre).toBe('pad');
  });

  it('strands use pentatonic scales', () => {
    expect(scoreFor(E, withGene(g, 24, E.STRANDS_ON)).mode).toMatch(/Penta$/);
  });

  it('palette contrast moves the mode from bright to dark', () => {
    const low = [10, 11, 12].reduce((acc, i) => withGene(acc, i, 0), g);
    const high = [10, 11, 12].reduce((acc, i) => withGene(acc, i, 1), g);
    expect(scoreFor(E, low).mode).toBe('lydian');
    expect(scoreFor(E, high).mode).toBe('aeolian');
  });

  it('reads frequency, mirrors, warps and twist from the tree', () => {
    const c = treeCues(E.parse('zoom(2, mirx(twist(-1.5, warp(1, 0.3, 4, noise(1.5, 2)))))'));
    expect(c.mirrors).toBe(1);
    expect(c.warps).toBe(1);
    expect(c.twist).toBeCloseTo(1.5);
    expect(c.meanF).toBeCloseTo((2 * 1 + 2 * 1.5) / 2);
    expect(treeCues(E.parse('x')).meanF).toBe(1);
  });
});
