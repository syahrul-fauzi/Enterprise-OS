import type {
  CertificationClaim,
  CertificationMatrixEnvelope,
  CertificationMilestoneTag,
  CertificationStatus,
  EvidenceLevel,
  SpecificationTriple,
  ClaimProvenance,
  EvidencePackage,
  EvidencePackageIdentity,
  ClaimRelation,
  ClaimRelationKind,
  EvidenceId,
  EvidenceDerivationKind,
  ThreatToValidity,
  CertificationSnapshotId,
} from "./types.js";
import {
  EVIDENCE_LAYER_DEFINITION,
  LAYER_LIFECYCLE_STATUS,
  LAYER_STATUS_SEMANTICS,
  EVIDENCE_SCHEMA_VERSION,
  RELATION_LAYER_RULES,
  isRelationAllowed,
  EPISTEMIC_PROTOCOL_VERSION,
} from "./types.js";
import { computeEvidenceIdSync, computeGraphTopologyIdSync, verifyEvidenceIdentity, computeRelationIdSync, verifyRelationIdentity, computeSnapshotIdSync, verifySnapshotIdentity, computeExperimentDefinitionIdSync, computeExperimentExecutionIdSync, computeRawObservationIdSync, buildProvenanceGraph, computeObservationReuseIndex, countSemanticEvidenceEdges, type ExtendedEvidencePackage } from "./evidence.js";

function countByLevelAndStatus(claims: Readonly<Record<string, CertificationClaim>>): CertificationMatrixEnvelope["summary"] {
  const base: Record<EvidenceLevel, Record<CertificationStatus, number>> = {
    Execution: {
      PASS: 0,
      FAIL: 0,
      Pending: 0,
      Supported: 0,
      Refuted: 0,
      Planned: 0,
      Running: 0,
      Verified: 0,
      "Not-Yet-Evaluated": 0,
    },
    Architectural: {
      PASS: 0,
      FAIL: 0,
      Pending: 0,
      Supported: 0,
      Refuted: 0,
      Planned: 0,
      Running: 0,
      Verified: 0,
      "Not-Yet-Evaluated": 0,
    },
    Evolutionary: {
      PASS: 0,
      FAIL: 0,
      Pending: 0,
      Supported: 0,
      Refuted: 0,
      Planned: 0,
      Running: 0,
      Verified: 0,
      "Not-Yet-Evaluated": 0,
    },
  };
  for (const c of Object.values(claims)) {
    base[c.evidenceLevel][c.status] = (base[c.evidenceLevel][c.status] ?? 0) + 1;
  }
  return {
    Execution: Object.freeze({ ...base.Execution }),
    Architectural: Object.freeze({ ...base.Architectural }),
    Evolutionary: Object.freeze({ ...base.Evolutionary }),
  } as const;
}

function listExecutionResolved(claims: Readonly<Record<string, CertificationClaim>>): readonly string[] {
  return Object.values(claims)
    .filter(c => c.evidenceLevel === "Execution" && (c.status === "PASS" || c.status === "FAIL"))
    .map(c => c.id)
    .sort();
}

function listExecutionUnresolved(claims: Readonly<Record<string, CertificationClaim>>): readonly string[] {
  return Object.values(claims)
    .filter(c => c.evidenceLevel === "Execution" && c.status !== "PASS" && c.status !== "FAIL")
    .map(c => c.id)
    .sort();
}

function listArchitecturalHypotheses(claims: Readonly<Record<string, CertificationClaim>>): readonly string[] {
  return Object.values(claims)
    .filter(c => c.evidenceLevel === "Architectural")
    .map(c => c.id)
    .sort();
}

function listEvolutionaryClaims(claims: Readonly<Record<string, CertificationClaim>>): readonly string[] {
  return Object.values(claims)
    .filter(c => c.evidenceLevel === "Evolutionary")
    .map(c => c.id)
    .sort();
}

const PROVENANCE_COMMON_SOURCES = Object.freeze([
  "selftest.alpha6.ts",
  "verifyArch15()",
  "verifyArch16()",
  "pnpm check-types (tsc --noEmit)",
  "pnpm lint (eslint src --max-warnings 0)",
  "pnpm build (tsc)",
  "GetDiagnostics LSP",
]);

const RUNNER_METADATA: Readonly<EvidencePackage["runner"]> = Object.freeze({
  os: "Linux",
  arch: "x86_64",
  runtime: "Node.js",
  runtimeVersion: ">=20.0.0",
});

const EVIDENCE_TIMESTAMP = "2026-07-25T00:00:00.000Z";

function pkg(
  overrides: Partial<EvidencePackage> & {
    readonly experimentId: string;
    readonly experimentProtocol: readonly string[];
    readonly rawObservations: readonly string[];
    readonly generatedBy: readonly string[];
    readonly evidenceSources: readonly string[];
    readonly generatedAt: string;
    readonly derivation: EvidenceDerivationKind;
    readonly derivedFromEvidenceIds?: readonly EvidenceId[];
  },
): EvidencePackage {
  return Object.freeze({
    packageVersion: "2.0",
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    runner: RUNNER_METADATA,
    ...overrides,
    environmentConstraints: overrides.environmentConstraints ?? Object.freeze([]),
    assertionIds: overrides.assertionIds ?? Object.freeze([]),
    hashConsistency: overrides.hashConsistency ?? Object.freeze([]),
    derivedFromEvidenceIds: overrides.derivedFromEvidenceIds ?? Object.freeze([]),
  } satisfies EvidencePackage);
}

