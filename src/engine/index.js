// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck
/**
 * Public formula engine API (matches legacy `ENGINE` global).
 * @typedef {import('./types.js').FormulaNode} FormulaNode
 * @typedef {import('./types.js').Genome} Genome
 */

import { fitIso, stats, strandP, uniforms, viable } from './analysis.js';
import { glsl } from './codegen-glsl.js';
import {
  DEFAULT_CAMERA,
  DEFAULT_SPECIMEN_CODE,
  DEFAULT_SPECIMEN_TAG,
  defaultSpecimenGenome,
} from './default-specimen.js';
import { js } from './evaluate.js';
import { BANK, crossover, mutate, randomGenome, startGenome } from './evolve.js';
import {
  cloneG,
  DISCRETE,
  decode,
  encode,
  fmtScalar,
  NS,
  SCALARS,
  STRANDS_OFF,
  STRANDS_ON,
  tag,
  val,
} from './genome.js';
import { fbmJS, seedVec, snoise } from './noise.js';
import { BY_KIND, LANG, NCHILD, OPS } from './ops.js';
import { palCSS, paletteToGenes } from './palette.js';
import { parse } from './parse.js';
import { pretty, print } from './print.js';
import { mulberry32, setRandom } from './rng.js';
import { cost, depth, grow, size } from './tree.js';

export {
  BANK,
  BY_KIND,
  cloneG,
  cost,
  crossover,
  DEFAULT_CAMERA,
  DEFAULT_SPECIMEN_CODE,
  DEFAULT_SPECIMEN_TAG,
  DISCRETE,
  decode,
  defaultSpecimenGenome,
  depth,
  encode,
  fbmJS,
  fitIso,
  fmtScalar,
  glsl,
  grow,
  js,
  LANG,
  mulberry32,
  mutate,
  NCHILD,
  NS,
  OPS,
  palCSS,
  paletteToGenes,
  parse,
  pretty,
  print,
  randomGenome,
  SCALARS,
  STRANDS_OFF,
  STRANDS_ON,
  seedVec,
  setRandom,
  size,
  snoise,
  startGenome,
  stats,
  strandP,
  tag,
  uniforms,
  val,
  viable,
};

/** @typedef {import('./types.js').FormulaNode} FormulaNode */
/** @typedef {import('./types.js').Genome} Genome */

const engine = {
  OPS,
  LANG,
  SCALARS,
  NS,
  DISCRETE,
  STRANDS_ON,
  STRANDS_OFF,
  val,
  fmtScalar,
  snoise,
  seedVec,
  parse,
  print,
  pretty,
  glsl,
  js,
  stats,
  viable,
  uniforms,
  mutate,
  crossover,
  fitIso,
  randomGenome,
  startGenome,
  defaultSpecimenGenome,
  DEFAULT_SPECIMEN_CODE,
  DEFAULT_SPECIMEN_TAG,
  DEFAULT_CAMERA,
  cloneG,
  encode,
  decode,
  tag,
  palCSS,
  paletteToGenes,
  size,
  cost,
  depth,
  grow,
  strandP,
  setRandom,
  mulberry32,
  BY_KIND,
  NCHILD,
  BANK,
  fbmJS,
};

export default engine;
