import { expect, test } from '@playwright/test';
import { runGuideScenario } from './guide/user-guide-session';
import { runExecutionGuide } from './guide/run-execution-guide';
import {
  showGuideAnnotation,
  clearGuideAnnotation,
} from './guide/guide-annotation';

// Deliberately not tagged as a book chapter: this verifies the ordinary, non-recording harness path.
test('guide checkpoints reject ambiguous targets during ordinary browser verification', async ({
  browser,
  baseURL,
}) => {
  const [first, second] = runExecutionGuide.steps;
  if (first === undefined || second === undefined)
    throw new Error('Checkpoint fixture requires two steps');
  const chapter = {
    ...runExecutionGuide,
    order: 999,
    slug: 'checkpoint-validation-only',
    steps: [
      { ...first, id: 'reject-ambiguous' },
      { ...second, id: 'accept-unique' },
    ],
  };
  await runGuideScenario(
    browser,
    baseURL ?? 'http://localhost:4300',
    chapter,
    async (guide) => {
      await guide.page.setContent(
        '<main><h1>Checkpoint fixture</h1><button>Repeated target</button><button>Repeated target</button></main>',
      );
      await expect(
        guide.result(
          'reject-ambiguous',
          guide.page.getByRole('button', {
            name: 'Repeated target',
            exact: true,
          }),
        ),
      ).rejects.toThrow();
      await guide.result(
        'accept-unique',
        guide.page.getByRole('heading', {
          name: 'Checkpoint fixture',
          exact: true,
        }),
      );
    },
  );
});

for (const width of [320, 1440]) {
  test(`guide annotations stay above a native modal at ${width}px without moving focus`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 400 });
    await page.setContent(
      '<dialog style="position:fixed;inset:0;margin:0;border:0;width:100vw;height:100vh;max-width:none;max-height:none"><h1>Private inspector</h1><button style="position:fixed;left:20px;top:200px">Inspect note</button></dialog>',
    );
    await page.locator('dialog').evaluate((dialog) => {
      if (!(dialog instanceof HTMLDialogElement))
        throw new Error('Expected native dialog fixture');
      dialog.showModal();
    });
    const target = page.getByRole('button', { name: 'Inspect note' });
    await target.focus();
    await showGuideAnnotation(page, target, 'Read the note attribution');
    const caption = page.locator('[data-ergon-guide-caption="true"]');
    const paintsAboveModal = await caption.evaluate((element) => {
      element.style.pointerEvents = 'auto';
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      element.style.pointerEvents = 'none';
      return hit === element || (hit !== null && element.contains(hit));
    });
    expect(paintsAboveModal).toBe(true);
    await expect(target).toBeFocused();
    await clearGuideAnnotation(page);
    await expect(caption).toHaveCount(0);
    await expect(target).toBeFocused();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
  test(`guide captions wrap inside ${width}px and avoid the target when space permits`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 400 });
    await page.setContent(
      '<main><button style="position:fixed;left:20px;top:320px">Annotation target</button></main>',
    );
    const target = page.getByRole('button', { name: 'Annotation target' });
    const label = `Inspect using the keyboard at narrow width ${'unbroken'.repeat(8)}`;
    await showGuideAnnotation(page, target, label);
    const caption = page.locator('[data-ergon-guide-caption="true"]');
    await expect(caption).toHaveText(label);
    const bounds = await caption.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        wraps:
          element.scrollWidth <= element.clientWidth &&
          element.scrollHeight <= element.clientHeight,
      };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(12);
    expect(bounds.right).toBeLessThanOrEqual(width - 12);
    expect(bounds.top).toBeGreaterThanOrEqual(12);
    expect(bounds.bottom).toBeLessThanOrEqual(304);
    expect(bounds.wraps).toBe(true);
    await target.evaluate((element) => {
      element.style.top = '20px';
    });
    await showGuideAnnotation(page, target, label);
    await expect(caption).toHaveCount(1);
    const below = await caption.evaluate(
      (element) => element.getBoundingClientRect().top,
    );
    expect(below).toBeGreaterThanOrEqual(57);
    await clearGuideAnnotation(page);
    await expect(caption).toHaveCount(0);
    await expect(target).toBeVisible();
  });
}
