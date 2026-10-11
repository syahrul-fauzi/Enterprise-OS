
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['capabilities/**/test/*.test.ts', 'capabilities/**/tests/*.test.ts', 'examples/vertical-slice/HV-*/tests/*.test.ts', 'examples/vertical-slice/FIN-001/tests/*.test.ts', 'workspace/products/**/tests/*.test.ts'],
    globals: true,
  },
});