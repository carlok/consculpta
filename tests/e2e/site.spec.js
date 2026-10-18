// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';

test.describe('Consculpta legacy site', () => {
  test.describe.configure({ mode: 'serial' });
  // Spin starts off: on CI's software WebGL a spinning stage starves the main thread and toasts or
  // tips can expire before the test acts on them. The overlay test toggles Spin explicitly.
  test.use({ reducedMotion: 'reduce' });
  // Sound is on by default and starts on the first interaction; keep it off except in the Sound test,
  // so other tests do not load Tone.js and samples on software WebGL.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        if (localStorage.getItem('nsb.sound') === null) localStorage.setItem('nsb.sound', '0');
      } catch {}
    });
  });
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
    await expect(page.locator('#curOffNote')).toContainText('Optional.');

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
    test.setTimeout(120_000);
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
    test.setTimeout(120_000);
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
    test.setTimeout(120_000);
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

  test('stage overlay holds view toggles; AI breeder sits after the shelf', async ({ page }) => {
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    const spin = page.locator('#stage #spin');
    await expect(spin).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('s');
    await expect(spin).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#stage #morph')).toHaveAttribute('aria-pressed', 'false');

    const order = await page.evaluate(
      () =>
        document
          .getElementById('shelfCount')
          .compareDocumentPosition(document.getElementById('curOn')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(order).toBeTruthy();
    await expect(page.locator('#curStatus')).toHaveText('');
  });

  test('wheel scrolls the page until the stage is engaged, then zooms', async ({ page }) => {
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    await expect(page.locator('#stageBusy')).toBeHidden();
    const box = await page.locator('#focus').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    // The tip hides itself after a couple of seconds; record that it appeared instead of racing it.
    await page.evaluate(() => {
      const tip = document.getElementById('stageTip');
      window.__tipShown = false;
      new MutationObserver(() => {
        if (!tip.hidden) window.__tipShown = true;
      }).observe(tip, { attributes: true, attributeFilter: ['hidden'] });
    });

    await page.mouse.wheel(0, 200);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => window.__tipShown)).toBe(true);
    await expect(page.locator('#readRes')).toContainText('zoom 1.00×');

    await page.locator('#stage').focus();
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 200);
    await expect(page.locator('#readRes')).not.toContainText('zoom 1.00×');
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test('reload keeps the litter and Undo history', async ({ page }) => {
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    await page.keyboard.press('2');
    await expect(page.locator('#plateId')).toHaveText(/^G2 · /);
    const plate = await page.locator('#plateId').textContent();
    const tags = await page.locator('#litter .pup-id').allTextContents();

    await page.reload();
    await expect(page.locator('#plateId')).toHaveText(plate);
    expect(await page.locator('#litter .pup-id').allTextContents()).toEqual(tags);
    await expect(page.locator('#undo')).toBeEnabled();
    await page.locator('#undo').click();
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
  });

  test('share link loads a specimen once and Undo returns yours', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    await page.locator('#random').click();
    await expect(page.locator('#plateId')).not.toHaveText('G1 · 74C8');
    const mine = await page.locator('#plateId').textContent();
    const code = await page.evaluate(() => ENGINE.DEFAULT_SPECIMEN_CODE);

    await page.goto('about:blank');
    await page.goto(`/consculpta/#${code}`);
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    await expect(page.locator('#toast')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('#toast')).toContainText('shared specimen');
    expect(new URL(page.url()).hash).toBe('');
    await page.locator('#toast .toast-act').click();
    await expect(page.locator('#plateId')).toHaveText(mine);
  });

  test('export sheet is a modal dialog and keeps snapshot options', async ({ page }) => {
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    await page.locator('#glsl').click();
    const sheet = page.locator('#sheet');
    await expect(sheet).toBeVisible();
    await expect(page.locator('#glslInfo')).toContainText('lines');
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('#sheet'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();

    await page.locator('#snap').click();
    await page.locator('#snapFrame').selectOption('square');
    await page.locator('#sheetClose').click();
    await page.reload();
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    await expect(page.locator('#snapFrame')).toHaveValue('square');
  });

  test('orbit hint retires after the first drag and stays retired', async ({ page }) => {
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    const hint = page.locator('.stage .hint');
    await expect(hint).toBeVisible();
    const box = await page.locator('#focus').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2);
    await page.mouse.up();
    await expect(hint).toBeHidden();
    await page.reload();
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    await expect(hint).toBeHidden();
  });

  test('discrete genes use segments and dim genes that do not apply', async ({ page }) => {
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    await expect(page.locator('#genome')).toHaveAttribute('open', '');
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
    await expect(page.locator('#genome')).toHaveAttribute('open', '');
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

  test('lineage strip brings back an earlier parent as a new step', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    await expect(page.locator('#lineage')).toBeHidden();
    await expect(page.locator('#litter')).toHaveAttribute('role', 'group');

    await page.keyboard.press('2');
    await expect(page.locator('#plateId')).toHaveText(/^G2 · /);
    const g2 = await page.locator('#plateId').textContent();
    const strip = page.locator('#lineage');
    await expect(strip).toBeVisible();
    await expect(strip.locator('.lin-cur')).toHaveText(g2);

    await strip.getByRole('button', { name: 'Go back to G1 · 74C8' }).click();
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    await expect(page.locator('#toast')).toContainText('Back to G1 · 74C8.');
    await expect(strip.getByRole('button')).toHaveCount(2);

    await page.locator('#toast .toast-act').click();
    await expect(page.locator('#plateId')).toHaveText(g2);
  });

  test('palette presets rewrite the colour genes with Undo', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    await expect(page.locator('#genome')).toHaveAttribute('open', '');
    const code = page.locator('#code');
    const before = await code.inputValue();
    const presets = page.locator('#presets button');
    expect(await presets.count()).toBeGreaterThanOrEqual(6);

    await page.getByRole('button', { name: 'Ember palette' }).click();
    await expect(page.locator('#toast')).toContainText('Ember palette.');
    await expect(code).not.toHaveValue(before);
    // Ember: frequency (c) 1, 0.7, 0.4 in the 0.3–1.7 gene range.
    await expect(page.locator('#gene-13')).toHaveValue('500');
    await expect(page.locator('#gene-15')).toHaveValue('71');

    await page.locator('#toast .toast-act').click();
    await expect(code).toHaveValue(before);
  });

  test('theme toggle sets data-theme and is remembered', async ({ page }) => {
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    const html = page.locator('html');
    const theme = page.getByRole('radiogroup', { name: 'Theme' });
    await expect(theme.getByRole('radio', { name: 'System' })).toBeChecked();
    await expect(html).not.toHaveAttribute('data-theme', /.+/);

    await theme.getByRole('radio', { name: 'Dark' }).check();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(theme.getByRole('radio', { name: 'Dark' })).toBeChecked();

    await theme.getByRole('radio', { name: 'Light' }).check();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await theme.getByRole('radio', { name: 'System' }).check();
    await expect(html).not.toHaveAttribute('data-theme', /.+/);
    expect(await page.evaluate(() => localStorage.getItem('nsb.theme'))).toBe('system');
  });

  test('Sound is on by default: armed until the first interaction, and off is remembered', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // Simulate a first visit for sound only (runs after the beforeEach default, once per test).
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('soundTest')) {
        localStorage.removeItem('nsb.sound');
        sessionStorage.setItem('soundTest', '1');
      }
    });
    const requests = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    const btn = page.locator('#stage #sound');
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect(btn).toHaveClass(/armed/);
    // Nothing audio-related loads before the visitor interacts.
    expect(await page.evaluate(() => typeof AUDIO)).toBe('undefined');
    expect(requests.some((u) => u.includes('audio.bundle') || u.includes('/vcsl/'))).toBe(false);

    // Any interaction starts it.
    await page.locator('h1').click();
    await expect
      .poll(() => page.evaluate(() => window.__sound?.playing === true), { timeout: 30_000 })
      .toBe(true);
    await expect(btn).not.toHaveClass(/armed/);
    await expect(page.locator('#vol')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__sound.stats.scheduled)).toBeGreaterThan(0);
    // The vendored samples load and take over from the fallback synth.
    await expect
      .poll(() => page.evaluate(() => window.__sound.stats.sampled), { timeout: 30_000 })
      .toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__sound.stats.loadError)).toBe('');
    const origin = new URL(page.url()).origin;
    const samples = requests.filter((u) => u.endsWith('.mp3'));
    expect(samples.length).toBeGreaterThan(0);
    for (const u of samples)
      expect(u.startsWith(`${origin}/consculpta/third_party/vcsl/`), u).toBe(true);
    // No third-party hosts (Tone's worklet code arrives as same-page blob: URLs, which are fine).
    expect(requests.filter((u) => /^https?:/.test(u) && !u.startsWith(origin))).toEqual([]);

    await page.evaluate(() => {
      window.__prevScore = window.__sound.score;
    });
    await page.keyboard.press('2');
    await expect(page.locator('#plateId')).toHaveText(/^G2 · /);
    expect(await page.evaluate(() => window.__sound.score !== window.__prevScore)).toBe(true);

    // A turns it off, and that sticks across a reload: no audio loads on interaction afterwards.
    await page.keyboard.press('a');
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => window.__sound.playing)).toBe(false);
    expect(await page.evaluate(() => localStorage.getItem('nsb.sound'))).toBe('0');
    await page.reload();
    await expect(page.locator('#plateId')).toHaveText(/^G2 · /);
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await page.locator('h1').click();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => typeof AUDIO)).toBe('undefined');
  });

  test('the Sound button turns armed sound off before it ever starts', async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('soundTest')) {
        localStorage.removeItem('nsb.sound');
        sessionStorage.setItem('soundTest', '1');
      }
    });
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    const btn = page.locator('#stage #sound');
    await expect(btn).toHaveClass(/armed/);
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await expect(btn).not.toHaveClass(/armed/);
    expect(await page.evaluate(() => typeof AUDIO)).toBe('undefined');
    expect(await page.evaluate(() => localStorage.getItem('nsb.sound'))).toBe('0');
  });

  test('wide screens use three columns instead of empty margins', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    const box = (sel) => page.locator(sel).boundingBox();
    const [stage, litter, keepers, curator] = await Promise.all(
      ['#stage', '.litter-block', '.keepers', '.curator'].map(box),
    );
    expect(litter.x).toBeGreaterThan(stage.x + stage.width);
    expect(keepers.x).toBeGreaterThan(litter.x + litter.width);
    expect(curator.x).toBe(keepers.x);
    expect(curator.y).toBeLessThan(keepers.y + keepers.height + 40);
    expect(keepers.x + keepers.width).toBeGreaterThan(1920 * 0.9);
  });

  test('the genome panel starts open and remembers being closed', async ({ page }) => {
    await page.goto('/consculpta/');
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    const genome = page.locator('#genome');
    await expect(genome).toHaveAttribute('open', '');
    await expect(page.locator('#fText')).toBeVisible();
    await page.locator('#genome > summary').click();
    await expect(genome).not.toHaveAttribute('open', '');
    await page.reload();
    await expect(page.locator('#plateId')).toHaveText('G1 · 74C8');
    await expect(genome).not.toHaveAttribute('open', '');
  });
});
