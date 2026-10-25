/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir:
    '../../../node_modules/.vite/packages/requester-progress/feature-web',
  plugins: [react()],
  test: {
    name: '@ergon/requester-progress-feature-web',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.spec.tsx'],
  },
}));
