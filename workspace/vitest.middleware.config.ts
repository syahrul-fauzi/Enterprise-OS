import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: [
      // Fix module resolution untuk semua @repo imports sesuai konvensi monorepo
      { find: '@repo/core-kernel', replacement: path.resolve(__dirname, './packages/core/kernel/src') },
      { find: '@repo/core-runtime', replacement: path.resolve(__dirname, './packages/core/runtime/src') },
      { find: '@repo/contracts-core', replacement: path.resolve(__dirname, './packages/contracts-core/src') },
      // Fix .js extension imports untuk source files
      { find: /^(.*)\.js$/, replacement: '$1' },
    ],
  },
  plugins: [tsconfigPaths({
    projects: [
      './apps/api/tsconfig.json',
      './packages/core/kernel/tsconfig.json',
      './packages/contracts-core/tsconfig.json'
    ],
    ignoreConfigErrors: true
  })],
  test: {
    environment: 'node',
  }
});