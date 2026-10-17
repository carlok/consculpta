// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';

test.describe('Consculpta legacy site', () => {
  test.describe.configure({ mode: 'serial' });
  test('shows GitHub footer link and AI breeder off on first visit', async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/consculpta/');
    await expect(page.getByRole('heading', { level: 1, name: 'Consculpta' })).toBeVisible();

    // Footer copyright is written at the end of legacy/app.js (after breed/WebGL init).
    // Wait once for a fully bootstrapped first visit instead of timing out on early asserts.
    await page.waitForFunction(
      () => {
        const on = document.getElementById('curOn');
        const foot = document.getElementById('footerCopy');
        const plate = document.getElementById('plateId');
        return (
          on?.getAttribute('aria-pressed') === 'false' &&
          on?.textContent === 'Off' &&
          foot?.textContent?.includes('carlok') &&
          plate?.textContent?.includes('74C8')
        );
      },
      null,
      { timeout: 90_000 },
    );

    const repo = page.locator('footer a.footer-repo');
    await expect(repo).toHaveAttribute('href', 'https://github.com/carlok/consculpta');
    await expect(repo).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(repo).toHaveAttribute('target', '_blank');

    await expect(page.locator('#footerCopy')).toContainText('©');
    await expect(page.locator('#footerCopy')).toContainText('carlok');

    await expect(page.locator('#curOn')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#curOn')).toHaveText('Off');
    await expect(page.locator('#curOffNote')).toContainText('Off.');

    await expect(page.locator('#bigView')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#bench')).not.toHaveClass(/big/);

    await expect(page.locator('#plateId')).toContainText('74C8');
    await expect(page.locator('#code')).toHaveValue(
      await page.evaluate(() => ENGINE.DEFAULT_SPECIMEN_CODE),
    );
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

  test('dims stale litter thumbnails until the new litter renders', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/consculpta/');
    const pups = page.locator('#litter .pup');
    await expect(pups).toHaveCount(6);
    await expect(page.locator('#litter .pup.pending')).toHaveCount(0, { timeout: 90_000 });

    await page.locator('#reroll').click();
    // Labels change at once; every picture is stale until its render job runs.
    expect(await page.locator('#litter .pup.pending').count()).toBeGreaterThan(0);
    await expect(page.locator('#litter .pup.pending')).toHaveCount(0, { timeout: 90_000 });
  });

  test('genome summary describes the current parent', async ({ page }) => {
    await page.goto('/consculpta/');
    await expect(page.locator('#genomeSum')).toHaveText(
      /^\d+ nodes · \d+ noise · (sphere|cube|drum)$/,
    );
  });

  test('hides Large view on phones', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/consculpta/');
    await expect(page.locator('#bigView')).toBeHidden();
  });

  test('number keys adopt, Z undoes and Shift+Z redoes', async ({ page }) => {
    await page.goto('/consculpta/');
    const plate = page.locator('#plateId');
    await expect(plate).toHaveText('G1 · 74C8');
    const tag = (await page.locator('#pup-1 .pup-id').textContent()).split(' · ')[1];

    await page.keyboard.press('2');
    await expect(plate).toHaveText(`G2 · ${tag}`);
    await expect(page.locator('#toast')).toContainText('Adopted offspring 2');

    await page.keyboard.press('z');
    await expect(plate).toHaveText('G1 · 74C8');
    await expect(page.locator('#redo')).toBeEnabled();

    await page.keyboard.press('Shift+Z');
    await expect(plate).toHaveText(`G2 · ${tag}`);
    await expect(page.locator('#redo')).toBeDisabled();
  });

  test('toast Undo reverts Random', async ({ page }) => {
    await page.goto('/consculpta/');
    const plate = page.locator('#plateId');
    await expect(plate).toHaveText('G1 · 74C8');
    await page.locator('#random').click();
    await expect(plate).not.toHaveText('G1 · 74C8');
    await page.locator('#toast .toast-act').click();
    await expect(plate).toHaveText('G1 · 74C8');
    await expect(page.locator('#toast')).toBeHidden();
  });

  test('Keep shows kept state and shelf delete can be undone', async ({ page }) => {
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    const keep = page.locator('#keep');
    await keep.click();
    await expect(keep).toHaveText('Kept · K1');
    await expect(page.locator('#shelf .kept')).toHaveCount(1);

    await page.locator('#shelf .kept-del').click();
    await expect(page.locator('#shelf .kept')).toHaveCount(0);
    await expect(keep).toHaveText('Keep');
    await page.locator('#toast .toast-act').click();
    await expect(page.locator('#shelf .kept')).toHaveCount(1);
    await expect(keep).toHaveText('Kept · K1');
  });

  test('? opens the shortcuts list and Escape closes it', async ({ page }) => {
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    await page.keyboard.press('?');
    await expect(page.locator('#keys')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#keys')).toBeHidden();
  });

  test('discrete genes use segments and dim genes that do not apply', async ({ page }) => {
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    await page.locator('#genome > summary').click();
    const surface = page.locator('#gene-2');
    await expect(surface.getByRole('radio')).toHaveCount(3);
    // Default specimen is a solid sphere: segments reflect the current genes on load.
    await expect(surface.getByRole('radio', { name: 'solid' })).toBeChecked();
    await expect(page.locator('#gene-4').getByRole('radio', { name: 'sphere' })).toBeChecked();
    const thickness = page.locator('#gene-1').locator('xpath=..');

    await surface.getByRole('radio', { name: 'solid' }).check();
    await expect(page.locator('#plateKind')).toContainText('solid');
    await expect(thickness).toHaveClass(/idle/);

    await surface.getByRole('radio', { name: 'shell' }).check();
    await expect(page.locator('#plateKind')).toContainText('shell');
    await expect(thickness).not.toHaveClass(/idle/);
    await expect(page.locator('#gene-3').locator('xpath=..')).toHaveClass(/idle/);
  });

  test('formula editor flags parse errors and applies with Ctrl+Enter', async ({ page }) => {
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    await page.locator('#genome > summary').click();
    const shape = page.locator('#fText');
    const original = await shape.inputValue();

    await shape.fill('add(');
    await expect(page.locator('#fErr')).toContainText('Shape:');
    await expect(shape).toHaveAttribute('aria-invalid', 'true');

    await shape.fill(original);
    await expect(shape).toHaveAttribute('aria-invalid', 'false');
    await shape.press('Control+Enter');
    await expect(page.locator('#toast')).toContainText('Formula applied.');
  });
});
