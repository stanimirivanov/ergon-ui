import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import {
  expect,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  type Video,
} from '@playwright/test';

import type { GuideChapter, GuideStep } from './guide-chapter';
import { installSimulatedGuideNetworkBoundary } from './simulated-guide-network-boundary';
import { showGuideAnnotation, clearGuideAnnotation } from './guide-annotation';

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
 * incomplete artifacts. Step IDs/order and unique visible checkpoint targets
 * are checked in both modes, so recording cannot discover otherwise-hidden
 * locator ambiguity after ordinary browser verification has passed.
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
    await this.verifyTarget(target);
    if (this.recordsGuide) {
      await showGuideAnnotation(this.page, target, step.title);
      await this.captureStep(step);
      // The dwell communicates the highlighted control in the recording;
      // assertions, not this delay, synchronize the application state.
      // eslint-disable-next-line playwright/no-wait-for-timeout
      await this.page.waitForTimeout(700);
      await clearGuideAnnotation(this.page);
    }
    await perform();
  }

  async result(id: string, target: Locator): Promise<void> {
    const step = this.consumeStep(id);
    await this.verifyTarget(target);
    if (!this.recordsGuide) return;
    await showGuideAnnotation(this.page, target, step.title);
    await this.captureStep(step);
    // Deliberate narration dwell, never used to wait for server state.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(1_200);
    await clearGuideAnnotation(this.page);
  }

  private async verifyTarget(target: Locator): Promise<void> {
    await expect(target).toHaveCount(1);
    await expect(target).toBeVisible();
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

  private async closeContext(): Promise<void> {
    if (this.contextClosed) return;
    await clearGuideAnnotation(this.page);
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
