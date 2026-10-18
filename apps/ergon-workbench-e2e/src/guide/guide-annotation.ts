import type { Locator, Page } from '@playwright/test';

/** Replaces the recording overlay without moving focus. Captions wrap before their measured size determines viewport placement. */
export async function showGuideAnnotation(
  page: Page,
  target: Locator,
  title: string,
): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (box === null) throw new Error('Guide target is not visible.');
  await clearGuideAnnotation(page);
  await page.evaluate(
    ({ targetBox, label }) => {
      if (
        document.querySelector('[data-ergon-guide-simulation="true"]') === null
      ) {
        const badge = document.createElement('div');
        badge.dataset['ergonGuideSimulation'] = 'true';
        badge.textContent = 'SIMULATED DATA';
        badge.style.cssText =
          'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483646;padding:6px 10px;border-radius:7px;background:#f4d99d;color:#33220d;font:800 12px/1.2 system-ui,sans-serif;letter-spacing:.08em;pointer-events:none';
        (document.querySelector('main') ?? document.body).append(badge);
      }
      const layer = document.createElement('div');
      layer.dataset['ergonGuideAnnotation'] = 'true';
      layer.style.cssText =
        'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
      const highlight = document.createElement('div');
      highlight.style.cssText =
        'position:fixed;border:3px solid #d3a234;border-radius:10px;box-shadow:0 0 0 4px rgba(211,162,52,.24)';
      highlight.style.left = `${Math.max(4, targetBox.x - 4)}px`;
      highlight.style.top = `${Math.max(4, targetBox.y - 4)}px`;
      highlight.style.width = `${targetBox.width + 8}px`;
      highlight.style.height = `${targetBox.height + 8}px`;
      const note = document.createElement('div');
      note.dataset['ergonGuideCaption'] = 'true';
      note.textContent = label;
      note.style.cssText =
        'position:fixed;box-sizing:border-box;max-width:min(380px,calc(100vw - 24px));overflow-wrap:anywhere;padding:13px 16px;border-radius:10px;background:#193d31;color:white;font:600 16px/1.4 system-ui,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.25)';
      layer.append(highlight, note);
      document.body.append(layer);
      // A desktop allowance can make left negative on narrow screens. Measure
      // wrapped text, and prefer space outside the highlighted target.
      const bounds = note.getBoundingClientRect();
      note.style.left = `${Math.max(12, Math.min(targetBox.x, window.innerWidth - bounds.width - 12))}px`;
      const below = targetBox.y + targetBox.height + 16;
      const above = targetBox.y - bounds.height - 16;
      note.style.top = `${below + bounds.height <= window.innerHeight - 12 ? below : above >= 12 ? above : Math.max(12, window.innerHeight - bounds.height - 12)}px`;
    },
    { targetBox: box, label: title },
  );
}

/** Removes only caption/highlight layers; the simulation badge remains for the chapter. */
export async function clearGuideAnnotation(page: Page): Promise<void> {
  if (page.isClosed()) return;
  await page
    .locator('[data-ergon-guide-annotation="true"]')
    .evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
}
