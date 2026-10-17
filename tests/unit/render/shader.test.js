// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  buildFragmentSource,
  getSharedGlslBlocks,
  getVertexSource,
} from '../../../src/render/shader.js';
import ENGINE from '../../helpers/engine.mjs';

describe('render/shader', () => {
  it('vertex shader targets WebGL2', () => {
    expect(getVertexSource()).toContain('#version 300 es');
  });

  it('shared blocks include vendored simplex noise', () => {
    const { noise, prelude, scene } = getSharedGlslBlocks();
    expect(noise).toContain('float snoise(vec3 v)');
    expect(prelude).toContain('fbmN');
    expect(scene).toContain('vec3 render');
  });

  it('buildFragmentSource inlines engine trees', () => {
    const g = ENGINE.startGenome();
    const src = buildFragmentSource(ENGINE, g, { maxSteps: 64 });
    expect(src).toContain('#define MAXSTEPS 64');
    expect(src).toContain('float tree');
    expect(src).toContain('float ctree');
    expect(src).toContain('out vec4 outColor');
  });
});
