/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir:
    '../../../node_modules/.vite/packages/requester-progress/data-access-web',

  test: {
    name: '@ergon/requester-progress-data-access-web',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
}));
