// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
/**
 * Sampled instruments and the effects chain, built on Tone.js. Samples are the vendored VCSL subset
 * (CC0) in third_party/vcsl, listed in its manifest.json; only the instruments an ensemble needs are
 * loaded. Until they are, the scheduler falls back to the oscillator synth (synth.js).
 *
 * Signal path: instrument sampler -> level trim -> (bed: slow auto-filter) -> chorus -> ping-pong delay
 * -> reverb -> pan -> master volume.
 */
import * as Tone from 'tone';
import manifest from '../../third_party/vcsl/manifest.json';
import { instrumentsOf, TRIM_DB } from './ensemble.js';

/** Unpitched samples are mapped onto fixed notes so one Sampler handles every instrument. */
export const KEYNOTE = { low: 'C4', high: 'D4', muted: 'E4', swell: 'C4', down: 'C4', up: 'D4' };
const BED = new Set(['vibesBowed', 'organ', 'glasses']);

/** @param {{baseUrl?: string, audioContext?: any}} [opts] audioContext: an already-resumed context to adopt. */
export function createOrchestra({ baseUrl = 'third_party/vcsl/', audioContext } = {}) {
  if (audioContext) Tone.setContext(audioContext);
  const ctx = Tone.getContext();
  const out = new Tone.Volume(-80).toDestination();
  const pan = new Tone.Panner(0).connect(out);
  const reverb = new Tone.Reverb({ decay: 6, preDelay: 0.03, wet: 0.35 }).connect(pan);
  const delay = new Tone.PingPongDelay({ delayTime: 0.42, feedback: 0.28, wet: 0 }).connect(reverb);
  const chorus = new Tone.Chorus({ frequency: 0.6, delayTime: 3.5, depth: 0.5, wet: 0 })
    .connect(delay)
    .start();
  const bedFilter = new Tone.AutoFilter({
    frequency: 0.03,
    baseFrequency: 260,
    octaves: 3.2,
    wet: 0.8,
  })
    .connect(chorus)
    .start();
  const samplers = new Map();

  function samplerFor(name) {
    if (samplers.has(name)) return samplers.get(name);
    const inst = manifest.instruments[name];
    if (!inst) throw new Error(`no samples for ${name}`);
    const urls = {};
    for (const [key, file] of Object.entries(inst.files))
      urls[inst.pitched ? key : KEYNOTE[key]] = file;
    const entry = { ready: false, failed: false };
    entry.loaded = new Promise((resolve, reject) => {
      const trim = new Tone.Volume(TRIM_DB[name] ?? -8).connect(BED.has(name) ? bedFilter : chorus);
      entry.sampler = new Tone.Sampler({
        urls,
        baseUrl: `${baseUrl}${name}/`,
        release: BED.has(name) ? 2.5 : 1.2,
        onload: () => {
          entry.ready = true;
          resolve();
        },
        onerror: (e) => {
          entry.failed = true;
          reject(e);
        },
      }).connect(trim);
    });
    samplers.set(name, entry);
    return entry;
  }

  return {
    /** Clock and lifecycle the scheduler drives (Tone's context). */
    ctx: {
      get currentTime() {
        return ctx.currentTime;
      },
      resume: () => Tone.start(),
      suspend: () => ctx.rawContext.suspend(),
    },
    /** The same AudioContext, for the fallback synth, so both share one clock. */
    rawContext: ctx.rawContext,
    load(ens) {
      return Promise.all(instrumentsOf(ens).map((n) => samplerFor(n).loaded));
    },
    ready(name) {
      return !!samplers.get(name)?.ready;
    },
    /** Play one arrangement event; false when its instrument is not loaded yet. */
    play(ev, t) {
      const e = samplers.get(ev.inst);
      if (!e?.ready) return false;
      const note = ev.kind === 'hit' ? KEYNOTE[ev.key] : Tone.Frequency(ev.midi, 'midi').toNote();
      e.sampler.triggerAttackRelease(
        note,
        ev.dur,
        t + (ev.at || 0),
        Math.max(0.05, Math.min(1, ev.vel)),
      );
      return true;
    },
    /** Room and effects from the score: less gloss, bigger room; mirrors echo; warps shimmer. */
    configure(score) {
      reverb.decay = 3 + (1 - score.gloss) * 6;
      reverb.wet.rampTo(Math.min(0.6, score.reverb + 0.05), 1);
      delay.wet.rampTo(Math.min(0.35, score.mirrors * 0.12), 1);
      chorus.wet.rampTo(Math.min(0.6, score.warps * 0.2), 1);
      pan.pan.rampTo(score.pan, 1);
    },
    /** The bed breathes faster while the shape morphs. */
    setMorphing(on) {
      bedFilter.frequency.rampTo(on ? 0.12 : 0.03, 2);
    },
    setVolume(v, ramp = 0.15) {
      out.volume.rampTo(v <= 0.001 ? -80 : Tone.gainToDb(v), ramp);
    },
  };
}
