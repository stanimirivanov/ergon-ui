import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import type {
  Browser,
  BrowserContext,
  Locator,
  Page,
  Video,
} from '@playwright/test';

import type { GuideChapter, GuideStep } from './guide-chapter';
import { installSimulatedGuideNetworkBoundary } from './simulated-guide-network-boundary';

const guideOutputRoot = path.join(workspaceRoot, 'dist', 'user-guide');
const guideViewport = { width: 1440, height: 900 } as const;

function isGuideMode(): boolean {
  const mode = process.env['ERGON_E2E_MODE'];
  if (mode === undefined || mode === 'test-only') return false;
  if (mode === 'user-guide') return true;
  throw new Error('ERGON_E2E_MODE must be test-only or user-guide.');
}

/**
 * Executes one asserted Playwright workflow in test-only or narrated mode.
 * The dedicated context is the exact video boundary; aborted runs discard
 * incomplete artifacts. Step IDs and order are checked in both modes.
 */
export class UserGuideSession {
  readonly page: Page;

  private readonly context: BrowserContext;
  private readonly chapter: GuideChapter;
  private readonly directory: string;
  private readonly recordsGuide: boolean;
  private readonly video: Video | null;
  private readonly networkBoundary: {
    assertNoUnexpectedRequests: () => Promise<void>;
  } | null;
  private readonly images: { id: string; image: string }[] = [];
  private nextStepIndex = 0;
  private contextClosed = false;

  private constructor(
    context: BrowserContext,
    page: Page,
    chapter: GuideChapter,
    directory: string,
    recordsGuide: boolean,
    networkBoundary: { assertNoUnexpectedRequests: () => Promise<void> } | null,
  ) {
    this.context = context;
    this.page = page;
    this.chapter = chapter;
    this.directory = directory;
    this.recordsGuide = recordsGuide;
    this.video = page.video();
    this.networkBoundary = networkBoundary;
  }

  static async start(
    browser: Browser,
    baseURL: string,
    chapter: GuideChapter,
  ): Promise<UserGuideSession> {
    const recordsGuide = isGuideMode();
    const url = new URL(baseURL);
    if (
      recordsGuide &&
      (!['localhost', '127.0.0.1'].includes(url.hostname) ||
        url.protocol !== 'http:')
    ) {
      throw new Error('User-guide scenarios require a local HTTP workbench.');
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(chapter.slug)) {
      throw new Error('Guide slug must be lowercase hyphenated words.');
    }

    const directory = path.join(guideOutputRoot, chapter.slug);
    if (recordsGuide) {
      await mkdir(path.join(directory, 'assets'), { recursive: true });
    }
    const context = await browser.newContext({
      baseURL,
      colorScheme: 'light',
      locale: 'en-GB',
      reducedMotion: 'reduce',
      timezoneId: 'UTC',
      viewport: guideViewport,
      ...(recordsGuide ? { serviceWorkers: 'block' as const } : {}),
      ...(recordsGuide
        ? {
            recordVideo: {
              dir: path.join(directory, 'assets'),
              size: guideViewport,
            },
          }
        : {}),
    });
    const networkBoundary = recordsGuide
      ? await installSimulatedGuideNetworkBoundary(context, url.origin)
      : null;
    const page = await context.newPage();
    return new UserGuideSession(
      context,
      page,
      chapter,
      directory,
      recordsGuide,
      networkBoundary,
    );
  }

  async action(
    id: string,
    target: Locator,
    perform: () => Promise<void>,
  ): Promise<void> {
    const step = this.consumeStep(id);
    if (this.recordsGuide) {
      await this.showAnnotation(target, step.title);
      await this.captureStep(step);
      // The dwell communicates the highlighted control in the recording;
      // assertions, not this delay, synchronize the application state.
      // eslint-disable-next-line playwright/no-wait-for-timeout
      await this.page.waitForTimeout(700);
      await this.clearAnnotation();
    }
    await perform();
  }

