// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';

test.describe('Consculpta legacy site', () => {
  test('loads without a blocking modal or console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/consculpta/');
    await expect(page.getByRole('heading', { level: 1, name: 'Consculpta' })).toBeVisible();

    const sheet = page.locator('#sheet');
    await expect(sheet).toBeHidden();
    await expect(page.getByRole('dialog', { name: 'Snapshot' })).toBeHidden();

    await expect(page.locator('#focus')).toBeVisible();
    expect(errors, `console errors: ${errors.join('; ')}`).toEqual([]);
  });
});
