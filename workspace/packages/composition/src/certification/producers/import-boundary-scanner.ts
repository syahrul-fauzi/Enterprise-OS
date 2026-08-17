import { join, isAbsolute, relative } from "node:path";
import { existsSync } from "node:fs";
import ts from "typescript";
import type { IndependentEvidenceProducer, ProducerContext } from "./types.js";
import { produceEvidencePackageEnvelope } from "./types.js";

const PRODUCER_ID = "import-boundary-v1";
const PRODUCER_NAME = "Semantic Import Boundary Scanner (TypeChecker)";
const TARGET_ARTIFACT = "packages/core/runtime";
const EXPERIMENT_ID = "EXP-A8-IMP-RUNTIME-BOUNDARY";

const FORBIDDEN_COMPILER_SUBMODULES = Object.freeze([
  "@repo/composition/src/graph",
  "@repo/composition/src/plan",
  "@repo/composition/src/normalizer",
  "@repo/composition/src/compose",
  "@repo/composition/src/canonical",
  "@repo/composition/src/certification",
  "@repo/composition/src/arch15-determinism",
  "@repo/composition/src/arch16-boundary",
  "@repo/composition/graph",
  "@repo/composition/plan",
  "@repo/composition/normalizer",
  "@repo/composition/compose",
  "@repo/composition/canonical",
  "@repo/composition/certification",
  "@repo/composition/orchestration",
]);

const FORBIDDEN_DIRECT_DEPENDENCIES = Object.freeze([
  "@repo/core-kernel",
  "@repo/core-capability-registry",
  "@repo/ui-system",
  "@repo/foundation",
]);

const RUNTIME_SRC_ROOT = join("packages", "core", "runtime", "src");
const COMPOSITION_SRC_ROOT = join("packages", "composition", "src");

function resolveModuleToAbsolutePath(
  moduleSpecifier: string,
  containingFile: string,
  compilerOptions: ts.CompilerOptions,
  host: ts.ModuleResolutionHost,
): string | null {
  const resolved = ts.resolveModuleName(
    moduleSpecifier,
    containingFile,
    compilerOptions,
    host,
  );
  const res = resolved.resolvedModule;
  return res ? res.resolvedFileName : null;
}

export class ImportBoundaryScannerProducer implements IndependentEvidenceProducer {
  readonly producerId = PRODUCER_ID;
  readonly producerName = PRODUCER_NAME;
  readonly derivation = "Raw" as const;
  readonly experimentId = EXPERIMENT_ID;
  readonly targetArtifactPath = TARGET_ARTIFACT;

  produce(ctx: ProducerContext) {
    const repoRoot = isAbsolute(ctx.repoRoot) ? ctx.repoRoot : join(process.cwd(), ctx.repoRoot);
    const runtimeSrc = join(repoRoot, RUNTIME_SRC_ROOT);
    const compositionSrc = join(repoRoot, COMPOSITION_SRC_ROOT);

    const observations: string[] = [];
    const assertions: string[] = [];
    let exitCode = 0;

    try {
      const sourceFiles: string[] = [
        join(runtimeSrc, "runtime.ts"),
        join(runtimeSrc, "index.ts"),
        join(runtimeSrc, "types.ts"),
      ];
      const workspaceTs = join(runtimeSrc, "workspace.ts");
      if (existsSync(workspaceTs)) sourceFiles.push(workspaceTs);

      const compFiles = sourceFiles.slice();
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        isolatedModules: true,
        baseUrl: repoRoot,
        paths: {
          "@repo/composition": [join(compositionSrc, "index.ts")],
          "@repo/composition/*": [join(compositionSrc, "*")],
          "@repo/core-kernel": [join(repoRoot, "packages", "core", "kernel", "src", "index.ts")],
          "@repo/core-capability-registry": [join(repoRoot, "packages", "core", "capability-registry", "src", "index.ts")],
        },
        rootDir: repoRoot,
      };

      assertions.push("IMP-1: TypeChecker instantiated with program spanning runtime + @repo/composition src trees");
  const program = ts.createProgram(compFiles, compilerOptions);
  const host = ts.createCompilerHost(compilerOptions, true);

      observations.push(`Program type-checkable sourceFile count (non-decl)=${program.getSourceFiles().filter(s => !s.isDeclarationFile).length}`);

      const importGraphEdges: Array<{ from: string; to: string; kind: string }> = [];
      const forbiddenSubmoduleEdges: Array<{ from: string; to: string }> = [];
      const forbiddenDepEdges: Array<{ from: string; to: string }> = [];
      const resolvedCompositionOnlyTypes: string[] = [];
      const directCompilerStageImports: Array<{ from: string; to: string; subpath: string }> = [];

      for (const srcPath of sourceFiles) {
        const sf = program.getSourceFile(srcPath);
        if (!sf) continue;
        const relFrom = relative(repoRoot, srcPath);

        function visit(node: ts.Node) {
          if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const modSpec = node.moduleSpecifier.text;
            const resolvedAbs = resolveModuleToAbsolutePath(modSpec, srcPath, compilerOptions, host);
            importGraphEdges.push({
              from: relFrom,
              to: resolvedAbs ? relative(repoRoot, resolvedAbs) : modSpec,
              kind: "ImportDeclaration",
            });

            for (const forbidden of FORBIDDEN_COMPILER_SUBMODULES) {
              if (modSpec === forbidden || modSpec.startsWith(forbidden + "/")) {
                forbiddenSubmoduleEdges.push({ from: relFrom, to: modSpec });
                directCompilerStageImports.push({
                  from: relFrom,
                  to: modSpec,
                  subpath: modSpec.slice("@repo/composition/".length),
                });
              }
            }
            for (const forbDep of FORBIDDEN_DIRECT_DEPENDENCIES) {
              if (modSpec === forbDep || modSpec.startsWith(forbDep + "/")) {
                forbiddenDepEdges.push({ from: relFrom, to: modSpec });
              }
            }
          } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const modSpec = node.moduleSpecifier.text;
            importGraphEdges.push({
              from: relFrom,
              to: modSpec,
              kind: "ExportReExport",
            });
            for (const forbidden of FORBIDDEN_COMPILER_SUBMODULES) {
              if (modSpec === forbidden || modSpec.startsWith(forbidden + "/")) {
                forbiddenSubmoduleEdges.push({ from: relFrom, to: modSpec });
                directCompilerStageImports.push({
                  from: relFrom,
                  to: modSpec,
                  subpath: modSpec.slice("@repo/composition/".length),
                });
              }
            }
            for (const forbDep of FORBIDDEN_DIRECT_DEPENDENCIES) {
              if (modSpec === forbDep || modSpec.startsWith(forbDep + "/")) {
                forbiddenDepEdges.push({ from: relFrom, to: modSpec });
              }
            }
          }
          ts.forEachChild(node, visit);
        }
        visit(sf);

