import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';

const workflowPath = fileURLToPath(
  new URL('../../.github/workflows/user-guide.yml', import.meta.url),
);

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
  assert.ok(
    steps.some(
      (step) =>
        step.uses?.startsWith('actions/upload-artifact@') &&
        step.if === 'failure()' &&
        step.with.path.includes('test-output/playwright'),
    ),
  );
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
