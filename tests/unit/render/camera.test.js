// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { clampZoom, THUMB_CAM, ZMAX, ZMIN } from '../../../src/render/camera.js';

describe('render/camera', () => {
  it('clamps zoom distance', () => {
    expect(clampZoom(0.5)).toBe(ZMIN);
    expect(clampZoom(99)).toBe(ZMAX);
    expect(clampZoom(4)).toBe(4);
  });

  it('exposes litter thumb orbit', () => {
    expect(THUMB_CAM).toHaveLength(3);
  });
});
