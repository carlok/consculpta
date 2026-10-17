// SPDX-License-Identifier: Apache-2.0
import noise3d from '../../third_party/webgl-noise/src/noise3D.glsl?raw';
import prelude from './glsl/prelude.glsl?raw';
import scene from './glsl/scene.glsl?raw';
import vertex from './glsl/vertex.vert.glsl?raw';

/** @typedef {{ glsl: (tree: unknown, name: string) => string }} EngineLike */

/**
 * GLSL shared between live fragment shaders and Shadertoy export (prelude + noise + scene).
 * @returns {{ prelude: string, scene: string, noise: string }}
 */
export function getSharedGlslBlocks() {
  return { prelude, scene, noise: noise3d };
}

/** @returns {string} */
export function getVertexSource() {
  return vertex;
}

/**
 * @param {EngineLike} engine
 * @param {{ t: unknown, c: unknown }} genome
 * @param {{ maxSteps: number }} opts
 */
export function buildFragmentSource(engine, genome, opts) {
  const { maxSteps } = opts;
  const body = `${noise3d}\n${prelude}\n${engine.glsl(genome.t, 'tree')}\n${engine.glsl(genome.c, 'ctree')}\n${scene}`;
  return `#version 300 es
precision highp float;
uniform vec4 P[8];
uniform vec2 uRes;
uniform vec2 uOff;
uniform float uFlip;
uniform vec3 uCam;
uniform vec3 uBg;
uniform float uMT;
out vec4 outColor;
#define MAXSTEPS ${maxSteps}
${body}
void main(){
  vec2 fc = uFlip > 0.5 ? vec2(uOff.x + gl_FragCoord.x, uRes.y - (uOff.y + gl_FragCoord.y)) : gl_FragCoord.xy;
  outColor = vec4(render(fc, uRes, uCam, uBg, uMT), 1.0);
}`;
}

/**
 * @param {{
 *   prelude: string,
 *   scene: string,
 *   noise: string,
 *   treeGlsl: string,
 *   colorGlsl: string,
 *   uniformRows: string,
 *   bg: string,
 *   morph: string,
 *   camExpr: string,
 * }} p
 */
export function buildShadertoyExport(p) {
  return `// Consculpta export
const vec4 P[8] = vec4[8](
${p.uniformRows}
);
const vec3 BG = vec3(${p.bg});
#define MORPH ${p.morph}
#define MAXSTEPS 160
${p.noise}
${p.prelude}
${p.treeGlsl}
${p.colorGlsl}
${p.scene}
void mainImage(out vec4 fragColor, in vec2 fragCoord){
  vec2 m = iMouse.z > 0.0 ? iMouse.xy/iResolution.xy - 0.5 : vec2(0.0);
  vec3 cam = vec3(${p.camExpr});
  fragColor = vec4(render(fragCoord, iResolution.xy, cam, BG, iTime*MORPH), 1.0);
}`;
}
