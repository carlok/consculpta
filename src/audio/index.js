// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
import { makeScanner } from './scan.js';
import { scoreFor } from './score.js';
import { createSynth } from './synth.js';

export { colourFn, makeScanner } from './scan.js';
export { MODES, scoreFor, treeCues } from './score.js';
export { createSynth } from './synth.js';

const LOOKAHEAD = 0.12,
  TICK_MS = 25;

/**
 * Generative sound for the current specimen. A lookahead scheduler (setInterval on AudioContext time,
 * not animation frames) asks the scanner what the shape looks like at each step and plays it through
 * the score's texture.
 * @param {{engine: any, createSynth?: Function}} opts createSynth is injectable for tests.
 */
export function createSonifier({ engine, createSynth: make = createSynth }) {
  let synth = null,
    timer = 0,
    score = null,
    scan = null,
    step = 0,
    next = 0,
    volume = 0.6,
    playing = false;
  const view = { yaw: 0, morphT: 0 };
  const stats = { scheduled: 0, steps: 0 };

  function setSpecimen(g) {
    score = scoreFor(engine, g);
    scan = makeScanner(engine, g, score);
    if (synth) synth.setReverb(score.reverb);
  }

  function play(s, t, dur, extra) {
    const sc = score;
    synth.note({
      t,
      midi: s.midi,
      dur,
      vel: s.vel,
      kind: sc.timbre,
      cutoff: sc.cutoff * (0.5 + s.bright),
      attack: sc.attack,
      release: 1.2,
      pan: sc.pan + (s.voice === 1 ? 0.2 : s.voice === 2 ? -0.2 : 0),
      detune: sc.detune,
      send: 0.35,
      ...extra,
    });
    stats.scheduled++;
  }

  /** A triad on the scale degree the middle ring reads, voiced low. */
  function chord(s0, t, dur) {
    const sc = score,
      L = sc.scale.length;
    for (const off of [0, 2, 4]) {
      const d = s0.deg + off;
      const midi = sc.root + 12 + sc.scale[d % L] + 12 * Math.floor(d / L);
      play({ ...s0, midi, vel: 0.5 }, t, dur, { kind: 'pad', attack: Math.max(0.4, sc.attack) });
    }
  }

  function scheduleStep(t) {
    const sc = score,
      k = step % sc.steps,
      beat = sc.stepDur;
    const smp = scan(step, view.yaw, view.morphT);
    stats.steps++;
    if (sc.membrane && (k === 0 || (k === sc.steps / 2 && smp[0].on))) {
      synth.thump(t, 0.7);
      stats.scheduled++;
    }
    if (sc.texture === 'sustain') {
      if (k === 0) chord(smp[0], t, beat * sc.steps);
      if (k % 2 === 0 && smp[0].on) play(smp[0], t, beat * 1.8, { vel: smp[0].vel * 0.7 });
      if (k % 4 === 2 && smp[1] && smp[1].on) play(smp[1], t, beat * 3, { vel: smp[1].vel * 0.5 });
    } else if (sc.texture === 'arp') {
      if (k === 0) chord(smp[0], t, beat * sc.steps);
      const s = smp[k % smp.length];
      if (s.on) play(s, t, beat * 1.3);
    } else if (sc.texture === 'pulse') {
      const every = Math.max(1, Math.round(sc.steps / sc.bands));
      if (k % every === 0) {
        const low = smp[smp.length - 1];
        play({ ...low, midi: sc.root + 12 }, t, beat * 0.6, {
          kind: 'pluck',
          attack: 0.005,
          release: 0.4,
        });
      }
      if (k % 2 === 1 && smp[0].on) play(smp[0], t, beat * 1.5, { vel: smp[0].vel * 0.6 });
    } else {
      for (const s of smp) {
        if (s.on && (k + s.voice) % 3 === 0)
          play({ ...s, midi: s.midi + 12 }, t, beat * 0.5, {
            kind: 'bell',
            attack: 0.005,
            release: 2.6,
            send: 0.6,
          });
      }
    }
    // Swing: long-short pairs.
    next += beat * (step % 2 === 0 ? 1 + sc.swing : 1 - sc.swing);
    step++;
  }

  function tick() {
    if (!playing || !score) return;
    const horizon = synth.ctx.currentTime + LOOKAHEAD;
    if (next < synth.ctx.currentTime) next = synth.ctx.currentTime + 0.02; // fell behind (tab was busy)
    while (next < horizon) scheduleStep(next);
  }

  async function start() {
    if (!synth) {
      synth = make();
      if (score) synth.setReverb(score.reverb);
    }
    await synth.ctx.resume();
    playing = true;
    synth.setVolume(volume);
    next = synth.ctx.currentTime + 0.05;
    clearInterval(timer);
    timer = setInterval(tick, TICK_MS);
    tick();
  }

  function stop() {
    playing = false;
    clearInterval(timer);
    if (!synth) return;
    synth.setVolume(0, 0.08);
    const s = synth;
    setTimeout(() => {
      if (!playing) s.ctx.suspend();
    }, 600);
  }

  return {
    start,
    stop,
    setSpecimen,
    setView(v) {
      if (typeof v.yaw === 'number') view.yaw = v.yaw;
      if (typeof v.morphT === 'number') view.morphT = v.morphT;
    },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (synth && playing) synth.setVolume(volume);
    },
    /** Pause audio without losing place, e.g. while the tab is hidden. */
    suspend() {
      if (synth) synth.ctx.suspend();
    },
    resume() {
      if (synth && playing) synth.ctx.resume();
    },
    get playing() {
      return playing;
    },
    get score() {
      return score;
    },
    stats,
  };
}
