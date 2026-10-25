/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/ergon-requester',
  plugins: [react(), tailwindcss()],
  server: {
    port: 4201,
    host: 'localhost',
    proxy: Object.fromEntries(
      ['/bff', '/oauth2', '/login/oauth2'].map((path) => [
        path,
        {
          target:
            process.env['ERGON_REQUESTER_CONTROL_PLANE_URL'] ??
            'http://localhost:8091',
        },
      ]),
    ),
  },
  preview: { port: 4301, host: 'localhost' },
  build: { outDir: './dist', emptyOutDir: true },
  test: {
    name: '@ergon/requester',
    watch: false,
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.spec.{ts,tsx}'],
  },
}));
