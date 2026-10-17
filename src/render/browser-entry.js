// SPDX-License-Identifier: Apache-2.0
import {
  boxFilterTile,
  buildShadertoyExport,
  clampZoom,
  createRenderer,
  enqueueThumb,
  filterRows,
  getSharedGlslBlocks,
  pngStream,
  processThumbQueue,
  SNAP_TILE_SIZE,
  snapTileGrid,
  snapTileOrigin,
  THUMB_CAM,
  ZMAX,
  ZMIN,
} from './index.js';

const RENDER = {
  createRenderer,
  THUMB_CAM,
  ZMIN,
  ZMAX,
  clampZoom,
  SNAP_TILE_SIZE,
  snapTileGrid,
  snapTileOrigin,
  boxFilterTile,
  pngStream,
  filterRows,
  getSharedGlslBlocks,
  buildShadertoyExport,
  processThumbQueue,
  enqueueThumb,
};

export default RENDER;

if (typeof globalThis !== 'undefined') {
  /** @type {typeof RENDER} */
  // @ts-expect-error legacy global for IIFE bundle
  globalThis.RENDER = RENDER;
}
