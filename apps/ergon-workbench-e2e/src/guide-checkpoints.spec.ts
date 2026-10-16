import { expect, test } from '@playwright/test';
import { runGuideScenario } from './guide/user-guide-session';
import { runExecutionGuide } from './guide/run-execution-guide';

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
