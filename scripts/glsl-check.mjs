// SPDX-License-Identifier: Apache-2.0
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @param {string} cmd */
function has(cmd) {
  const r = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
  return r.status === 0;
}

const validator = has('glslangValidator') ? 'glslangValidator' : has('glslang') ? 'glslang' : null;
if (!validator) {
  console.error('glslangValidator not found (install glslang-tools)');
  process.exit(1);
}

const noise = fs.readFileSync(path.join(root, 'third_party/webgl-noise/src/noise3D.glsl'), 'utf8');
const prelude = fs.readFileSync(path.join(root, 'src/render/glsl/prelude.glsl'), 'utf8');
const scene = fs.readFileSync(path.join(root, 'src/render/glsl/scene.glsl'), 'utf8');
const vertex = fs.readFileSync(path.join(root, 'src/render/glsl/vertex.vert.glsl'), 'utf8');

const fragmentProbe = `#version 300 es
precision highp float;
uniform vec4 P[8];
#define MAXSTEPS 120
${noise}
${prelude}
float tree(vec3 p){ return 0.0; }
float ctree(vec3 p){ return 0.0; }
${scene}
void main(){}
`;

const tmpDir = fs.mkdtempSync(path.join(root, '.glsl-check-'));
const files = [
  ['vertex.vert.glsl', vertex],
  ['fragment.frag.glsl', fragmentProbe],
];

let failed = false;
for (const [name, src] of files) {
  const file = path.join(tmpDir, name);
  fs.writeFileSync(file, src);
  try {
    execFileSync(validator, ['-S', name.endsWith('.vert.glsl') ? 'vert' : 'frag', file], {
      stdio: 'pipe',
    });
    console.log(`ok ${name}`);
  } catch (e) {
    failed = true;
    console.error(`fail ${name}`);
    if (e.stdout) console.error(String(e.stdout));
    if (e.stderr) console.error(String(e.stderr));
  }
}

fs.rmSync(tmpDir, { recursive: true, force: true });
if (failed) process.exit(1);
console.log('glsl: all checks passed');