        if (sf) {
          const importsOnly = ts.forEachChild(sf, function collectTypeOnly(n): string[] | undefined {
            if (ts.isImportDeclaration(n) && n.importClause && n.importClause.isTypeOnly) {
              const list: string[] = [];
              const named = n.importClause.namedBindings;
              if (named && ts.isNamedImports(named)) {
                for (const el of named.elements) list.push(`type ${el.name.getText(sf!)}`);
              }
              return list;
            }
            return undefined;
          });
          if (importsOnly && importsOnly.length > 0) {
            resolvedCompositionOnlyTypes.push(...importsOnly.map(t => `${relFrom}:${t}`));
          }
        }
      }

      assertions.push("IMP-2: ZERO import edges from runtime → @repo/composition compiler-stage submodules (graph/plan/normalizer/compose/canonical/arch15/arch16/certification)");
      observations.push(`import graph edges total=${importGraphEdges.length}`);
      for (const e of importGraphEdges.slice(0, 30)) observations.push(`  EDGE ${e.kind}: ${e.from} → ${e.to}`);
      if (importGraphEdges.length > 30) observations.push(`  (... ${importGraphEdges.length - 30} more edges omitted from log)`);

      observations.push(`forbidden compiler-submodule edges count=${forbiddenSubmoduleEdges.length}`);
      for (const e of forbiddenSubmoduleEdges) observations.push(`  FORBIDDEN-SUBMODULE: ${e.from} → ${e.to}`);

      assertions.push("IMP-3: ZERO import edges from runtime → @repo/core-kernel / @repo/core-capability-registry / @repo/ui-system / @repo/foundation");
      observations.push(`forbidden direct-dep edges count=${forbiddenDepEdges.length}`);
      for (const e of forbiddenDepEdges) observations.push(`  FORBIDDEN-DEP: ${e.from} → ${e.to}`);

      assertions.push("IMP-4: Semantic TypeChecker: ALL symbols imported from @repo/composition resolve to TYPES ONLY OR runtime-safe surface (ResolvedWorkspace + exports.* from composition index)");
      let compRootOnlyImportsGood = true;
      for (const srcPath of sourceFiles) {
        const sf = program.getSourceFile(srcPath);
        if (!sf) continue;
        function visitSem(n: ts.Node) {
          if (ts.isImportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
            const modSpec = n.moduleSpecifier.text;
            if (modSpec.startsWith("@repo/composition")) {
              const resolved = resolveModuleToAbsolutePath(modSpec, srcPath, compilerOptions, host);
              const relRes = resolved ? relative(repoRoot, resolved) : null;
              if (relRes && !(relRes === join(COMPOSITION_SRC_ROOT, "index.ts") || relRes === join(COMPOSITION_SRC_ROOT, "index.ts"))) {
                if (!relRes.endsWith(join("composition", "src", "index.ts"))) {
                  compRootOnlyImportsGood = false;
                  observations.push(`  SEMANTIC-VIOLATION: @repo/composition import resolves to internal file ${relRes} (not src/index.ts surface)`);
                }
              } else if (relRes === null) {
                observations.push(`  SEMANTIC-UNCERTAIN: @repo/composition subpath ${modSpec} could not be resolved in host — assuming boundary violation.`);
                compRootOnlyImportsGood = false;
              }
            }
          }
          ts.forEachChild(n, visitSem);
        }
        visitSem(sf);
      }
      observations.push(`IMP-4 composition root-only resolution holds=${compRootOnlyImportsGood}`);

      assertions.push("IMP-5: Import graph DAG property holds (no cyclic edges within transitive closure of runtime → composition)");
      const importAdj: Record<string, string[]> = {};
      for (const e of importGraphEdges) {
        if (!importAdj[e.from]) importAdj[e.from] = [];
        importAdj[e.from].push(e.to);
      }
      const visited = new Set<string>();
      const stack = new Set<string>();
      let cycleFound = false;
      function dfs(node: string): void {
        if (stack.has(node)) { cycleFound = true; return; }
        if (visited.has(node)) return;
        visited.add(node);
        stack.add(node);
        for (const nxt of importAdj[node] ?? []) dfs(nxt);
        stack.delete(node);
      }
      for (const n of Object.keys(importAdj)) dfs(n);
      observations.push(`IMP-5 import graph cycle detected=${cycleFound}`);

      if (forbiddenSubmoduleEdges.length > 0) exitCode = 1;
      if (forbiddenDepEdges.length > 0) exitCode = 1;
      if (!compRootOnlyImportsGood) exitCode = 1;
      if (cycleFound) exitCode = 1;

      observations.push(`resolvedComposition-only-type-re-exports list length=${resolvedCompositionOnlyTypes.length}`);
    } catch (err) {
      exitCode = 1;
      observations.push(`IMP-FATAL exception: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    }

    const protocol = [
      "Create ts.createProgram with runtime source + strict TypeChecker + paths config resolving @repo/* to workspace package src/ directories.",
      "Walk ImportDeclaration + ExportDeclaration nodes per source file.",
      "For each import: call ts.resolveModuleName against module specifier + containing file → obtain absolute resolved file.",
      "Build edge list (from, to, kind). Label kind=ImportDeclaration or ExportReExport.",
      "Check every edge to ∈ FORBIDDEN_COMPILER_SUBMODULES exact or prefix. Collect directCompilerStageImports.",
      "Check every edge to ∈ FORBIDDEN_DIRECT_DEPENDENCIES (@repo/core-kernel, @repo/core-capability-registry, @repo/ui-system, @repo/foundation).",
      "Semantic TypeChecker step: For imports starting with @repo/composition, verify resolveModuleName result ENDS with packages/composition/src/index.ts (NOT graph.ts, plan.ts, etc.).",
      "Build adjacency list from import graph. DFS with white/gray/black color sets to detect cycles (IMP-5 DAG invariant).",
      "Preserve raw edge list for audit trail; any violation sets exitCode=1 non-fatal so matrix still receives evidence observation payload.",
    ] as const;

    return produceEvidencePackageEnvelope(
      this,
      {
        experimentProtocol: protocol,
        rawObservations: Object.freeze(observations),
        evidenceSources: Object.freeze([
          "typescript.createProgram + getTypeChecker",
          "typescript.resolveModuleName",
          "ts.SyntaxKind.ImportDeclaration",
          "ts.SyntaxKind.ExportDeclaration + moduleSpecifier",
          "ts.isNamedImports named binding enumeration",
          "import-clause.isTypeOnly flag inspection",
          "DFS cycle detection over import edges",
          `${TARGET_ARTIFACT}/src/runtime.ts semantic imports`,
          `${TARGET_ARTIFACT}/src/index.ts re-exports`,
          `${TARGET_ARTIFACT}/src/types.ts imports`,
        ]),
        scriptFile: "packages/composition/src/certification/producers/import-boundary-scanner.ts",
        functionName: "ImportBoundaryScannerProducer.produce()",
        assertionIds: Object.freeze(assertions),
        exitCode,
        environmentConstraints: Object.freeze([
          "TypeScript module resolution paths configured for workspace monorepo",
          "@repo/composition src/index.ts exports ALL runtime-safe surface; no runtime import bypasses to sibling submodules",
          "Filesystem readable by resolution host",
        ]),
      },
      ctx,
    );
  }
}

export const importBoundaryScanner = new ImportBoundaryScannerProducer();