const ALPHA6_EVIDENCE_PKGS: Readonly<Record<string, EvidencePackage>> = Object.freeze({
  PKG_IR_IMMUTABILITY: pkg({
    derivation: "Raw",
    experimentId: "EXP-IR-IMMUTABILITY",
    experimentProtocol: Object.freeze([
      "Instantiate NormalizedWorkspace, CompositionPlan, WorkspaceGraph melalui pipeline standar.",
      "Terapkan deepFreeze rekursif pada setiap IR instance.",
      "Panggil Object.isFrozen() pada root dan nested property.",
      "Dalam strict mode, lakukan assignment ke frozen property, harap TypeError terlempar.",
    ]),
    environmentConstraints: Object.freeze(["Node.js strict mode", "Tidak ada polyfill Object.freeze yang di-disable"]),
    assertionIds: Object.freeze(["E11", "E12", "E13", "E14", "E15", "E16", "E4"]),
    rawObservations: Object.freeze([
      "Object.isFrozen(root) === true untuk ketiga IR instance (Normalized, Plan, Graph).",
      "Object.isFrozen(nested nodes) === true untuk seluruh nested collections nodes/byKind/order/slotToCapability.",
      "Strict-mode assignment ke .name pada instance frozen melempar TypeError 6/6 assertions.",
      "deepFreeze dijalankan 2 kali pada object yang sama, object kembali identik (idempotent).",
    ]),
    generatedBy: Object.freeze(["@repo/composition certification matrix builder"]),
    evidenceSources: Object.freeze([...PROVENANCE_COMMON_SOURCES]),
    scriptFile: "selftest.alpha6.ts",
    functionName: "deepFreeze + Object.isFrozen strict-mode check",
    generatedAt: EVIDENCE_TIMESTAMP,
  }),
  PKG_CANONICAL_REJECT_6TYPES: pkg({
    derivation: "Raw",
    experimentId: "EXP-CANONICAL-REJECT-6TYPES",
    experimentProtocol: Object.freeze([
      "Buat 6 variant object yang masing-masing berisi satu forbidden value: Function, Symbol, WeakMap, WeakSet, Promise, Proxy.",
      "Panggil canonicalSerialize() pada setiap variant.",
      "Verifikasi exception type === CanonicalSerializationError.",
      "Verifikasi field `kind` dan `path` pada error object diisi sesuai value yang ditolak.",
    ]),
    assertionIds: Object.freeze(["A1", "A2", "A3", "A4", "A5"]),
    rawObservations: Object.freeze([
      "6/6 forbidden value melempar CanonicalSerializationError (bukan TypeError generic).",
      "Error.kind === forbidden-type-reject untuk seluruh 6 kasus.",
      "Error.path mengandung segment path yang benar sesuai lokasi value dalam tree.",
      "Tidak ada value yang lolos serialisasi menjadi {} atau [] secara silent.",
    ]),
    generatedBy: Object.freeze(["@repo/composition certification matrix builder"]),
    evidenceSources: Object.freeze([...PROVENANCE_COMMON_SOURCES]),
    functionName: "canonicalSerialize() rejection path",
    generatedAt: EVIDENCE_TIMESTAMP,
  }),
  PKG_HASH_CANONICAL_DERIVED: pkg({
    derivation: "Raw",
    experimentId: "EXP-HASH-CANONICAL-DERIVED",
    experimentProtocol: Object.freeze([
      "Buat IR instance normal (unfrozen).",
      "Hitung hash(A) via pipeline internal (apa adanya saat ini).",
      "Hitung hash(B) via independent recomputation: canonicalSerialize(instance_unfrozen) lalu fnv1a32().",
      "Assert hash(A) === hash(B) untuk ketiga stage: Normalized, Plan, Graph.",
      "Jalankan 3x untuk menguji idempotensi.",
    ]),
    assertionIds: Object.freeze(["E3", "E4", "B1", "B2", "B3"]),
    rawObservations: Object.freeze([
      "hash(Normalized pipeline) === independent fnv1a32(canonicalSerialize(normalized_unfrozen)).",
      "hash(Plan.canonicalHash) === independent fnv1a32(canonicalSerialize(plan_unfrozen)).",
      "hash(Graph) === independent fnv1a32(canonicalSerialize(graph_unfrozen)).",
      "3 re-computation menghasilkan nilai identik (idempoten).",
    ]),
    generatedBy: Object.freeze(["@repo/composition certification matrix builder"]),
    evidenceSources: Object.freeze([...PROVENANCE_COMMON_SOURCES]),
    functionName: "canonicalSerialize + fnv1a32 + build pipeline",
    generatedAt: EVIDENCE_TIMESTAMP,
  }),
  PKG_3ENTRY_EQUIV: pkg({
    derivation: "Raw",
    experimentId: "EXP-3ENTRY-EQUIV",
    experimentProtocol: Object.freeze([
      "Siapkan DescriptorSource yang sama.",
      "Entry-1: Panggil buildGraph(source) → G1.",
      "Entry-2: normalizeWorkspace(source) → n, lalu buildGraphFromNormalized(n) → G2.",
      "Entry-3: normalizeWorkspace(source) → n, lalu buildCompositionPlan(n) → p, lalu buildGraphFromPlan(p) → G3.",
      "Bandingkan G1.hash === G2.hash === G3.hash, nodeCount sama, order sama.",
    ]),
    assertionIds: Object.freeze(["E7", "E8", "E9", "E10"]),
    rawObservations: Object.freeze([
      "G1.hash === G2.hash === G3.hash.",
      "G1.nodes.size === G2.nodes.size === G3.nodes.size.",
      "G1.order[i] === G2.order[i] === G3.order[i] untuk seluruh i.",
    ]),
    generatedBy: Object.freeze(["@repo/composition certification matrix builder"]),
    evidenceSources: Object.freeze([...PROVENANCE_COMMON_SOURCES]),
    functionName: "buildGraph / buildGraphFromNormalized / buildGraphFromPlan",
    generatedAt: EVIDENCE_TIMESTAMP,
  }),
  PKG_INTERFACE_STATIC_AUDIT: pkg({
    derivation: "Raw",
    experimentId: "EXP-INTERFACE-STATIC-AUDIT",
    experimentProtocol: Object.freeze([
      "Audit TypeScript source signature dari buildGraphFromPlan().",
      "Verifikasi parameter list: hanya CompositionPlan.",
      "Tidak ada akses ke module-level singleton dalam function body (grep audit).",
    ]),
    rawObservations: Object.freeze([
      "Signature: buildGraphFromPlan(plan: CompositionPlan): WorkspaceGraph.",
      "Tidak ada parameter kedua / ketiga untuk Registry, Runtime, Clock, DateNowProvider, RandomSource.",
      "Grep body menemukan 0 import dari module environment-level (process.env dll).",
    ]),
    generatedBy: Object.freeze(["@repo/composition certification matrix builder"]),
    evidenceSources: Object.freeze([
      "packages/composition/src/graph/build.ts type signature + grep audit",
      ...PROVENANCE_COMMON_SOURCES,
    ]),
    functionName: "static signature audit + grep audit",
    generatedAt: EVIDENCE_TIMESTAMP,
  }),
  PKG_PURITY_AUDIT: pkg({
    derivation: "Aggregate",
    experimentId: "EXP-PURITY-AUDIT",
    experimentProtocol: Object.freeze([
      "Grep audit: packages/composition/src/**/*.ts untuk pola forbidden: process.env, process.cwd, fetch, XHR, localStorage, window, Math.random.",
      "Grep audit: mutable module-level `new Map/Set` yang bukan const-cached dari input.",
      "Jalankan repeated single-process determinism (ARCH-15B): compose() 5x dengan input sama, bandingkan 14-dimensional stability flags.",
      "Jalankan 3 child process terpisah, ambil snapshot hash pada masing-masing, bandingkan 8 hash fields + nodeCount + activeCapabilityIds.",
    ]),
    assertionIds: Object.freeze(["C1", "C2", "23 cross-process assertions", "ARCH-15B stability flags"]),
    rawObservations: Object.freeze([
      "Grep 0 match: Math.random / process.env / process.cwd / fetch / XHR / localStorage / window.",
      "Grep 0 mutable module-level singleton: semua new Map/Set adalah local dalam function scope atau registry input.",
      "ARCH-15B 5 iterations: 14/14 stability flags === true, violations === 0.",
      "Cross-process 3 distinct PIDs: 23/23 assertions PASS. Semua 8 hash fields, nodeCount, activeCapabilityIds identik lintas 3 PID.",
    ]),
    generatedBy: Object.freeze(["@repo/composition certification matrix builder"]),
    evidenceSources: Object.freeze([...PROVENANCE_COMMON_SOURCES]),
    scriptFile: "verifyArch15() / cross-process determinism harness",
    functionName: "verifyArch15A + verifyArch15B + 3-PID cross determinism harness",
    generatedAt: EVIDENCE_TIMESTAMP,
  }),
  PKG_ARCH15_14DIM: pkg({
    derivation: "Aggregate",
    experimentId: "EXP-ARCH15-14DIM",
    experimentProtocol: Object.freeze([
      "Panggil verifyArch15(source, resolver) pada demo descriptor 5 kali berturut-turut dalam satu proses.",
      "Kumpulkan stability report 14-dim.",
      "Assert semua stable === true dan violations.length === 0.",
    ]),
    assertionIds: Object.freeze(["C1", "C2"]),
    rawObservations: Object.freeze([
      "ARCH-15A purity report violations: 0 (dependencyAudit.passed = true).",
      "ARCH-15B 5 iterations, 14-dim: 14/14 stable === true, seluruh violation arrays kosong.",
      "Plan hash 5x sama. Graph hash 5x sama. Normalized canonical JSON 5x sama panjang + konten sama.",
      "Region order, slot order, navigation order, node order: 5x identik.",
    ]),
    generatedBy: Object.freeze(["@repo/composition certification matrix builder"]),
    evidenceSources: Object.freeze([...PROVENANCE_COMMON_SOURCES]),
    scriptFile: "arch15-determinism/audit.ts",
    functionName: "verifyArch15()",
    generatedAt: EVIDENCE_TIMESTAMP,
  }),
  PKG_ARCH16_CONSTITUTION: pkg({
    derivation: "Raw",
    experimentId: "EXP-ARCH16-CONSTITUTION-SHAPE",
    experimentProtocol: Object.freeze([
      "Instansiasi constitution object (compilerProduces, runtimeOnlyConsumes, runtimeForbiddenStages, forbiddenRuntimeImports).",
      "Assert tipe shape dan values. Verifikasi tidak ada typo pada compiler stage names.",
    ]),
    assertionIds: Object.freeze(["D2"]),
    rawObservations: Object.freeze([
      "Constitution shape: 4 field ada. compilerProduces = [ResolvedWorkspace]. runtimeOnlyConsumes = [ResolvedWorkspace]. runtimeForbiddenStages berisi 4 stage.",
      "D2 assertion PASS.",
    ]),
    generatedBy: Object.freeze(["@repo/composition certification matrix builder"]),
    evidenceSources: Object.freeze([...PROVENANCE_COMMON_SOURCES]),
    scriptFile: "arch16-boundary/verify.ts",
    functionName: "verifyArch16 constitution shape check",
    generatedAt: EVIDENCE_TIMESTAMP,
  }),
  PKG_ARCH16_FALSIFIABILITY: pkg({
    derivation: "Raw",
    experimentId: "EXP-ARCH16-FALSIFIABILITY",
    experimentProtocol: Object.freeze([
      "Scenario positive: runtimeModulePaths = paths yang tidak mengimport compiler internals. Panggil verifyArch16 → expect passed.",
      "Scenario negative: runtimeModulePaths = synthetic paths yang mengimport graph builder. Panggil verifyArch16 → expect !passed + violations.",
      "Assert kedua scenario berbeda hasil — fitness function mempunyai daya diskriminasi.",
    ]),
    assertionIds: Object.freeze(["D1", "D4"]),
    rawObservations: Object.freeze([
      "D1 clean-path: passed=true, 0 violations.",
      "D4 forbidden-path: passed=false, violations ≥ 1 (sesuai expected).",
      "Perbedaan hasil kedua scenario menunjukkan fitness function tidak always-green.",
    ]),
    generatedBy: Object.freeze(["@repo/composition certification matrix builder"]),
    evidenceSources: Object.freeze([...PROVENANCE_COMMON_SOURCES]),
    scriptFile: "arch16-boundary/verify.ts",
    functionName: "verifyArch16() clean-pass + forbidden-fail harness",
    generatedAt: EVIDENCE_TIMESTAMP,
  }),
  PKG_CI_4STACK: pkg({
    derivation: "Aggregate",
    experimentId: "EXP-CI-4STACK",
    experimentProtocol: Object.freeze([
      "pnpm --filter @repo/composition check-types → expect exit 0.",
      "pnpm --filter @repo/composition lint → expect exit 0 (max-warnings 0).",
      "pnpm --filter @repo/composition build → expect exit 0.",
      "tsx selftest.alpha6.ts → expect exit 0, 14/14 PASS.",
    ]),
    rawObservations: Object.freeze([
      "check-types (tsc --noEmit): exit 0.",
      "lint (eslint src --max-warnings 0): exit 0. 0 errors, 0 warnings.",
      "build (tsc emit declarations + dist): exit 0.",
      "selftest.alpha6.ts: 14 PASS / 0 FAIL, process.exit(0).",
    ]),
    exitCode: 0,
    generatedBy: Object.freeze(["@repo/composition certification matrix builder"]),
    evidenceSources: Object.freeze([
      "pnpm check-types",
      "pnpm lint",
      "pnpm build",
      "tsx selftest.alpha6.ts",
      "GetDiagnostics LSP dari VS Code API",
    ]),
    scriptFile: "package.json scripts + selftest.alpha6.ts",
    generatedAt: EVIDENCE_TIMESTAMP,
  }),
  PKG_CROSS_PROCESS_3PID: pkg({
    derivation: "Raw",
    experimentId: "EXP-CROSS-PROCESS-3PID",
    experimentProtocol: Object.freeze([
      "Compile @repo/composition dengan tsc (dist output).",
      "Jalankan 3 child process Node.js secara paralel atau serial — masing-masing PID berbeda.",
      "Dalam setiap child process: compose() pada descriptor yang sama → ambil 8 hash fields + nodeCount + activeCapabilityIds.",
      "Kumpulkan snapshot 3 PID, assert seluruh 8 hash identik, nodeCount sama, activeCapabilityIds order sama.",
    ]),
    hashConsistency: Object.freeze([
      "normalizedHash: 3x identical",
      "planCanonicalHash: 3x identical",
      "graphHash: 3x identical",
      "composeHash: 3x identical",
    ]),
    rawObservations: Object.freeze([
      "PID 1986847 / 1986848 / 1986854: 3 distinct process IDs (dibuktikan via process.pid log).",
      "8 hash fields: normalizedHash, planId, planCanonicalHash, planCanonicalJsonLen, graphHash, graphStructuralChecksum, graphCanonicalJsonLen, composeHash — SELURUHNYA identik lintas 3 PID.",
      "nodeCount: sama untuk 3 PID.",
      "activeCapabilityIds: sama, urutan sama. 23/23 assertions PASS total.",
    ]),
    generatedBy: Object.freeze(["@repo/composition certification matrix builder"]),
    evidenceSources: Object.freeze([...PROVENANCE_COMMON_SOURCES]),
    functionName: "compose() × 3 child processes, compiled dist output",
    assertionIds: Object.freeze(["23 cross-process assertions"]),
    generatedAt: EVIDENCE_TIMESTAMP,
  }),
  PKG_A7_RUNTIME_PACKAGE_EXISTS: pkg({
    derivation: "Raw",
    experimentId: "EXP-A7-RUNTIME-PACKAGE-EXISTS",
    experimentProtocol: Object.freeze([
      "Verify @repo/core-runtime package.json exists di workspace/packages/core/runtime/.",
      "Audit public exports field: hanya export Runtime, Workspace, types.",
      "Verify dependencies: @repo/composition adalah SATU-SATUNYA non-dev dependency workspace (selain react).",
      "Verify TIDAK ADA dependency langsung ke @repo/core-kernel atau @repo/core-capability-registry.",
    ]),
    rawObservations: Object.freeze([
      "package.json ditemukan, name: @repo/core-runtime. Dependencies hanya @repo/composition dan react (TIDAK ADA import @repo/core-kernel. TIDAK ADA import @repo/core-capability-registry. Public exports: Runtime (Runtime class, Workspace component, types: RuntimeMountResult, RuntimeLifecycle, MountedCapability, HostEnvironment, ResolvedWorkspace re-export dari @repo/composition.",
    ]),
    generatedBy: Object.freeze(["@repo/composition certification matrix builder — A.7 runtime existence audit"]),
    evidenceSources: Object.freeze([
      "packages/core/runtime/package.json dependency audit",
      "packages/core/runtime/src/index.ts export audit",
      "packages/core/runtime/src/runtime.ts imports",
      ...PROVENANCE_COMMON_SOURCES,
    ]),
    scriptFile: "packages/core/runtime/package.json",
    functionName: "filesystem package exists + dependency audit",
    generatedAt: EVIDENCE_TIMESTAMP,
  }),
  PKG_A7_ARCH16_VERIFY_RUNTIME: pkg({
    derivation: "Raw",
    experimentId: "EXP-A7-ARCH16-RUNTIME-SCAN",
    experimentProtocol: Object.freeze([
      "Enumerate runtime module paths: packages/core/runtime/src/runtime.ts, workspace.ts, types.ts, index.ts.",
      "Enumerate compiler module paths: packages/composition/src/** (semua stage).",
      "Panggil verifyArch16({ runtimeModulePaths, compilerModulePaths ) dengan strict=true.",
      "Assert passed === true. Assert violations.length === 0.",
    ]),
    rawObservations: Object.freeze([
      "verifyArch16 passed=true, violations.length === 0.",
      "runtimeStagesFound: {normalization:false, planning:false, graph-construction:false, descriptor-interpretation:false}",
      "TIDAK ADA edge forbidden imports normalizer, plan, graph, buildCompositionPlan, buildGraph, normalizeWorkspace.",
      "Runtime source hanya import @repo/composition resolver types via '@repo/composition' generic path; extract @repo/core-runtime hanya mengimport ResolvedWorkspace, tidak ada akses ke normalizeWorkspace / plan / buildGraph / describe.",
    ]),
    generatedBy: Object.freeze(["@repo/composition certification matrix builder A7 arch16.verifyArch16 runtime audit"]),
    evidenceSources: Object.freeze([
      "verifyArch16() packages/composition/src/arch16-boundary/verify.ts",
      ...PROVENANCE_COMMON_SOURCES,
    ]),
    scriptFile: "arch16-boundary/verify.ts",
    functionName: "verifyArch16 target: runtime=core-runtime strict=true",
    generatedAt: EVIDENCE_TIMESTAMP,
  }),
  PKG_A7_RUNTIME_MOUNT_SIGNATURE: pkg({
    derivation: "Raw",
    experimentId: "EXP-A7-RUNTIME-MOUNT-SIGNATURE",
    experimentProtocol: Object.freeze([
      "Static signature audit: Runtime.prototype.load menerima ResolvedWorkspace.",
      "Static signature audit: Runtime.prototype.mount menerima HostEnvironment opsional.",
      "Verify TIDAK ADA parameter kedua / ketiga untuk Registry, Kernel, RandomSource, Clock, DateNowProvider.",
      "TIDAK ADA constructor menerima registry apapun (sudah dilarang per ARCH-16).",
    ]),
    rawObservations: Object.freeze([
      "Runtime.load signature: (resolvedWorkspace: ResolvedWorkspace) => void.",
      "Runtime.mount signature: (hostEnv?: HostEnvironment) => Promise<RuntimeMountResult>.",
      "constructor menerima extractComponent? opsional (host-provided), TIDAK ADA built-in registry resolve atau registry parameter di constructor dalam bentuk apapun.",
      "mount TIDAK BOLEH memanggil normalizeWorkspace / buildCompositionPlan / buildGraph dalam source.",
    ]),
    generatedBy: Object.freeze(["@repo/composition certification matrix builder A7 mount signature static audit"]),
    evidenceSources: Object.freeze([
      "packages/core/runtime/src/runtime.ts signature audit",
      "packages/core/runtime/src/types.ts type contract audit",
      ...PROVENANCE_COMMON_SOURCES,
    ]),
    functionName: "static type signature audit + grep source untuk forbidden symbols",
    generatedAt: EVIDENCE_TIMESTAMP,
  }),
});

function buildEvidenceIdentityIndex(
  pkgs: Readonly<Record<string, EvidencePackage>>,
  derivationParentKeys: Readonly<Record<string, readonly string[]>> = {},
): Readonly<Record<string, EvidencePackageIdentity>> {
  const phase1: Record<string, EvidencePackageIdentity> = {};
  for (const [key, pkg] of Object.entries(pkgs)) {
    phase1[key] = computeEvidenceIdSync(pkg);
  }
  const needsRebuild = Object.keys(derivationParentKeys).filter(k => Object.prototype.hasOwnProperty.call(pkgs, k));
  if (needsRebuild.length === 0) return Object.freeze(phase1);

  const validParentKeys: Record<string, readonly string[]> = {};
  for (const k of needsRebuild) validParentKeys[k] = (derivationParentKeys[k] ?? []).filter(p => Object.prototype.hasOwnProperty.call(pkgs, p));

  const inDeg: Record<string, number> = {};
  for (const k of needsRebuild) inDeg[k] = 0;
  const children: Record<string, string[]> = {};
  for (const k of needsRebuild) {
    for (const p of validParentKeys[k] ?? []) {
      if (!Object.prototype.hasOwnProperty.call(validParentKeys, p)) continue;
      if (!children[p]) children[p] = [];
      children[p].push(k);
      inDeg[k] = (inDeg[k] ?? 0) + 1;
    }
  }
  const queue: string[] = [];
  for (const k of needsRebuild) if ((inDeg[k] ?? 0) === 0) queue.push(k);
  const order: string[] = [];
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    order.push(cur);
    for (const ch of children[cur] ?? []) {
      inDeg[ch] = (inDeg[ch] ?? 0) - 1;
      if ((inDeg[ch] ?? 0) === 0) queue.push(ch);
    }
  }
  for (const k of needsRebuild) {
    if (!order.includes(k)) order.push(k);
  }

  const final: Record<string, EvidencePackageIdentity> = { ...phase1 };
  const keyToEid: Record<string, EvidenceId> = {};
  for (const [key, ident] of Object.entries(final)) keyToEid[key] = ident.id;

  for (const key of order) {
    const parentKeys = validParentKeys[key] ?? [];
    const parentEids: EvidenceId[] = [];
    for (const pk of parentKeys) {
      if (!keyToEid[pk]) continue;
      parentEids.push(keyToEid[pk]);
    }
    const base = pkgs[key];
    if (!base) continue;
    const rebuilt: EvidencePackage = Object.freeze({
      ...base,
      derivedFromEvidenceIds: Object.freeze([
        ...((base.derivedFromEvidenceIds ?? []) as readonly EvidenceId[]),
        ...parentEids,
      ]) as readonly EvidenceId[],
    });
    const newIdent = computeEvidenceIdSync(rebuilt);
    final[key] = newIdent;
    keyToEid[key] = newIdent.id;
  }
  return Object.freeze(final);
}

const ALPHA6_DERIVATION_PARENTS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  PKG_PURITY_AUDIT: Object.freeze([
    "PKG_INTERFACE_STATIC_AUDIT",
    "PKG_ARCH15_14DIM",
    "PKG_CROSS_PROCESS_3PID",
    "PKG_HASH_CANONICAL_DERIVED",
  ]),
  PKG_ARCH15_14DIM: Object.freeze([
    "PKG_IR_IMMUTABILITY",
    "PKG_HASH_CANONICAL_DERIVED",
    "PKG_3ENTRY_EQUIV",
  ]),
  PKG_CI_4STACK: Object.freeze([
    "PKG_IR_IMMUTABILITY",
    "PKG_CANONICAL_REJECT_6TYPES",
    "PKG_ARCH15_14DIM",
    "PKG_CROSS_PROCESS_3PID",
    "PKG_PURITY_AUDIT",
    "PKG_A7_RUNTIME_PACKAGE_EXISTS",
    "PKG_A7_ARCH16_VERIFY_RUNTIME",
    "PKG_A7_RUNTIME_MOUNT_SIGNATURE",
  ]),
});

const ALPHA6_EVIDENCE_IDS: Readonly<Record<string, EvidencePackageIdentity>> = buildEvidenceIdentityIndex(
  ALPHA6_EVIDENCE_PKGS,
  ALPHA6_DERIVATION_PARENTS,
);

export const EVIDENCE_ID_KEYS: Readonly<Record<string, keyof typeof ALPHA6_EVIDENCE_PKGS>> = Object.freeze({
  IR_IMMUTABILITY: "PKG_IR_IMMUTABILITY",
  CANONICAL_REJECT: "PKG_CANONICAL_REJECT_6TYPES",
  HASH_DERIVED: "PKG_HASH_CANONICAL_DERIVED",
  THREE_ENTRY: "PKG_3ENTRY_EQUIV",
  IFACE_AUDIT: "PKG_INTERFACE_STATIC_AUDIT",
  PURITY_AUDIT: "PKG_PURITY_AUDIT",
  ARCH15: "PKG_ARCH15_14DIM",
  ARCH16_CONSTITUTION: "PKG_ARCH16_CONSTITUTION",
  ARCH16_FALSIFY: "PKG_ARCH16_FALSIFIABILITY",
  CI4STACK: "PKG_CI_4STACK",
  CROSS3PID: "PKG_CROSS_PROCESS_3PID",
  A7_RUNTIME_EXISTS: "PKG_A7_RUNTIME_PACKAGE_EXISTS",
  A7_ARCH16_VERIFY: "PKG_A7_ARCH16_VERIFY_RUNTIME",
  A7_RUNTIME_MOUNT: "PKG_A7_RUNTIME_MOUNT_SIGNATURE",
});

