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
                'Session application code may depend only on application and domain contracts.',
            },
          ],
        },
      ],
    },
  },
  { ignores: ['**/dist', '**/out-tsc'] },
];
