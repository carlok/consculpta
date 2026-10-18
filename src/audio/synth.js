// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
/**
 * Small Web Audio synth, no samples or dependencies: oscillator voices with an ADSR-ish envelope and a
 * lowpass, a pitch-drop "membrane" for drum blocks, and a convolution reverb whose impulse is generated
 * noise with an exponential tail. Everything is scheduled on AudioContext time.
 */

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

/** Stereo decaying-noise impulse response. */
function impulse(ctx, seconds, decay) {
  const n = Math.round(ctx.sampleRate * seconds),
    buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** decay;
  }
  return buf;
}

/** @param ctxOrClass an AudioContext to share (e.g. Tone's), or a constructor for a new one. */
export function createSynth(ctxOrClass = globalThis.AudioContext || globalThis.webkitAudioContext) {
  const ctx = typeof ctxOrClass === 'function' ? new ctxOrClass() : ctxOrClass;
  const out = ctx.createGain();
  out.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.ratio.value = 3;
  const wet = ctx.createGain();
  const verb = ctx.createConvolver();
  verb.buffer = impulse(ctx, 3.4, 2.4);
  wet.connect(verb).connect(comp);
  comp.connect(out).connect(ctx.destination);

  /**
   * One note. kind 'pad' = two detuned soft oscillators with a slow lowpass; 'pluck' = saw with a
   * fast-closing filter; 'bell' = sine plus a quiet fifth partial for strand plucks.
   */
  function note({
    t,
    midi,
    dur,
    vel = 0.5,
    kind = 'pad',
    cutoff = 2000,
    attack = 0.05,
    release = 1.2,
    pan = 0,
    detune = 0,
    send = 0.4,
  }) {
    const f = mtof(midi);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, t);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.Q.value = kind === 'pluck' ? 4 : 0.7;
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const oscs = [];
    const add = (type, freq, cents, level) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = cents;
      g.gain.value = level;
      o.connect(g).connect(filt);
      oscs.push(o);
    };
    if (kind === 'pluck') {
      add('sawtooth', f, 0, 0.5);
      filt.frequency.setValueAtTime(cutoff * 2.5, t);
      filt.frequency.exponentialRampToValueAtTime(Math.max(120, cutoff * 0.25), t + 0.35);
    } else if (kind === 'bell') {
      add('sine', f, 0, 0.6);
      add('sine', f * 3, 0, 0.12);
      filt.frequency.value = cutoff * 3;
    } else {
      add('triangle', f, -detune, 0.45);
      add('sine', f, detune, 0.45);
      filt.frequency.setValueAtTime(cutoff * 0.6, t);
      filt.frequency.linearRampToValueAtTime(cutoff, t + attack + dur * 0.5);
    }
    filt.connect(amp);
    const peak = vel * (kind === 'pad' ? 0.18 : 0.28);
    amp.gain.linearRampToValueAtTime(peak, t + attack);
    amp.gain.setTargetAtTime(peak * 0.7, t + attack, Math.max(0.05, dur * 0.4));
    amp.gain.setTargetAtTime(0, t + dur, release / 4);
    let tail = amp;
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      amp.connect(panner);
      tail = panner;
    }
    tail.connect(comp);
    const sendGain = ctx.createGain();
    sendGain.gain.value = send;
    tail.connect(sendGain).connect(wet);
    const end = t + dur + release * 1.5;
    for (const o of oscs) {
      o.start(t);
      o.stop(end);
    }
    oscs[0].onended = () => {
      amp.disconnect();
      sendGain.disconnect();
      if (panner) panner.disconnect();
    };
  }

  /** Low pitch-dropping sine for drum blocks. */
  function thump(t, vel = 0.7) {
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.frequency.setValueAtTime(115, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.28);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel * 0.55, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(comp);
    o.start(t);
    o.stop(t + 0.55);
    o.onended = () => g.disconnect();
  }

  function setVolume(v, ramp = 0.15) {
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setTargetAtTime(v, ctx.currentTime, ramp);
  }
  function setReverb(level) {
    wet.gain.setTargetAtTime(level, ctx.currentTime, 0.3);
  }

  return { ctx, note, thump, setVolume, setReverb };
}
