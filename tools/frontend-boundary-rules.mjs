import path from 'node:path';
import { fileURLToPath } from 'node:url';

import reactHooks from 'eslint-plugin-react-hooks';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const SOURCE_EXTENSIONS = '{ts,tsx,cts,mts,js,jsx,cjs,mjs}';
const UI_SOURCES = [
  `apps/*/src/**/*.${SOURCE_EXTENSIONS}`,
  `packages/*/feature-{web,native}/src/**/*.${SOURCE_EXTENSIONS}`,
  `packages/ui-{web,native}/src/**/*.${SOURCE_EXTENSIONS}`,
  `packages/*/ui-{web,native}/src/**/*.${SOURCE_EXTENSIONS}`,
];
const DATA_ACCESS_SOURCES = [
  `packages/*/data-access-{web,native}/src/**/*.${SOURCE_EXTENSIONS}`,
];
/** Actionable diagnostic shared by static and literal dynamic acquisition checks. */
export const FRONTEND_EXECUTION_BOUNDARY_MESSAGE =
  'Effect execution belongs in data access behind an injected client or RTK Query endpoint, not in React presentation or app composition.';
// ESQuery requires a Unicode slash escape inside selector regular expressions.
// Only known execution modules match; Schema and unrelated module names do not.
const EXECUTION_MODULE_SELECTOR =
  '/^effect(?:$|\\u002f(?:Effect|Runtime|ManagedRuntime)(?:$|[.\\u002f]))/';

/**
 * Shared ESLint configuration for React execution and hook ownership.
 *
 * An explicit repository base path keeps these patterns effective when Nx
 * imports this configuration from a package-local eslint.config.mjs. Pure
 * Schema use and type-only imports remain permitted; transport Effect programs
 * stay executable in data access. Literal dynamic import and CommonJS require
 * of the execution namespaces are checked without banning unrelated symbols
 * named Effect. Computed module specifiers and indirect runtime acquisition,
 * like semantic state ownership, still need review.
 */
export const frontendBoundaryConfigs = [
  {
    name: 'ergon/frontend-effect-execution-boundary',
    basePath: repositoryRoot,
    files: UI_SOURCES,
    ignores: ['apps/*-e2e/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'effect',
              importNames: ['Effect', 'Runtime', 'ManagedRuntime'],
              allowTypeImports: true,
              message: FRONTEND_EXECUTION_BOUNDARY_MESSAGE,
            },
          ],
          patterns: [
            {
              group: ['Effect', 'Runtime', 'ManagedRuntime'].flatMap(
                (namespace) => [
                  `effect/${namespace}`,
                  `effect/${namespace}.*`,
                  `effect/${namespace}/**`,
                ],
              ),
              allowTypeImports: true,
              message: FRONTEND_EXECUTION_BOUNDARY_MESSAGE,
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        'WithStatement',
        ...[
          `ImportExpression[source.value=${EXECUTION_MODULE_SELECTOR}]`,
          `CallExpression[callee.name='require'][arguments.0.value=${EXECUTION_MODULE_SELECTOR}]`,
          `CallExpression[callee.object.name='module'][callee.property.name='require'][arguments.0.value=${EXECUTION_MODULE_SELECTOR}]`,
        ].map((selector) => ({
          selector,
          message: FRONTEND_EXECUTION_BOUNDARY_MESSAGE,
        })),
      ],
    },
  },
  {
    name: 'ergon/react-hook-correctness',
    basePath: repositoryRoot,
    files: [...UI_SOURCES, ...DATA_ACCESS_SOURCES],
    ignores: ['apps/*-e2e/**'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
];
