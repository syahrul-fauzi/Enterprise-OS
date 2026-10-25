import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: [
      // Fix module resolution untuk semua @repo imports dari SEMUA lokasi file (termasuk @repo/core/kernel)
      { find: /^@repo\/(.*)/, replacement: path.resolve(__dirname, '../../packages/$1') },
      // Fix module resolution untuk semua @capabilities imports dari SEMUA lokasi file
      { find: /^@capabilities\/(.*)/, replacement: path.resolve(__dirname, '../../capabilities/$1') },
      // Fix .js extension imports (ubah jadi .ts source files)
      { find: /^(.*)\.js$/, replacement: '$1' },
    ],
  },
  plugins: [tsconfigPaths({
    projects: [
      './tsconfig.json',
      '../../capabilities/work-core/tsconfig.json',
      '../../packages/core/kernel/tsconfig.json',
      '../../capabilities/atomic-composition/tsconfig.json',
      '../../capabilities/identity/tsconfig.json' // Tambahkan identity tsconfig untuk resolve semua command import
    ]
  })],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    globals: true, // Aktifkan globals Vitest (vi, expect, dll.)
    // Aktifkan mock untuk module yang membutuhkan SSR
    server: {
      deps: {
        inline: ['@capabilities/atomic-composition', '@capabilities/consultation', '@repo/core-kernel', '@capabilities/work-core']
      }
    }
  },
});