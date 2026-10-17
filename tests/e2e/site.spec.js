// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';

test.describe('Consculpta legacy site', () => {
  test.describe.configure({ mode: 'serial' });
  test('shows GitHub footer link and AI breeder off on first visit', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/consculpta/');
    await expect(page.getByRole('heading', { level: 1, name: 'Consculpta' })).toBeVisible();

    const repo = page.locator('footer a.footer-repo');
    await expect(repo).toHaveAttribute('href', 'https://github.com/carlok/consculpta');
    await expect(repo).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(repo).toHaveAttribute('target', '_blank');

    await expect(page.locator('#footerCopy')).toContainText('©');
    await expect(page.locator('#footerCopy')).toContainText('carlok');

    await expect(page.locator('#curOn')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#curOn')).toHaveText('Off');
    await expect(page.locator('#curOffNote')).toContainText('Off.');
  });

  test('loads without a blocking modal or console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/consculpta/');
    await expect(page.getByRole('heading', { level: 1, name: 'Consculpta' })).toBeVisible();

    await expect(page.locator('#sheet')).toBeHidden();

    await expect(page.locator('#focus')).toBeVisible();
    expect(errors, `console errors: ${errors.join('; ')}`).toEqual([]);
  });
});
