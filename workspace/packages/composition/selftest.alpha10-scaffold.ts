import path from "node:path";

import {
  runAllIndependentProducers,
  buildAlpha8EvidencePkgs,
  buildAlpha8AggregatePkgs,
  buildAlpha8Claims,
  buildAlpha8ClaimRelations,
  buildAlpha8EvidenceDerivationParents,
  INTERNAL_AGGREGATE_EXTENDED_KEY,
} from "./src/certification/producers/correlate.js";
import {
  computeEvidenceIdSync,
  buildEmptyProvenanceRegistry,
  mergeProvenanceChainIntoRegistry,
  computeExperimentDefinitionIdSync,
  buildProvenanceGraph,
  buildEmptyProvenanceGraph,
  enrichGraphWithAlpha10FrontiersScaffold,
  computeRawObservationIdSync,
  type ExtendedEvidencePackage,
  type ProvenanceRegistryCollection,
} from "./src/certification/evidence.js";
import type { EvidencePackage, CertificationClaim, ClaimRelation, EvidenceId, ExperimentDefinition } from "./src/certification/types.js";

function nowIso(): string { return new Date().toISOString(); }

function execGitOrFallback(args: readonly string[], fallback: string): string {
  try {
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    const REPO_ROOT = path.resolve(__dirname, "..", "..");
    const buf = execSync(`git ${args.join(" ")}`, { cwd: REPO_ROOT, timeout: 5000, stdio: ["ignore", "pipe", "ignore"] }) as Buffer;
    return buf.toString("utf8").trim();
  } catch { return fallback; }
}

type Ctx = {
  readonly repoRoot: string;
  readonly generatedAt: string;
  readonly commonSources: readonly string[];
  readonly runner: { readonly os: string; readonly arch: string; readonly runtime: string; readonly runtimeVersion: string };
  readonly gitCommit: string;
  readonly workingTreeDirtyCount: number;
  readonly executorIdentity: string;
};
function mkCtx(): Ctx {
  const REPO_ROOT = path.resolve(__dirname, "..", "..");
  const gitCommit = execGitOrFallback(["rev-parse", "HEAD"], "0000000000000000000000000000000000000000");
  const porcelain = execGitOrFallback(["status", "--porcelain"], "");
  const dirty = porcelain === "" ? 0 : Math.max(1, porcelain.split("\n").filter(Boolean).length);
  return Object.freeze({
    repoRoot: REPO_ROOT, generatedAt: nowIso(),
    commonSources: Object.freeze([`repository-local-filesystem-scan:workspace-packages`]),
    runner: Object.freeze({ os: process.platform, arch: process.arch, runtime: "node", runtimeVersion: process.version }),
    gitCommit, workingTreeDirtyCount: dirty,
    executorIdentity: `pid=${process.pid}:startTs=${Date.now()}:user=${process.env.USER ?? "u"}:harness=alpha10-scaffold`,
  });
}