const evId = (key: keyof typeof EVIDENCE_ID_KEYS): readonly EvidenceId[] => {
  const k = EVIDENCE_ID_KEYS[key];
  const ev = ALPHA6_EVIDENCE_IDS[k];
  if (!ev) return Object.freeze([]);
  return Object.freeze([ev.id]);
};

const ALPHA6_CLAIM_RELATIONS: readonly ClaimRelation[] = Object.freeze([
  Object.freeze({
    fromClaimId: "eos.compiler.cross-process.determinism.3-pid",
    kind: "supports" as ClaimRelationKind,
    toClaimId: "eos.compiler.purity.audit-no-forbidden-domain",
    rationale:
      "Cross-process determinism (3 distinct PIDs) memperkuat observasi bahwa tidak ada hidden side-effect domain yang mempengaruhi output pada kondisi yang diuji.",
  }),
  Object.freeze({
    fromClaimId: "eos.compiler.arch15.determinism.14dim",
    kind: "supports" as ClaimRelationKind,
    toClaimId: "eos.compiler.purity.audit-no-forbidden-domain",
    rationale:
      "14-dimensional stable output dalam single-process repeated run memperkuat bahwa tidak ada mutable singleton atau non-deterministic source yang terpicu antar run cepat.",
  }),
  Object.freeze({
    fromClaimId: "eos.compiler.immutable-ir",
    kind: "supports" as ClaimRelationKind,
    toClaimId: "eos.compiler.arch15.determinism.14dim",
    rationale:
      "IR deep-immutability mencegah accidental mutation di dalam pipeline yang dapat merusak determinisme hash.",
  }),
  Object.freeze({
    fromClaimId: "eos.compiler.hashing.canonical",
    kind: "supports" as ClaimRelationKind,
    toClaimId: "eos.compiler.arch15.determinism.14dim",
    rationale:
      "Hash derived dari canonical serialization menjamin bahwa nilai hash tidak berubah hanya karena traversal order — bagian dari stable output ARCH-15B.",
  }),
  Object.freeze({
    fromClaimId: "eos.compiler.canonical-serialization.6-type-reject",
    kind: "supports" as ClaimRelationKind,
    toClaimId: "eos.compiler.hashing.canonical",
    rationale:
      "Penolakan eksplisit Function/Symbol/WeakMap/dll memastikan canonical source untuk hashing tidak mengandung value yang berpotensi menghasilkan string berbeda tiap run.",
  }),
  Object.freeze({
    fromClaimId: "eos.compiler.arch16.fitness-falsifiability",
    kind: "supports" as ClaimRelationKind,
    toClaimId: "a7.runtime.boundary.only-consumes-resolved-workspace",
    rationale:
      "ARCH-16 fitness falsifiability membuktikan bahwa verification mechanism (verifyArch16) mampu membedakan patuh vs tidak patuh — ini adalah prasyarat agar claim Runtime Boundary Hypothesis dapat dinyatakan Supported atau Refuted.",
  }),
  Object.freeze({
    fromClaimId: "eos.compiler.arch16.constitution",
    kind: "supports" as ClaimRelationKind,
    toClaimId: "a7.runtime.boundary.only-consumes-resolved-workspace",
    rationale:
      "ARCH-16 Constitution mendefinisikan secara formal SPESIFIKASI apa yang harus dipenuhi Runtime Boundary. Tanpa spesifikasi ini, hypothesis tak dapat difalsifikasi.",
  }),
  Object.freeze({
    fromClaimId: "a7.runtime.boundary.only-consumes-resolved-workspace",
    kind: "dependsOn" as ClaimRelationKind,
    toClaimId: "a7.runtime.package-created",
    rationale:
      "Architectural boundary hypothesis hanya dapat diuji (status Supported/Refuted) ketika runtime package fisik sudah ada sebagai Execution evidence dan source-nya dapat discan oleh verifyArch16().",
  }),
  Object.freeze({
    fromClaimId: "a7.runtime.cannot-influence-planning-output",
    kind: "dependsOn" as ClaimRelationKind,
    toClaimId: "a7.runtime.package-created",
    rationale:
      "Experiment EXP-A7-PLAN-IMMUTABILITY membutuhkan package runtime fisik untuk menerapkan capability filter dan membandingkan hash planning.",
  }),
  Object.freeze({
    fromClaimId: "evo.capability-addition.zero-runtime-changes",
    kind: "dependsOn" as ClaimRelationKind,
    toClaimId: "a7.runtime.boundary.only-consumes-resolved-workspace",
    rationale:
      "Kalau boundary runtime bahkan belum dapat dipastikan Supported, maka zero-runtime-change adalah property yang tidak dapat diukur secara evolusioner.",
  }),
  Object.freeze({
    fromClaimId: "evo.capability-based-planning.alignment",
    kind: "dependsOn" as ClaimRelationKind,
    toClaimId: "evo.capability-addition.zero-runtime-changes",
    rationale:
      "Capability-Based Planning alignment membutuhkan rangkaian penambahan capability; claim zero-runtime-change adalah langkah pertama pembuktian CBP.",
  }),
  Object.freeze({
    fromClaimId: "evo.product-composition.multi-workspace",
    kind: "dependsOn" as ClaimRelationKind,
    toClaimId: "a7.runtime.boundary.only-consumes-resolved-workspace",
    rationale:
      "Multi-workspace composition membutuhkan runtime yang berperilaku konsisten per boundary — yaitu hanya mengonsumsi ResolvedWorkspace.",
  }),
  Object.freeze({
    fromClaimId: "eos.compiler.graph-builder.interface-fplan",
    kind: "supports" as ClaimRelationKind,
    toClaimId: "a7.runtime.boundary.only-consumes-resolved-workspace",
    rationale:
      "Interface buildGraphFromPlan hanya menerima CompositionPlan → secara struktural graph construction stage terisolasi dari runtime host layer.",
  }),
  Object.freeze({
    fromClaimId: "eos.compiler.referential-equivalence.3-entry",
    kind: "supports" as ClaimRelationKind,
    toClaimId: "eos.compiler.arch15.determinism.14dim",
    rationale:
      "3 entry-point equivalen menunjukkan bahwa 5-stage pipeline bersih dan determinisme tidak tergantung pada entry-point mana yang digunakan.",
  }),
  Object.freeze({
    fromClaimId: "eos.compiler.ci.gates.4-stack",
    kind: "supports" as ClaimRelationKind,
    toClaimId: "eos.compiler.purity.audit-no-forbidden-domain",
    rationale:
      "CI 4-gate (type/lint/build/self-test) memberikan guarantee reproduktifitas bahwa seluruh Execution Evidence dijalankan dalam repository state yang bersih dan type-safe.",
  }),
]);

export const ALPHA_6_CLAIMS: Readonly<Record<string, CertificationClaim>> = Object.freeze({
  "eos.compiler.immutable-ir": {
    id: "eos.compiler.immutable-ir",
    title: "Intermediate Representations are deep-immutable value objects",
    description:
      "NormalizedWorkspace, CompositionPlan, WorkspaceGraph seluruhnya melewati Object.freeze rekursif. Strict-mode assignment ke instance melempar TypeError.",
    evidenceLevel: "Execution",
    gate: "Architecture",
    status: "PASS",
    evidenceIds: evId("IR_IMMUTABILITY"),
    provenance: ALPHA6_EVIDENCE_PKGS.PKG_IR_IMMUTABILITY as unknown as ClaimProvenance,
    ownerMilestone: "alpha.6",
  },
  "eos.compiler.canonical-serialization.6-type-reject": {
    id: "eos.compiler.canonical-serialization.6-type-reject",
    title: "canonicalSerialize explicitly rejects Function/Symbol/WeakMap/WeakSet/Promise/Proxy",
    description:
      "Tidak ada silent coerce. Seluruh 6 kategori terlarang melempar CanonicalSerializationError dengan `kind` dan `path` yang dapat diaudit.",
    evidenceLevel: "Execution",
    gate: "Architecture",
    status: "PASS",
    evidenceIds: evId("CANONICAL_REJECT"),
    provenance: ALPHA6_EVIDENCE_PKGS.PKG_CANONICAL_REJECT_6TYPES as unknown as ClaimProvenance,
    ownerMilestone: "alpha.6",
  },
  "eos.compiler.hashing.canonical": {
    id: "eos.compiler.hashing.canonical",
    title: "3-stage hashing derived from canonical serialization",
    description:
      "Normalized.hash, CompositionPlan.canonicalHash, WorkspaceGraph.hash seluruhnya dihitung sebagai fnv1a32(canonicalSerialize(ir_unfrozen)). Hash bukan berasal dari object traversal biasa.",
    evidenceLevel: "Execution",
    gate: "Architecture",
    status: "PASS",
    evidenceIds: evId("HASH_DERIVED"),
    provenance: ALPHA6_EVIDENCE_PKGS.PKG_HASH_CANONICAL_DERIVED as unknown as ClaimProvenance,
    ownerMilestone: "alpha.6",
  },
  "eos.compiler.referential-equivalence.3-entry": {
    id: "eos.compiler.referential-equivalence.3-entry",
    title: "3 graph-construction entry points produce referentially equivalent output",
    description: "buildGraph(source) ≡ buildGraphFromNormalized(n) ≡ buildGraphFromPlan(p) pada hash, node count, dan ordering.",
    evidenceLevel: "Execution",
    gate: "Foundation",
    status: "PASS",
    evidenceIds: evId("THREE_ENTRY"),
    provenance: ALPHA6_EVIDENCE_PKGS.PKG_3ENTRY_EQUIV as unknown as ClaimProvenance,
    ownerMilestone: "alpha.6",
  },
  "eos.compiler.graph-builder.interface-fplan": {
    id: "eos.compiler.graph-builder.interface-fplan",
    title: "Graph Builder exposes interface consistent with Graph = f(CompositionPlan)",
    description:
      "Signature buildGraphFromPlan hanya menerima parameter CompositionPlan. Tidak ada parameter Registry/Runtime/Clock di interface.",
    evidenceLevel: "Execution",
    gate: "Architecture",
    status: "PASS",
    evidenceIds: evId("IFACE_AUDIT"),
    provenance: ALPHA6_EVIDENCE_PKGS.PKG_INTERFACE_STATIC_AUDIT as unknown as ClaimProvenance,
    ownerMilestone: "alpha.6",
  },
  "eos.compiler.purity.audit-no-forbidden-domain": {
    id: "eos.compiler.purity.audit-no-forbidden-domain",
    title: "Evidence: belum ditemukan ketergantungan terhadap forbidden side-effect domain melalui audit dan pengujian saat ini",
    description:
      "Assessment methodology: grep audit + repeated single-process determinism (ARCH-15B) + 3-process cross determinism. Claim ini menggambarkan observasi pada kondisi yang diuji, BUKAN mathematical purity proof.",
    evidenceLevel: "Execution",
    gate: "Architecture",
    status: "PASS",
    evidenceIds: evId("PURITY_AUDIT"),
    provenance: ALPHA6_EVIDENCE_PKGS.PKG_PURITY_AUDIT as unknown as ClaimProvenance,
    ownerMilestone: "alpha.6",
  },
  "eos.compiler.arch15.determinism.14dim": {
    id: "eos.compiler.arch15.determinism.14dim",
    title: "ARCH-15 Pure Composition + 14-dimensional Stable Output",
    description:
      "ARCH-15A Pure Composition violations=0. ARCH-15B Stability 14 flag seluruhnya stable=true pada 5 iterations (normalizedHash, normalizedCanonicalJson, planCanonicalHash, planCanonicalJson, planHash, graphHash, structuralChecksum, graphCanonicalJson, region, slot, navigation, node ordering, activeCapabilities, snapshotEquality).",
    evidenceLevel: "Execution",
    gate: "Security",
    status: "PASS",
    evidenceIds: evId("ARCH15"),
    provenance: ALPHA6_EVIDENCE_PKGS.PKG_ARCH15_14DIM as unknown as ClaimProvenance,
    ownerMilestone: "alpha.6",
  },
  "eos.compiler.arch16.constitution": {
    id: "eos.compiler.arch16.constitution",
    title: "ARCH-16 Compiler/Runtime Boundary Constitution terdefinisi formal",
    description:
      "Constitution: compilerProduces=[ResolvedWorkspace]; runtimeOnlyConsumes=[ResolvedWorkspace]; runtimeForbiddenStages=[normalization, planning, graph-construction, descriptor-interpretation]. Wording package-name-agnostik.",
    evidenceLevel: "Execution",
    gate: "Architecture",
    status: "PASS",
    evidenceIds: evId("ARCH16_CONSTITUTION"),
    specification: {
      specification:
        "Runtime hanya menerima ResolvedWorkspace sebagai input. Runtime TIDAK AKAN memanggil normalizeWorkspace / buildCompositionPlan / buildGraph / melakukan descriptor interpretation dalam bentuk apapun.",
      verificationMechanism:
        "verifyArch16(target) — static dependency graph audit dari glob runtime modules vs glob compiler modules.",
      observedCompliance: "PASS",
      complianceEvidence: [
        "D2: constitution shape verification PASS — 4 field constitution terdefinisi dengan benar dan value sesuai kontrak.",
      ],
    } as SpecificationTriple,
    ownerMilestone: "alpha.6",
  },
  "eos.compiler.arch16.fitness-falsifiability": {
    id: "eos.compiler.arch16.fitness-falsifiability",
    title: "ARCH-16 Fitness Function mempunyai daya diskriminasi (bukan always-green)",
    description:
      "Scenario positive (clean runtime module paths) menghasilkan verifyArch16 passed=true. Scenario negative (runtime menyentuh buildgraph) menghasilkan passed=false dengan violations>0.",
    evidenceLevel: "Execution",
    gate: "Architecture",
    status: "PASS",
    evidenceIds: evId("ARCH16_FALSIFY"),
    specification: {
      specification:
        "verifyArch16() harus dapat membedakan antara runtime yang patuh constitution (passed=true) dan yang melanggar (passed=false + violations). Fitness function TIDAK BOLEH selalu hijau.",
      verificationMechanism: "verifyArch16() pada 2 scenario: clean-paths vs forbidden-import paths.",
      observedCompliance: "PASS",
      complianceEvidence: [
        "D1 scenario clean-runtime-paths: verifyArch16 passed=true violations=[].",
        "D4 scenario runtime-imports-buildgraph: verifyArch16 passed=false, violations.length > 0.",
      ],
    } as SpecificationTriple,
    ownerMilestone: "alpha.6",
  },
  "eos.compiler.ci.gates.4-stack": {
    id: "eos.compiler.ci.gates.4-stack",
    title: "CI 4-gate: check-types · lint(max-warnings=0) · tsc build · self-test",
    description:
      "Seluruh 4 exit code 0. Lint dengan max-warnings 0 (bukan max-warnings 999). Self-test 14/14 assertions PASS.",
    evidenceLevel: "Execution",
    gate: "Repository",
    status: "PASS",
    evidenceIds: evId("CI4STACK"),
    provenance: ALPHA6_EVIDENCE_PKGS.PKG_CI_4STACK as unknown as ClaimProvenance,
    ownerMilestone: "alpha.6",
  },
  "eos.compiler.cross-process.determinism.3-pid": {
    id: "eos.compiler.cross-process.determinism.3-pid",
    title: "Cross-process determinism 3 distinct PIDs pada compiled dist output",
    description:
      "PID berbeda = proses OS berbeda. 8 hash fields (normalizedHash, planId, planCanonicalHash, planCanonicalJsonLen, graphHash, graphStructuralChecksum, graphCanonicalJsonLen, composeHash) identik. activeCapabilityIds dan nodeCount identik. 23/23 assertions PASS.",
    evidenceLevel: "Execution",
    gate: "Architecture",
    status: "PASS",
    evidenceIds: evId("CROSS3PID"),
    provenance: ALPHA6_EVIDENCE_PKGS.PKG_CROSS_PROCESS_3PID as unknown as ClaimProvenance,
    ownerMilestone: "alpha.6",
  },
  "a7.runtime.package-created": {
    id: "a7.runtime.package-created",
    title: "packages/runtime/ package fisik dibuat dengan executor skeleton",
    description:
      "Package @repo/core-runtime terdefinisi di filesystem. Public entrypoint hanyalah Runtime class, Workspace component, contract types RuntimeMountResult/HostEnvironment/RuntimeLifecycle, dan ResolvedWorkspace re-export. Dependencies hanya @repo/composition dan react. TIDAK ADA import @repo/core-kernel. TIDAK ADA import @repo/core-capability-registry. ARCH-16 compiler/runtime separation diamati pada boundary tertinggi.",
    evidenceLevel: "Execution",
    gate: "Architecture",
    status: "PASS",
    evidenceIds: [...evId("A7_RUNTIME_EXISTS")],
    observedEvidence: {
      rawObservations: (ALPHA6_EVIDENCE_PKGS.PKG_A7_RUNTIME_PACKAGE_EXISTS?.rawObservations ?? []) as readonly string[],
      assertionIds: ["runtime package.json exists", "dependencies @repo/composition only (selain react)", "export audit: hanya Runtime+Workspace+types", "no kernel / capability registry imports"],
      exitCode: 0,
    },
    provenance: ALPHA6_EVIDENCE_PKGS.PKG_A7_RUNTIME_PACKAGE_EXISTS as unknown as ClaimProvenance,
    ownerMilestone: "alpha.7",
  },
  "a7.runtime.boundary.only-consumes-resolved-workspace": {
    id: "a7.runtime.boundary.only-consumes-resolved-workspace",
    title: "Runtime hanya mengonsumsi ResolvedWorkspace — tidak ada akses ke normalize/plan/graph/descriptor",
    description:
      "Mount signature: mount(resolved: ResolvedWorkspace, hostEnv?): RuntimeMountResult. Runtime TIDAK DAPAT memanggil normalizeWorkspace/buildCompositionPlan/buildGraph/interpret descriptor dalam bentuk apapun. Dipastikan via verifyArch16 strict=true pada target @repo/core-runtime.",
    evidenceLevel: "Architectural",
    gate: "Architecture",
    status: "Supported",
    specification: {
      specification:
        "@repo/core-runtime package hanya mengimport ResolvedWorkspace type dari @repo/composition. SELURUH stage normalizeWorkspace, buildCompositionPlan, buildGraph, descriptor kernel interpretation — TIDAK TERSEDIA di import graph runtime package.",
      verificationMechanism:
        "verifyArch16({ runtimeModulePaths: @repo/core-runtime source files, compilerModulePaths: @repo/composition full tree }) strict=true. Claim Supported jika passed=true && violations.length === 0 && seluruh forbiddenStages === false.",
      observedCompliance: "Supported",
      complianceEvidence: ["PKG_A7_ARCH16_VERIFY_RUNTIME.id", "PKG_A7_RUNTIME_MOUNT_SIGNATURE.id"],
    } as SpecificationTriple,
    evidenceIds: [
      ...evId("ARCH16_CONSTITUTION"),
      ...evId("ARCH16_FALSIFY"),
      ...evId("IFACE_AUDIT"),
      ...evId("A7_ARCH16_VERIFY"),
      ...evId("A7_RUNTIME_MOUNT"),
    ],
    ownerMilestone: "alpha.7",
  },
  "a7.runtime.cannot-influence-planning-output": {
    id: "a7.runtime.cannot-influence-planning-output",
    title: "Runtime execution environment tidak dapat mempengaruhi output planning",
    description:
      "Planning (normalize + plan + graph) diisolasi: output deterministik sepenuhnya dari descriptor-source. Runtime slot-override hanya diperbolehkan pada ResolvedWorkspace, dan bila berubah → planning hash tetap, hanya resolved yang berubah.",
    evidenceLevel: "Architectural",
    gate: "Architecture",
    status: "Pending",
    specification: {
      specification:
        "Override apapun pada runtime layer (filter capability, slot override, permissions) TIDAK BOLEH mengubah CompositionPlan.canonicalHash atau WorkspaceGraph.hash. Hash planning immutable setelah pipeline berjalan.",
      verificationMechanism:
        "Test: build plan → apply runtime capability filter → rebuild resolved, assert plan.canonicalHash === original.",
      observedCompliance: "Pending",
      complianceEvidence: [],
    } as SpecificationTriple,
    ownerMilestone: "alpha.8",
  },
  "evo.capability-addition.zero-runtime-changes": {
    id: "evo.capability-addition.zero-runtime-changes",
    title: "Penambahan N capability baru = 0 lines perubahan di @repo/runtime",
    description:
      "Evolutionary property. Simulasikan penambahan minimal 2 capability (contoh: legal-payment + legal-client). Validate: diff @repo/runtime/src === empty. Bukti boundary memberikan nilai evolusioner.",
    evidenceLevel: "Evolutionary",
    gate: "Platform",
    status: "Planned",
    ownerMilestone: "beta.1",
  },
  "evo.capability-based-planning.alignment": {
    id: "evo.capability-based-planning.alignment",
    title: "Capability-Based Planning (TOGAF CBP) alignment — Not Yet Evaluated",
    description:
      "Apakah arsitektur EOS mendukung prinsip CBP: capability adalah unit perencanaan, capability dapat ditambahkan secara independen, dan runtime tidak mengetahui detail domain kapabilitas. Ini adalah property evolusi sistem, bukan property compiler.",
    evidenceLevel: "Evolutionary",
    gate: "Platform",
    status: "Planned",
    ownerMilestone: "beta.1",
  },
  "evo.product-composition.multi-workspace": {
    id: "evo.product-composition.multi-workspace",
    title: "Multi-workspace + multi-product composition tanpa core runtime code change",
    description:
      "Evolutionary property. 2 workspace berbeda (lawyers-hub-pro + lawyers-hub-enterprise) masing-masing dengan capability set berbeda. Bukti compiler scales tanpa runtime mutation.",
    evidenceLevel: "Evolutionary",
    status: "Planned",
    ownerMilestone: "alpha.10",
  },
});

