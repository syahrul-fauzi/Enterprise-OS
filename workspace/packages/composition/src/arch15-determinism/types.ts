//import type { ComposeResult } from "../compose/index.js";
//import type { DescriptorSource } from "../normalizer/types.js";
//import type { ResolverContext, ResolverCapabilityEntry } from "../resolver/types.js";
//
//export type Arch15AViolationKind =
//  | "env-var-read"
//  | "filesystem-access"
//  | "network-request"
//  | "global-singleton-access"
//  | "react-context-access"
//  | "local-storage-read"
//  | "non-deterministic-date-now"
//  | "non-deterministic-math-random"
//  | "non-deterministic-performance-now"
//  | "source-contract-violation";
//
//export type Arch15BViolationKind =
//  | "graph-hash-mismatch"
//  | "plan-hash-mismatch"
//  | "normalized-hash-mismatch"
//  | "normalized-canonical-json-mismatch"
//  | "plan-canonical-hash-mismatch"
//  | "plan-canonical-json-mismatch"
//  | "graph-canonical-json-mismatch"
//  | "graph-structural-checksum-mismatch"
//  | "normalized-id-mismatch"
//  | "node-ordering-mismatch"
//  | "region-ordering-mismatch"
//  | "slot-ordering-mismatch"
//  | "navigation-ordering-mismatch"
//  | "by-kind-count-mismatch"
//  | "active-capabilities-ordering-mismatch"
//  | "resolved-snapshot-mismatch";
//
//export interface Arch15Violation<Kind extends string = string> {
//  readonly kind: Kind;
//  readonly severity: "error" | "warning";
//  readonly message: string;
//  readonly path?: string;
//  readonly ref?: string;
//  readonly iteration?: number;
//}
//
//export interface Arch15ADependencyAudit {
//  readonly allowedSources: readonly ("descriptor" | "kernel-contracts" | "capability-registry" | "resolver-context")[];
//  readonly forbiddenSources: readonly ("env-var" | "filesystem" | "network" | "global-singleton" | "react" | "local-storage")[];
//  readonly allowedSideEffectDomains: readonly ("durationMs" | "profiling" | "diagnostics" | "fitness-reporting")[];
//  readonly forbiddenSideEffectDomains: readonly ("cache-key" | "node-id" | "ordering" | "canonical-json" | "plan-id" | "graph-hash" | "structural-checksum" | "composition-hash")[];
//  readonly passed: boolean;
//  readonly details: readonly string[];
//}
//
//export interface Arch15APurityReport {
//  readonly rule: "ARCH-15A";
//  readonly title: "Pure Composition";
//  readonly inputHints: {
//    readonly descriptorFields: readonly string[];
//    readonly resolverContextFields: readonly string[];
//    readonly forbiddenSideEffectSourcePresent: Record<string, boolean>;
//  };
//  readonly dependencyAudit: Arch15ADependencyAudit;
//  readonly violations: readonly Arch15Violation<Arch15AViolationKind>[];
//  readonly durationMs: number;
//  readonly passed: boolean;
//}
//
//export interface Arch15BStabilityReport {
//  readonly rule: "ARCH-15B";
//  readonly title: "Stable Output";
//  readonly iterations: number;
//  readonly inputHash: string;
//  readonly planHashes: readonly string[];
//  readonly graphHashes: readonly string[];
//  readonly normalizedHashes: readonly string[];
//  readonly planCanonicalHashes: readonly string[];
//  readonly graphStructuralChecksums: readonly string[];
//  readonly resolvedActiveCapabilityOrders: readonly (readonly string[])[];
//  readonly regionOrders: readonly (readonly string[])[];
//  readonly slotOrders: readonly (readonly string[])[];
//  readonly navigationOrders: readonly (readonly string[])[];
//  readonly nodeOrders: readonly (readonly string[])[];
//  readonly planHashStable: boolean;
//  readonly graphHashStable: boolean;
//  readonly normalizedHashStable: boolean;
//  readonly normalizedCanonicalJsonStable: boolean;
//  readonly planCanonicalHashStable: boolean;
//  readonly planCanonicalJsonStable: boolean;
//  readonly graphCanonicalJsonStable: boolean;
//  readonly graphStructuralChecksumStable: boolean;
//  readonly regionOrderStable: boolean;
//  readonly slotOrderStable: boolean;
//  readonly navigationOrderStable: boolean;
//  readonly nodeOrderStable: boolean;
//  readonly activeCapabilitiesOrderStable: boolean;
//  readonly snapshotEqualityStable: boolean;
//  readonly allOutputsStable: boolean;
//  readonly violations: readonly Arch15Violation<Arch15BViolationKind>[];
//  readonly durationMs: number;
//  readonly passed: boolean;
//}
//
//export interface Arch15CombinedReport {
//  readonly overall: {
//    readonly rule: "ARCH-15";
//    readonly title: "Composition Determinism (Purity + Stability)";
//    readonly passed: boolean;
//    readonly durationMs: number;
//  };
//  readonly purity: Arch15APurityReport;
//  readonly stability: Arch15BStabilityReport;
//  readonly violations: readonly Arch15Violation[];
//}
//
//export interface Arch15ResultEnvelope {
//  readonly compose: ComposeResult;
//  readonly arch15?: Arch15CombinedReport;
//}
//
//export interface Arch15Snapshot {
//  readonly planId: string;
//  readonly normalizedId: string;
//  readonly normalizedHash: string;
//  readonly normalizedCanonicalJson: string;
//  readonly planCanonicalHash: string;
//  readonly planCanonicalJson: string;
//  readonly graphStructuralChecksum: string;
//  readonly graphCanonicalJson: string;
//  readonly canonicalId: string;
//  readonly planRegionOrder: readonly string[];
//  readonly planSlotOrder: readonly string[];
//  readonly planNavOrder: readonly string[];
//  readonly planDependenciesOrder: readonly string[];
//  readonly graphHash: string;
//  readonly graphNodeCount: number;
//  readonly graphOrder: readonly string[];
//  readonly activeCapabilityIds: readonly string[];
//  readonly layoutPattern: string;
//  readonly composeHash: string;
//}
//
//export type VerifyArch15AFn = (
//  source: DescriptorSource,
//  resolver: Partial<ResolverContext> & {
//    readonly capabilityEntries?: Readonly<Record<string, ResolverCapabilityEntry>>;
//  },
//  options?: { readonly strict?: boolean },
//) => Arch15APurityReport;
//
//export type VerifyArch15BFn = (
//  source: DescriptorSource,
//  resolver: Partial<ResolverContext> & {
//    readonly capabilityEntries?: Readonly<Record<string, ResolverCapabilityEntry>>;
//  },
//  options?: { readonly iterations?: number; readonly strict?: boolean },
//) => Arch15BStabilityReport;
//
//export type VerifyArch15Fn = (
//  source: DescriptorSource,
//  resolver: Partial<ResolverContext> & {
//    readonly capabilityEntries?: Readonly<Record<string, ResolverCapabilityEntry>>;
//  },
//  options?: { readonly iterations?: number; readonly strict?: boolean },
//) => Arch15CombinedReport;
