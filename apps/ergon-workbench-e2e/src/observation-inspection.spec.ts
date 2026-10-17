import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { installSimulatedOwnedContextBff } from './guide/simulated-owned-context-bff';

test('keeps long untrusted comparison content inert, keyboard-contained and readable at narrow width', async ({
  page,
}, testInfo) => {
  const markup =
    '<img src=x onerror="globalThis.ergonEvidenceExecuted=true"><script>globalThis.ergonEvidenceExecuted=true</script>';
  const content = `${markup}\n${'A source statement is not a verified claim.\n'.repeat(45)}${'x'.repeat(450)}`;
  const bff = await installSimulatedOwnedContextBff(page, {
    observationContent: content,
  });
  await page.goto('/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8');
  await page.getByRole('button', { name: 'Open resolver console' }).click();
  const compare = page.getByRole('button', { name: 'Compare sources' });

  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 650 });
    await compare.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Source comparison' });
    const title = dialog.getByRole('heading', { name: 'Source comparison' });
    const close = dialog.getByRole('button', { name: 'Close comparison' });
    const second = dialog.getByRole('combobox', { name: 'Second observation' });
    await expect(title).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(second).toBeFocused();
    await title.focus();
    await expect(dialog.locator('img, script')).toHaveCount(0);
    await expect(dialog.locator('article').first()).toContainText(markup);
    if (width === 1440) {
      // A shorter source must stay top-aligned beside a long source, not spread
      // its own grid rows across the taller comparison card.
      const firstSummary = await dialog
        .locator('article')
        .first()
        .getByText('Customer cannot sign in', { exact: true })
        .boundingBox();
      const secondSummary = await dialog
        .locator('article')
        .nth(1)
        .getByText('Later SSO diagnostic received', { exact: true })
        .boundingBox();
      if (firstSummary === null || secondSummary === null)
        throw new Error('Comparison summaries have no bounds');
      expect(Math.abs(firstSummary.y - secondSummary.y)).toBeLessThan(2);
    }
    expect(
      await page.evaluate(() =>
        Reflect.has(globalThis, 'ergonEvidenceExecuted'),
      ),
    ).toBe(false);
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    const bounds = await dialog.boundingBox();
    if (bounds === null) throw new Error('Open comparison has no bounds');
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(
      await dialog.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    ).toBe(true);
    for (const cycle of [1, 2, 3]) {
      await test.step(`Title keyboard viewport endpoints, cycle ${cycle}`, async () => {
        // Rejected background focus must not retarget the title's scroll keys.
        await compare.evaluate((element) => element.focus());
        await expect(title).toBeFocused();
        await page.keyboard.press('End');
        await expect
          .poll(() => dialog.evaluate((element) => element.scrollTop))
          .toBeGreaterThan(0);
        await expect
          .poll(() =>
            dialog.evaluate(
              (element) =>
                element.scrollHeight - element.clientHeight - element.scrollTop,
            ),
          )
          .toBe(0);
        await expect(title).toBeFocused();
        await page.keyboard.press('Home');
        await expect
          .poll(() => dialog.evaluate((element) => element.scrollTop))
          .toBe(0);
        await expect(title).toBeFocused();
      });
    }
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(second).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(second).toBeFocused();
    // The native modal must reject background focus, not merely paint an overlay.
    await compare.evaluate((element) => element.focus());
    await expect(second).toBeFocused();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`source-comparison-${width}.png`),
      animations: 'disabled',
    });
    if (width === 1440) await page.keyboard.press('Escape');
    else await close.click();
    await expect(dialog).toHaveCount(0);
    await expect(compare).toBeFocused();
  }
  expect(bff.summaryReads()).toBe(1);
  expect(bff.claimCommands()).toBe(0);
});
