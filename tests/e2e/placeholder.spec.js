// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';

test('dev shell placeholder', async ({ page }) => {
  await page.goto('/src/index.html');
  await expect(page.getByText('Development shell')).toBeVisible();
});