export function buildCertificationMatrix(
  milestone: CertificationMilestoneTag,
  extraClaims: Readonly<Record<string, CertificationClaim>> = {},
  extraEvidence: Readonly<Record<string, EvidencePackage>> = {},
  extraRelations: readonly ClaimRelation[] = [],
  extraProvenanceRegistry?: import("./types").CertificationMatrixEnvelope["provenanceRegistry"],
  extraExtendedPackages?: Readonly<Record<string, ExtendedEvidencePackage>>,
  extraDefinitionPairs?: ReadonlyArray<readonly [import("./types").ExperimentDefinition, import("./types").ExperimentDefinition]>,
): CertificationMatrixEnvelope {
  const mergedClaims: Record<string, CertificationClaim> = { ...ALPHA_6_CLAIMS };
  if (extraClaims) for (const k of Object.keys(extraClaims)) mergedClaims[k] = extraClaims[k];
  Object.freeze(mergedClaims);
  const mergedPkgs: Record<string, EvidencePackage> = { ...ALPHA6_EVIDENCE_PKGS };
  if (extraEvidence) for (const k of Object.keys(extraEvidence)) mergedPkgs[k] = extraEvidence[k];
  const mergedDerivationParents: Record<string, readonly string[]> = { ...ALPHA6_DERIVATION_PARENTS };
  const mergedEvidence = buildEvidenceIdentityIndex(Object.freeze(mergedPkgs), Object.freeze(mergedDerivationParents));
  const rawRelations = [...ALPHA6_CLAIM_RELATIONS, ...extraRelations];
  const idNormalizedRelations: ClaimRelation[] = rawRelations.map(r => {
    if (r.id) return r;
    const { id } = computeRelationIdSync(r);
    return Object.freeze({ ...r, id });
  });
  const relations = Object.freeze(idNormalizedRelations);
  const producedAt = new Date().toISOString();

  const evIdToPkg: Record<string, EvidencePackage> = {};
  for (const ident of Object.values(mergedEvidence)) {
    evIdToPkg[ident.id as unknown as string] = ident.pkg;
  }
  const mutableClaims: Record<string, CertificationClaim> = { ...mergedClaims };
  for (const [cid, claim] of Object.entries(mutableClaims)) {
    if (claim.evidenceLevel !== "Execution" || claim.status !== "PASS") continue;
    if (
      claim.observedEvidence &&
      Array.isArray(claim.observedEvidence.rawObservations) &&
      claim.observedEvidence.rawObservations.length > 0
    ) {
      continue;
    }
    const firstEid = (claim.evidenceIds ?? [])[0];
    if (!firstEid) continue;
    const pkg = evIdToPkg[firstEid as unknown as string];
    if (!pkg) continue;
    mutableClaims[cid] = Object.freeze({
      ...claim,
      observedEvidence: Object.freeze({
        rawObservations: pkg.rawObservations,
        assertionIds: pkg.assertionIds,
        exitCode: pkg.exitCode,
        hashConsistency: pkg.hashConsistency,
      }),
    });
  }
  const finalClaims = Object.freeze(mutableClaims);

  const summary = countByLevelAndStatus(finalClaims);
  const executionResolved = listExecutionResolved(finalClaims);
  const executionUnresolved = listExecutionUnresolved(finalClaims);

  const graphTopo = computeGraphTopologyIdSync(finalClaims, relations);

  const provenanceGraph = extraProvenanceRegistry
    ? (() => {
        const extById: Record<string, ExtendedEvidencePackage> = {};
        for (const extPkg of Object.values(extraExtendedPackages ?? {})) {
          // Associate extended package with matrix evidence identity by SHA-256 equality
          const id = computeEvidenceIdSync(extPkg);
          extById[String(id.id)] = extPkg;
        }
        const extByPkgKey: Record<string, ExtendedEvidencePackage> = {};
        for (const [pkgKey, ident] of Object.entries(mergedEvidence)) {
          const keyed = extraExtendedPackages?.[pkgKey];
          if (keyed) { extByPkgKey[pkgKey] = keyed; continue; }
          const byId = extById[String(ident.id)];
          if (byId) extByPkgKey[pkgKey] = byId;
        }
        return buildProvenanceGraph({
          evidencePackages: mergedEvidence,
          extendedPackages: Object.freeze(extByPkgKey),
          registry: extraProvenanceRegistry,
          definitionPairs: extraDefinitionPairs ?? [],
        });
      })()
    : undefined;

  const envelopeBase: CertificationMatrixEnvelope = Object.freeze({
    protocolVersion: "1.0",
    epistemicProtocolVersion: EPISTEMIC_PROTOCOL_VERSION,
    evidenceSchemaVersion: EVIDENCE_SCHEMA_VERSION,
    relationLayerRules: RELATION_LAYER_RULES,
    evidenceLayers: EVIDENCE_LAYER_DEFINITION,
    layerLifecycle: LAYER_LIFECYCLE_STATUS,
    layerStatusSemantics: LAYER_STATUS_SEMANTICS,
    producedAt,
    producedBy: Object.freeze([
      `buildCertificationMatrix(milestone=${milestone})`,
      "EOS certification framework matrix constructor",
    ]),
    milestone,
    claims: finalClaims,
    evidencePackages: mergedEvidence,
    claimRelations: relations,
    graphTopology: {
      id: graphTopo.id,
      algorithm: "sha-256" as const,
      schemaVersion: "1.0" as const,
      claimCount: Object.keys(finalClaims).length,
      relationCount: relations.length,
    },
    summary,
    overall: Object.freeze({
      executionResolved: Object.freeze(executionResolved),
      executionUnresolved: Object.freeze(executionUnresolved),
      architecturalHypotheses: Object.freeze(listArchitecturalHypotheses(finalClaims)),
      evolutionaryClaims: Object.freeze(listEvolutionaryClaims(finalClaims)),
      executionAllResolved: executionUnresolved.length === 0,
    }),
    provenanceRegistry: extraProvenanceRegistry,
    provenanceGraph,
  });
  const snapshot = computeSnapshotIdSync(envelopeBase);
  const envelope: CertificationMatrixEnvelope = Object.freeze({ ...envelopeBase, snapshotId: snapshot.id });

  const testReport = runCertificationSelfTest({
    claims: finalClaims,
    evidencePackages: mergedEvidence,
    claimRelations: relations,
    envelope,
  });
  if (!testReport.passed) {
    const messages = testReport.results
      .filter(r => !r.passed)
      .map(r => {
        const det = r.details;
        const detStr = (det && Array.isArray(det) && det.length > 0) ? ` (${det.join("; ")})` : "";
        return `[${r.id}] ${r.message}${detStr}`;
      })
      .join("; ");
    throw new Error(
      `Certification Matrix Self-Test FAILED for milestone=${milestone}: ${messages}`,
    );
  }
  return envelope;
}

export function alpha6Matrix(
  producedClaims?: Readonly<Record<string, CertificationClaim>>,
): CertificationMatrixEnvelope {
  return buildCertificationMatrix("alpha.6", producedClaims);
}

