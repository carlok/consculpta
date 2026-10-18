// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
import { arrange } from './arrange.js';
import { ensembleFor } from './ensemble.js';
import { makeScanner } from './scan.js';
import { scoreFor } from './score.js';
import { createSynth } from './synth.js';

export { arrange, degreeMidi } from './arrange.js';
export { ensembleFor, instrumentsOf, TRIM_DB } from './ensemble.js';
export { colourFn, makeScanner } from './scan.js';
export { MODES, scoreFor, treeCues } from './score.js';
export { createSynth } from './synth.js';

const LOOKAHEAD = 0.12,
  TICK_MS = 25;

/**
 * Generative sound for the current specimen. A lookahead scheduler (setInterval on audio-context time,
 * not animation frames) asks the scanner what the shape looks like at each step, arrange() turns that
 * into events, and the orchestra (sampled instruments) plays them. Until an ensemble's samples have
 * loaded, or if they fail, the oscillator synth plays instead, on the same clock.
 * @param {{engine: any, createSynth?: Function, createOrchestra?: Function}} opts both injectable for tests;
 *   without createOrchestra only the synth is used.
 */
export function createSonifier({
  engine,
  createSynth: makeSynth = createSynth,
  createOrchestra = null,
}) {
  let synth = null,
    orch = null,
    ctx = null,
    timer = 0,
    score = null,
    ens = null,
    scan = null,
    step = 0,
    next = 0,
    volume = 0.6,
    playing = false,
    pendingGong = false,
    specimenKey = '';
  const view = { yaw: 0, morphT: 0, morphing: false };
  const state = { chord: 0 };
  const stats = { scheduled: 0, sampled: 0, steps: 0, loaded: [], loadError: '' };

  function loadEnsemble() {
    if (!orch || !ens) return;
    orch.configure(score);
    const want = ens;
    orch.load(want).then(
      () => {
        if (want === ens) stats.loaded = Object.values(ens).filter((v) => typeof v === 'string');
      },
      (e) => {
        stats.loadError = String(e?.message || e);
      },
    );
  }

  function setSpecimen(g, key) {
    score = scoreFor(engine, g);
    scan = makeScanner(engine, g, score);
    ens = ensembleFor(score);
    if (playing && key && specimenKey && key !== specimenKey) pendingGong = true;
    if (key) specimenKey = key;
    if (synth) synth.setReverb(score.reverb);
    loadEnsemble();
  }

  /** The oscillator synth's stand-in for an event while samples load. */
  function fallback(ev, t) {
    if (ev.kind === 'hit') {
      if (ev.role === 'perc') synth.thump(t, ev.vel);
      return;
    }
    const bed = ev.role === 'bed';
    synth.note({
      t: t + (ev.at || 0),
      midi: ev.midi,
      dur: ev.dur,
      vel: ev.vel * (bed ? 0.6 : 1),
      kind: bed ? 'pad' : score.strands ? 'bell' : score.timbre,
      cutoff: score.cutoff,
      attack: bed ? 0.6 : score.attack,
      release: bed ? 2 : 1.2,
      pan: score.pan,
      detune: score.detune,
      send: 0.35,
    });
  }

  function scheduleStep(t) {
    const samples = scan(step, view.yaw, view.morphT);
    stats.steps++;
    const events = arrange({ step, samples, score, ens, gong: pendingGong, state });
    pendingGong = false;
    for (const ev of events) {
      stats.scheduled++;
      if (orch?.play(ev, t)) stats.sampled++;
      else fallback(ev, t);
    }
    // Swing: long-short pairs.
    next += score.stepDur * (step % 2 === 0 ? 1 + score.swing : 1 - score.swing);
    step++;
  }

  function tick() {
    if (!playing || !score) return;
    const now = ctx.currentTime,
      horizon = now + LOOKAHEAD;
    if (next < now) next = now + 0.02; // fell behind (tab was busy)
    while (next < horizon) scheduleStep(next);
  }

  function setLevel(v, ramp) {
    synth.setVolume(v, ramp);
    if (orch) orch.setVolume(v, ramp);
  }

  async function start() {
    if (!synth) {
      if (createOrchestra) {
        orch = createOrchestra();
        synth = makeSynth(orch.rawContext);
        ctx = orch.ctx;
      } else {
        synth = makeSynth();
        ctx = synth.ctx;
      }
      if (score) {
        synth.setReverb(score.reverb);
        loadEnsemble();
      }
    }
    await ctx.resume();
    playing = true;
    setLevel(volume);
    next = ctx.currentTime + 0.05;
    clearInterval(timer);
    timer = setInterval(tick, TICK_MS);
    tick();
  }

  function stop() {
    playing = false;
    clearInterval(timer);
    if (!synth) return;
    setLevel(0, 0.08);
    const c = ctx;
    setTimeout(() => {
      if (!playing) c.suspend();
    }, 600);
  }

  return {
    start,
    stop,
    setSpecimen,
    setView(v) {
      if (typeof v.yaw === 'number') view.yaw = v.yaw;
      if (typeof v.morphT === 'number') view.morphT = v.morphT;
      if (typeof v.morphing === 'boolean' && v.morphing !== view.morphing) {
        view.morphing = v.morphing;
        if (orch) orch.setMorphing(v.morphing);
      }
    },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (synth && playing) setLevel(volume);
    },
    /** Pause audio without losing place, e.g. while the tab is hidden. */
    suspend() {
      if (ctx) ctx.suspend();
    },
    resume() {
      if (ctx && playing) ctx.resume();
    },
    get playing() {
      return playing;
    },
    get score() {
      return score;
    },
    get ensemble() {
      return ens;
    },
    stats,
  };
}
