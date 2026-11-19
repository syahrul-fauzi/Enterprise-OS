import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: [
      { find: /^@repo\/capabilities-identity$/, replacement: path.resolve(__dirname, 'workspace/capabilities/identity/implementation/index.ts') },
      { find: /^@repo\/contracts-core$/, replacement: path.resolve(__dirname, 'workspace/packages/contracts-core/src/index.ts') },
      { find: /^@capabilities\/work-core$/, replacement: path.resolve(__dirname, 'workspace/capabilities/work-core') },
      { find: /^@capabilities\/evidence-registry$/, replacement: path.resolve(__dirname, 'workspace/capabilities/evidence-registry/implementation/index.ts') },
      { find: /^@repo\/capabilities-evidence-registry$/, replacement: path.resolve(__dirname, 'workspace/capabilities/evidence-registry/implementation/index.ts') },
      { find: /^@repo\/core-kernel$/, replacement: path.resolve(__dirname, 'workspace/packages/core/kernel/src/index.ts') },
      { find: /^@repo\/core-runtime$/, replacement: path.resolve(__dirname, 'workspace/packages/core/runtime/src/index.ts') },
      { find: /^@repo\/core-runtime\/execution-context\.js$/, replacement: path.resolve(__dirname, 'workspace/packages/core/runtime/src/execution-context.ts') },
      { find: /^@repo\/core-constitution$/, replacement: path.resolve(__dirname, 'workspace/packages/core/constitution/src/index.ts') },
      { find: /^@repo\/core-capability-registry$/, replacement: path.resolve(__dirname, 'workspace/packages/core/capability-registry/src/index.ts') },
      { find: /^@repo\/core-registry-resolver$/, replacement: path.resolve(__dirname, 'workspace/packages/core/registry-resolver/src/index.ts') },
      { find: /^@repo\/core-proof-ledger$/, replacement: path.resolve(__dirname, 'workspace/packages/core/proof-ledger/src/index.ts') },
      { find: /^@repo\/core-predicate-registry$/, replacement: path.resolve(__dirname, 'workspace/packages/core/predicate-registry/src/index.ts') },
      { find: /^@repo\/core-transformation-registry$/, replacement: path.resolve(__dirname, 'workspace/packages/core/transformation-registry/src/index.ts') },
      { find: /^@repo\/core-eir$/, replacement: path.resolve(__dirname, 'workspace/packages/core/eir/src/index.ts') },
        { find: /^@repo\/core-kernel\/digest-engine$/, replacement: path.resolve(__dirname, 'workspace/packages/core/kernel/src/digest-engine.ts') },
        { find: /^@repo\/core-kernel\/session\/workspace-session$/, replacement: path.resolve(__dirname, 'workspace/packages/core/kernel/src/session/workspace-session.ts') },
        { find: /^@repo\/core-kernel\/registry\/capability-command-registry$/, replacement: path.resolve(__dirname, 'workspace/packages/core/kernel/src/registry/capability-command-registry.ts') },
        { find: /^@repo\/eos-cli$/, replacement: path.resolve(__dirname, 'workspace/packages/tooling/eos-cli/src/index.ts') },
    ]
  },
  test: {
    include: ['capabilities/**/test/*.test.ts', 'capabilities/**/tests/*.test.ts', 'capabilities/**/__tests__/*.test.ts', 'examples/vertical-slice/HV-*/tests/*.test.ts', 'examples/vertical-slice/FIN-001/tests/*.test.ts', 'products/**/tests/*.test.ts', 'apps/**/*.test.ts', 'workspace/capabilities/**/test/*.test.ts', 'workspace/capabilities/**/tests/*.test.ts', 'workspace/capabilities/**/__tests__/*.test.ts', 'workspace/examples/vertical-slice/HV-*/tests/*.test.ts', 'workspace/examples/vertical-slice/FIN-001/tests/*.test.ts', 'workspace/products/**/tests/**/*.test.ts', 'workspace/apps/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.{idea,git,cache,output,temp}/**'],
    globals: true,
  },
});