import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';

const manifest = JSON.parse(
  await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
);
const workflow = parseYaml(
  await readFile(
    new URL('../../.github/workflows/verify.yml', import.meta.url),
    'utf8',
  ),
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

function assertVisualConfiguration(candidate) {
  const job = candidate.jobs.visual;
  assert.ok(job, 'visual comparison job is required');
  const step = job.steps.find(
    (entry) => entry.name === 'Verify Console visual baselines',
  );
  assert.equal(
    step?.run,
    'pnpm visual:check',
    'visual comparison must not update expectations',
  );
  for (const owner of [job, step]) {
    assert.equal(owner.if, undefined, 'visual gate must not be conditional');
    assert.equal(
      owner['continue-on-error'],
      undefined,
      'visual failures must not be tolerated',
    );
  }
  const startup = job.steps.find(
    (entry) => entry.name === 'Start pinned visual renderer',
  );
  assert.match(startup.run, /tools\/visual\/renderer\.json/u);
  assert.match(startup.run, /--platform linux\/amd64/u);
  assert.equal(
    job.steps.find((entry) => entry.uses?.startsWith('actions/checkout@'))
      ?.with?.['persist-credentials'],
    false,
  );
}

test('visual comparison uses a matching immutable renderer and a mandatory comparison-only gate', () => {
  assert.equal(renderer.playwrightVersion, playwright.version);
  assert.match(
    renderer.image,
    new RegExp(
      '^mcr\\.microsoft\\.com/playwright:v' +
        renderer.playwrightVersion.replaceAll('.', '\\.') +
        '-noble@sha256:[a-f0-9]{64}$',
      'u',
    ),
  );
  assert.equal(
    manifest.scripts['visual:check'],
    'playwright test --config=apps/ergon-workbench-e2e/playwright.visual.config.mts',
  );
  assertVisualConfiguration(workflow);
});

test('rejects conditional, tolerated or updating visual verification', () => {
  for (const alteration of [
    { if: 'false' },
    { 'continue-on-error': true },
    { run: 'pnpm visual:check --update-snapshots=all' },
  ]) {
    const changed = structuredClone(workflow);
    Object.assign(
      changed.jobs.visual.steps.find(
        (entry) => entry.name === 'Verify Console visual baselines',
      ),
      alteration,
    );
    assert.throws(() => assertVisualConfiguration(changed));
  }
  const changed = structuredClone(workflow);
  delete changed.jobs.visual;
  assert.throws(() => assertVisualConfiguration(changed));
});

function assertVerificationConfiguration(packageJson, verifyWorkflow) {
  // Nx's default formatting range requires Git refs absent from shallow PR checkouts.
  assert.equal(
    packageJson.scripts['format:check'],
    'nx format:check --all',
    'format:check must check all files without resolving a Git base/head',
  );
  assert.equal(
    packageJson.scripts['verify:workspace'],
    'pnpm format:check && pnpm guide:check && pnpm nx run-many -t lint typecheck test build',
    'workspace verification must retain formatting, guide validation and all four Nx targets',
  );
  const job = verifyWorkflow.jobs.verify;
  const workspaceStep = job.steps.find(
    (step) => step.name === 'Verify workspace',
  );
  assert.equal(workspaceStep?.run, 'pnpm verify:workspace');
  assert.equal(
    workspaceStep?.if,
    undefined,
    'workspace checks must not be conditionally skipped',
  );
  assert.equal(
    workspaceStep?.['continue-on-error'],
    undefined,
    'workspace failures must fail CI',
  );
  assert.equal(
    job['continue-on-error'],
    undefined,
    'failed verification must not be masked at job level',
  );
  assert.deepEqual(verifyWorkflow.permissions, { contents: 'read' });
  assert.equal(
    job.steps.find((step) => step.uses?.startsWith('actions/checkout@'))
      ?.with?.['persist-credentials'],
    false,
    'format verification must not require persisted checkout credentials',
  );
}

test('workspace verification is Git-ref-independent and retains the complete failure gate', () => {
  assertVerificationConfiguration(manifest, workflow);
});

test('rejects formatting commands that silently reintroduce Git range discovery', () => {
  for (const command of [
    'nx format:check',
    'nx format:check --base=main',
    'nx format:check --files=package.json',
  ]) {
    const changed = structuredClone(manifest);
    changed.scripts['format:check'] = command;
    assert.throws(
      () => assertVerificationConfiguration(changed, workflow),
      /without resolving a Git base\/head/u,
    );
  }
});

test('rejects dropped workspace verification capabilities', () => {
  const changed = structuredClone(manifest);
  changed.scripts['verify:workspace'] =
    'pnpm nx run-many -t lint typecheck build';
  assert.throws(
    () => assertVerificationConfiguration(changed, workflow),
    /retain formatting/u,
  );
});

test('rejects conditional or tolerated workspace failures', () => {
  for (const options of [{ if: 'false' }, { 'continue-on-error': true }]) {
    const changed = structuredClone(workflow);
    Object.assign(
      changed.jobs.verify.steps.find(
        (step) => step.name === 'Verify workspace',
      ),
      options,
    );
    assert.throws(
      () => assertVerificationConfiguration(manifest, changed),
      /must not|must fail/u,
    );
  }
  const changed = structuredClone(workflow);
  changed.jobs.verify['continue-on-error'] = true;
  assert.throws(
    () => assertVerificationConfiguration(manifest, changed),
    /must not be masked/u,
  );
});
