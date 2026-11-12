import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@repo/core-kernel', replacement: path.resolve(__dirname, '../../packages/core/kernel/src') },
      { find: '@repo/core-runtime', replacement: path.resolve(__dirname, '../../packages/core/runtime/src') },
      { find: '@repo/capabilities-identity', replacement: path.resolve(__dirname, '../../capabilities/identity') },
      { find: '@capabilities/identity', replacement: path.resolve(__dirname, '../../capabilities/identity') },
      // Maintain base @repo alias for other packages
      { find: '@repo', replacement: path.resolve(__dirname, '../../packages') },
      // Explicit alias for contracts-core to fix module not found error
      { find: '@repo/contracts-core', replacement: path.resolve(__dirname, '../../packages/contracts-core/dist') },
      // Fix .js extension imports ONLY for capabilities/ source files (exclude packages/ dist files)
      { find: /^(.*)\/identity\/implementation\/repositories\/index\.js$/, replacement: '$1/identity/implementation/repositories/index.ts' },
      { find: /^(.*)\/membership\.inmemory\.js$/, replacement: '$1/membership.inmemory.ts' },
      { find: /^(.*)\.js$/, replacement: (path: string) => path.includes('/packages/') ? path : path.replace('.js', '') },
    ],
  },
  plugins: [tsconfigPaths({
    projects: [
      './tsconfig.json',
      '../../packages/core/kernel/tsconfig.json',
      '../../packages/core/runtime/tsconfig.json',
      '../../capabilities/identity/tsconfig.json'
    ]
  })],
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // Align test module resolution with NodeNext to match production
    server: {
      deps: {
        inline: ['@capabilities/identity']
      }
    }
  },
});