import nx from '@nx/eslint-plugin';
import baseConfig from '../../../eslint.config.mjs';

export default [
  ...nx.configs['flat/typescript'],
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-*',
                '@reduxjs/*',
                'effect',
                '@ergon/ui-*',
              ],
              message:
                'Follow-up application ports must remain independent of frameworks and infrastructure.',
            },
          ],
        },
      ],
    },
  },
  { ignores: ['**/dist', '**/out-tsc'] },
];
