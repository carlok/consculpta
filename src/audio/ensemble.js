// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
/**
 * The genome picks the band. Each role names a sampled instrument in third_party/vcsl (see
 * manifest.json): lead plays the silhouette melody, bed holds the chord, counter plays the top and
 * bottom voices, perc and shimmer add colour, gong marks a new parent.
 */

const BY_BLOCK = {
  sphere: { lead: 'vibes', bed: 'vibesBowed', counter: 'chimes', perc: null },
  cube: { lead: 'marimba', bed: 'organ', counter: 'kalimba', perc: null },
  drum: { lead: 'kalimba', bed: 'glasses', counter: 'harp', perc: 'frameDrum' },
};

/** Per-instrument level trims in dB, so roles sit together in the mix. */
export const TRIM_DB = {
  vibes: -4,
  vibesBowed: -11,
  marimba: -5,
  glock: -12,
  chimes: -12,
  glasses: -15,
  kalimba: -5,
  harp: -7,
  organ: -20,
  frameDrum: -8,
  slitDrum: -11,
  gong: -16,
  markTrees: -18,
};

/** @param {{block: string, texture: string, strands: boolean}} score */
export function ensembleFor(score) {
  const e = {
    ...(BY_BLOCK[score.block] || BY_BLOCK.sphere),
    shimmer: null,
    gong: 'gong',
    arp: false,
  };
  if (score.texture === 'arp') {
    e.counter = 'harp';
    e.arp = true;
  }
  if (score.texture === 'pulse') e.perc = 'slitDrum';
  if (score.strands) {
    e.lead = 'glock';
    e.bed = 'glasses';
    e.shimmer = 'markTrees';
  }
  return e;
}

/** Instruments an ensemble needs loaded, without duplicates. */
export function instrumentsOf(e) {
  return [...new Set([e.lead, e.bed, e.counter, e.perc, e.shimmer, e.gong].filter(Boolean))];
}
