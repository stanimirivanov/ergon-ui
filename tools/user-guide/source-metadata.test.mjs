import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateSourceMetadata } from './source-metadata.mjs';

function chapter(filename, order = '1', slug = "'review-work'") {
  return {
    filename,
    source: `export const chapter: GuideChapter = { order: ${order}, slug: ${slug} };`,
  };
}

test('accepts literal chapter identities without executing source', () => {
  assert.deepEqual(
    validateSourceMetadata([
      chapter('first.ts'),
      chapter('second.ts', '2', "'other-work'"),
    ]),
    [],
  );
});

test('reports duplicate order and slug deterministically with owning files', () => {
  const sources = [chapter('second.ts'), chapter('first.ts')];
  const diagnostics = validateSourceMetadata(sources);
  assert.deepEqual(diagnostics, validateSourceMetadata([...sources].reverse()));
  assert.equal(diagnostics.length, 2);
  assert.match(
    diagnostics[0],
    /second.ts:1: Duplicate guide order 1 \(also first.ts\)/u,
  );
  assert.match(diagnostics[1], /Duplicate guide slug "review-work"/u);
});

test('rejects calculated, missing, repeated or unsafe metadata', () => {
  for (const order of [
    '0',
    '-1',
    '1 + 1',
    'Number.MAX_SAFE_INTEGER',
    '9007199254740992',
  ]) {
    assert.match(
      validateSourceMetadata([chapter('invalid.ts', order)])[0],
      /literal order/u,
    );
  }
  for (const slug of ["'Not Lowercase'", "''", 'slugFromConfig']) {
    assert.match(
      validateSourceMetadata([chapter('invalid.ts', '1', slug)])[0],
      /literal slug/u,
    );
  }
  assert.match(
    validateSourceMetadata([
      {
        filename: 'missing.ts',
        source: 'export const chapter: GuideChapter = {};',
      },
    ])[0],
    /literal order/u,
  );
  assert.match(
    validateSourceMetadata([
      {
        filename: 'repeated.ts',
        source:
          "export const chapter: GuideChapter = {order: 1, order: 2, slug: 'review-work'};",
      },
    ])[0],
    /literal order/u,
  );
});

test('requires exactly one exported typed chapter object per source', () => {
  for (const source of [
    'const chapter: GuideChapter = {};',
    'export const chapter: GuideChapter = buildChapter();',
    'export const a: GuideChapter = {}; export const b: GuideChapter = {};',
  ]) {
    assert.equal(
      validateSourceMetadata([{ filename: 'invalid.ts', source }]).length,
      1,
    );
  }
});

test('generation checks metadata before clearing output or recording', async () => {
  const source = await readFile(
    new URL('./generate.mjs', import.meta.url),
    'utf8',
  );
  assert.ok(
    source.indexOf('await checkRepositoryGuideMetadata(repositoryRoot)') <
      source.indexOf('rmSync(outputRoot'),
  );
  assert.ok(
    source.indexOf('rmSync(outputRoot') < source.indexOf("runStep('Building"),
  );
});
