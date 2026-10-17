// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const enginePath = join(dirname(fileURLToPath(import.meta.url)), '../../legacy/engine.snapshot.js');
const code = readFileSync(enginePath, 'utf8');
const module = { exports: {} };
const sandbox = vm.createContext({
  module,
  exports: module.exports,
  Math,
  JSON,
  parseFloat,
  parseInt,
  isFinite,
  Object,
  Array,
  String,
  Error,
  btoa,
  atob,
  encodeURIComponent,
  escape,
  unescape,
  decodeURIComponent,
});

vm.runInContext(code, sandbox);

/** @type {import('../../legacy/engine.js')} */
const ENGINE = module.exports;
export default ENGINE;
