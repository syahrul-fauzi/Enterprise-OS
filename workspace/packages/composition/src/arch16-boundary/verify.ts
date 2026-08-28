//import type {
//  Arch16CompilerRuntimeBoundaryReport,
//  Arch16DependencyEdge,
//  Arch16DependencyGraph,
//  Arch16StageInclusion,
//  Arch16Violation,
//  Arch16ViolationKind,
//  VerifyArch16Fn,
//} from "./types.js";
//
//const RUNTIME_FORBIDDEN_STAGES = [
//  "normalization",
//  "planning",
//  "graph-construction",
//  "descriptor-interpretation",
//] as const;
//
//const CONSTITUTION = {
//  compilerProduces: ["ResolvedWorkspace"] as const,
//  runtimeOnlyConsumes: ["ResolvedWorkspace"] as const,
//  runtimeForbiddenStages: RUNTIME_FORBIDDEN_STAGES,
//  forbiddenRuntimeImports: [
//    "@repo/composition/normalizer",
//    "@repo/composition/plan",
//    "@repo/composition/graph",
//    "@repo/composition/src/normalizer",
//    "@repo/composition/src/plan",
//    "@repo/composition/src/graph",
//    "normalizeWorkspace",
//    "buildCompositionPlan",
//    "buildGraph",
//    "buildGraphFromNormalized",
//    "buildGraphFromPlan",
//  ],
//} as const;
//
//function emptyStageInclusion(): Arch16StageInclusion {
//  return {
//    normalization: false,
//    planning: false,
//    "graph-construction": false,
//    "descriptor-interpretation": false,
//  };
//}
//
//function detectStageFromSymbol(symbolName: string): keyof Arch16StageInclusion | null {
//  const n = symbolName.toLowerCase();
//  if (n.startsWith("normalize") || n.includes("normalizedworkspace")) return "normalization";
//  if (n.startsWith("buildcompositionplan") || n.includes("compositionplan")) return "planning";
//  if (n.startsWith("buildgraph") || n.includes("workspacegraph")) return "graph-construction";
//  if (n.includes("descriptor") || n.includes("workspaceid") || n.includes("workspacedescriptor")) return "descriptor-interpretation";
//  return null;
//}
//
//function kindForStage(stage: keyof Arch16StageInclusion): Arch16ViolationKind {
//  switch (stage) {
//    case "normalization": return "runtime-performs-normalization";
//    case "planning": return "runtime-performs-planning";
//    case "graph-construction": return "runtime-performs-graph-construction";
//    case "descriptor-interpretation": return "runtime-performs-descriptor-interpretation";
//  }
//}
//
//export const verifyArch16: VerifyArch16Fn = function verifyArch16(target, options): Arch16CompilerRuntimeBoundaryReport {
//  const t0 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
//  const strict = options?.strict ?? true;
//  const collectGraph = options?.collectDependencyGraph ?? false;
//  const violations: Arch16Violation[] = [];
//  const stagesFound = emptyStageInclusion();
//
//  const mutableNodes: Record<string, Arch16DependencyEdge[]> | undefined = collectGraph ? {} : undefined;
//  if (collectGraph && mutableNodes !== undefined) {
//    for (const p of target.runtimeModulePaths) mutableNodes[p] = [];
//    for (const p of target.compilerModulePaths) mutableNodes[p] = [];
//  }
//
//  const normalizerPatterns = target.normalizerExportPatterns ?? [/^normalize/, /NormalizedWorkspace/];
//  const plannerPatterns = target.plannerExportPatterns ?? [/^buildCompositionPlan/, /CompositionPlan/];
//  const graphPatterns = target.graphBuilderExportPatterns ?? [/^buildGraph/, /WorkspaceGraph/];
//
//  for (const stageKey of RUNTIME_FORBIDDEN_STAGES) {
//    const stage: keyof Arch16StageInclusion = stageKey;
//    switch (stage) {
//      case "normalization":
//        for (const pattern of normalizerPatterns) {
//          const refs = target.runtimeModulePaths.filter((m) => pattern.test(m));
//          for (const ref of refs) {
//            stagesFound.normalization = true;
//            violations.push({
//              kind: kindForStage(stage),
//              severity: strict ? "error" : "warning",
//              message: `Runtime path "${ref}" terdeteksi menyentuh normalization boundary symbol pattern ${String(pattern)}`,
//              path: ref,
//              ref: String(pattern),
//            });
//          }
//        }
//        break;
//      case "planning":
//        for (const pattern of plannerPatterns) {
//          const refs = target.runtimeModulePaths.filter((m) => pattern.test(m));
//          for (const ref of refs) {
//            stagesFound.planning = true;
//            violations.push({
//              kind: kindForStage(stage),
//              severity: strict ? "error" : "warning",
//              message: `Runtime path "${ref}" terdeteksi menyentuh planning boundary symbol pattern ${String(pattern)}`,
//              path: ref,
//              ref: String(pattern),
//            });
//          }
//        }
//        break;
//      case "graph-construction":
//        for (const pattern of graphPatterns) {
//          const refs = target.runtimeModulePaths.filter((m) => pattern.test(m));
//          for (const ref of refs) {
//            stagesFound["graph-construction"] = true;
//            violations.push({
//              kind: kindForStage(stage),
//              severity: strict ? "error" : "warning",
//              message: `Runtime path "${ref}" terdeteksi menyentuh graph-construction boundary symbol pattern ${String(pattern)}`,
//              path: ref,
//              ref: String(pattern),
//            });
//          }
//        }
//        break;
//      case "descriptor-interpretation":
//        break;
//    }
//  }
//
//  const hasForbiddenEdge = (runtimePath: string, compilerPath: string): boolean => {
//    const normalized = `${runtimePath}->${compilerPath}`.toLowerCase();
//    return (
//      normalized.includes("normalizer") ||
//      normalized.includes("/plan") ||
//      normalized.includes("/graph") ||
//      normalized.includes("->buildgraph") ||
//      normalized.includes("->buildcompositionplan") ||
//      normalized.includes("->normalize")
//    );
//  };
//
//  for (const runtimePath of target.runtimeModulePaths) {
//    for (const compilerPath of target.compilerModulePaths) {
//      const compound = `${runtimePath}|${compilerPath}`;
//      void detectStageFromSymbol;
//      if (hasForbiddenEdge(runtimePath, compilerPath)) {
//        violations.push({
//          kind: "runtime-depends-on-compiler-module",
//          severity: strict ? "error" : "warning",
//          message: `Runtime module "${runtimePath}" memiliki dependency edge ke compiler module "${compilerPath}" yang melintasi ARCH-16 boundary`,
//          path: runtimePath,
//          ref: compilerPath,
//        });
//      }
//      if (collectGraph && mutableNodes !== undefined) {
//        const edge: Arch16DependencyEdge = {
//          from: runtimePath,
//          to: compilerPath,
//          kind: "import",
//        };
//        const bucket = mutableNodes[runtimePath];
//        if (bucket) bucket.push(edge);
//        void compound;
//      }
//    }
//  }
//
//  const anyStageFound = (Object.values(stagesFound) as boolean[]).some(Boolean);
//  const hasViolations = strict ? violations.length > 0 : violations.some((v) => v.severity === "error");
//  const passed = !anyStageFound && !hasViolations;
//
//  let dependencyGraph: Arch16DependencyGraph | undefined;
//  if (collectGraph && mutableNodes !== undefined) {
//    const out: Record<string, readonly Arch16DependencyEdge[]> = {};
//    for (const k of Object.keys(mutableNodes)) {
//      const bucket = mutableNodes[k];
//      out[k] = Object.freeze((bucket ?? []).slice());
//    }
//    dependencyGraph = Object.freeze({ nodes: Object.freeze(out) });
//  }
//
//  const t1 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
//  return {
//    rule: "ARCH-16",
//    title: "Compiler / Runtime Separation (Boundary Enforcement)",
//    constitution: CONSTITUTION,
//    runtimeStagesFound: Object.freeze({ ...stagesFound }),
//    dependencyEdges: dependencyGraph,
//    violations: Object.freeze(violations.slice()),
//    durationMs: t1 - t0,
//    passed,
//  } as const;
//};
