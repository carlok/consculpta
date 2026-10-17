// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';

test.describe('Renderer noise parity', () => {
  test('default specimen thumb matches SwiftShader checksum', async ({ page }) => {
    await page.goto('/consculpta/');
    await expect(page.getByRole('heading', { level: 1, name: 'Consculpta' })).toBeVisible();

    const digest = await page.evaluate(async () => {
      const g = ENGINE.defaultSpecimenGenome();
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const r = RENDER.createRenderer({
        engine: ENGINE,
        canvas,
        coarsePointer: true,
      });
      if (!r.init()) throw new Error('WebGL2 unavailable');
      r.setBackground([0.82, 0.85, 0.81]);
      const e = r.programFor(g);
      for (let i = 0; i < 200; i++) {
        if (r.ready(e)) break;
        await new Promise((res) => requestAnimationFrame(res));
      }
      if (!r.ready(e)) throw new Error('shader not ready');
      r.drawWith(e, g, { fbo: true, w: 64, h: 64, cam: RENDER.THUMB_CAM, mt: 0 });
      const px = r.readRaw(64, 64);
      let s = '';
      for (let i = 0; i < px.length; i += 16) s += `${px[i]},${px[i + 1]},${px[i + 2]};`;
      return s;
    });

    const hash = createHash('sha256').update(digest).digest('hex');
    expect(hash).toBe('3556fc0912f228e6d48263d6dc6eecf763a2fc1dcaab63a1dc4a33a4e3514fe0');
  });
});
