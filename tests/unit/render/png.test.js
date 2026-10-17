// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { crc32, filterRows, pngChunk } from '../../../src/render/png.js';

describe('render/png', () => {
  it('crc32 matches PNG chunk checksum', () => {
    const chunk = pngChunk('IHDR', new Uint8Array([1, 2, 3]));
    const len = chunk.length;
    const stored = new DataView(chunk.buffer).getUint32(len - 4);
    expect(stored).toBe(crc32(chunk, 4, len - 4));
  });

  it('filterRows emits sub filter rows', () => {
    const band = new Uint8Array([10, 20, 30, 40, 50, 60]);
    const out = filterRows(band, 2, 1);
    expect(out[0]).toBe(1);
    expect(out[1]).toBe(10);
    expect(out[4]).toBe(30);
    expect(out[5]).toBe(30);
  });
});