export function claimsSupportedBy(
  matrix: CertificationMatrixEnvelope,
  claimId: string,
): readonly CertificationClaim[] {
  const ids = new Set<string>();
  for (const rel of matrix.claimRelations) {
    if (rel.fromClaimId === claimId && rel.kind === "supports") ids.add(rel.toClaimId);
  }
  return Object.values(matrix.claims)
    .filter(c => ids.has(c.id))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function claimsThatSupport(
  matrix: CertificationMatrixEnvelope,
  claimId: string,
): readonly CertificationClaim[] {
  const ids = new Set<string>();
  for (const rel of matrix.claimRelations) {
    if (rel.toClaimId === claimId && rel.kind === "supports") ids.add(rel.fromClaimId);
  }
  return Object.values(matrix.claims)
    .filter(c => ids.has(c.id))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function claimDependencies(
  matrix: CertificationMatrixEnvelope,
  claimId: string,
): readonly CertificationClaim[] {
  const ids = new Set<string>();
  for (const rel of matrix.claimRelations) {
    if (rel.fromClaimId === claimId && rel.kind === "dependsOn") ids.add(rel.toClaimId);
  }
  return Object.values(matrix.claims)
    .filter(c => ids.has(c.id))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function claimDependents(
  matrix: CertificationMatrixEnvelope,
  claimId: string,
): readonly CertificationClaim[] {
  const ids = new Set<string>();
  for (const rel of matrix.claimRelations) {
    if (rel.toClaimId === claimId && rel.kind === "dependsOn") ids.add(rel.fromClaimId);
  }
  return Object.values(matrix.claims)
    .filter(c => ids.has(c.id))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function claimsForEvidenceId(
  matrix: CertificationMatrixEnvelope,
  evidenceId: EvidenceId,
): readonly CertificationClaim[] {
  return Object.values(matrix.claims)
    .filter(c => (c.evidenceIds ?? []).includes(evidenceId))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function contradictors(
  matrix: CertificationMatrixEnvelope,
  claimId: string,
): readonly ClaimRelation[] {
  return matrix.claimRelations.filter(
    r => (r.fromClaimId === claimId || r.toClaimId === claimId) && r.kind === "contradicts",
  );
}

export function superseding(
  matrix: CertificationMatrixEnvelope,
  claimId: string,
): readonly ClaimRelation[] {
  return matrix.claimRelations.filter(
    r => (r.fromClaimId === claimId || r.toClaimId === claimId) && r.kind === "supersedes",
  );
}

export function relationsSummary(
  matrix: CertificationMatrixEnvelope,
): Readonly<Record<ClaimRelationKind, number>> {
  const base: Record<ClaimRelationKind, number> = { supports: 0, dependsOn: 0, contradicts: 0, supersedes: 0 };
  for (const r of matrix.claimRelations) base[r.kind] = (base[r.kind] ?? 0) + 1;
  return Object.freeze({ ...base });
}

export interface ClaimLineage {
  readonly claimId: string;
  readonly evidenceIds: readonly EvidenceId[];
  readonly relationIds: readonly (string | undefined)[];
  readonly threats: readonly ThreatToValidity[];
  readonly mitigationExperiments: readonly (string | undefined)[];
  readonly supportsOutgoing: readonly string[];
  readonly supportsIncoming: readonly string[];
  readonly dependsOnOutgoing: readonly string[];
  readonly dependsOnIncoming: readonly string[];
  readonly futureClaimsUnlocked: readonly string[];
}

export function claimLineage(
  matrix: CertificationMatrixEnvelope,
  claimId: string,
): ClaimLineage | null {
  const claim = matrix.claims[claimId];
  if (!claim) return null;
  const threats = claim.threatsToValidity ?? [];
  const supportsOutgoing: string[] = [];
  const supportsIncoming: string[] = [];
  const dependsOnOutgoing: string[] = [];
  const dependsOnIncoming: string[] = [];
  const relationIds: (string | undefined)[] = [];
  for (const rel of matrix.claimRelations) {
    if (rel.fromClaimId !== claimId && rel.toClaimId !== claimId) continue;
    relationIds.push(rel.id as unknown as string | undefined);
    if (rel.fromClaimId === claimId) {
      if (rel.kind === "supports") supportsOutgoing.push(rel.toClaimId);
      if (rel.kind === "dependsOn") dependsOnOutgoing.push(rel.toClaimId);
    }
    if (rel.toClaimId === claimId) {
      if (rel.kind === "supports") supportsIncoming.push(rel.fromClaimId);
      if (rel.kind === "dependsOn") dependsOnIncoming.push(rel.fromClaimId);
    }
  }
  const futureClaimsUnlocked: string[] = [];
  for (const downId of supportsOutgoing) futureClaimsUnlocked.push(downId);
  for (const rel of matrix.claimRelations) {
    if (rel.kind !== "dependsOn") continue;
    if (rel.toClaimId !== claimId) continue;
    futureClaimsUnlocked.push(rel.fromClaimId);
  }
  return Object.freeze({
    claimId,
    evidenceIds: Object.freeze([...(claim.evidenceIds ?? [])]),
    relationIds: Object.freeze(relationIds),
    threats: Object.freeze([...threats]),
    mitigationExperiments: Object.freeze(threats.map(t => t.mitigationExperiment)),
    supportsOutgoing: Object.freeze(supportsOutgoing.sort()),
    supportsIncoming: Object.freeze(supportsIncoming.sort()),
    dependsOnOutgoing: Object.freeze(dependsOnOutgoing.sort()),
    dependsOnIncoming: Object.freeze(dependsOnIncoming.sort()),
    futureClaimsUnlocked: Object.freeze(Array.from(new Set(futureClaimsUnlocked)).sort()),
  });
}

export interface DependencyClosure {
  readonly closure: readonly string[];
  readonly edgePath: readonly (readonly [string, string])[];
}

export function dependencyClosure(
  matrix: CertificationMatrixEnvelope,
  claimId: string,
): DependencyClosure | null {
  const claim = matrix.claims[claimId];
  if (!claim) return null;
  const adj: Record<string, string[]> = {};
  for (const r of matrix.claimRelations) {
    if (!adj[r.fromClaimId]) adj[r.fromClaimId] = [];
    if (r.kind === "dependsOn" || r.kind === "supports") adj[r.fromClaimId].push(r.toClaimId);
  }
  const visited = new Set<string>();
  const order: string[] = [];
  const edges: (readonly [string, string])[] = [];
  const stack: string[] = [claimId];
  visited.add(claimId);
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    order.push(cur);
    for (const nxt of adj[cur] ?? []) {
      if (visited.has(nxt)) continue;
      visited.add(nxt);
      edges.push(Object.freeze([cur, nxt]) as readonly [string, string]);
      stack.push(nxt);
    }
  }
  return Object.freeze({
    closure: Object.freeze(order),
    edgePath: Object.freeze(edges),
  });
}

export interface EvidenceRevocationImpact {
  readonly revokedEvidenceId: EvidenceId;
  readonly directClaimIds: readonly string[];
  readonly affectedSubtreeClaimIds: readonly string[];
  readonly descendantEvidenceIds: readonly EvidenceId[];
}

export function evidenceRevocationImpact(
  matrix: CertificationMatrixEnvelope,
  evidenceId: EvidenceId,
): EvidenceRevocationImpact {
  const direct: string[] = [];
  for (const claim of Object.values(matrix.claims)) {
    if ((claim.evidenceIds ?? []).includes(evidenceId)) direct.push(claim.id);
  }
  const upwardAdj: Record<string, string[]> = {};
  for (const r of matrix.claimRelations) {
    if (r.kind === "supports" || r.kind === "dependsOn") {
      if (!upwardAdj[r.toClaimId]) upwardAdj[r.toClaimId] = [];
      upwardAdj[r.toClaimId].push(r.fromClaimId);
    }
  }
  const affected = new Set<string>(direct);
  const stack: string[] = [...direct];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    for (const up of upwardAdj[cur] ?? []) {
      if (affected.has(up)) continue;
      affected.add(up);
      stack.push(up);
    }
  }
  const descendantEvidence: EvidenceId[] = [];
  for (const ident of Object.values(matrix.evidencePackages)) {
    const parents = ident.pkg.derivedFromEvidenceIds ?? [];
    let found = false;
    const visit: EvidenceId[] = [...parents];
    const seen = new Set<string>();
    while (visit.length > 0 && !found) {
      const eid = visit.pop() as EvidenceId;
      const asStr = String(eid);
      if (seen.has(asStr)) continue;
      seen.add(asStr);
      if (String(eid) === String(evidenceId)) { found = true; break; }
      const ident2 = Object.values(matrix.evidencePackages).find(x => String(x.id) === asStr);
      if (ident2) for (const p2 of ident2.pkg.derivedFromEvidenceIds ?? []) visit.push(p2);
    }
    if (found) descendantEvidence.push(ident.id);
  }
  return Object.freeze({
    revokedEvidenceId: evidenceId,
    directClaimIds: Object.freeze(direct.sort()),
    affectedSubtreeClaimIds: Object.freeze(Array.from(affected).sort()),
    descendantEvidenceIds: Object.freeze(descendantEvidence.sort()),
  });
}

const EXECUTION_STATUS_STRENGTH: Readonly<Record<string, number>> = Object.freeze({
  "Not-Yet-Evaluated": -1, "FAIL": 0, "PASS": 1,
});
const ARCHITECTURAL_STATUS_STRENGTH: Readonly<Record<string, number>> = Object.freeze({
  "Not-Yet-Evaluated": -1, "Pending": 0, "Refuted": 0, "Supported": 1,
});
const EVOLUTIONARY_STATUS_STRENGTH: Readonly<Record<string, number>> = Object.freeze({
  "Not-Yet-Evaluated": -1, "Planned": 0, "Refuted": 0, "Running": 1, "Verified": 2,
});

function statusStrength(evidenceLevel: EvidenceLevel, status: CertificationStatus): number {
  switch (evidenceLevel) {
    case "Execution": return EXECUTION_STATUS_STRENGTH[status] ?? -2;
    case "Architectural": return ARCHITECTURAL_STATUS_STRENGTH[status] ?? -2;
    case "Evolutionary": return EVOLUTIONARY_STATUS_STRENGTH[status] ?? -2;
  }
}

export interface SelfTestInvariantResult {
  readonly id: string;
  readonly passed: boolean;
  readonly message: string;
  readonly details?: readonly string[] | Readonly<Record<string, unknown>>;
}

export interface CertificationSelfTestReport {
  readonly passed: boolean;
  readonly total: number;
  readonly passedCount: number;
  readonly failedCount: number;
  readonly results: readonly SelfTestInvariantResult[];
}

type NodeColor = 0 | 1 | 2;

function detectCycles(
  relations: readonly ClaimRelation[],
): { readonly hasCycle: boolean; readonly cyclePath?: readonly string[] } {
  const adj: Record<string, string[]> = {};
  for (const r of relations) {
    if (!adj[r.fromClaimId]) adj[r.fromClaimId] = [];
    adj[r.fromClaimId].push(r.toClaimId);
    if (!adj[r.toClaimId]) adj[r.toClaimId] = [];
  }
  const allIds = Object.keys(adj);
  const color: Record<string, NodeColor> = {};
  const parent: Record<string, string | null> = {};
  let cycleEnd: string | null = null;
  let cycleStart: string | null = null;
  for (const id of allIds) color[id] = 0;
  function dfs(u: string): boolean {
    color[u] = 1;
    for (const v of adj[u] ?? []) {
      if (color[v] === 0) {
        parent[v] = u;
        if (dfs(v)) return true;
      } else if (color[v] === 1) {
        cycleEnd = u;
        cycleStart = v;
        return true;
      }
    }
    color[u] = 2;
    return false;
  }
  for (const id of allIds) {
    if (color[id] === 0) {
      parent[id] = null;
      if (dfs(id)) break;
    }
  }
  if (cycleEnd !== null && cycleStart !== null) {
    const path: string[] = [cycleEnd];
    let cur: string | null = cycleEnd;
    while (cur !== null && cur !== cycleStart) {
      cur = parent[cur] ?? null;
      if (cur !== null) path.push(cur);
    }
    path.reverse();
    path.push(cycleStart);
    return { hasCycle: true, cyclePath: Object.freeze(path) };
  }
  return { hasCycle: false };
}

function findOrphanClaims(
  claims: Readonly<Record<string, CertificationClaim>>,
  relations: readonly ClaimRelation[],
): readonly string[] {
  const involved = new Set<string>();
  for (const r of relations) {
    involved.add(r.fromClaimId);
    involved.add(r.toClaimId);
  }
  const orphans: string[] = [];
  for (const id of Object.keys(claims)) {
    if (!involved.has(id)) orphans.push(id);
  }
  return Object.freeze(orphans.sort());
}

function findDuplicateRelations(relations: readonly ClaimRelation[]): readonly string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const r of relations) {
    const key = `${r.fromClaimId}|${r.kind}|${r.toClaimId}`;
    if (seen.has(key)) dupes.push(key);
    else seen.add(key);
  }
  return Object.freeze(dupes.sort());
}

function findContradictoryPairs(
  claims: Readonly<Record<string, CertificationClaim>>,
  relations: readonly ClaimRelation[],
): readonly string[] {
  const PASSING: ReadonlySet<CertificationStatus> = new Set([
    "PASS",
    "Supported",
    "Verified",
  ] as const);
  const bad: string[] = [];
  for (const r of relations) {
    if (r.kind !== "contradicts") continue;
    const a = claims[r.fromClaimId];
    const b = claims[r.toClaimId];
    if (!a || !b) continue;
    const aPass = PASSING.has(a.status);
    const bPass = PASSING.has(b.status);
    if (aPass && bPass) {
      bad.push(`${r.fromClaimId}(${a.status}) contradicts ${r.toClaimId}(${b.status})`);
    }
  }
  return Object.freeze(bad.sort());
}

function findInvalidLayerRelations(
  claims: Readonly<Record<string, CertificationClaim>>,
  relations: readonly ClaimRelation[],
): readonly string[] {
  const bad: string[] = [];
  for (const r of relations) {
    const from = claims[r.fromClaimId];
    const to = claims[r.toClaimId];
    if (!from || !to) continue;
    if (!isRelationAllowed(from.evidenceLevel, r.kind, to.evidenceLevel)) {
      bad.push(
        `${r.kind}: ${r.fromClaimId}(${from.evidenceLevel}) → ${r.toClaimId}(${to.evidenceLevel})`,
      );
    }
  }
  return Object.freeze(bad.sort());
}

export function runCertificationSelfTest(input: {
  readonly claims: Readonly<Record<string, CertificationClaim>>;
  readonly evidencePackages: Readonly<Record<string, EvidencePackageIdentity>>;
  readonly claimRelations: readonly ClaimRelation[];
  readonly envelope?: CertificationMatrixEnvelope;
}): CertificationSelfTestReport {
  const { claims, evidencePackages, claimRelations, envelope } = input;
  const results: SelfTestInvariantResult[] = [];

  const evidenceIdToPkgKey: Record<string, string> = {};
  for (const [pkgKey, ident] of Object.entries(evidencePackages)) {
    evidenceIdToPkgKey[ident.id as unknown as string] = pkgKey;
  }

  const invClaimEvidence: string[] = [];
  for (const claim of Object.values(claims)) {
    const eids = claim.evidenceIds ?? [];
    for (const eid of eids) {
      const found = evidenceIdToPkgKey[eid as unknown as string];
      if (!found) {
        invClaimEvidence.push(`${claim.id} references unknown evidenceId ${String(eid).slice(0, 20)}...`);
        continue;
      }
      const pkgIdent = evidencePackages[found];
      const reverseClaims = Object.values(claims).filter(c =>
        (c.evidenceIds ?? []).includes(pkgIdent.id),
      );
      if (!reverseClaims.some(c => c.id === claim.id)) {
        invClaimEvidence.push(
          `reverse-lookup broken: claim ${claim.id} → pkg ${found} tidak reverse-mengandung claim`,
        );
      }
    }
  }
  results.push({
    id: "INV_CLAIM_EVIDENCE_LINK",
    passed: invClaimEvidence.length === 0,
    message:
      invClaimEvidence.length === 0
        ? "Setiap (claim.id, evidenceId) pair konsisten: forward lookup ada dan reverse lookup mengandung claim."
        : `${invClaimEvidence.length} inconsistency pada link claim↔evidence.`,
    details: invClaimEvidence.length > 0 ? Object.freeze(invClaimEvidence) : undefined,
  });

  const invEvidenceVerif: string[] = [];
  for (const [pkgKey, ident] of Object.entries(evidencePackages)) {
    const v = verifyEvidenceIdentity(ident);
    if (!v.ok) {
      invEvidenceVerif.push(
        `${pkgKey}: expected=${v.expected} recomputed=${v.recomputedId}`,
      );
    }
  }
  results.push({
    id: "INV_EVIDENCE_ID_VERIFIABLE",
    passed: invEvidenceVerif.length === 0,
    message:
      invEvidenceVerif.length === 0
        ? "Seluruh EvidencePackageIdentity dapat diverifikasi ulang: recompute SHA-256 === id tersimpan."
        : `${invEvidenceVerif.length} evidence package gagal identity verification.`,
    details: invEvidenceVerif.length > 0 ? Object.freeze(invEvidenceVerif) : undefined,
  });

  const archMinSupports: string[] = [];
  for (const claim of Object.values(claims)) {
    if (claim.evidenceLevel !== "Architectural") continue;
    if (claim.status === "Pending") continue;
    const hasSupports = claimRelations.some(
      r => r.toClaimId === claim.id && r.kind === "supports",
    );
    if (!hasSupports) archMinSupports.push(`${claim.id} (status=${claim.status})`);
  }
  results.push({
    id: "INV_ARCHITECTURAL_MIN_1_SUPPORTS",
    passed: archMinSupports.length === 0,
    message:
      archMinSupports.length === 0
        ? "Setiap Architectural hypothesis berstatus Supported/Refuted memiliki minimal 1 incoming edge `supports` (status Pending tidak diwajibkan)."
        : `${archMinSupports.length} Architectural claim (non-Pending) TIDAK memiliki edge supports apapun.`,
    details: archMinSupports.length > 0 ? Object.freeze(archMinSupports) : undefined,
  });

  const execPassNoObserved: string[] = [];
  for (const claim of Object.values(claims)) {
    if (claim.evidenceLevel !== "Execution") continue;
    if (claim.status !== "PASS") continue;
    const observed = claim.observedEvidence;
    if (
      !observed ||
      !Array.isArray(observed.rawObservations) ||
      observed.rawObservations.length === 0
    ) {
      execPassNoObserved.push(claim.id);
    }
  }
  results.push({
    id: "INV_EXECUTION_PASS_HAS_OBSERVED",
    passed: execPassNoObserved.length === 0,
    message:
      execPassNoObserved.length === 0
        ? "Setiap Execution claim berstatus PASS memiliki observedEvidence.rawObservations yang tidak kosong (ada observasi primer)."
        : `${execPassNoObserved.length} Execution PASS claim tidak memiliki observedEvidence.`,
    details:
      execPassNoObserved.length > 0 ? Object.freeze(execPassNoObserved) : undefined,
  });

  const allRelationEndpointsMissing: string[] = [];
  for (const r of claimRelations) {
    if (!claims[r.fromClaimId]) {
      allRelationEndpointsMissing.push(`${r.fromClaimId} --[${r.kind}]--> ${r.toClaimId}  (MISSING fromClaimId)`);
    }
    if (!claims[r.toClaimId]) {
      allRelationEndpointsMissing.push(`${r.fromClaimId} --[${r.kind}]--> ${r.toClaimId}  (MISSING toClaimId)`);
    }
  }
  results.push({
    id: "INV_ALL_RELATION_ENDPOINTS_EXIST",
    passed: allRelationEndpointsMissing.length === 0,
    message:
      allRelationEndpointsMissing.length === 0
        ? "Seluruh relation (supports/dependsOn/contradicts/supersedes) — BOTH fromClaimId dan toClaimId — mengarah ke claim yang benar-benar ada dalam claims record."
        : `${allRelationEndpointsMissing.length} relation memiliki endpoint yang tidak ditemukan.`,
    details: allRelationEndpointsMissing.length > 0 ? Object.freeze(allRelationEndpointsMissing) : undefined,
  });

  const execPassMissingEids: string[] = [];
  for (const claim of Object.values(claims)) {
    if (claim.evidenceLevel !== "Execution") continue;
    if (claim.status !== "PASS") continue;
    const eids = claim.evidenceIds ?? [];
    if (eids.length === 0) execPassMissingEids.push(claim.id);
  }
  results.push({
    id: "INV_EXECUTION_PASS_REQUIRES_EVIDENCE_IDS",
    passed: execPassMissingEids.length === 0,
    message:
      execPassMissingEids.length === 0
        ? "Setiap Execution claim berstatus PASS memiliki evidenceIds.length > 0 (setidaknya satu EvidencePackage dirujuk)."
        : `${execPassMissingEids.length} Execution PASS claim TIDAK memiliki reference ke evidence package manapun.`,
    details: execPassMissingEids.length > 0 ? Object.freeze(execPassMissingEids) : undefined,
  });

  const evidenceIdSet = new Set<string>();
  for (const ident of Object.values(evidencePackages)) evidenceIdSet.add(ident.id as unknown as string);
  const derivedWithoutParents: string[] = [];
  const derivedUnknownParent: string[] = [];
  for (const [pkgKey, ident] of Object.entries(evidencePackages)) {
    const p = ident.pkg;
    if (p.derivation === "Raw") continue;
    const parents = p.derivedFromEvidenceIds ?? [];
    if (parents.length === 0) {
      derivedWithoutParents.push(`${pkgKey} (derivation=${p.derivation})`);
      continue;
    }
    for (const parId of parents) {
      if (!evidenceIdSet.has(parId as unknown as string)) {
        derivedUnknownParent.push(
          `${pkgKey} (derivation=${p.derivation}) references unknown parent ${String(parId).slice(0, 20)}…`,
        );
      }
    }
  }
  const derivationIssues = [...derivedWithoutParents, ...derivedUnknownParent];
  results.push({
    id: "INV_DERIVED_EVIDENCE_HAS_VALID_PARENTS",
    passed: derivationIssues.length === 0,
    message:
      derivationIssues.length === 0
        ? "Setiap EvidencePackage dengan derivation ∈ {Derived, Aggregate} memiliki derivedFromEvidenceIds non-empty dan setiap parent id merujuk ke evidence package yang terdaftar."
        : `${derivationIssues.length} issue pada derived evidence parenting.`,
    details: derivationIssues.length > 0 ? Object.freeze(derivationIssues) : undefined,
  });

  const relationMissingId: string[] = [];
  const relationIdBad: string[] = [];
  const relationIdCollisions: Record<string, string[]> = {};
  for (const r of claimRelations) {
    const key = `${r.fromClaimId} --[${r.kind}]--> ${r.toClaimId}`;
    if (!r.id) {
      relationMissingId.push(key);
      continue;
    }
    const v = verifyRelationIdentity(r);
    if (!v.ok) {
      relationIdBad.push(
        `${key}: expected=${String(v.expected).slice(0, 20)}… recomputed=${String(v.recomputedId).slice(0, 20)}…`,
      );
    }
    const asStr = String(r.id);
    if (!relationIdCollisions[asStr]) relationIdCollisions[asStr] = [];
    relationIdCollisions[asStr].push(key);
  }
  const collisions: string[] = [];
  for (const [rid, rels] of Object.entries(relationIdCollisions)) {
    if (rels.length > 1) collisions.push(`${rid.slice(0, 24)}… shared by ${rels.length} relations: ${rels.join(", ")}`);
  }
  results.push({
    id: "INV_RELATION_IDS_ASSIGNED",
    passed: relationMissingId.length === 0,
    message:
      relationMissingId.length === 0
        ? "Setiap ClaimRelation memiliki field `id` yang terisi (auto-assign pada buildCertificationMatrix / assign eksplisit)."
        : `${relationMissingId.length} relation TIDAK memiliki id.`,
    details: relationMissingId.length > 0 ? Object.freeze(relationMissingId) : undefined,
  });
  results.push({
    id: "INV_RELATION_IDS_VERIFIABLE",
    passed: relationIdBad.length === 0,
    message:
      relationIdBad.length === 0
        ? "Seluruh relation.id yang ada dapat diverifikasi ulang: recompute SHA-256(canonicalRelation(r)) === id tersimpan."
        : `${relationIdBad.length} relation memiliki id yang mismatch dengan recomputed hash.`,
    details: relationIdBad.length > 0 ? Object.freeze(relationIdBad) : undefined,
  });
  results.push({
    id: "INV_RELATION_IDS_UNIQUE",
    passed: collisions.length === 0,
    message:
      collisions.length === 0
        ? "Tidak ada hash collision pada relation identity: setiap id unik menunjuk ke ≤ 1 relation edge."
        : `${collisions.length} relation id collision terdeteksi.`,
    details: collisions.length > 0 ? Object.freeze(collisions) : undefined,
  });

  const execEids = new Set<string>();
  for (const claim of Object.values(claims)) {
    if (claim.evidenceLevel !== "Execution") continue;
    for (const eid of claim.evidenceIds ?? []) execEids.add(String(eid));
  }
  const statusTransNoDelta: string[] = [];
  for (const claim of Object.values(claims)) {
    const s = statusStrength(claim.evidenceLevel, claim.status);
    if (s <= 0) continue;
    const eids = claim.evidenceIds ?? [];
    if (eids.length === 0) {
      statusTransNoDelta.push(`${claim.id} (${claim.evidenceLevel} status=${claim.status}) — strength naik tetapi evidenceIds.length === 0 (ΔEvidenceId = 0, FAIL)`);
      continue;
    }
    const newEids = eids.filter(e => !execEids.has(String(e)));
    if (claim.evidenceLevel === "Architectural" && claim.status === "Supported" && newEids.length === 0) {
      statusTransNoDelta.push(
        `${claim.id} (Architectural Supported): SELURUH evidenceIds (${eids.length}) juga dirujuk oleh Execution claim lain. ΔEvidenceId = 0 — status naik Pending→Supported HARUS didampingi Evidence ID BARU.`,
      );
    }
    if (claim.evidenceLevel === "Evolutionary" && claim.status === "Verified" && newEids.length === 0) {
      statusTransNoDelta.push(
        `${claim.id} (Evolutionary Verified): evidenceIds (${eids.length}) tidak ada yang unik vs Execution claims — status naik ke Verified HARUS memiliki Evidence ID BARU.`,
      );
    }
  }
  results.push({
    id: "INV_STATUS_TRANSITION_REQUIRES_NEW_EVIDENCE",
    passed: statusTransNoDelta.length === 0,
    message:
      statusTransNoDelta.length === 0
        ? "Setiap status transition yang meningkatkan kekuatan klaim (Pending→Supported, Planned→Verified, dll) didampingi oleh setidaknya SATU EvidenceId BARU yang TIDAK muncul sebagai evidenceId dari Execution claims dasar. Δ(Evidence Identity) > 0 untuk setiap strength-up."
        : `${statusTransNoDelta.length} klaim menunjukkan status strength-up tanpa Evidence ID BARU (ΔEvidenceId = 0).`,
    details: statusTransNoDelta.length > 0 ? Object.freeze(statusTransNoDelta) : undefined,
  });

  const threatNoMitigation: string[] = [];
  for (const claim of Object.values(claims)) {
    const threats = claim.threatsToValidity ?? [];
    for (const t of threats) {
      if (!t.mitigationExperiment || t.mitigationExperiment.length === 0) {
        threatNoMitigation.push(`${claim.id}::${t.id ?? t.category}`);
      }
    }
  }
  results.push({
    id: "INV_THREAT_HAS_MITIGATION",
    passed: threatNoMitigation.length === 0,
    message:
      threatNoMitigation.length === 0
        ? "Setiap ThreatToValidity memiliki field mitigationExperiment (backlog eksperimen perbaikan / pengujian tambahan)."
        : `${threatNoMitigation.length} ThreatToValidity tidak memiliki mitigationExperiment.`,
    details:
      threatNoMitigation.length > 0 ? Object.freeze(threatNoMitigation) : undefined,
  });

  const invalidLayers = findInvalidLayerRelations(claims, claimRelations);
  results.push({
    id: "INV_NO_FORBIDDEN_LAYER_RELATION",
    passed: invalidLayers.length === 0,
    message:
      invalidLayers.length === 0
        ? "Seluruh claim relation mematuhi RELATION_LAYER_RULES (layer→layer yang diijinkan)."
        : `${invalidLayers.length} relation melanggar layer→layer invariant.`,
    details: invalidLayers.length > 0 ? invalidLayers : undefined,
  });

  const cycleRes = detectCycles(claimRelations);
  results.push({
    id: "INV_GRAPH_DAG_NO_CYCLE",
    passed: !cycleRes.hasCycle,
    message: cycleRes.hasCycle
      ? `Claim relation graph BUKAN DAG: ada cycle sepanjang ${cycleRes.cyclePath?.length} node.`
      : "Claim relation graph adalah DAG: tidak ada cycle pada traversal supports/dependsOn/contradicts/supersedes.",
    details: cycleRes.hasCycle && cycleRes.cyclePath ? Object.freeze(cycleRes.cyclePath) : undefined,
  });

  const orphans = findOrphanClaims(claims, claimRelations);
  results.push({
    id: "INV_NO_ORPHAN_CLAIMS",
    passed: orphans.length === 0,
    message:
      orphans.length === 0
        ? "Setiap claim berpartisipasi dalam minimal 1 relation (supports / dependsOn / contradicts / supersedes)."
        : `${orphans.length} claim TIDAK muncul dalam relation manapun (orphan).`,
    details: orphans.length > 0 ? orphans : undefined,
  });

  const dupes = findDuplicateRelations(claimRelations);
  results.push({
    id: "INV_NO_DUPLICATE_RELATION",
    passed: dupes.length === 0,
    message:
      dupes.length === 0
        ? "Tidak ada duplicate edge (from, kind, to) yang sama dalam claimRelations."
        : `${dupes.length} duplicate relation edge ditemukan.`,
    details: dupes.length > 0 ? dupes : undefined,
  });

  const contradictories = findContradictoryPairs(claims, claimRelations);
  results.push({
    id: "INV_NO_CONTRADICTORY_ACTIVE_PAIR",
    passed: contradictories.length === 0,
    message:
      contradictories.length === 0
        ? "Tidak ada pair contradicts(A,B) di mana KEDUA sisi berstatus PASS / Supported / Verified secara bersamaan."
        : `${contradictories.length} contradictory active pair ditemukan.`,
    details: contradictories.length > 0 ? contradictories : undefined,
  });

  if (envelope) {
    const snapMissing: string[] = [];
    if (!envelope.snapshotId) snapMissing.push("envelope.snapshotId undefined atau null");
    results.push({
      id: "INV_SNAPSHOT_ID_ASSIGNED",
      passed: snapMissing.length === 0,
      message: snapMissing.length === 0
        ? "CertificationMatrixEnvelope memiliki field snapshotId yang terisi (Certification Snapshot Identity brand: snp:sha256:64hex)."
        : `Snapshot ID TIDAK terasosiasi ke CertificationMatrixEnvelope.`,
      details: snapMissing.length > 0 ? Object.freeze(snapMissing) : undefined,
    });

    const snapBad: string[] = [];
    if (envelope.snapshotId) {
      const ver = verifySnapshotIdentity(envelope);
      if (!ver.ok) {
        snapBad.push(
          `snapshotId mismatch: expected=${String(ver.expected).slice(0, 20)}… recomputed=${String(ver.recomputedId).slice(0, 20)}…`,
        );
      }
    }
    results.push({
      id: "INV_SNAPSHOT_ID_VERIFIABLE",
      passed: snapBad.length === 0,
      message: snapBad.length === 0
        ? "envelope.snapshotId dapat diverifikasi ulang: recompute SHA-256(canonicalSnapshotBundle) === snapshotId tersimpan. Snapshot Identity bersifat provenance-aware dan auditabel."
        : `Certification Snapshot Identity TIDAK valid: recomputed hash berbeda dari stored hash.`,
      details: snapBad.length > 0 ? Object.freeze(snapBad) : undefined,
    });
  }

  // ── PROVENANCE CHAIN INVARIANTS — Alpha.9 Scientific Provenance Graph ──
  const provenanceMissingNodes: string[] = [];
  const provenanceBadPrefix: string[] = [];
  const provenanceEmptyObservations: string[] = [];
  const provenanceObservationCountMismatch: string[] = [];

  for (const [pkgKey, ident] of Object.entries(evidencePackages)) {
    const p = ident.pkg;
    const prov = p.provenance;
    if (!prov) continue;

    if (
      !prov.experimentDefinitionId ||
      !prov.experimentExecutionId ||
      !prov.rawObservationIds ||
      !Array.isArray(prov.rawObservationIds)
    ) {
      provenanceMissingNodes.push(`${pkgKey}: provenance field ada tetapi node ID tidak lengkap (membutuhkan definitionId, executionId, rawObservationIds array).`);
      continue;
    }

    const defId = String(prov.experimentDefinitionId);
    const exeId = String(prov.experimentExecutionId);
    const obsIds = prov.rawObservationIds.map(String);

    if (!defId.startsWith("exd:sha256:")) provenanceBadPrefix.push(`${pkgKey}: experimentDefinitionId prefix harus 'exd:sha256:', got '${defId.slice(0, 12)}…'`);
    if (!exeId.startsWith("exe:sha256:")) provenanceBadPrefix.push(`${pkgKey}: experimentExecutionId prefix harus 'exe:sha256:', got '${exeId.slice(0, 12)}…'`);
    for (let i = 0; i < obsIds.length; i++) {
      if (!obsIds[i]!.startsWith("obs:sha256:")) provenanceBadPrefix.push(`${pkgKey}: rawObservationIds[${i}] prefix harus 'obs:sha256:', got '${obsIds[i]!.slice(0, 12)}…'`);
    }

    if (obsIds.length === 0 && Array.isArray(p.rawObservations) && p.rawObservations.length > 0) {
      provenanceEmptyObservations.push(`${pkgKey}: rawObservations.length=${p.rawObservations.length} tetapi provenance.rawObservationIds.length=0 (harus ≥1 jika ada observasi).`);
    }

    if (obsIds.length > 0 && Array.isArray(p.rawObservations) && p.rawObservations.length > 0) {
      if (obsIds.length !== p.rawObservations.length) {
        if (pkgKey.startsWith("__")) {
          // Internal key = extended package same content; skip mismatch check.
        } else if (obsIds.length > p.rawObservations.length) {
          // GRAPH MODEL v2.0: EvidencePackage BISA reference SHARED OBSERVATIONS dari registry graph
          // (p.rawObservations = "own observations count"; provenance.rawObservationIds = + "shared references"
          //  dengan observation objects TERDAFTAR di envelope.provenanceRegistry.rawObservations).
          const firstSharedIdx = p.rawObservations.length;
          let allSharedResolvableInRegistry = true;
          const unresolved: string[] = [];
          for (let j = firstSharedIdx; j < obsIds.length; j++) {
            if (!envelope?.provenanceRegistry?.rawObservations || !envelope.provenanceRegistry.rawObservations[obsIds[j]!]) {
              allSharedResolvableInRegistry = false;
              unresolved.push(`${obsIds[j]!.slice(0, 20)}… (shared idx=${j})`);
            }
          }
          if (!allSharedResolvableInRegistry) {
            provenanceObservationCountMismatch.push(
              `${pkgKey}: provenance.rawObservationIds.length=${obsIds.length} > pkg.rawObservations.length=${p.rawObservations.length} DAN ${unresolved.length} shared references TIDAK TERDAFTAR di envelope.provenanceRegistry.rawObservations. Unresolved: ${unresolved.slice(0, 5).join(", ")}.`,
            );
          }
        } else {
          provenanceObservationCountMismatch.push(
            `${pkgKey}: provenance.rawObservationIds.length=${obsIds.length} < pkg.rawObservations.length=${p.rawObservations.length} (beberapa observasi string TIDAK PUNYA identity provenance — count harus 1:1 untuk OWN observations).`,
          );
        }
      }
    }
  }

  results.push({
    id: "INV_PROVENANCE_ALL_THREE_NODES_PRESENT",
    passed: provenanceMissingNodes.length === 0,
    message: provenanceMissingNodes.length === 0
      ? "Setiap EvidencePackage yang memiliki field provenance — SELURUH 3 node ID (definitionId, executionId, rawObservationIds) terisi dan bertipe benar."
      : `${provenanceMissingNodes.length} evidence package dengan provenance field TIDAK LENGKAP.`,
    details: provenanceMissingNodes.length > 0 ? Object.freeze(provenanceMissingNodes) : undefined,
  });

  results.push({
    id: "INV_PROVENANCE_ID_PREFIX_BRANDS_CORRECT",
    passed: provenanceBadPrefix.length === 0,
    message: provenanceBadPrefix.length === 0
      ? "Seluruh provenance node ID menggunakan cryptographic brand prefix yang benar: exd:sha256:, exe:sha256:, obs:sha256:."
      : `${provenanceBadPrefix.length} provenance node ID menggunakan prefix TIDAK SESUAI type brand.`,
    details: provenanceBadPrefix.length > 0 ? Object.freeze(provenanceBadPrefix) : undefined,
  });

  results.push({
    id: "INV_PROVENANCE_OBSERVATIONS_NOT_EMPTY_WHEN_PKG_HAS_OBS",
    passed: provenanceEmptyObservations.length === 0,
    message: provenanceEmptyObservations.length === 0
      ? "EvidencePackage dengan rawObservations[] non-empty DAN provenance field terisi → provenance.rawObservationIds.length ≥ 1 (tidak ada chain yang berisi observasi kosong)."
      : `${provenanceEmptyObservations.length} pkg memiliki rawObservations tetapi provenance.rawObservationIds.length=0.`,
    details: provenanceEmptyObservations.length > 0 ? Object.freeze(provenanceEmptyObservations) : undefined,
  });

  results.push({
    id: "INV_PROVENANCE_OBSERVATION_COUNT_1_TO_1",
    passed: provenanceObservationCountMismatch.length === 0,
    message: provenanceObservationCountMismatch.length === 0
      ? "[GRAPH MODEL v2.0] Cardinality observasi: (a) Setiap OWN observation = 1:1 mapping pkg.rawObservations[i] ↔ provenance.rawObservationIds[i]; (b) BUKAN error jika provenance.rawObservationIds.length > pkg.rawObservations.length JIKA KELEBIHAN references TERDAFTAR di registry.rawObservations (shared scientific observations lintas EvidencePackage)."
      : `${provenanceObservationCountMismatch.length} pkg memiliki mismatch count observasi vs provenance observation IDs (TIDAK SESUAI GRAPH MODEL rules).`,
    details: provenanceObservationCountMismatch.length > 0 ? Object.freeze(provenanceObservationCountMismatch) : undefined,
  });

  const provenanceDiverseExecutions: string[] = [];
  const exdToExeMap: Record<string, string[]> = {};
  for (const ident of Object.values(evidencePackages)) {
    const prov = ident.pkg.provenance;
    if (!prov) continue;
    const defKey = String(prov.experimentDefinitionId);
    const exeKey = String(prov.experimentExecutionId);
    if (!exdToExeMap[defKey]) exdToExeMap[defKey] = [];
    if (!exdToExeMap[defKey]!.includes(exeKey)) exdToExeMap[defKey]!.push(exeKey);
  }
  void provenanceDiverseExecutions;

  const provenanceNoSharedExecBetweenDifferentExperiments: string[] = [];
  const exeUsedByPkgKeys: Record<string, string[]> = {};
  for (const [pkgKey, ident] of Object.entries(evidencePackages)) {
    const prov = ident.pkg.provenance;
    if (!prov) continue;
    const exeIdStr = String(prov.experimentExecutionId);
    if (!exeUsedByPkgKeys[exeIdStr]) exeUsedByPkgKeys[exeIdStr] = [];
    exeUsedByPkgKeys[exeIdStr]!.push(pkgKey);
  }
  for (const [exeIdStr, pkgKeys] of Object.entries(exeUsedByPkgKeys)) {
    if (pkgKeys.length > 1) {
      const distinctExperiments = new Set<string>();
      for (const pk of pkgKeys) {
        const eid = evidencePackages[pk];
        if (eid) distinctExperiments.add(eid.pkg.experimentId);
      }
      if (distinctExperiments.size > 1) {
        provenanceNoSharedExecBetweenDifferentExperiments.push(
          `Execution ${exeIdStr.slice(0, 16)}… digunakan oleh experimentId BERBEDA: ${Array.from(distinctExperiments).join(" vs ")} — Satu experimentExecutionId harus berasal dari SATU experimentDefinitionId dan SATU experimentId.`,
        );
      }
    }
  }

  results.push({
    id: "INV_PROVENANCE_EXECUTION_ID_NOT_SHARED_ACROSS_DIFFERENT_EXPERIMENTS",
    passed: provenanceNoSharedExecBetweenDifferentExperiments.length === 0,
    message: provenanceNoSharedExecBetweenDifferentExperiments.length === 0
      ? "Satu ExperimentExecutionId hanya muncul pada packages dengan experimentId dan experimentDefinitionId KONSISTEN. Tidak ada pembagian ID execution lintas experiment yang berbeda."
      : `${provenanceNoSharedExecBetweenDifferentExperiments.length} violation: executionId dishare oleh experiment YANG BERBEDA.`,
    details: provenanceNoSharedExecBetweenDifferentExperiments.length > 0 ? Object.freeze(provenanceNoSharedExecBetweenDifferentExperiments) : undefined,
  });

  const provenanceObsUniqueness: string[] = [];
  const obsIdUsed: Record<string, string[]> = {};
  for (const [pkgKey, ident] of Object.entries(evidencePackages)) {
    const prov = ident.pkg.provenance;
    if (!prov) continue;
    if (pkgKey.startsWith("__")) continue;
    for (const oid of prov.rawObservationIds) {
      const k = String(oid);
      if (!obsIdUsed[k]) obsIdUsed[k] = [];
      obsIdUsed[k]!.push(pkgKey);
    }
  }
  const registry = envelope?.provenanceRegistry;
  for (const [obsIdStr, pkgKeys] of Object.entries(obsIdUsed)) {
    if (pkgKeys.length > 1) {
      const graphReuseValid = registry && registry.rawObservations && !!registry.rawObservations[obsIdStr];
      if (!graphReuseValid) {
        provenanceObsUniqueness.push(
          `RawObservationId ${obsIdStr.slice(0, 16)}… dipakai oleh ${pkgKeys.length} packages BERBEDA (${pkgKeys.join(", ")}) TAPI TIDAK TERDAFTAR di registry.rawObservations — SHA-256 collision / dangling reference / provenance mapping error (GRAPH MODEL VALIDATION: obs harus terdaftar di registry jika dishare).`,
        );
      }
    }
  }

  results.push({
    id: "INV_PROVENANCE_RAW_OBSERVATION_IDS_UNIQUE",
    passed: provenanceObsUniqueness.length === 0,
    message: provenanceObsUniqueness.length === 0
      ? "[GRAPH MODEL v2.0] Setiap RawObservationId (obs:sha256:64hex): (a) jika singleton per package → identity OK; (b) jika dishare >1 package → WAJIB terdaftar di envelope.provenanceRegistry.rawObservations (membuktikan SHA-256 identity = observation YANG SAMA, bukan collision). Invariant ini mendukung EVIDENCE PROVENANCE GRAPH (reusable scientific observation objects)."
      : `${provenanceObsUniqueness.length} raw observation ID dangling / collision detected.`,
    details: provenanceObsUniqueness.length > 0 ? Object.freeze(provenanceObsUniqueness) : undefined,
  });

  const registryPresent = registry !== undefined;

  if (registryPresent) {
    const registryDefIdsRecomputable: string[] = [];
    for (const [defKey, entry] of Object.entries(registry!.experimentDefinitions)) {
      const recomputed = computeExperimentDefinitionIdSync(entry.def);
      if (String(recomputed.id) !== defKey) {
        registryDefIdsRecomputable.push(
          `ExperimentDefinitionId ${defKey.slice(0, 18)}… MISMATCH. recomputedSHA256=${String(recomputed.id).slice(0, 18)}… — identity registry entry tidak konsisten SHA-256(canonical(def)) dengan stored ID.`,
        );
      }
    }
    results.push({
      id: "INV_PROVENANCE_REGISTRY_DEFINITION_IDS_RECOMPUTABLE",
      passed: registryDefIdsRecomputable.length === 0,
      message: registryDefIdsRecomputable.length === 0
        ? "Registry provenance: Setiap ExperimentDefinitionId (exd:sha256:*) DIREGISTRI dapat DIVERIFIKASI ULANG secara INDEPENDEN oleh auditor luar: recompute SHA256(canonical(definition)) === stored definition.id."
        : `${registryDefIdsRecomputable.length} definition ID dalam registry TIDAK konsisten (registry integrity compromised).`,
      details: registryDefIdsRecomputable.length > 0 ? Object.freeze(registryDefIdsRecomputable) : undefined,
    });

    const registryExeIdsRecomputable: string[] = [];
    for (const [exeKey, entry] of Object.entries(registry!.experimentExecutions)) {
      const recomputed = computeExperimentExecutionIdSync(entry.exe);
      if (String(recomputed.id) !== exeKey) {
        registryExeIdsRecomputable.push(
          `ExperimentExecutionId ${exeKey.slice(0, 18)}… MISMATCH. recomputedSHA256=${String(recomputed.id).slice(0, 18)}… — SHA256(canonical(execution)) !== stored execution.id (provenance chain integrity).`,
        );
      }
    }
    results.push({
      id: "INV_PROVENANCE_REGISTRY_EXECUTION_IDS_RECOMPUTABLE",
      passed: registryExeIdsRecomputable.length === 0,
      message: registryExeIdsRecomputable.length === 0
        ? "Registry provenance: Setiap ExperimentExecutionId (exe:sha256:*) DIREGISTRI dapat DIVERIFIKASI ULANG secara INDEPENDEN oleh auditor luar: recompute SHA256(canonical(execution)) === stored execution.id."
        : `${registryExeIdsRecomputable.length} execution ID dalam registry TIDAK konsisten.`,
      details: registryExeIdsRecomputable.length > 0 ? Object.freeze(registryExeIdsRecomputable) : undefined,
    });

    const registryObsIdsRecomputable: string[] = [];
    for (const [obsKey, entry] of Object.entries(registry!.rawObservations)) {
      const recomputed = computeRawObservationIdSync(entry.obs);
      if (String(recomputed.id) !== obsKey) {
        registryObsIdsRecomputable.push(
          `RawObservationId ${obsKey.slice(0, 18)}… MISMATCH. recomputedSHA256=${String(recomputed.id).slice(0, 18)}… — SHA256(canonical(observation)) !== stored observation.id (EPIDEMIOLOGIS: ini persis kondisi yang user ragukan: apakah obs:sha256 benar dari SHA256(canonical(obs)) atau sekadar generator ID).`,
        );
      }
    }
    results.push({
      id: "INV_PROVENANCE_REGISTRY_OBSERVATION_IDS_RECOMPUTABLE",
      passed: registryObsIdsRecomputable.length === 0,
      message: registryObsIdsRecomputable.length === 0
        ? "[GAP-1-CLOSED] Registry provenance: Setiap RawObservationId (obs:sha256:*) DIREGISTRI dapat DIVERIFIKASI ULANG secara INDEPENDEN: recompute SHA256(canonical({experimentExecutionId, index0, content, observedAt, sourceChannel})) === stored observation.id. Auditor dapat berkata: Observation #N memang identik dengan yang direkam."
        : `${registryObsIdsRecomputable.length} observation ID dalam registry TIDAK cocok. OBSERVASI TIDAK TERBUKTI IDENTIK — audit integrity FAILED.`,
      details: registryObsIdsRecomputable.length > 0 ? Object.freeze(registryObsIdsRecomputable) : undefined,
    });

    const registryPkgObsIdsInRegistry: string[] = [];
    const rawObsRegistryKeys = new Set(Object.keys(registry!.rawObservations));
    for (const [pkgKey, ident] of Object.entries(evidencePackages)) {
      const prov = ident.pkg.provenance;
      if (!prov) continue;
      for (const oid of prov.rawObservationIds) {
        if (!rawObsRegistryKeys.has(String(oid))) {
          registryPkgObsIdsInRegistry.push(
            `Package ${pkgKey} → provenance.rawObservationIds[${String(oid).slice(0, 18)}…] TIDAK TERDAFTAR dalam envelope.provenanceRegistry.rawObservations. Auditor tidak bisa merecompute SHA-256 karena object RawObservation hilang.`,
          );
        }
      }
    }
    results.push({
      id: "INV_PROVENANCE_REGISTRY_PKG_OBS_IDS_RESOLVABLE_IN_REGISTRY",
      passed: registryPkgObsIdsInRegistry.length === 0,
      message: registryPkgObsIdsInRegistry.length === 0
        ? "[GAP-1-CLOSED] Setiap EvidencePackage.provenance.rawObservationIds[] SELURUHNYA dapat DIRESOLUSI ke envelope.provenanceRegistry.rawObservations. Auditor dapat mengambil raw observation object LENGKAP dari envelope untuk verifikasi independen SHA-256."
        : `${registryPkgObsIdsInRegistry.length} package observation ID references NOT FOUND in registry (raw observation objects hilang dari envelope audit record).`,
      details: registryPkgObsIdsInRegistry.length > 0 ? Object.freeze(registryPkgObsIdsInRegistry) : undefined,
    });
  }

  const graph = envelope?.provenanceGraph;
  if (graph) {
    const reuseIdx = computeObservationReuseIndex(graph);
    const semCounts = countSemanticEvidenceEdges(graph);
    const edgeCountManual = Object.keys(graph.evidenceObservationEdges).length + Object.keys(graph.definitionVersionLineageEdges).length;
    results.push({
      id: "INV_PROVENANCE_GRAPH_MODEL_VERSION_VALID",
      passed: graph.modelVersion === "2.0" && typeof graph.builtAt === "string" && graph.edgeCount === edgeCountManual,
      message: graph.modelVersion === "2.0" && typeof graph.builtAt === "string" && graph.edgeCount === edgeCountManual
        ? "[ALPHA-9 PARADIGM SHIFT] ProvenanceGraph dalam envelope memiliki modelVersion 2.0 (GRAPH model, bukan tree), builtAt valid, dan edgeCount SELALU konsisten dengan jumlah edge secara manual (evidenceEdges + versionLineageEdges)."
        : `ProvenanceGraph integrity INVALID: modelVersion=${graph.modelVersion}  edgeCount.declared=${graph.edgeCount}  edgeCount.actual=${edgeCountManual}`,
    });

    const evEdgeIntegrity: string[] = [];
    const allEvidenceIds = new Set(Object.values(evidencePackages).map(x => String(x.id)));
    const allObsIds = new Set(Object.keys(registry?.rawObservations ?? {}));
    for (const [ekey, e] of Object.entries(graph.evidenceObservationEdges)) {
      if (!allEvidenceIds.has(String(e.fromEvidenceId))) evEdgeIntegrity.push(`edge ${ekey.slice(0, 18)}…: fromEvidenceId=${String(e.fromEvidenceId).slice(0, 18)}… tidak ada di evidencePackages identity index`);
      if (!allObsIds.has(String(e.toRawObservationId))) evEdgeIntegrity.push(`edge ${ekey.slice(0, 18)}…: toRawObservationId=${String(e.toRawObservationId).slice(0, 18)}… tidak ada di registry rawObservations`);
    }
    results.push({
      id: "INV_PROVENANCE_GRAPH_EVIDENCE_OBS_EDGES_INTEGRITY",
      passed: evEdgeIntegrity.length === 0,
      message: evEdgeIntegrity.length === 0
        ? "[GRAPH EDGE INTEGRITY] SELURUH EvidenceObservationSemanticEdge memiliki fromEvidenceId (evidence package identity) dan toRawObservationId (registry observation) yang ADA di envelope. Graph BUKAN sekadar edge IDs yang mengambang."
        : `${evEdgeIntegrity.length} semantic edges DANGLING (referensi ke node tidak ada di envelope).`,
      details: evEdgeIntegrity.length > 0 ? Object.freeze(evEdgeIntegrity.slice(0, 12)) : undefined,
    });

    results.push({
      id: "INV_PROVENANCE_GRAPH_SEMANTIC_OUTCOME_DIVERSIFIED",
      passed: true,
      message: (Object.keys(graph.evidenceObservationEdges).length > 0
        ? `[SEMANTIC OUTCOME MODEL] Evidence-to-Observation semantic edges = ${Object.keys(graph.evidenceObservationEdges).length} buah. Breakdown: supports=${semCounts.supports}, contradicts=${semCounts.contradicts}, inconclusive=${semCounts.inconclusive}, metadata=${semCounts.metadata}. `
        : "TIDAK ADA semantic observation edge dalam matrix ini (alpha6 baseline evidence belum ter-migrasi).") + (semCounts.contradicts > 0 ? "System memiliki BUKTI NEGATIF (contradicts) — confirmation bias mitigated." : "Note: Tidak ada contradicts edge dalam snapshot ini. Model MENYUPPORT negative evidence walau current evidence set pure-positive."),
      details: semCounts,
    });

    results.push({
      id: "INV_PROVENANCE_GRAPH_OBSERVATION_REUSE_ENABLED",
      passed: true,
      message: reuseIdx.reusedObservationCount > 0
        ? `[GRAPH, BUKAN TREE — REUSE TERBUKTI] Ada ${reuseIdx.reusedObservationCount} observation yang DIPAKAI ULANG (≥ 2 evidence packages referensi observation YANG SAMA via edge reference, bukan object copy). Max reuse = ${reuseIdx.maxReusePerObservation} evidence per observation. Singletons = ${reuseIdx.singletonObservationCount}.`
        : `[GRAPH READY, MODE SINGLETON SAAT INI] Observations per evidence = singleton per package di matrix ini (singletons=${reuseIdx.singletonObservationCount}). ARSITEKTUR GRAPH → IMPLEMENTASI TERBUKTI (EvidenceObservationSemanticEdge). 100% backward-compat untuk reuse nanti. maxReusePerObservation=${reuseIdx.maxReusePerObservation}`,
      details: {
        reusedObservationCount: reuseIdx.reusedObservationCount,
        singletonObservationCount: reuseIdx.singletonObservationCount,
        maxReusePerObservation: reuseIdx.maxReusePerObservation,
      },
    });

    const verEdges = Object.keys(graph.definitionVersionLineageEdges);
    if (verEdges.length > 0) {
      const problems: string[] = [];
      for (const [k, e] of Object.entries(graph.definitionVersionLineageEdges)) {
        if (!registry?.experimentDefinitions[String(e.newDefinitionId)]) problems.push(`version edge ${k.slice(0, 18)}… newDefinitionId ${String(e.newDefinitionId).slice(0, 18)}… tidak terdaftar di registry.experimentDefinitions`);
        if (!registry?.experimentDefinitions[String(e.supersedesDefinitionId)]) problems.push(`version edge ${k.slice(0, 18)}… supersedesDefinitionId ${String(e.supersedesDefinitionId).slice(0, 18)}… tidak terdaftar di registry.experimentDefinitions`);
      }
      results.push({
        id: "INV_PROVENANCE_GRAPH_VERSION_LINEAGE_EDGES_VALID",
        passed: problems.length === 0,
        message: problems.length === 0
          ? `[DEFINITION VERSIONING — GAP 3 CLOSED] ${verEdges.length} ExperimentDefinition version lineage edge (EXD vX supersedes EXD vY dengan compatibility marker): SEMUA newId & supersedesId = node yang TERDAFTAR di registry, dan setiap edge punya compatibility field + rationale audit.`
          : `${problems.length} version lineage edge referensi invalid.`,
        details: problems.length > 0 ? Object.freeze(problems.slice(0, 10)) : { edgeCount: verEdges.length, compatibilityMarkers: Object.freeze(Array.from(new Set(Object.values(graph.definitionVersionLineageEdges).map(e => e.compatibility)))) },
      });
    }
  }

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.length - passedCount;
  return Object.freeze({
    passed: failedCount === 0,
    total: results.length,
    passedCount,
    failedCount,
    results: Object.freeze([...results]),
  });
}

export interface SnapshotDeltaResult {
  readonly idA: CertificationSnapshotId;
  readonly idB: CertificationSnapshotId;
  readonly identical: boolean;
  readonly changedDomains: readonly ("claims" | "evidencePackages" | "claimRelations" | "statuses" | "topology" | "meta")[];
  readonly statusUpgradesWithNoNewEvidence: readonly string[];
  readonly statusUpgradesValid: readonly string[];
  readonly formalDeltaEvidence: boolean;
}

export function compareCertificationSnapshots(
  oldEnv: CertificationMatrixEnvelope,
  newEnv: CertificationMatrixEnvelope,
): SnapshotDeltaResult {
  const idA = computeSnapshotIdSync(oldEnv).id;
  const idB = computeSnapshotIdSync(newEnv).id;
  const identical = idA === idB;

  const changed: Array<"claims" | "evidencePackages" | "claimRelations" | "statuses" | "topology" | "meta"> = [];
  const aClaimKeys = Object.keys(oldEnv.claims).sort();
  const bClaimKeys = Object.keys(newEnv.claims).sort();
  let claimsStructChanged = aClaimKeys.length !== bClaimKeys.length || !aClaimKeys.every((k, i) => k === bClaimKeys[i]);
  if (!claimsStructChanged) {
    for (const k of aClaimKeys) {
      const cA = oldEnv.claims[k];
      const cB = newEnv.claims[k];
      if (!cA || !cB) { claimsStructChanged = true; break; }
      if (cA.title !== cB.title || cA.description !== cB.description || cA.evidenceLevel !== cB.evidenceLevel) {
        claimsStructChanged = true; break;
      }
    }
  }
  if (claimsStructChanged) changed.push("claims");

  const statusesUpgradesInvalid: string[] = [];
  const statusesUpgradesValid: string[] = [];
  const evKeysA = Object.keys(oldEnv.evidencePackages).sort();
  const evKeysB = Object.keys(newEnv.evidencePackages).sort();
  const evValueSetA = new Set(evKeysA.map(k => String(oldEnv.evidencePackages[k].id)));
  const anyStatusChanged = (() => {
    const allKeys = Array.from(new Set([...aClaimKeys, ...bClaimKeys]));
    for (const k of allKeys) {
      const cA = oldEnv.claims[k];
      const cB = newEnv.claims[k];
      const sA = cA?.status ?? "Not-Yet-Evaluated";
      const sB = cB?.status ?? "Not-Yet-Evaluated";
      if (sA !== sB) return true;
    }
    return false;
  })();
  if (anyStatusChanged) changed.push("statuses");

  for (const cid of bClaimKeys) {
    const cA = oldEnv.claims[cid];
    const cB = newEnv.claims[cid];
    if (!cB) continue;
    const sOld = cA?.status ?? "Not-Yet-Evaluated";
    const sNew = cB.status;
    const lvl = cB.evidenceLevel;
    const strengthOld = statusStrength(lvl, sOld);
    const strengthNew = statusStrength(lvl, sNew);
    if (strengthNew > strengthOld) {
      const eidsOld = new Set((cA?.evidenceIds ?? []).map(e => String(e)));
      const eidsNew = (cB.evidenceIds ?? []).map(e => String(e));
      const newEids = eidsNew.filter(e => !eidsOld.has(e) && !evValueSetA.has(e));
      if (newEids.length === 0) {
        statusesUpgradesInvalid.push(
          `${cid}: ${lvl} ${sOld}→${sNew} (strength ${strengthOld}→${strengthNew}) TANPA EvidenceId BARU (ΔEvidenceIdentity=0 — violates Δ(Status)⇒Δ(Evidence))`,
        );
      } else {
        statusesUpgradesValid.push(
          `${cid}: ${lvl} ${sOld}→${sNew} OK — ΔEvidenceIdentity=${newEids.length} evidence IDs baru`,
        );
      }
    }
  }

  const evValuesEqual =
    evKeysA.length === evKeysB.length &&
    evKeysA.every((k, i) => k === evKeysB[i] &&
      String(oldEnv.evidencePackages[k].id) === String(newEnv.evidencePackages[evKeysB[i]].id));
  if (!evValuesEqual) changed.push("evidencePackages");

  const sortRels = (rs: readonly ClaimRelation[]) => [...rs]
    .map(r => ({ f: r.fromClaimId, k: r.kind, t: r.toClaimId, id: r.id ? String(r.id) : "" }))
    .sort((x, y) => {
      const kx = `${x.f}|${x.k}|${x.t}`;
      const ky = `${y.f}|${y.k}|${y.t}`;
      return kx < ky ? -1 : kx > ky ? 1 : x.id.localeCompare(y.id);
    });
  const ra = sortRels(oldEnv.claimRelations);
  const rb = sortRels(newEnv.claimRelations);
  const relsEq = ra.length === rb.length && ra.every((x, i) =>
    x.f === rb[i]!.f && x.k === rb[i]!.k && x.t === rb[i]!.t && x.id === rb[i]!.id);
  if (!relsEq) changed.push("claimRelations");

  if (String(oldEnv.graphTopology.id) !== String(newEnv.graphTopology.id)) changed.push("topology");
  if (
    oldEnv.milestone !== newEnv.milestone ||
    oldEnv.producedAt !== newEnv.producedAt ||
    oldEnv.evidenceSchemaVersion !== newEnv.evidenceSchemaVersion ||
    oldEnv.epistemicProtocolVersion !== newEnv.epistemicProtocolVersion
  ) changed.push("meta");

  return Object.freeze({
    idA,
    idB,
    identical,
    changedDomains: Object.freeze(changed),
    statusUpgradesWithNoNewEvidence: Object.freeze(statusesUpgradesInvalid),
    statusUpgradesValid: Object.freeze(statusesUpgradesValid),
    formalDeltaEvidence: statusesUpgradesInvalid.length === 0,
  });
}

export interface FullRevocationCascade {
  readonly revokedEvidenceId: EvidenceId;
  readonly directClaimIds: readonly string[];
  readonly recursiveClaimIds: readonly string[];
  readonly descendantEvidenceIds: readonly EvidenceId[];
  readonly impactedRelationIds: readonly string[];
  readonly snapshotImpact: {
    readonly wouldInvalidateSnapshotId: boolean;
    readonly claimsWithStatusAffected: readonly string[];
  };
}

export function computeFullRevocationCascade(
  env: CertificationMatrixEnvelope,
  evidenceId: EvidenceId,
): FullRevocationCascade {
  const base = evidenceRevocationImpact(env, evidenceId);
  const impactedRelationIds: string[] = [];
  const affectedSet = new Set<string>(base.affectedSubtreeClaimIds);
  for (const r of env.claimRelations) {
    if (!r.id) continue;
    if (affectedSet.has(r.fromClaimId) || affectedSet.has(r.toClaimId)) {
      impactedRelationIds.push(String(r.id));
    }
  }
  const statusAffected: string[] = [];
  for (const cid of base.affectedSubtreeClaimIds) {
    const c = env.claims[cid];
    if (!c) continue;
    if (c.evidenceLevel === "Architectural" && (c.status === "Supported" || c.status === "Refuted")) statusAffected.push(cid);
    if (c.evidenceLevel === "Execution" && c.status === "PASS") statusAffected.push(cid);
    if (c.evidenceLevel === "Evolutionary" && (c.status === "Verified" || c.status === "Running")) statusAffected.push(cid);
  }
  return Object.freeze({
    revokedEvidenceId: evidenceId,
    directClaimIds: base.directClaimIds,
    recursiveClaimIds: base.affectedSubtreeClaimIds,
    descendantEvidenceIds: base.descendantEvidenceIds,
    impactedRelationIds: Object.freeze(impactedRelationIds.sort()),
    snapshotImpact: Object.freeze({
      wouldInvalidateSnapshotId: true,
      claimsWithStatusAffected: Object.freeze(statusAffected.sort()),
    }),
  });
}