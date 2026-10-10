import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';

import { FRONTEND_EXECUTION_BOUNDARY_MESSAGE } from './frontend-boundary-rules.mjs';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const APP_SOURCE = 'apps/ergon-workbench/src/frontend-boundary-fixture.tsx';
const FEATURE_SOURCE =
  'packages/run-supervision/feature-web/src/frontend-boundary-fixture.tsx';
const DATA_ACCESS_SOURCE =
  'packages/run-supervision/data-access-web/src/frontend-boundary-fixture.ts';
const UI_SOURCE = 'packages/ui-web/src/frontend-boundary-fixture.tsx';
const SENSORS = new Set([
  'no-restricted-imports',
  'no-restricted-syntax',
  'react-hooks/rules-of-hooks',
  'react-hooks/exhaustive-deps',
]);
const rootLint = createLint('eslint.config.mjs');

describe('frontend execution and hook boundaries', () => {
  it('includes the shared lint helper in inherited Nx cache inputs', () => {
    const { namedInputs } = JSON.parse(
      readFileSync(path.join(repositoryRoot, 'nx.json'), 'utf8'),
    );
    assert.ok(namedInputs.default.includes('sharedGlobals'));
    assert.ok(
      namedInputs.sharedGlobals.includes(
        '{workspaceRoot}/tools/frontend-boundary-rules.mjs',
      ),
    );
  });

  it('wires error-level sensors into the actual root configuration', async () => {
    for (const filePath of [APP_SOURCE, FEATURE_SOURCE, UI_SOURCE]) {
      const config = await rootLint.calculateConfigForFile(filePath);
      for (const rule of SENSORS) {
        assert.equal(config.rules[rule][0], 2, `${filePath}: ${rule}`);
      }
    }
    const dataAccessConfig =
      await rootLint.calculateConfigForFile(DATA_ACCESS_SOURCE);
    assert.equal(dataAccessConfig.rules['no-restricted-imports'], undefined);
    assert.equal(dataAccessConfig.rules['no-restricted-syntax'], undefined);
    assert.equal(dataAccessConfig.rules['react-hooks/rules-of-hooks'][0], 2);
    assert.equal(dataAccessConfig.rules['react-hooks/exhaustive-deps'][0], 2);
  });

  it('rejects runtime namespace imports, aliases, and re-exports in UI source', async () => {
    const sources = [
      "import { Effect } from 'effect'; export { Effect };",
      "import { Effect as Boundary } from 'effect'; export { Boundary };",
      "import { Runtime as Boundary } from 'effect'; export { Boundary };",
      "import { ManagedRuntime as Boundary } from 'effect'; export { Boundary };",
      "import * as Library from 'effect'; export { Library };",
      "export { Effect as Execution } from 'effect';",
      "export * from 'effect';",
    ];
    for (const source of sources) {
      assert.equal(
        (await sensorMessages(rootLint, source, FEATURE_SOURCE))[0]?.ruleId,
        'no-restricted-imports',
        source,
      );
    }
  });

  it('rejects runner imports through Effect subpaths', async () => {
    const sources = [
      "import { runPromise as execute } from 'effect/Effect'; export { execute };",
      "import * as Boundary from 'effect/Effect'; export { Boundary };",
      "import { runFork } from 'effect/Runtime'; export { runFork };",
      "import { make } from 'effect/ManagedRuntime'; export { make };",
      "import * as Boundary from 'effect/Effect.js'; export { Boundary };",
      "export * from 'effect/Runtime/index.js';",
      "import Execution = require('effect/Runtime'); export { Execution };",
    ];
    for (const source of sources) {
      assert.equal(
        (await sensorMessages(rootLint, source, APP_SOURCE))[0]?.ruleId,
        'no-restricted-imports',
        source,
      );
    }
  });

  it('rejects literal dynamic and CommonJS execution module acquisition', async () => {
    const sources = [
      "export const execution = import('effect');",
      "export const execution = import('effect/Effect');",
      "export const execution = import('effect/Runtime.js');",
      "export const execution = import('effect/ManagedRuntime/index.js');",
      "export const execution = require('effect');",
      "export const { runPromise: execute } = require('effect/Effect');",
      "export const execution = require('effect/Runtime');",
      "export const execution = require('effect/ManagedRuntime');",
      "export const execution = module.require('effect/Effect');",
    ];
    for (const source of sources) {
      for (const filePath of [APP_SOURCE, FEATURE_SOURCE, UI_SOURCE]) {
        const messages = await sensorMessages(rootLint, source, filePath);
        assert.equal(messages[0]?.ruleId, 'no-restricted-syntax', source);
        assert.equal(messages[0]?.severity, 2, source);
        assert.equal(
          messages[0]?.message,
          FRONTEND_EXECUTION_BOUNDARY_MESSAGE,
          source,
        );
      }
    }
  });

  it('allows Schema-only and unrelated literal dynamic module acquisition', async () => {
    const sources = [
      "export const schema = import('effect/Schema');",
      "export const schema = require('effect/Schema');",
      "export const schema = module.require('effect/Schema');",
      "export const ui = import('@ergon/ui-web');",
      "export const other = import('effect-other/Effect');",
      "export const other = require('./effect/Runtime');",
      "export const other = import('effect/RuntimeFlags');",
      "export const other = require('effect/Effectable');",
    ];
    for (const source of sources) {
      assert.deepEqual(
        await sensorMessages(rootLint, source, FEATURE_SOURCE),
        [],
        source,
      );
    }
  });

  it('covers app, shared UI, future capability, and native feature source', async () => {
    const source = "import { Effect } from 'effect'; export { Effect };";
    for (const filePath of [
      APP_SOURCE,
      UI_SOURCE,
      'packages/future-capability/feature-web/src/view.tsx',
      'packages/future-capability/feature-native/src/view.tsx',
      'packages/shared/ui-web/src/disclosure.tsx',
    ]) {
      assert.equal(
        (await sensorMessages(rootLint, source, filePath))[0]?.ruleId,
        'no-restricted-imports',
        filePath,
      );
    }
  });

  it('allows pure Schema, type-only contracts, and unrelated APIs', async () => {
    const sources = [
      "import { Schema } from 'effect'; export { Schema };",
      "import * as Schema from 'effect/Schema'; export { Schema };",
      "import type { Effect } from 'effect'; export type { Effect };",
      "import type { Runtime } from 'effect/Runtime'; export type { Runtime };",
      "import { Button } from '@ergon/ui-web'; export { Button };",
      "import { Effect } from './local-presentation'; export { Effect };",
      'export const Effect = { runPromise: () => Promise.resolve() };',
    ];
    for (const source of sources) {
      assert.deepEqual(
        await sensorMessages(rootLint, source, FEATURE_SOURCE),
        [],
        source,
      );
    }
  });

  it('permits asynchronous Effect execution in data access', async () => {
    for (const source of [
      "import { Effect, Runtime, ManagedRuntime } from 'effect'; export { Effect, Runtime, ManagedRuntime };",
      "import { runPromise } from 'effect/Effect'; export { runPromise };",
      "export const execution = import('effect');",
      "export const execution = require('effect/Runtime');",
    ]) {
      assert.deepEqual(
        await sensorMessages(rootLint, source, DATA_ACCESS_SOURCE),
        [],
      );
    }
  });

  it('keeps root ownership sensors effective through project-local configs', async () => {
    for (const [configPath, filePath] of [
      ['apps/ergon-workbench/eslint.config.mjs', APP_SOURCE],
      [
        'packages/run-supervision/feature-web/eslint.config.mjs',
        FEATURE_SOURCE,
      ],
      ['packages/ui-web/eslint.config.mjs', UI_SOURCE],
    ]) {
      const lint = createLint(configPath);
      for (const [source, ruleId] of [
        [
          "import { Effect } from 'effect'; export { Effect };",
          'no-restricted-imports',
        ],
        ["export const execution = import('effect');", 'no-restricted-syntax'],
        [
          "export const execution = require('effect/Effect');",
          'no-restricted-syntax',
        ],
      ]) {
        assert.equal(
          (await sensorMessages(lint, source, filePath))[0]?.ruleId,
          ruleId,
          configPath,
        );
      }
    }
  });

  it('rejects conditional hook calls in features and data-access hooks', async () => {
    const source = `
      import { useState } from 'react';
      export function useBroken(enabled: boolean) {
        if (enabled) useState(0);
      }
    `;
    for (const filePath of [FEATURE_SOURCE, DATA_ACCESS_SOURCE]) {
      const messages = await sensorMessages(rootLint, source, filePath);
      assert.equal(messages[0]?.ruleId, 'react-hooks/rules-of-hooks');
      assert.equal(messages[0]?.severity, 2);
    }
  });

  it('rejects stale dependencies and accepts an explicit synchronized input', async () => {
    const stale = `
      import { useEffect } from 'react';
      export function View({ tenantId }: { tenantId: string }) {
        useEffect(() => { void tenantId; }, []);
        return null;
      }
    `;
    const messages = await sensorMessages(rootLint, stale, FEATURE_SOURCE);
    assert.equal(messages[0]?.ruleId, 'react-hooks/exhaustive-deps');
    assert.equal(messages[0]?.severity, 2);
    assert.deepEqual(
      await sensorMessages(
        rootLint,
        stale.replace('}, []);', '}, [tenantId]);'),
        FEATURE_SOURCE,
      ),
      [],
    );
  });
});

function createLint(configPath) {
  return new ESLint({
    cwd: repositoryRoot,
    overrideConfigFile: path.join(repositoryRoot, configPath),
    // Synthetic imports exercise frontend sensors without asking Nx to build
    // a project graph for fixture-only modules. Production lint retains Nx.
    overrideConfig: { rules: { '@nx/enforce-module-boundaries': 'off' } },
  });
}

async function sensorMessages(lint, source, filePath) {
  const [result] = await lint.lintText(source, { filePath });
  assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
  assert.equal(result.warningCount, 0, JSON.stringify(result.messages));
  return result.messages.filter((message) => SENSORS.has(message.ruleId));
}
