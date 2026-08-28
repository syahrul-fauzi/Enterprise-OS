//export type Arch16CompilerStage = "normalization" | "planning" | "graph-construction" | "descriptor-interpretation";
//
//export type Arch16ViolationKind =
//  | "runtime-imports-normalizer"
//  | "runtime-imports-planner"
//  | "runtime-imports-graph-builder"
//  | "runtime-imports-descriptor-kernel"
//  | "runtime-performs-normalization"
//  | "runtime-performs-planning"
//  | "runtime-performs-graph-construction"
//  | "runtime-performs-descriptor-interpretation"
//  | "runtime-depends-on-compiler-module";
//
//export interface Arch16Violation {
//  readonly kind: Arch16ViolationKind;
//  readonly severity: "error" | "warning";
//  readonly message: string;
//  readonly path?: string;
//  readonly ref?: string;
//}
//
//export type Arch16StageInclusion = Record<Arch16CompilerStage, boolean>;
//
//export interface Arch16DependencyEdge {
//  readonly from: string;
//  readonly to: string;
//  readonly kind: "import" | "re-export" | "dynamic-import" | "type-import";
//  readonly symbol?: string;
//}
//
//export interface Arch16DependencyGraph {
//  readonly nodes: Readonly<Record<string, readonly Arch16DependencyEdge[]>>;
//}
//
//export interface Arch16CompilerRuntimeBoundaryReport {
//  readonly rule: "ARCH-16";
//  readonly title: "Compiler / Runtime Separation (Boundary Enforcement)";
//  readonly constitution: {
//    readonly compilerProduces: readonly ["ResolvedWorkspace"];
//    readonly runtimeOnlyConsumes: readonly ["ResolvedWorkspace"];
//    readonly runtimeForbiddenStages: readonly Arch16CompilerStage[];
//    readonly forbiddenRuntimeImports: readonly string[];
//  };
//  readonly runtimeStagesFound: Arch16StageInclusion;
//  readonly dependencyEdges?: Arch16DependencyGraph;
//  readonly violations: readonly Arch16Violation[];
//  readonly durationMs: number;
//  readonly passed: boolean;
//}
//
//export type Arch16BoundaryTarget = {
//  readonly runtimeModulePaths: readonly string[];
//  readonly compilerModulePaths: readonly string[];
//  readonly normalizerExportPatterns?: readonly RegExp[];
//  readonly plannerExportPatterns?: readonly RegExp[];
//  readonly graphBuilderExportPatterns?: readonly RegExp[];
//};
//
//export type VerifyArch16Fn = (
//  target: Arch16BoundaryTarget,
//  options?: { readonly strict?: boolean; readonly collectDependencyGraph?: boolean },
//) => Arch16CompilerRuntimeBoundaryReport;
