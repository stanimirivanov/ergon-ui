import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assembleBook, readGuideManifest } from './book.mjs';

const slug = 'handle-work';
const substantialContext =
  'This step explains the resolver’s purpose, the authority boundary, the expected result, and the safe recovery action when ownership changes. '.repeat(
    22,
  );

function validManifest() {
  return {
    schemaVersion: 1,
    order: 10,
    slug,
    title: 'Handle work',
    summary: 'Claim and inspect an illustrative follow-up.',
    audience: 'Resolvers with current queue authority.',
    verification: 'simulated-bff',
    overview: [substantialContext],
    prerequisites: ['Use a verified browser session.'],
    steps: [
      {
        id: 'claim-work',
        title: 'Claim work',
        body: substantialContext,
        expected: 'The work appears in the owned list.',
        image: 'assets/step-01.png',
      },
    ],
    troubleshooting: [
      {
        symptom: 'Work is unavailable.',
        guidance: 'Refresh the list and recheck authority.',
      },
    ],
    limitations: ['This is simulated, not a live backend proof.'],
    video: 'assets/handle-work.webm',
  };
}

async function withGuide(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ergon-guide-test-'));
  const directory = path.join(root, slug);
  const manifestPath = path.join(directory, 'guide.json');
  try {
    await mkdir(path.join(directory, 'assets'), { recursive: true });
    await writeFile(path.join(directory, 'assets', 'step-01.png'), 'image');
    await writeFile(
      path.join(directory, 'assets', 'handle-work.webm'),
      'video',
    );
    await writeFile(manifestPath, JSON.stringify(validManifest()));
    await run({ root, directory, manifestPath });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('assembles substantial simulated chapters with relative media and escaped HTML', async () => {
  await withGuide(async ({ root, directory, manifestPath }) => {
    const manifest = validManifest();
    manifest.summary = '<script>unsafe</script> Simulated follow-up.';
    await writeFile(manifestPath, JSON.stringify(manifest));

    assert.equal(await assembleBook(root), 1);
    const markdown = await readFile(path.join(directory, 'README.md'), 'utf8');
    const html = await readFile(path.join(directory, 'index.html'), 'utf8');
    const index = await readFile(path.join(root, 'index.html'), 'utf8');
    assert.match(markdown, /## Before you begin/u);
    assert.match(markdown, /## Troubleshooting/u);
    assert.match(markdown, /simulated BFF responses/u);
    assert.match(markdown, /assets\/step-01\.png/u);
    assert.match(html, /&lt;script&gt;unsafe&lt;\/script&gt;/u);
    assert.doesNotMatch(html, /<script>/u);
    assert.match(index, /\.\/handle-work\//u);
  });
});

test('rejects a thin chapter even when every required field exists', async () => {
  await withGuide(async ({ manifestPath }) => {
    const manifest = validManifest();
    manifest.overview = ['A short overview.'];
    manifest.steps[0].body = 'Click Claim.';
    await writeFile(manifestPath, JSON.stringify(manifest));
    await assert.rejects(
      readGuideManifest(manifestPath),
      /reader-facing words/u,
    );
  });
});

test('rejects escaping and missing media', async () => {
  await withGuide(async ({ manifestPath }) => {
    const manifest = validManifest();
    manifest.steps[0].image = '../outside.png';
    await writeFile(manifestPath, JSON.stringify(manifest));
    await assert.rejects(readGuideManifest(manifestPath), /inside its guide/u);

    manifest.steps[0].image = 'assets/missing.png';
    await writeFile(manifestPath, JSON.stringify(manifest));
    await assert.rejects(readGuideManifest(manifestPath), /does not exist/u);
  });
});

test('rejects a guide that conceals its simulation boundary', async () => {
  await withGuide(async ({ manifestPath }) => {
    const manifest = validManifest();
    manifest.verification = 'live-backend';
    await writeFile(manifestPath, JSON.stringify(manifest));
    await assert.rejects(readGuideManifest(manifestPath), /simulated-bff/u);
  });
});
