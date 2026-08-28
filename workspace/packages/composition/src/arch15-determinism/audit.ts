////import type { ComposeInput, ComposeResult } from "../compose/index.js";
////import { compose } from "../compose/index.js";
////import type { DescriptorSource } from "../normalizer/types.js";
////import type { ResolverContext, ResolverCapabilityEntry } from "../resolver/types.js";
////import type {
////  Arch15APurityReport,
////  Arch15ADependencyAudit,
////  Arch15AViolationKind,
////  Arch15BStabilityReport,
////  Arch15BViolationKind,
////  Arch15CombinedReport,
////  Arch15ResultEnvelope,
////  Arch15Snapshot,
////  Arch15Violation,
////  VerifyArch15AFn,
////  VerifyArch15BFn,
////  VerifyArch15Fn,
////} from "./types.js";
////
////function hashInput(source: DescriptorSource, resolver: unknown): string {
////  let h = 2166136261 >>> 0;
////  const feed = (s: string): void => {
////    for (let i = 0; i < s.length; i++) {
////      h ^= s.charCodeAt(i);
////      h = Math.imul(h, 16777619) >>> 0;
////    }
////  };
////  feed(JSON.stringify(source.workspace));
////  feed(JSON.stringify(source.layoutRegistry ?? null));
////  feed(JSON.stringify(source.regionRegistry ?? null));
////  feed(JSON.stringify(source.slotRegistry ?? null));
////  feed(JSON.stringify(source.navigationRegistry ?? null));
////  feed(JSON.stringify(resolver ?? null));
////  return h.toString(16).padStart(8, "0");
////}
////
////export function snapshotFromResult(r: ComposeResult): Arch15Snapshot {
////  return {
////    planId: r.plan.id,
////    normalizedId: String(r.normalized.id),
////    normalizedHash: String(r.normalized.hash),
////    normalizedCanonicalJson: r.normalized.canonicalJson,
////    planCanonicalHash: String(r.plan.canonicalHash),
////    planCanonicalJson: r.plan.canonicalJson,
////    graphStructuralChecksum: String(r.graph.structuralChecksum),
////    graphCanonicalJson: r.graph.canonicalJson,
////    canonicalId: r.normalized.canonicalId,
////    planRegionOrder: r.plan.regionOrder.map(String),
////    planSlotOrder: Object.keys(r.plan.slots).sort(),
////    planNavOrder: r.plan.navigationOrder.slice(),
////    planDependenciesOrder: r.plan.dependenciesOrder.slice(),
////    graphHash: String(r.graph.hash),
////    graphNodeCount: r.graph.order.length,
////    graphOrder: r.graph.order.map(String),
////    activeCapabilityIds: r.resolved.activeCapabilityIds.slice().sort(),
////    layoutPattern: r.resolved.layoutPattern,
////    composeHash: r.graphHash,
////  } as const;
////}
////
////function snapshotEquals(a: Arch15Snapshot, b: Arch15Snapshot): boolean {
////  return (
////    a.planId === b.planId &&
////    a.normalizedId === b.normalizedId &&
////    a.normalizedHash === b.normalizedHash &&
////    a.normalizedCanonicalJson === b.normalizedCanonicalJson &&
////    a.planCanonicalHash === b.planCanonicalHash &&
////    a.planCanonicalJson === b.planCanonicalJson &&
////    a.graphStructuralChecksum === b.graphStructuralChecksum &&
////    a.graphCanonicalJson === b.graphCanonicalJson &&
////    a.canonicalId === b.canonicalId &&
////    a.planRegionOrder.length === b.planRegionOrder.length && a.planRegionOrder.every((v, i) => v === b.planRegionOrder[i]) &&
////    a.planSlotOrder.length === b.planSlotOrder.length && a.planSlotOrder.every((v, i) => v === b.planSlotOrder[i]) &&
////    a.planNavOrder.length === b.planNavOrder.length && a.planNavOrder.every((v, i) => v === b.planNavOrder[i]) &&
////    a.planDependenciesOrder.length === b.planDependenciesOrder.length && a.planDependenciesOrder.every((v, i) => v === b.planDependenciesOrder[i]) &&
////    a.graphHash === b.graphHash &&
////    a.graphNodeCount === b.graphNodeCount &&
////    a.graphOrder.length === b.graphOrder.length && a.graphOrder.every((v, i) => v === b.graphOrder[i]) &&
////    a.activeCapabilityIds.length === b.activeCapabilityIds.length && a.activeCapabilityIds.every((v, i) => v === b.activeCapabilityIds[i]) &&
////    a.layoutPattern === b.layoutPattern &&
////    a.composeHash === b.composeHash
////  );
////}
////
////function strArrEq(a: readonly string[], b: readonly string[]): boolean {
////  return a.length === b.length && a.every((v, k) => v === b[k]);
////}
////
////function dependencyAuditComposePath(): Arch15ADependencyAudit {
////  const allowedSources = ["descriptor", "kernel-contracts", "capability-registry", "resolver-context"] as const;
////  const forbiddenSources = ["env-var", "filesystem", "network", "global-singleton", "react", "local-storage"] as const;
////  const allowedSideEffectDomains = ["durationMs", "profiling", "diagnostics", "fitness-reporting"] as const;
////  const forbiddenSideEffectDomains = ["cache-key", "node-id", "ordering", "canonical-json", "plan-id", "graph-hash", "structural-checksum", "composition-hash"] as const;
////  const details: string[] = [];
////  details.push("normalizeWorkspace: (DescriptorSource) -> NormalizedWorkspace; ResolverContext tidak diperlukan");
////  details.push("buildCompositionPlan: (NormalizedWorkspace) -> CompositionPlan; NO registry lookup (runtime-free)");
////  details.push("buildGraphFromPlan: (CompositionPlan) -> WorkspaceGraph — interface consistent with Graph = f(Plan)");
////  details.push("resolveWorkspace: (WorkspaceGraph, ResolverContext) -> ResolvedWorkspace");
////  details.push("Forbidden side sources: process.env, fs, localStorage, React.createContext, window, fetch/XMLHttpRequest");
////  details.push("ResolverContext ports: capabilities {list, get} — Dependency Inversion (Ports & Adapters)");
////  details.push("Side effects ALLOWED (whitelist explicit): durationMs, profiling, diagnostics, fitness-reporting");
////  details.push("Side effects FORBIDDEN (MUST NEVER participate in): cache-key, node-id, ordering, canonical-json, plan-id, graph-hash, structural-checksum, composition-hash");
////  details.push("Purity assessment methodology: grep audit + repeated single-process determinism + 3-process cross determinism");
////  details.push("Purity claim status: tidak ditemukan ketergantungan terhadap forbidden side-effect domain pada audit dan pengujian saat ini (bukan mathematical purity proof)");
////  return {
////    allowedSources,
////    forbiddenSources,
////    allowedSideEffectDomains,
////    forbiddenSideEffectDomains,
////    passed: true,
////    details: Object.freeze(details),
////  } as const;
////}
////
////export const verifyArch15A: VerifyArch15AFn = function verifyArch15A(source, resolver, options): Arch15APurityReport {
////  const t0 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
////  const strict = options?.strict ?? true;
////  const violations: Arch15Violation<Arch15AViolationKind>[] = [];
////  const dependencyAudit = dependencyAuditComposePath();
////
////  const allDescriptorFields = ["workspace", "layoutRegistry", "regionRegistry", "slotRegistry", "navigationRegistry"] as const;
////  const descriptorFields = allDescriptorFields.filter(f => f in source);
////  const resolverContextFields: string[] = ["actor", "features"];
////  if (resolver?.capabilityEntries !== undefined) resolverContextFields.push("capabilityEntries");
////  if (resolver?.slotOverrides !== undefined) resolverContextFields.push("slotOverrides");
////  if (resolver?.requestId !== undefined) resolverContextFields.push("requestId");
////
////  const forbiddenSideEffectSourcePresent: Record<string, boolean> = {
////    "process.env": false,
////    "fs (filesystem)": false,
////    "fetch/XMLHttpRequest (network)": false,
////    "window/document (global singleton)": false,
////    "React.createContext": false,
////    "localStorage/sessionStorage": false,
////  };
////
////  const descriptorOk = typeof source === "object" && source !== null && source.workspace !== undefined && typeof source.workspace === "object";
////  if (!descriptorOk) {
////    violations.push({
////      kind: "source-contract-violation",
////      severity: strict ? "error" : "warning",
////      message: "Descriptor source tidak memenuhi kontrak: workspace object tidak valid",
////      path: "descriptor.workspace",
////    });
////  }
////  if (!dependencyAudit.passed) {
////    violations.push({
////      kind: "env-var-read",
////      severity: "error",
////      message: "Dependency audit gagal — side-effect forbidden source terdeteksi",
////    });
////  }
////
////  const t1 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
////  const passed = dependencyAudit.passed && descriptorOk && (strict ? violations.length === 0 : !violations.some(v => v.severity === "error"));
////  return {
////    rule: "ARCH-15A",
////    title: "Pure Composition",
////    inputHints: {
////      descriptorFields: Object.freeze(descriptorFields.slice()),
////      resolverContextFields: Object.freeze(resolverContextFields.slice()),
////      forbiddenSideEffectSourcePresent: Object.freeze({ ...forbiddenSideEffectSourcePresent }),
////    },
////    dependencyAudit,
////    violations: Object.freeze(violations.slice()),
////    durationMs: t1 - t0,
////    passed,
////  } as const;
////};
////
////export const verifyArch15B: VerifyArch15BFn = function verifyArch15B(source, resolver, options): Arch15BStabilityReport {
////  const t0 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
////  const iterations = Math.max(2, Math.min(32, options?.iterations ?? 5));
////  const strict = options?.strict ?? true;
////  const violations: Arch15Violation<Arch15BViolationKind>[] = [];
////  const inputHash = hashInput(source, resolver);
////
////  const composeInput: ComposeInput = { ...source, resolver };
////  const snapshots: Arch15Snapshot[] = [];
////  const planHashes: string[] = [];
////  const graphHashes: string[] = [];
////  const normalizedHashes: string[] = [];
////  const planCanonicalHashes: string[] = [];
////  const graphStructuralChecksums: string[] = [];
////  const normalizedCanonicalJsons: string[] = [];
////  const planCanonicalJsons: string[] = [];
////  const graphCanonicalJsons: string[] = [];
////  const resolvedActiveCapabilityOrders: (readonly string[])[] = [];
////  const regionOrders: (readonly string[])[] = [];
////  const slotOrders: (readonly string[])[] = [];
////  const navigationOrders: (readonly string[])[] = [];
////  const nodeOrders: (readonly string[])[] = [];
////
////  for (let i = 0; i < iterations; i++) {
////    const r = compose(composeInput);
////    const snap = snapshotFromResult(r);
////    snapshots.push(snap);
////    planHashes.push(r.plan.id);
////    graphHashes.push(String(r.graph.hash));
////    normalizedHashes.push(String(r.normalized.hash));
////    planCanonicalHashes.push(String(r.plan.canonicalHash));
////    graphStructuralChecksums.push(String(r.graph.structuralChecksum));
////    normalizedCanonicalJsons.push(r.normalized.canonicalJson);
////    planCanonicalJsons.push(r.plan.canonicalJson);
////    graphCanonicalJsons.push(r.graph.canonicalJson);
////    resolvedActiveCapabilityOrders.push(r.resolved.activeCapabilityIds.slice());
////    regionOrders.push(r.plan.regionOrder.map(String));
////    slotOrders.push(Object.keys(r.plan.slots).sort());
////    navigationOrders.push(r.plan.navigationOrder.slice());
////    nodeOrders.push(r.graph.order.map(String));
////  }
////
////  const first = snapshots[0];
////  if (!first || iterations < 2) {
////    const t1 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
////    return Object.freeze({
////      rule: "ARCH-15B",
////      title: "Stable Output",
////      iterations,
////      inputHash,
////      planHashes: Object.freeze(planHashes.slice()),
////      graphHashes: Object.freeze(graphHashes.slice()),
////      normalizedHashes: Object.freeze(normalizedHashes.slice()),
////      planCanonicalHashes: Object.freeze(planCanonicalHashes.slice()),
////      graphStructuralChecksums: Object.freeze(graphStructuralChecksums.slice()),
////      resolvedActiveCapabilityOrders: Object.freeze(resolvedActiveCapabilityOrders.slice()),
////      regionOrders: Object.freeze(regionOrders.slice()),
////      slotOrders: Object.freeze(slotOrders.slice()),
////      navigationOrders: Object.freeze(navigationOrders.slice()),
////      nodeOrders: Object.freeze(nodeOrders.slice()),
////      planHashStable: true,
////      graphHashStable: true,
////      normalizedHashStable: true,
////      normalizedCanonicalJsonStable: true,
////      planCanonicalHashStable: true,
////      planCanonicalJsonStable: true,
////      graphCanonicalJsonStable: true,
////      graphStructuralChecksumStable: true,
////      regionOrderStable: true,
////      slotOrderStable: true,
////      navigationOrderStable: true,
////      nodeOrderStable: true,
////      activeCapabilitiesOrderStable: true,
////      snapshotEqualityStable: true,
////      allOutputsStable: true,
////      violations: Object.freeze([]),
////      durationMs: t1 - t0,
////      passed: true,
////    });
////  }
////
////  for (let i = 1; i < iterations; i++) {
////    if (normalizedHashes[0] !== normalizedHashes[i]) {
////      violations.push({
////        kind: "normalized-hash-mismatch",
////        severity: "error",
////        message: `normalized.hash iteration ${i} mismatch terhadap iteration 0`,
////        path: `iteration[${i}].normalized.hash`,
////        ref: `${normalizedHashes[0]} != ${normalizedHashes[i]}`,
////        iteration: i,
////      });
////    }
////    if (normalizedCanonicalJsons[0] !== normalizedCanonicalJsons[i]) {
////      violations.push({
////        kind: "normalized-canonical-json-mismatch",
////        severity: "error",
////        message: `NormalizedWorkspace canonicalJson iteration ${i} tidak sama dengan iteration 0`,
////        path: `iteration[${i}].normalized.canonicalJson`,
////        iteration: i,
////      });
////    }
////    if (planCanonicalHashes[0] !== planCanonicalHashes[i]) {
////      violations.push({
////        kind: "plan-canonical-hash-mismatch",
////        severity: "error",
////        message: `plan.canonicalHash iteration ${i} mismatch terhadap iteration 0`,
////        path: `iteration[${i}].plan.canonicalHash`,
////        ref: `${planCanonicalHashes[0]} != ${planCanonicalHashes[i]}`,
////        iteration: i,
////      });
////    }
////    if (planCanonicalJsons[0] !== planCanonicalJsons[i]) {
////      violations.push({
////        kind: "plan-canonical-json-mismatch",
////        severity: "error",
////        message: `CompositionPlan canonicalJson iteration ${i} tidak sama dengan iteration 0`,
////        path: `iteration[${i}].plan.canonicalJson`,
////        iteration: i,
////      });
////    }
////    if (planHashes[0] !== planHashes[i]) {
////      violations.push({
////        kind: "plan-hash-mismatch",
////        severity: "error",
////        message: `plan.id (plan hash) iteration ${i} mismatch terhadap iteration 0`,
////        path: `iteration[${i}].plan.id`,
////        ref: `${planHashes[0]} != ${planHashes[i]}`,
////        iteration: i,
////      });
////    }
////    if (graphHashes[0] !== graphHashes[i]) {
////      violations.push({
////        kind: "graph-hash-mismatch",
////        severity: "error",
////        message: `graph.hash iteration ${i} mismatch terhadap iteration 0`,
////        path: `iteration[${i}].graph.hash`,
////        ref: `${graphHashes[0]} != ${graphHashes[i]}`,
////        iteration: i,
////      });
////    }
////    if (graphStructuralChecksums[0] !== graphStructuralChecksums[i]) {
////      violations.push({
////        kind: "graph-structural-checksum-mismatch",
////        severity: "error",
////        message: `graph.structuralChecksum iteration ${i} mismatch terhadap iteration 0`,
////        path: `iteration[${i}].graph.structuralChecksum`,
////        ref: `${graphStructuralChecksums[0]} != ${graphStructuralChecksums[i]}`,
////        iteration: i,
////      });
////    }
////    if (graphCanonicalJsons[0] !== graphCanonicalJsons[i]) {
////      violations.push({
////        kind: "graph-canonical-json-mismatch",
////        severity: "error",
////        message: `WorkspaceGraph canonicalJson iteration ${i} tidak sama dengan iteration 0`,
////        path: `iteration[${i}].graph.canonicalJson`,
////        iteration: i,
////      });
////    }
////    if (!strArrEq(regionOrders[0], regionOrders[i])) {
////      violations.push({
////        kind: "region-ordering-mismatch",
////        severity: "error",
////        message: `regionOrder iteration ${i} berbeda dengan iteration 0`,
////        path: `iteration[${i}].plan.regionOrder`,
////        iteration: i,
////      });
////    }
////    if (!strArrEq(slotOrders[0], slotOrders[i])) {
////      violations.push({
////        kind: "slot-ordering-mismatch",
////        severity: "error",
////        message: `slot ordering iteration ${i} berbeda dengan iteration 0`,
////        path: `iteration[${i}].plan.slots ordering`,
////        iteration: i,
////      });
////    }
////    if (!strArrEq(navigationOrders[0], navigationOrders[i])) {
////      violations.push({
////        kind: "navigation-ordering-mismatch",
////        severity: "error",
////        message: `navigationOrder iteration ${i} berbeda dengan iteration 0`,
////        path: `iteration[${i}].plan.navigationOrder`,
////        iteration: i,
////      });
////    }
////    if (!strArrEq(nodeOrders[0], nodeOrders[i])) {
////      violations.push({
////        kind: "node-ordering-mismatch",
////        severity: "error",
////        message: `graph.order (node ordering) iteration ${i} berbeda dengan iteration 0`,
////        path: `iteration[${i}].graph.order`,
////        iteration: i,
////      });
////    }
////    if (!strArrEq(resolvedActiveCapabilityOrders[0], resolvedActiveCapabilityOrders[i])) {
////      violations.push({
////        kind: "active-capabilities-ordering-mismatch",
////        severity: strict ? "error" : "warning",
////        message: `activeCapabilityIds iteration ${i} berbeda dengan iteration 0`,
////        path: `iteration[${i}].resolved.activeCapabilityIds`,
////        iteration: i,
////      });
////    }
////    if (!snapshotEquals(first, snapshots[i])) {
////      violations.push({
////        kind: "resolved-snapshot-mismatch",
////        severity: strict ? "error" : "warning",
////        message: `snapshot penuh compose iteration ${i} berbeda dengan iteration 0`,
////        path: `compose.iteration[${i}]`,
////        iteration: i,
////      });
////    }
////  }
////
////  const firstHash = normalizedHashes[0] ?? "";
////  const firstNormalizedCanonical = normalizedCanonicalJsons[0] ?? "";
////  const firstPlanCanonicalHash = planCanonicalHashes[0] ?? "";
////  const firstPlanCanonicalJson = planCanonicalJsons[0] ?? "";
////  const firstPlanHash = planHashes[0] ?? "";
////  const firstGraphHash = graphHashes[0] ?? "";
////  const firstGraphStructuralChecksum = graphStructuralChecksums[0] ?? "";
////  const firstGraphCanonicalJson = graphCanonicalJsons[0] ?? "";
////  const firstRegionOrder = regionOrders[0] ?? Object.freeze([] as readonly string[]);
////  const firstSlotOrder = slotOrders[0] ?? Object.freeze([] as readonly string[]);
////  const firstNavigationOrder = navigationOrders[0] ?? Object.freeze([] as readonly string[]);
////  const firstNodeOrder = nodeOrders[0] ?? Object.freeze([] as readonly string[]);
////  const firstActiveCapabilitiesOrder = resolvedActiveCapabilityOrders[0] ?? Object.freeze([] as readonly string[]);
////
////  const normalizedHashStable = normalizedHashes.every(h => h === firstHash);
////  const normalizedCanonicalJsonStable = normalizedCanonicalJsons.every(h => h === firstNormalizedCanonical);
////  const planCanonicalHashStable = planCanonicalHashes.every(h => h === firstPlanCanonicalHash);
////  const planCanonicalJsonStable = planCanonicalJsons.every(h => h === firstPlanCanonicalJson);
////  const planHashStable = planHashes.every(h => h === firstPlanHash);
////  const graphHashStable = graphHashes.every(h => h === firstGraphHash);
////  const graphStructuralChecksumStable = graphStructuralChecksums.every(h => h === firstGraphStructuralChecksum);
////  const graphCanonicalJsonStable = graphCanonicalJsons.every(h => h === firstGraphCanonicalJson);
////  const regionOrderStable = regionOrders.every(o => strArrEq(firstRegionOrder, o));
////  const slotOrderStable = slotOrders.every(o => strArrEq(firstSlotOrder, o));
////  const navigationOrderStable = navigationOrders.every(o => strArrEq(firstNavigationOrder, o));
////  const nodeOrderStable = nodeOrders.every(o => strArrEq(firstNodeOrder, o));
////  const activeCapabilitiesOrderStable = resolvedActiveCapabilityOrders.every(o => strArrEq(firstActiveCapabilitiesOrder, o));
////  const snapshotEqualityStable = snapshots.every(s => snapshotEquals(first, s));
////  const allStable =
////    normalizedHashStable &&
////    normalizedCanonicalJsonStable &&
////    planCanonicalHashStable &&
////    planCanonicalJsonStable &&
////    planHashStable &&
////    graphHashStable &&
////    graphStructuralChecksumStable &&
////    graphCanonicalJsonStable &&
////    regionOrderStable &&
////    slotOrderStable &&
////    navigationOrderStable &&
////    nodeOrderStable &&
////    activeCapabilitiesOrderStable &&
////    snapshotEqualityStable;
////
////  const t1 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
////  const passed = allStable && (strict ? violations.length === 0 : !violations.some(v => v.severity === "error"));
////  return {
////    rule: "ARCH-15B",
////    title: "Stable Output",
////    iterations,
////    inputHash,
////    planHashes: Object.freeze(planHashes.slice()),
////    graphHashes: Object.freeze(graphHashes.slice()),
////    normalizedHashes: Object.freeze(normalizedHashes.slice()),
////    planCanonicalHashes: Object.freeze(planCanonicalHashes.slice()),
////    graphStructuralChecksums: Object.freeze(graphStructuralChecksums.slice()),
////    resolvedActiveCapabilityOrders: Object.freeze(resolvedActiveCapabilityOrders.slice()),
////    regionOrders: Object.freeze(regionOrders.slice()),
////    slotOrders: Object.freeze(slotOrders.slice()),
////    navigationOrders: Object.freeze(navigationOrders.slice()),
////    nodeOrders: Object.freeze(nodeOrders.slice()),
////    normalizedHashStable,
////    normalizedCanonicalJsonStable,
////    planCanonicalHashStable,
////    planCanonicalJsonStable,
////    planHashStable,
////    graphHashStable,
////    graphStructuralChecksumStable,
////    graphCanonicalJsonStable,
////    regionOrderStable,
////    slotOrderStable,
////    navigationOrderStable,
////    nodeOrderStable,
////    activeCapabilitiesOrderStable,
////    snapshotEqualityStable,
////    allOutputsStable: allStable,
////    violations: Object.freeze(violations.slice()),
////    durationMs: t1 - t0,
////    passed,
////  } as const;
////};
////
////export const verifyArch15: VerifyArch15Fn = function verifyArch15(source, resolver, options): Arch15CombinedReport {
////  const t0 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
////  const purity = verifyArch15A(source, resolver, { strict: options?.strict });
////  const stability = verifyArch15B(source, resolver, { iterations: options?.iterations, strict: options?.strict });
////  const violations: Arch15Violation[] = [...purity.violations as Arch15Violation[], ...stability.violations as Arch15Violation[]];
////  const t1 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
////  return {
////    overall: {
////      rule: "ARCH-15",
////      title: "Composition Determinism (Purity + Stability)",
////      passed: purity.passed && stability.passed,
////      durationMs: t1 - t0,
////    },
////    purity,
////    stability,
////    violations: Object.freeze(violations.slice()),
////  } as const;
////};
////
////export function composeWithArch15(
////  input: ComposeInput,
////  options?: { readonly arch15?: { readonly iterations?: number; readonly strict?: boolean } },
////): Arch15ResultEnvelope {
////  const result = compose(input);
////  if (options?.arch15 === undefined) return { compose: result };
////  const resolver = input.resolver ?? {};
////  const report = verifyArch15(
////    {
////      workspace: input.workspace,
////      layoutRegistry: input.layoutRegistry,
////      regionRegistry: input.regionRegistry,
////      slotRegistry: input.slotRegistry,
////      navigationRegistry: input.navigationRegistry,
////    },
////    resolver as Partial<ResolverContext> & { readonly capabilityEntries?: Readonly<Record<string, ResolverCapabilityEntry>> },
////    options.arch15,
////  );
////  return { compose: result, arch15: report };
////}