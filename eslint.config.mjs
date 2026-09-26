import nx from '@nx/eslint-plugin';

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
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:data-access',
                'type:adapter',
                'type:application',
                'type:domain',
                'type:ui',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:data-access',
                'type:application',
                'type:domain',
                'type:ui',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: [
                'type:application',
                'type:domain',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:adapter',
              onlyDependOnLibsWithTags: [
                'type:application',
                'type:domain',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:application',
              onlyDependOnLibsWithTags: ['type:domain', 'type:util'],
            },
            {
              sourceTag: 'type:domain',
              onlyDependOnLibsWithTags: ['type:domain', 'type:util'],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:domain', 'type:ui', 'type:util'],
            },
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['type:util'],
            },
            {
              sourceTag: 'type:e2e',
              onlyDependOnLibsWithTags: [
                'type:app',
                'type:feature',
                'type:data-access',
                'type:adapter',
                'type:application',
                'type:domain',
                'type:ui',
                'type:util',
              ],
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            {
              sourceTag: 'scope:follow-up',
              onlyDependOnLibsWithTags: ['scope:follow-up', 'scope:shared'],
            },
            {
              sourceTag: 'scope:workbench',
              onlyDependOnLibsWithTags: [
                'scope:workbench',
                'scope:follow-up',
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
];
