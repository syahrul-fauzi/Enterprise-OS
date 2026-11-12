import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@repo/core-kernel': path.resolve(__dirname, '../../packages/core/kernel'),
      '@repo/core-runtime': path.resolve(__dirname, '../../packages/core/runtime'),
      '@repo/contracts-core': path.resolve(__dirname, '../../packages/contracts-core'),
      '@repo': path.resolve(__dirname, '../../packages'),
    },
  },
  plugins: [tsconfigPaths({
    projects: [
      './tsconfig.json',
      '../../packages/core/kernel/tsconfig.json'
    ],
    ignoreConfigErrors: true
  })],
  test: {
    include: ['**/tests/**/*.test.ts'],
    environment: 'node',
  },
});