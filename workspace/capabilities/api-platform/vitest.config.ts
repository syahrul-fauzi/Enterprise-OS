import { defineConfig } from "vite";

export default defineConfig({
  test: {
    include: ['test/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    globals: true,
    testTimeout: 10000,
  }
});