import nx from '@nx/eslint-plugin';

import { frontendBoundaryConfigs } from './tools/frontend-boundary-rules.mjs';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
      '**/test-output',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'type:model',
              onlyDependOnLibsWithTags: ['type:model'],
              bannedExternalImports: [
                'react',
                'react-*',
                '@reduxjs/*',
                'redux',
                'effect',
                '@effect/*',
                'tailwindcss',
                '@tailwindcss/*',
              ],
            },
            {
              sourceTag: 'type:application',
              onlyDependOnLibsWithTags: ['type:application', 'type:model'],
              bannedExternalImports: [
                'react',
                'react-*',
                '@reduxjs/*',
                'redux',
                'effect',
                '@effect/*',
                'tailwindcss',
                '@tailwindcss/*',
              ],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: [
                'type:data-access',
                'type:application',
                'type:model',
              ],
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: [
                'type:data-access',
                'type:application',
                'type:model',
                'type:ui',
              ],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui'],
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:data-access',
                'type:application',
                'type:model',
                'type:ui',
              ],
            },
            {
              sourceTag: 'type:test',
              onlyDependOnLibsWithTags: [
                'type:test',
                'type:app',
                'type:feature',
                'type:data-access',
                'type:application',
                'type:model',
                'type:ui',
              ],
            },
            {
              sourceTag: 'scope:evidence',
              onlyDependOnLibsWithTags: ['scope:evidence', 'scope:shared'],
            },
            {
              sourceTag: 'scope:notifications',
              onlyDependOnLibsWithTags: ['scope:notifications', 'scope:shared'],
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            {
              sourceTag: 'scope:browser-tests',
              onlyDependOnLibsWithTags: [
                'scope:workbench',
                'scope:requester',
                'scope:follow-up',
                'scope:notifications',
                'scope:evidence',
                'scope:run-supervision',
                'scope:requester-progress',
                'scope:requester-intake',
                'scope:session',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'scope:requester',
              onlyDependOnLibsWithTags: [
                'scope:requester',
                'scope:requester-progress',
                'scope:notifications',
                'scope:requester-intake',
                'scope:session',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'scope:requester-progress',
              onlyDependOnLibsWithTags: [
                'scope:requester-progress',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'scope:requester-intake',
              onlyDependOnLibsWithTags: [
                'scope:requester-intake',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'scope:follow-up',
              onlyDependOnLibsWithTags: ['scope:follow-up', 'scope:shared'],
            },
            {
              sourceTag: 'scope:session',
              onlyDependOnLibsWithTags: ['scope:session', 'scope:shared'],
            },
            {
              sourceTag: 'scope:run-supervision',
              onlyDependOnLibsWithTags: [
                'scope:run-supervision',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'scope:workbench',
              onlyDependOnLibsWithTags: [
                'scope:workbench',
                'scope:follow-up',
                'scope:session',
                'scope:notifications',
                'scope:evidence',
                'scope:run-supervision',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'platform:shared',
              onlyDependOnLibsWithTags: ['platform:shared'],
            },
            {
              sourceTag: 'platform:web',
              onlyDependOnLibsWithTags: ['platform:web', 'platform:shared'],
            },
            {
              sourceTag: 'platform:native',
              onlyDependOnLibsWithTags: ['platform:native', 'platform:shared'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
  ...frontendBoundaryConfigs,
];
