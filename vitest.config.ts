
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['capabilities/**/test/*.test.ts', 'capabilities/**/tests/*.test.ts', 'workspace/capabilities/**/test/*.test.ts', 'workspace/capabilities/**/tests/*.test.ts', 'workspace/examples/vertical-slice/HV-*/tests/*.test.ts', 'workspace/examples/vertical-slice/FIN-001/tests/*.test.ts', 'workspace/products/**/tests/*.test.ts', 'workspace/apps/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.{idea,git,cache,output,temp}/**'],
    globals: true,
  },
});