// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
/**
 * One step of the arrangement: from what the scanner reads off the shape (samples), the score and the
 * ensemble, decide which events play. Pure, so it is unit tested without audio.
 *
 * Event: {role, inst, kind: 'note' | 'hit', midi?, key?, dur, vel, at?} where `at` is a time offset in
 * seconds within the step (for arpeggios) and `key` names an unpitched sample (e.g. 'low').
 */

/** MIDI note for scale degree d above the score root, in octave `oct` (0 = root octave). */
export function degreeMidi(score, d, oct = 1) {
  const L = score.scale.length,
    dd = Math.max(0, d);
  return score.root + 12 * oct + score.scale[dd % L] + 12 * Math.floor(dd / L);
}

/**
 * @param {{step: number, samples: any[], score: any, ens: any, gong?: boolean, state: {chord: number}}} a
 *   state carries the bar's chord degree between steps (mutated at bar lines).
 */
export function arrange({ step, samples, score, ens, gong = false, state }) {
  const S = score.steps,
    k = ((step % S) + S) % S,
    bar = Math.floor(step / S),
    beat = score.stepDur;
  const lead = samples[0],
    ev = [];
  if (k === 0) state.chord = lead.on ? lead.deg % score.scale.length : state.chord || 0;
  const chord = state.chord || 0;

  if (gong) ev.push({ role: 'gong', inst: ens.gong, kind: 'hit', key: 'swell', dur: 8, vel: 0.6 });

  // Bed: root and fifth of the bar's chord, held across the bar (overlapping into the next one).
  if (k === 0) {
    const root = degreeMidi(score, chord, 1);
    for (const midi of [root, root + 7])
      ev.push({ role: 'bed', inst: ens.bed, kind: 'note', midi, dur: beat * S + 1.5, vel: 0.5 });
  }

  // Lead: the silhouette melody, thinned per texture so the result stays ambient.
  const leadEvery = {
    sustain: k % 2 === 0,
    arp: k % 4 === 0,
    pulse: k % 2 === 1,
    sparse: k % 3 === 0,
  };
  if (lead.on && leadEvery[score.texture])
    ev.push({
      role: 'lead',
      inst: ens.lead,
      kind: 'note',
      midi: lead.midi,
      dur: beat * 2,
      vel: lead.vel * 0.8,
    });

  // Counter: top and bottom voices, or a rising arpeggio over the chord for shell surfaces.
  if (ens.arp) {
    const tones = [0, 2, 4, 7, 9, 11];
    const s = samples[k % samples.length];
    if (s.on)
      ev.push({
        role: 'counter',
        inst: ens.counter,
        kind: 'note',
        midi: degreeMidi(score, chord + tones[k % tones.length], 1),
        dur: beat * 1.5,
        vel: 0.35 + 0.4 * (s.vel - 0.4),
      });
  } else {
    const top = samples[1],
      low = samples[2];
    if (top?.on && k % 4 === 2)
      ev.push({
        role: 'counter',
        inst: ens.counter,
        kind: 'note',
        midi: top.midi,
        dur: beat * 3,
        vel: top.vel * 0.55,
      });
    if (low?.on && k % 8 === 6)
      ev.push({
        role: 'counter',
        inst: ens.counter,
        kind: 'note',
        midi: low.midi,
        dur: beat * 4,
        vel: low.vel * 0.6,
      });
  }

  // Percussion: drum blocks keep a soft pulse; contour surfaces tap their contour count per bar.
  if (ens.perc === 'frameDrum') {
    if (k === 0 || (k === S / 2 && lead.on))
      ev.push({ role: 'perc', inst: 'frameDrum', kind: 'hit', key: 'low', dur: 2, vel: 0.7 });
    else if (k % 4 === 2 && samples.some((s) => s.on))
      ev.push({ role: 'perc', inst: 'frameDrum', kind: 'hit', key: 'muted', dur: 1, vel: 0.4 });
  } else if (ens.perc === 'slitDrum') {
    const every = Math.max(1, Math.round(S / score.bands));
    if (k % every === 0)
      ev.push({
        role: 'perc',
        inst: 'slitDrum',
        kind: 'hit',
        key: (k / every) % 2 ? 'high' : 'low',
        dur: 1.5,
        vel: 0.55,
      });
  }

  // Shimmer: strands get a slow wind-chime sweep every other bar.
  if (ens.shimmer && k === 0 && bar % 2 === 0)
    ev.push({
      role: 'shimmer',
      inst: ens.shimmer,
      kind: 'hit',
      key: bar % 4 === 0 ? 'down' : 'up',
      dur: 5,
      vel: 0.5,
    });

  return ev;
}
