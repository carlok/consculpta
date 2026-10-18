// SPDX-License-Identifier: Apache-2.0
import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { arrange, degreeMidi } from '../../../src/audio/arrange.js';
import { ensembleFor, instrumentsOf, TRIM_DB } from '../../../src/audio/ensemble.js';
import { scoreFor } from '../../../src/audio/score.js';
import * as E from '../../../src/engine/index.js';

const manifest = JSON.parse(readFileSync('third_party/vcsl/manifest.json', 'utf8'));
const base = E.defaultSpecimenGenome();
const genome = (pairs) => {
  const g = { ...base, v: base.v.slice() };
  for (const [i, v] of pairs) g.v[i] = v;
  return g;
};
const NOTE = /^[A-G]#?\d$/;

describe('audio/ensemble', () => {
  it('the block picks the band', () => {
    expect(ensembleFor({ block: 'sphere', texture: 'sustain' })).toMatchObject({
      lead: 'vibes',
      bed: 'vibesBowed',
    });
    expect(ensembleFor({ block: 'cube', texture: 'sustain' })).toMatchObject({
      lead: 'marimba',
      bed: 'organ',
    });
    expect(ensembleFor({ block: 'drum', texture: 'sustain' })).toMatchObject({
      lead: 'kalimba',
      perc: 'frameDrum',
    });
  });

  it('surface and strands adjust roles', () => {
    expect(ensembleFor({ block: 'cube', texture: 'arp' })).toMatchObject({
      counter: 'harp',
      arp: true,
    });
    expect(ensembleFor({ block: 'sphere', texture: 'pulse' }).perc).toBe('slitDrum');
    expect(ensembleFor({ block: 'drum', texture: 'sparse', strands: true })).toMatchObject({
      lead: 'glock',
      bed: 'glasses',
      shimmer: 'markTrees',
    });
  });

  it('every instrument any ensemble can use has samples and a level trim', () => {
    const all = new Set();
    for (const block of ['sphere', 'cube', 'drum'])
      for (const texture of ['sustain', 'arp', 'pulse', 'sparse'])
        for (const strands of [false, true])
          for (const n of instrumentsOf(ensembleFor({ block, texture, strands }))) all.add(n);
    for (const n of all) {
      expect(manifest.instruments[n], n).toBeTruthy();
      expect(TRIM_DB[n], n).toBeTypeOf('number');
    }
  });
});

describe('vendored VCSL samples', () => {
  it('every manifest entry exists on disk, pitched keys are note names, files are small', () => {
    expect(manifest.license).toBe('CC0-1.0');
    expect(existsSync('third_party/vcsl/LICENSE')).toBe(true);
    let total = 0;
    for (const [name, inst] of Object.entries(manifest.instruments)) {
      const keys = Object.keys(inst.files);
      expect(keys.length, name).toBeGreaterThan(0);
      for (const [key, file] of Object.entries(inst.files)) {
        if (inst.pitched) expect(key, `${name} ${key}`).toMatch(NOTE);
        expect(file).not.toContain('#');
        const path = `third_party/vcsl/${name}/${file}`;
        expect(existsSync(path), path).toBe(true);
        const size = statSync(path).size;
        expect(size, path).toBeLessThan(200_000);
        total += size;
      }
    }
    expect(total).toBeLessThan(6 * 1024 * 1024);
  });
});

describe('audio/arrange', () => {
  const run = (g, bars = 2) => {
    const score = scoreFor(E, g),
      ens = ensembleFor(score),
      state = { chord: 0 };
    const out = [];
    for (let step = 0; step < score.steps * bars; step++) {
      // Alternate on/off so every rule gets exercised; deg varies with the step.
      const samples = [0, 1, 2].slice(0, Math.max(3, score.voices)).map((voice) => ({
        voice,
        on: (step + voice) % 3 !== 1,
        deg: step % 9,
        midi: 60 + (step % 12),
        vel: 0.7,
      }));
      out.push({
        step,
        k: step % score.steps,
        ev: arrange({ step, samples, score, ens, gong: step === 3, state }),
      });
    }
    return { score, ens, out };
  };

  it('beds start only on bar lines and hold for the bar', () => {
    const { score, out } = run(base);
    for (const { k, ev } of out)
      for (const e of ev.filter((x) => x.role === 'bed')) {
        expect(k).toBe(0);
        expect(e.dur).toBeGreaterThan(score.stepDur * score.steps);
      }
  });

  it('percussion only for drum blocks and contour surfaces', () => {
    const roles = (g) => new Set(run(g).out.flatMap((s) => s.ev.map((e) => e.role)));
    expect(
      roles(
        genome([
          [4, 0.1],
          [2, 0.1],
        ]),
      ).has('perc'),
    ).toBe(false);
    expect(
      roles(
        genome([
          [4, 0.9],
          [2, 0.1],
        ]),
      ).has('perc'),
    ).toBe(true);
    expect(
      roles(
        genome([
          [4, 0.1],
          [2, 0.9],
        ]),
      ).has('perc'),
    ).toBe(true);
  });

  it('the lead stays sparse and the gong marks a new parent once', () => {
    const { score, out } = run(base);
    const lead = out.filter((s) => s.ev.some((e) => e.role === 'lead')).length;
    expect(lead).toBeLessThanOrEqual(out.length / 2);
    const gongs = out.filter((s) => s.ev.some((e) => e.role === 'gong'));
    expect(gongs.map((s) => s.step)).toEqual([3]);
    expect(score.steps).toBe(16);
  });

  it('shell surfaces arpeggiate the chord on the counter instrument', () => {
    const { ens, out } = run(genome([[2, 0.5]]));
    expect(ens.arp).toBe(true);
    const counter = out.flatMap((s) => s.ev.filter((e) => e.role === 'counter'));
    expect(counter.length).toBeGreaterThan(4);
    expect(new Set(counter.map((e) => e.midi)).size).toBeGreaterThan(2);
  });

  it('degreeMidi climbs octaves past the scale length', () => {
    const score = scoreFor(E, base);
    expect(degreeMidi(score, score.scale.length, 1)).toBe(degreeMidi(score, 0, 2));
  });
});
