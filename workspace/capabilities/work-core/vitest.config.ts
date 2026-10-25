import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@repo/core-kernel': path.resolve(__dirname, '../../packages/core/kernel'),
      '@repo': path.resolve(__dirname, '../../packages'),
    },
  },
  plugins: [tsconfigPaths({
    projects: [
      './tsconfig.json',
      '../../packages/core/kernel/tsconfig.json'
    ]
  })],
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});