// SPDX-License-Identifier: Apache-2.0

/** Litter thumbnail orbit (yaw, pitch, distance). */
export const THUMB_CAM = [0.7, 0.38, 3.35];

export const ZMIN = 1.25;
export const ZMAX = 8;

/**
 * Clamp zoom distance.
 * @param {number} dist
 */
export function clampZoom(dist) {
  return Math.min(ZMAX, Math.max(ZMIN, dist));
}
