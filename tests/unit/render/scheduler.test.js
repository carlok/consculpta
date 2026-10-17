// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { enqueueThumb, processThumbQueue } from '../../../src/render/scheduler.js';

describe('render/scheduler', () => {
  it('enqueueThumb replaces same key', () => {
    const cv = { width: 0, height: 0, dataset: {}, getContext: () => ({ putImageData: () => {} }) };
    const q = enqueueThumb([], 'a', { g: {}, canvas: cv, key: 'a', size: 8 });
    const q2 = enqueueThumb(q, 'a', { g: { id: 1 }, canvas: cv, key: 'a', size: 8 });
    expect(q2).toHaveLength(1);
    expect(q2[0].g).toEqual({ id: 1 });
  });

  it('processThumbQueue paints one job', () => {
    const cv = { width: 0, height: 0, dataset: {}, getContext: () => ({ putImageData: () => {} }) };
    const queue = [{ g: {}, canvas: cv, key: 'pup0', size: 4 }];
    const renderer = {
      programFor: () => ({ state: 'ready' }),
      ready: () => true,
      drawWith: () => {},
      readFBO: () => ({ data: new Uint8ClampedArray(64), width: 4, height: 4 }),
    };
    const done = processThumbQueue(queue, renderer, {
      cam: [0.7, 0.38, 3.35],
      morphT: 0,
      litterId: 3,
      paintError: () => {},
    });
    expect(done).toBe(true);
    expect(queue).toHaveLength(0);
    expect(cv.dataset.done).toBe('3');
  });
});
