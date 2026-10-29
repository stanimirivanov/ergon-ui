import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';
import { nxE2EPreset } from '@nx/playwright/preset';
import { parse as parseYaml } from 'yaml';

const workflowPath = fileURLToPath(
  new URL('../../.github/workflows/user-guide.yml', import.meta.url),
);

const renderer = JSON.parse(
  await readFile(new URL('../visual/renderer.json', import.meta.url), 'utf8'),
);
const playwright = JSON.parse(
  await readFile(
    new URL(
      '../../node_modules/@playwright/test/package.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

function assertGuideRuntime(workflow) {
  const job = workflow.jobs.generate;
  assert.equal(job['runs-on'], 'ubuntu-24.04');
  assert.equal(job.container?.image, renderer.image);
  assert.equal(job.container.options, '--init --shm-size=256m');
  assert.equal(job.env?.PLAYWRIGHT_BROWSERS_PATH, '/ms-playwright');
  assert.equal(job['timeout-minutes'], 25);
  const generation = job.steps.find(
    (step) => step.name === 'Generate and validate the simulated guide',
  );
  assert.equal(generation?.run, 'pnpm guide:generate');
  assert.equal(generation['timeout-minutes'], 20);
  for (const owner of [job, generation]) {
    assert.equal(owner.if, undefined);
    assert.equal(owner['continue-on-error'], undefined);
  }
  assert.ok(
    job.steps.every(
      (step) => !/--with-deps|install-deps|apt-get/u.test(step.run ?? ''),
    ),
    'the guide image already supplies browser system dependencies',
  );
}

test('guide capture uses the matching immutable browser with diagnostic headroom', async () => {
  assert.equal(renderer.playwrightVersion, playwright.version);
  const workflow = parseYaml(await readFile(workflowPath, 'utf8'));
  assertGuideRuntime(workflow);
});

test('rejects mutable browser setup, mismatched images and weakened guide gates', async () => {
  const workflow = parseYaml(await readFile(workflowPath, 'utf8'));
  const mutations = [
    (job) => {
      job['runs-on'] = 'ubuntu-latest';
    },
    (job) => {
      job.container.image = 'mcr.microsoft.com/playwright:latest';
    },
    (job) => {
      delete job.env.PLAYWRIGHT_BROWSERS_PATH;
    },
    (job) => {
      job.steps.push({
        run: 'pnpm exec playwright install --with-deps chromium',
      });
    },
    (job) => {
      job.steps.find((step) => step.run === 'pnpm guide:generate')[
        'timeout-minutes'
      ] = 25;
    },
    (job) => {
      job.steps.find((step) => step.run === 'pnpm guide:generate')[
        'continue-on-error'
      ] = true;
    },
    (job) => {
      job.if = 'false';
    },
  ];
  for (const mutate of mutations) {
    const candidate = structuredClone(workflow);
    mutate(candidate.jobs.generate);
    assert.throws(() => assertGuideRuntime(candidate));
  }
});

test('CI reviews every guide run and publishes only validated main artifacts', async () => {
  const workflow = parseYaml(await readFile(workflowPath, 'utf8'));
  assert.deepEqual(Object.keys(workflow.on).sort(), [
    'pull_request',
    'push',
    'workflow_dispatch',
  ]);
  assert.deepEqual(workflow.on.push.branches, ['main']);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.deepEqual(workflow.jobs.generate.permissions, { contents: 'read' });

  const steps = workflow.jobs.generate.steps;
  assert.equal(
    steps.find((step) => step.uses?.startsWith('actions/checkout@'))?.with?.[
      'persist-credentials'
    ],
    false,
  );
  assert.ok(
    steps.some((step) => step.run === 'pnpm install --frozen-lockfile'),
  );
  assert.ok(steps.some((step) => step.run === 'pnpm guide:generate'));

  const artifact = steps.find(
    (step) =>
      step.uses?.startsWith('actions/upload-artifact@') &&
      step.if === undefined,
  );
  assert.equal(artifact?.with?.path, 'dist/user-guide');
  assert.equal(artifact.with['if-no-files-found'], 'error');
  assert.match(artifact.with.name, /^simulated-user-guide-/u);
  const failureArtifact = steps.find(
    (step) =>
      step.uses?.startsWith('actions/upload-artifact@') &&
      step.if === '${{ failure() || cancelled() }}',
  );
  // Nx paths are relative to the Playwright config, not the repository root.
  // Derive the uploaded directory from the installed preset that config uses.
  const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
  const configDirectory = path.join(repositoryRoot, 'apps/ergon-workbench-e2e');
  const { outputDir } = nxE2EPreset(configDirectory, { testDir: './src' });
  const diagnosticDirectory = path
    .relative(repositoryRoot, path.resolve(configDirectory, outputDir, '..'))
    .split(path.sep)
    .join('/');
  assert.deepEqual(failureArtifact?.with?.path.trim().split(/\r?\n/u), [
    'dist/user-guide',
    diagnosticDirectory,
  ]);
  const mainOnly =
    "${{ github.ref == 'refs/heads/main' && github.event_name != 'pull_request' }}";
  const pagesArtifact = steps.find((step) =>
    step.uses?.startsWith('actions/upload-pages-artifact@'),
  );
  assert.equal(pagesArtifact?.if, mainOnly);
  assert.equal(pagesArtifact.with.path, 'dist/user-guide');

  const publish = workflow.jobs.publish;
  assert.equal(publish.needs, 'generate');
  assert.equal(publish.if, mainOnly);
  assert.deepEqual(publish.permissions, {
    pages: 'write',
    'id-token': 'write',
  });
  assert.equal(publish.environment.name, 'github-pages');
  assert.equal(
    publish.environment.url,
    '${{ steps.deployment.outputs.page_url }}',
  );
  assert.ok(
    publish.steps.some((step) =>
      step.uses?.startsWith('actions/configure-pages@'),
    ),
  );
  assert.ok(
    publish.steps.some(
      (step) =>
        step.id === 'deployment' &&
        step.uses?.startsWith('actions/deploy-pages@'),
    ),
  );
  assert.doesNotMatch(JSON.stringify(workflow), /secrets\./u);
});
