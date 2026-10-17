// SPDX-License-Identifier: Apache-2.0

/**
 * @typedef {{ g: unknown, canvas: HTMLCanvasElement, key: string, size: number, tries?: number }} ThumbJob
 * @typedef {{
 *   programFor: (g: unknown) => unknown,
 *   ready: (e: unknown) => boolean,
 *   drawWith: (e: unknown, g: unknown, o: Record<string, unknown>) => void,
 *   readFBO: (w: number, h: number) => ImageData,
 * }} RendererLike
 */

/**
 * Process one thumb job from the queue (non-blocking compile retries).
 * @param {ThumbJob[]} queue — mutated in place
 * @param {RendererLike} renderer
 * @param {{ cam: number[], morphT: number, litterId: number, paintError: (cv: HTMLCanvasElement, T: number) => void }} ctx
 * @returns {boolean} true if a job completed this call
 */
export function processThumbQueue(queue, renderer, ctx) {
  for (let n = 0; n < queue.length; n++) {
    const job = queue.shift();
    if (!job) return false;
    const e = renderer.programFor(job.g);
    if (!renderer.ready(e)) {
      if (e && typeof e === 'object' && 'state' in e && e.state === 'error') {
        ctx.paintError(job.canvas, job.size);
        continue;
      }
      queue.push(job);
      return false;
    }
    const T = job.size;
    renderer.drawWith(e, job.g, { fbo: true, w: T, h: T, cam: ctx.cam, mt: ctx.morphT });
    const img = renderer.readFBO(T, T);
    if (job.canvas.width !== T) {
      job.canvas.width = job.size;
      job.canvas.height = job.size;
    }
    job.canvas.getContext('2d')?.putImageData(img, 0, 0);
    job.canvas.dataset.done = String(ctx.litterId);
    return true;
  }
  return false;
}

/**
 * @param {ThumbJob[]} queue
 * @param {string} key
 * @param {ThumbJob} job
 */
export function enqueueThumb(queue, key, job) {
  const next = queue.filter((q) => q.key !== key);
  next.push(job);
  return next;
}
