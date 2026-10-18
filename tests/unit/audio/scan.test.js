// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';
import { createSonifier } from '../../../src/audio/index.js';
import { colourFn, makeScanner } from '../../../src/audio/scan.js';
import { scoreFor } from '../../../src/audio/score.js';
import * as E from '../../../src/engine/index.js';

const g = E.defaultSpecimenGenome();
const score = scoreFor(E, g);
const phrase = (scan, yaw, m) =>
  Array.from({ length: score.steps }, (_, i) =>
    scan(i, yaw, m)
      .map((s) => (s.on ? s.midi : '-'))
      .join('/'),
  ).join(' ');

describe('audio/scan', () => {
  const scan = makeScanner(E, g, score);

  it('plays where the shape is and rests where a direction finds nothing', () => {
    const all = [];
    for (let yaw = 0; yaw < 6.28; yaw += 0.4)
      for (let i = 0; i < 16; i++) all.push(...scan(i, yaw, 0));
    expect(all.some((s) => s.on)).toBe(true);
    expect(all.some((s) => !s.on)).toBe(true);
    for (const s of all.filter((x) => x.on)) {
      expect(s.midi).toBeGreaterThan(20);
      expect(s.midi).toBeLessThan(110);
      expect(s.vel).toBeGreaterThanOrEqual(0.4);
      expect(s.vel).toBeLessThanOrEqual(1);
    }
  });

  it('turning the sculpture (yaw) changes the phrase; a full turn brings it back', () => {
    expect(phrase(scan, 1.3, 0)).not.toBe(phrase(scan, 0, 0));
    expect(phrase(scan, Math.PI * 2, 0)).toBe(phrase(scan, 0, 0));
  });

  it('morph changes the phrase the way it changes the field', () => {
    expect(phrase(scan, 0, 0.6)).not.toBe(phrase(scan, 0, 0));
  });

  it('mirror formulas give palindromic bars', () => {
    const m = { ...g, t: E.parse('mirx(' + E.print(g.t) + ')') };
    const sc = { ...scoreFor(E, m), palindrome: true };
    const s = makeScanner(E, m, sc);
    expect(s(3, 0.5, 0)).toEqual(s(12, 0.5, 0));
  });

  it('colour luminance stays in 0..1', () => {
    const lum = colourFn(E, g);
    for (const [x, y, z] of [
      [0, 0, 0],
      [0.4, 0.2, -0.3],
      [-0.5, -0.4, 0.1],
    ]) {
      const v = lum(x, y, z, 0);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('audio/sonifier scheduling', () => {
  function fakeSynth() {
    const ctx = { currentTime: 0, resume: vi.fn(async () => {}), suspend: vi.fn() };
    return { ctx, note: vi.fn(), thump: vi.fn(), setVolume: vi.fn(), setReverb: vi.fn() };
  }

  it('schedules ahead on audio time and follows view changes', async () => {
    vi.useFakeTimers();
    let synth;
    const s = createSonifier({ engine: E, createSynth: () => (synth = fakeSynth()) });
    s.setSpecimen(g);
    await s.start();
    expect(s.playing).toBe(true);
    for (let t = 0; t < 40; t++) {
      synth.ctx.currentTime += 0.1;
      vi.advanceTimersByTime(25);
    }
    expect(s.stats.steps).toBeGreaterThan(5);
    expect(s.stats.scheduled).toBeGreaterThan(0);
    const times = synth.note.mock.calls.map((c) => c[0].t);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    s.setView({ yaw: 2, morphT: 0.4 });
    s.setVolume(2);
    expect(synth.setVolume.mock.lastCall[0]).toBe(1);
    s.stop();
    expect(s.playing).toBe(false);
    vi.advanceTimersByTime(700);
    expect(synth.ctx.suspend).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('every texture schedules something for a viable specimen', async () => {
    vi.useFakeTimers();
    for (const [gene, v] of [
      [2, 0.1],
      [2, 0.5],
      [2, 0.9],
      [24, E.STRANDS_ON],
      [4, 0.9],
    ]) {
      const gg = { ...g, v: g.v.slice() };
      gg.v[gene] = v;
      E.fitIso(gg);
      let synth;
      const s = createSonifier({ engine: E, createSynth: () => (synth = fakeSynth()) });
      s.setSpecimen(gg);
      s.setView({ yaw: 0.7, morphT: 0 });
      await s.start();
      for (let t = 0; t < 120; t++) {
        synth.ctx.currentTime += 0.1;
        vi.advanceTimersByTime(25);
      }
      s.stop();
      expect(s.stats.scheduled, `gene ${gene}=${v}`).toBeGreaterThan(0);
    }
    vi.useRealTimers();
  });
});
