// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  boxFilterTile,
  SNAP_TILE_SIZE,
  snapTileGrid,
  snapTileOrigin,
} from '../../../src/render/tiler.js';

describe('render/tiler', () => {
  it('snapTileGrid counts partial tiles', () => {
    const g = snapTileGrid(300, 100, 256);
    expect(g.cols).toBe(2);
    expect(g.rows).toBe(1);
    expect(g.total).toBe(2);
    expect(g.tileSize).toBe(256);
    expect(SNAP_TILE_SIZE).toBe(256);
  });

  it('snapTileOrigin steps in tile units', () => {
    expect(snapTileOrigin(0, 2, 256)).toEqual({ col: 0, row: 0, ox: 0, oy: 0 });
    expect(snapTileOrigin(3, 2, 256)).toEqual({ col: 1, row: 1, ox: 256, oy: 256 });
  });

  it('boxFilterTile averages supersamples', () => {
    const px = new Uint8Array(16);
    for (let i = 0; i < 16; i += 4) {
      px[i] = 100;
      px[i + 1] = 100;
      px[i + 2] = 100;
    }
    const band = new Uint8Array(12);
    const td = new Uint8ClampedArray(16);
    boxFilterTile(px, 2, 1, 1, 0, 0, 2, band, td, 1, 2);
    expect(band[0]).toBe(100);
    expect(td[0]).toBe(100);
  });
});