  async result(id: string, target: Locator): Promise<void> {
    const step = this.consumeStep(id);
    if (!this.recordsGuide) return;
    await this.showAnnotation(target, step.title);
    await this.captureStep(step);
    // Deliberate narration dwell, never used to wait for server state.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(1_200);
    await this.clearAnnotation();
  }

  async finish(): Promise<void> {
    if (this.nextStepIndex !== this.chapter.steps.length) {
      throw new Error(
        `Guide recorded ${this.nextStepIndex} of ${this.chapter.steps.length} declared steps.`,
      );
    }
    await this.closeContext();
    if (!this.recordsGuide) return;
    await this.networkBoundary?.assertNoUnexpectedRequests();
    if (this.video === null) {
      throw new Error('Playwright did not create the requested guide video.');
    }
    const video = `assets/${this.chapter.slug}.webm`;
    await rename(await this.video.path(), path.join(this.directory, video));
    // Playwright may record a short auxiliary page in the same context. Only
    // the declared workflow recording belongs in the published artifact.
    for (const asset of await readdir(path.join(this.directory, 'assets'))) {
      if (asset.endsWith('.webm') && asset !== `${this.chapter.slug}.webm`) {
        await rm(path.join(this.directory, 'assets', asset));
      }
    }
    await writeFile(
      path.join(this.directory, 'guide.json'),
      `${JSON.stringify(
        {
          ...this.chapter,
          steps: this.chapter.steps.map((step, index) => ({
            ...step,
            image: this.images[index]?.image,
          })),
          video,
        },
        undefined,
        2,
      )}\n`,
      'utf8',
    );
  }

  async abort(): Promise<void> {
    await this.closeContext();
    if (this.recordsGuide) {
      await rm(this.directory, { recursive: true, force: true });
    }
  }

  private consumeStep(id: string): GuideStep {
    const step = this.chapter.steps[this.nextStepIndex];
    if (step?.id !== id) {
      throw new Error(
        `Guide step ${this.nextStepIndex + 1} must be ${step?.id ?? '(none)'}, not ${id}.`,
      );
    }
    this.nextStepIndex += 1;
    return step;
  }

  private async captureStep(step: GuideStep): Promise<void> {
    const image = `assets/step-${String(this.images.length + 1).padStart(2, '0')}.png`;
    await this.page.screenshot({
      animations: 'disabled',
      path: path.join(this.directory, image),
    });
    this.images.push({ id: step.id, image });
  }

  private async showAnnotation(target: Locator, title: string): Promise<void> {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (box === null) throw new Error('Guide target is not visible.');
    await this.clearAnnotation();
    await this.page.evaluate(
      ({ targetBox, label }) => {
        if (
          document.querySelector('[data-ergon-guide-simulation="true"]') ===
          null
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
        note.textContent = label;
        note.style.cssText =
          'position:fixed;max-width:380px;padding:13px 16px;border-radius:10px;background:#193d31;color:white;font:600 16px/1.4 system-ui,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.25)';
        note.style.left = `${Math.min(Math.max(12, targetBox.x), window.innerWidth - 400)}px`;
        note.style.top = `${Math.min(targetBox.y + targetBox.height + 16, window.innerHeight - 90)}px`;
        layer.append(highlight, note);
        document.body.append(layer);
      },
      { targetBox: box, label: title },
    );
  }

  private async clearAnnotation(): Promise<void> {
    if (this.page.isClosed()) return;
    await this.page
      .locator('[data-ergon-guide-annotation="true"]')
      .evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
  }

  private async closeContext(): Promise<void> {
    if (this.contextClosed) return;
    await this.clearAnnotation();
    await this.context.close();
    this.contextClosed = true;
  }
}

/** Runs an asserted chapter and discards partial recordings on any failure. */
export async function runGuideScenario(
  browser: Browser,
  baseURL: string,
  chapter: GuideChapter,
  scenario: (session: UserGuideSession) => Promise<void>,
): Promise<void> {
  const session = await UserGuideSession.start(browser, baseURL, chapter);
  try {
    await scenario(session);
    await session.finish();
  } catch (error: unknown) {
    await session.abort();
    throw error;
  }
}