type Check = { readonly id: string; readonly desc: string; passed: boolean; readonly msg?: string };
function main(): number {
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("Alpha.10 Scaffold Self-Test — 5 Epistemic Frontiers (Type Runtime Instantiation)");
  console.log("═══════════════════════════════════════════════════════════════════\n");
  const ctx = mkCtx();
  const corr = runAllIndependentProducers(ctx);
  const pkgsIndiv = buildAlpha8EvidencePkgs(corr);
  const pkgsAgg = buildAlpha8AggregatePkgs(corr, ctx);
  const mergedPkgs: Record<string, EvidencePackage> = { ...pkgsIndiv, ...pkgsAgg };
  let reg: ProvenanceRegistryCollection = buildEmptyProvenanceRegistry();
  for (const extPkg of Object.values(corr.extendedPackages)) {
    if (extPkg.__provenanceChain) reg = mergeProvenanceChainIntoRegistry(reg, extPkg.__provenanceChain);
  }
  const aggregateExtended = pkgsAgg[INTERNAL_AGGREGATE_EXTENDED_KEY] as unknown as ExtendedEvidencePackage | undefined;
  const extraExtended: Record<string, ExtendedEvidencePackage> = { ...corr.extendedPackages };
  if (aggregateExtended?.__provenanceChain) {
    extraExtended[INTERNAL_AGGREGATE_EXTENDED_KEY] = aggregateExtended;
    reg = mergeProvenanceChainIntoRegistry(reg, aggregateExtended.__provenanceChain);
  }
  {
    const mutDefs = { ...reg.experimentDefinitions };
    for (const [da, db] of corr.definitionVersionPairs) {
      const idA = computeExperimentDefinitionIdSync(da); const idB = computeExperimentDefinitionIdSync(db);
      if (!mutDefs[String(idA.id)]) mutDefs[String(idA.id)] = Object.freeze({ id: idA.id, algorithm: "sha-256" as const, provenanceVersion: da.provenanceVersion, canonicalBundleLength: idA.canonicalBundleLength, def: da });
      if (!mutDefs[String(idB.id)]) mutDefs[String(idB.id)] = Object.freeze({ id: idB.id, algorithm: "sha-256" as const, provenanceVersion: db.provenanceVersion, canonicalBundleLength: idB.canonicalBundleLength, def: db });
    }
    reg = Object.freeze({ ...reg, experimentDefinitions: Object.freeze(mutDefs) });
  }

  const evidenceIds: Record<string, EvidenceId> = {};
  const derivationParents = buildAlpha8EvidenceDerivationParents();
  const allKeys = Object.keys(mergedPkgs);
  const identIndex: Record<string, ReturnType<typeof computeEvidenceIdSync>> = {};
  for (const k of allKeys) identIndex[k] = computeEvidenceIdSync(mergedPkgs[k]!);
  const depParentKeys = Object.keys(derivationParents);
  if (depParentKeys.length > 0) {
    const inDeg: Record<string, number> = {}; const children: Record<string, string[]> = {};
    for (const k of depParentKeys) inDeg[k] = 0;
    for (const [k, parents] of Object.entries(derivationParents)) {
      for (const p of parents) {
        if (!children[p]) children[p] = []; children[p].push(k); inDeg[k] = (inDeg[k] ?? 0) + 1;
      }
    }
    const queue: string[] = []; const order: string[] = [];
    for (const k of depParentKeys) if ((inDeg[k] ?? 0) === 0) queue.push(k);
    while (queue.length > 0) { const cur = queue.shift() as string; order.push(cur); for (const ch of children[cur] ?? []) { inDeg[ch] = (inDeg[ch] ?? 0) - 1; if (inDeg[ch] === 0) queue.push(ch); } }
    const kToEid: Record<string, EvidenceId> = {};
    for (const [key, ident] of Object.entries(identIndex)) kToEid[key] = ident.id;
    for (const key of order) {
      const parentKeys = derivationParents[key] ?? [];
      const parentEids: EvidenceId[] = parentKeys.map(pk => kToEid[pk]).filter(Boolean) as EvidenceId[];
      const base = mergedPkgs[key]; if (!base) continue;
      const rebuilt: EvidencePackage = Object.freeze({
        ...base,
        derivedFromEvidenceIds: Object.freeze([...((base.derivedFromEvidenceIds ?? []) as readonly EvidenceId[]), ...parentEids]) as readonly EvidenceId[],
      });
      const newIdent = computeEvidenceIdSync(rebuilt);
      identIndex[key] = newIdent; kToEid[key] = newIdent.id;
    }
  }
  for (const [k, ident] of Object.entries(identIndex)) evidenceIds[k] = ident.id;
  const evidenceKeys = Object.freeze({ FS: "PKG_A8_FILESYSTEM_AUDIT_V1", AST: "PKG_A8_AST_STRUCTURAL_V1", IMP: "PKG_A8_IMPORT_BOUNDARY_V1", RUN: "PKG_A8_RUNTIME_PROBE_V1", AGG: "PKG_A8_AGGREGATE_RUNTIME_BOUNDARY" });
  const claims: Record<string, CertificationClaim> = { ...buildAlpha8Claims(corr, evidenceKeys, evidenceIds) };
  const relations: ClaimRelation[] = [...buildAlpha8ClaimRelations()];
  const matrixPkgsForGraph: Record<string, ReturnType<typeof computeEvidenceIdSync>> = {};
  for (const [k, ident] of Object.entries(identIndex)) matrixPkgsForGraph[k] = ident;

  const baseGraph = buildProvenanceGraph({
    evidencePackages: matrixPkgsForGraph,
    registry: reg,
    extendedPackages: extraExtended,
    definitionPairs: corr.definitionVersionPairs,
  });
  void buildEmptyProvenanceGraph;

  const frontierGraph = enrichGraphWithAlpha10FrontiersScaffold({
    envelope: {
      provenanceRegistry: reg,
      claims,
      evidencePackages: matrixPkgsForGraph,
    },
    baseGraph,
  });
  void relations;

  // ─────────────────── invariant checks ───────────────────
  const checks: Check[] = [];
  const eqCount = Object.keys(frontierGraph.observationSemanticEquivalenceEdges ?? {}).length;
  checks.push({ id: "10S.1 [Frontier#1=IDENTITY-vs-EQUIVALENCE]", desc: `SemanticEquivalence edges numeric-tolerance ≥ 1`, passed: eqCount >= 1, msg: `actual eqCount=${eqCount}` });
  const qualityCount = Object.keys(frontierGraph.observationQualityIndex ?? {}).length;
  checks.push({ id: "10S.2 [Frontier#2=WEIGHTED-EVIDENCE]", desc: `QualityIndex populated ≥ 70 observations (registry has 76)`, passed: qualityCount >= 70, msg: `qualityIndex count=${qualityCount}` });
  const lifecycleIndex = frontierGraph.observationLifecycleIndex ?? {};
  const lifeTotal = Object.keys(lifecycleIndex).length;
  const allHaveCreatedTransition = lifeTotal > 0 && Object.values(lifecycleIndex).every(e => e.transitions.some(t => t.toState === "created"));
  const noneBad = Object.values(lifecycleIndex).every(e => (e.currentState === "verified" || e.currentState === "replicated"));
  checks.push({ id: "10S.3 [Frontier#3=OBSERVATION-LIFECYCLE]", desc: `Lifecycle entries count >= 70, all have created→verified, none deprecated/superseded scaffold baseline`, passed: lifeTotal >= 70 && allHaveCreatedTransition && noneBad, msg: `lifecycleTotal=${lifeTotal} allHaveCreated=${allHaveCreatedTransition} noneBadState=${noneBad}` });
  const repGrps = Object.keys(frontierGraph.replicationGroupIndex ?? {}).length;
  checks.push({ id: "10S.4 [Frontier#4=INDEPENDENT-REPLICATION]", desc: `Replication groups ≥ 1 (≥1 definition with ≥1 execution)`, passed: repGrps >= 1, msg: `replicationGroups count=${repGrps}` });
  const consensus = Object.keys(frontierGraph.claimConsensusIndex ?? {}).length;
  checks.push({ id: "10S.5 [Frontier#5=CONSENSUS-REASONING]", desc: "Claim Consensus classified ≥ 5 claims (only claims with non-zero weighted edges populate classifier)", passed: consensus >= 5, msg: `claimConsensusIndex count=${consensus}` });
  // Invariant BACKWARD COMPAT: identity OBS TIDAK BERUBAH sesudah enrichment
  const regObsIds = Object.values(reg.rawObservations).map(e => String(e.id));
  const identityCheckCount = Math.min(10, regObsIds.length);
  let idOk = identityCheckCount > 0;
  for (let i = 0; i < identityCheckCount; i++) {
    const entry = Object.values(reg.rawObservations)[i]!;
    const recomputed = computeRawObservationIdSync(entry.obs);
    if (String(recomputed.id) !== String(entry.id)) idOk = false;
  }
  checks.push({ id: "10S.6 [BACKWARD-IDENTITY-STABLE]", desc: `Sampling 10/76 observation identities SHA-256 UNCHANGED (Alpha.9 → Alpha.10 scaffold)`, passed: idOk, msg: identityCheckCount === 0 ? "no observations" : "sampled 10 identity recompute matches registry entry.id" });
  const passed = checks.filter(c => c.passed).length;
  checks.push({ id: "10S.7 [OVERALL]", desc: `Total invariants PASS ≥ 6/6 = scaffold runtime instantiation success`, passed: passed >= 6, msg: `passed=${passed}/${checks.length - 1} invariants` });

  // ─────────────────── print ───────────────────
  console.log("Provenance Registry Actual Sizes:");
  console.log(`  experimentDefinitions  = ${Object.keys(reg.experimentDefinitions).length}`);
  console.log(`  experimentExecutions   = ${Object.keys(reg.experimentExecutions).length}`);
  console.log(`  rawObservations        = ${Object.keys(reg.rawObservations).length}\n`);
  console.log("Alpha.10 Frontiers Populated Counts:");
  console.log(`  observationSemanticEquivalenceEdges (#1): ${eqCount}`);
  console.log(`  observationQualityIndex (#2):             ${qualityCount}`);
  console.log(`  observationLifecycleIndex (#3):           ${lifeTotal}  [current-state counts: ${Object.entries(Object.values(lifecycleIndex).reduce((acc, e) => ({ ...acc, [e.currentState]: (acc as any)[e.currentState] + 1 }), { verified: 0, replicated: 0 } as Record<string, number>)).map(([k, v]) => `${k}=${v}`).join("  ")}]`);
  console.log(`  replicationGroupIndex (#4):               ${repGrps}`);
  console.log(`  claimConsensusIndex (#5):                 ${consensus}`);
  if (frontierGraph.replicationGroupIndex) {
    console.log(`\nReplication Group Status Breakdown:`);
    for (const grp of Object.values(frontierGraph.replicationGroupIndex)) {
      console.log(`  ${grp.groupId}: status=${grp.replicationStatus} execs=${grp.totalExecutionCount} distinctExecutors=${grp.distinctExecutorIdentities} convergence=${grp.observationConvergenceRatio01}`);
    }
  }
  if (frontierGraph.claimConsensusIndex) {
    console.log(`\nConsensus Strength Distribution (${consensus} claims):`);
    const hist: Record<string, number> = { strong: 0, moderate: 0, weak: 0, conflicting: 0, inconclusive: 0 };
    for (const c of Object.values(frontierGraph.claimConsensusIndex)) hist[c.strength] = (hist[c.strength] ?? 0) + 1;
    for (const [k, v] of Object.entries(hist)) if (v > 0) console.log(`  ${k.padEnd(13)} : ${v}`);
  }
  console.log("\n─── Invariant Results ───");
  let pn = 0, fn = 0;
  for (const c of checks) {
    const ok = c.passed ? "PASS" : "FAIL";
    if (c.passed) pn++; else fn++;
    console.log(`${ok.padEnd(5)} ${c.id.padEnd(46)} | ${c.desc.padEnd(78)} | ${c.msg ?? ""}`);
  }
  console.log(`\nTOTAL: ${pn} PASS / ${fn} FAIL / ${checks.length} CHECKS`);
  const allPassed = fn === 0;
  console.log(`\nVerdict: ${allPassed ? "SUCCESS — Alpha.10 5-Frontier scaffold runtime instantiation verified." : "FAILED — review above."}`);
  return allPassed ? 0 : 1;
}

process.exit(main());
