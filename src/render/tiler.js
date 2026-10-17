// SPDX-License-Identifier: Apache-2.0

/** GPU tile size for high-resolution snapshot export. */
export const SNAP_TILE_SIZE = 256;

/**
 * @param {number} W
 * @param {number} H
 * @param {number} [tileSize]
 */
export function snapTileGrid(W, H, tileSize = SNAP_TILE_SIZE) {
  const cols = Math.ceil(W / tileSize);
  const rows = Math.ceil(H / tileSize);
  return { cols, rows, total: cols * rows, tileSize };
}

/**
 * @param {number} index
 * @param {number} cols
 * @param {number} tileSize
 */
export function snapTileOrigin(index, cols, tileSize) {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { col, row, ox: col * tileSize, oy: row * tileSize };
}

/**
 * Box-filter supersampled RGBA readback into band + tile ImageData.
 * @param {Uint8Array} px — RGBA, size R*R
 * @param {number} R — supersampled tile side (tileSize * ss)
 * @param {number} tw
 * @param {number} th
 * @param {number} ox
 * @param {number} _oy
 * @param {number} W — full image width
 * @param {Uint8Array} band — W * tileSize * 3 row buffer
 * @param {Uint8ClampedArray} td — tile ImageData.data (tileSize²*4)
 * @param {number} tileSize
 * @param {number} ss — supersample factor per axis
 */
export function boxFilterTile(
  /** @type {Uint8Array} */ px,
  /** @type {number} */ R,
  /** @type {number} */ tw,
  /** @type {number} */ th,
  /** @type {number} */ ox,
  /** @type {number} */ _oy,
  /** @type {number} */ W,
  /** @type {Uint8Array} */ band,
  /** @type {Uint8ClampedArray} */ td,
  /** @type {number} */ tileSize,
  /** @type {number} */ ss,
) {
  const n = ss * ss;
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const k = ((y * ss + sy) * R + x * ss + sx) * 4;
          r += px[k];
          g += px[k + 1];
          b += px[k + 2];
        }
      }
      r = (r / n + 0.5) | 0;
      g = (g / n + 0.5) | 0;
      b = (b / n + 0.5) | 0;
      const bi = (y * W + ox + x) * 3;
      band[bi] = r;
      band[bi + 1] = g;
      band[bi + 2] = b;
      const ti = (y * tileSize + x) * 4;
      td[ti] = r;
      td[ti + 1] = g;
      td[ti + 2] = b;
      td[ti + 3] = 255;
    }
  }
}
