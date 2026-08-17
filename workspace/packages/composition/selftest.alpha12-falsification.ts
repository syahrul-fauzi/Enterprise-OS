import path from "node:path";
import {
  runAllIndependentProducers,
  INTERNAL_AGGREGATE_EXTENDED_KEY,
} from "./src/certification/producers/correlate.js";
import type { ExtendedEvidencePackage } from "./src/certification/evidence.js";
import {
  buildEmptyProvenanceRegistry,
  mergeProvenanceChainIntoRegistry,
  computeExperimentDefinitionIdSync,
  buildProvenanceGraph,
  enrichGraphWithAlpha10FrontiersScaffold,
  computeRawObservationIdSync,
  buildProvenanceChainSync,
  buildEmpiricalReplicationGroupsFromMultipleRegistries,
  computeClaimConsensusBaseline,
  canonicalObservationContentFingerprint,
  verifyRawObservationIdentity,
  type ProvenanceRegistryCollection,
} from "./src/certification/evidence.js";
import type {
  CertificationClaim,
  ClaimConsensusClassification,
  ExperimentExecution,
  RawObservation,
} from "./src/certification/types.js";

type InvariantResult = {
  readonly id: string;
  readonly desc: string;
  readonly pass: boolean;
  readonly actual: string;
  readonly threshold?: string;
};

const results: InvariantResult[] = [];

function record(
  id: string,
  desc: string,
  pass: boolean,
  actual: unknown,
  threshold?: string,
): void {
  results.push({
    id,
    desc,
    pass,
    actual: typeof actual === "string" ? actual : JSON.stringify(actual),
    threshold,
  });
}

function nowIso(offsetMs: number = 0): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function execGitOrFallback(args: readonly string[], fallback: string): string {
  try {
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    const REPO_ROOT = path.resolve(__dirname, "..", "..");
    const buf = execSync(`git ${args.join(" ")}`, {
      cwd: REPO_ROOT,
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    }) as Buffer;
    return buf.toString("utf8").trim();
  } catch {
    return fallback;
  }
}

type Ctx = {
  readonly repoRoot: string;
  readonly generatedAt: string;
  readonly commonSources: readonly string[];
  readonly runner: {
    readonly os: string;
    readonly arch: string;
    readonly runtime: string;
    readonly runtimeVersion: string;
  };
  readonly gitCommit: string;
  readonly workingTreeDirtyCount: number;
  readonly executorIdentity: string;
};

function mkCtx(runTag: string, offsetMs: number): Ctx {
  const REPO_ROOT = path.resolve(__dirname, "..", "..");
  const gitCommit = execGitOrFallback(
    ["rev-parse", "HEAD"],
    "0000000000000000000000000000000000000000",
  );
  const porcelain = execGitOrFallback(["status", "--porcelain"], "");
  const dirty =
    porcelain === ""
      ? 0
      : Math.max(1, porcelain.split("\n").filter(Boolean).length);
  return Object.freeze({
    repoRoot: REPO_ROOT,
    generatedAt: nowIso(offsetMs),
    commonSources: Object.freeze([
      `repository-local-filesystem-scan:workspace-packages`,
    ]),
    runner: Object.freeze({
      os: process.platform,
      arch: process.arch,
      runtime: "node",
      runtimeVersion: process.version,
    }),
    gitCommit,
    workingTreeDirtyCount: dirty,
    executorIdentity: `alpha12-run=${runTag}:pid=${process.pid}:startTs=${Date.now() + offsetMs}:user=${process.env.USER ?? "u"}:harness=alpha12-falsification`,
  });
}

type RunArtifacts = {
  readonly ctx: Ctx;
  readonly registry: ProvenanceRegistryCollection;
  readonly graph: ReturnType<typeof enrichGraphWithAlpha10FrontiersScaffold>;
  readonly extended: Record<string, ExtendedEvidencePackage>;
  readonly definitionVersionPairs: readonly (readonly [
    import("./src/certification/types").ExperimentDefinition,
    import("./src/certification/types").ExperimentDefinition,
  ])[];
};

function produceRunArtifacts(runTag: string, offsetMs: number = 0): RunArtifacts {
  const ctx = mkCtx(runTag, offsetMs);
  const corr = runAllIndependentProducers(ctx);
  let reg: ProvenanceRegistryCollection = buildEmptyProvenanceRegistry();
  for (const extPkg of Object.values(corr.extendedPackages)) {
    if (extPkg.__provenanceChain)
      reg = mergeProvenanceChainIntoRegistry(reg, extPkg.__provenanceChain);
  }
  const extraExtended: Record<string, ExtendedEvidencePackage> = {
    ...corr.extendedPackages,
  };
  {
    const mutDefs = { ...reg.experimentDefinitions };
    for (const [da, db] of corr.definitionVersionPairs) {
      const idA = computeExperimentDefinitionIdSync(da);
      const idB = computeExperimentDefinitionIdSync(db);
      if (!mutDefs[String(idA.id)])
        mutDefs[String(idA.id)] = Object.freeze({
          id: idA.id,
          algorithm: "sha-256" as const,
          provenanceVersion: da.provenanceVersion,
          canonicalBundleLength: idA.canonicalBundleLength,
          def: da,
        });
      if (!mutDefs[String(idB.id)])
        mutDefs[String(idB.id)] = Object.freeze({
          id: idB.id,
          algorithm: "sha-256" as const,
          provenanceVersion: db.provenanceVersion,
          canonicalBundleLength: idB.canonicalBundleLength,
          def: db,
        });
    }
    reg = Object.freeze({
      ...reg,
      experimentDefinitions: Object.freeze(mutDefs),
    });
  }
  const baseGraph = buildProvenanceGraph({
    evidencePackages: {},
    registry: reg,
    extendedPackages: extraExtended,
    definitionPairs: corr.definitionVersionPairs,
  });
  void INTERNAL_AGGREGATE_EXTENDED_KEY;
  const frontierGraph = enrichGraphWithAlpha10FrontiersScaffold({
    envelope: {
      provenanceRegistry: reg,
      claims: {},
      evidencePackages: {},
    },
    baseGraph,
  });
  return Object.freeze({
    ctx,
    registry: reg,
    graph: frontierGraph,
    extended: extraExtended,
    definitionVersionPairs: corr.definitionVersionPairs,
  });
}

console.log("=".repeat(75));
console.log(
  "Alpha.12 Falsification Self-Test — Frontier C: Sengaja Mencoba Memalsukan Bukti",
);
console.log("=".repeat(75));
console.log("");
console.log(
  "Filosofi: Tidak membuktikan sistem BENAR. Membuktikan sistem TIDAK mudah dipalsukan.",
);
console.log("Sistem lulus JIKA percobaan pemalsuan BERHASIL di-DETEKSI.");
console.log("");

// ─────────────────────────────────────────────────────────────────────────────
// Setup baseline: dapatkan 1 pipeline run untuk observation samples nyata
// ─────────────────────────────────────────────────────────────────────────────
const singleRun = produceRunArtifacts("ALPHA12-FALSIFICATION-HARNESS");
const graph0 = singleRun.graph;
const reg0 = singleRun.registry;
const baselineObsIds = Object.keys(reg0.rawObservations);
const anyObsEntry = reg0.rawObservations[baselineObsIds[0]];
const anyObs = anyObsEntry.obs;
const baselineIdentity = computeRawObservationIdSync(anyObs);

// ─────────────────────────────────────────────────────────────────────────────
// C.1 — 1-byte mutation observation content → identity BERUBAH (BREAKS)
// ─────────────────────────────────────────────────────────────────────────────
{
  const origContentStr =
    typeof anyObs.content === "string"
      ? anyObs.content
      : JSON.stringify(anyObs.content);
  const mutContentStr =
    origContentStr.length > 0
      ? origContentStr.slice(0, -1) +
        (origContentStr.charCodeAt(origContentStr.length - 1) === 65 ? "B" : "A")
      : "mut";
  const mutContent: RawObservation["content"] =
    typeof anyObs.content === "string" ? mutContentStr : anyObs.content;
  const mutatedObs: RawObservation = { ...anyObs, content: mutContent };
  const mutIdentity = computeRawObservationIdSync(mutatedObs);
  const identityChanged = baselineIdentity.id !== mutIdentity.id;
  const fingerprintChanged =
    canonicalObservationContentFingerprint(anyObs) !==
    canonicalObservationContentFingerprint(mutatedObs);
  record(
    "12C.1",
    "1-byte mutation pada observation content → observation identity BERUBAH (TIDAK stabil jika iden sama) (identity uniqueness)",
    identityChanged && fingerprintChanged,
    `baselineId=${baselineIdentity.id.slice(0, 12)}… mutId=${mutIdentity.id.slice(0, 12)}… idChanged=${identityChanged} fpChanged=${fingerprintChanged}`,
    "HARUS id BERBEDA (≠ sama)",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// C.2 — Claim dengan ZERO evidence edges → consensus TIDAK BOLEH strong/moderate/weak. HARUS inconclusive (totalWeight < minW = FAIL closed)
// ─────────────────────────────────────────────────────────────────────────────
{
  const fakeClaimId = "claim-alpha12-falsification-noevidence-001";
  const fakeClaim: CertificationClaim = {
    id: fakeClaimId,
    title: "Claim tanpa bukti — uji falsifikasi",
    description: "Claim ini TIDAK punya evidence edges apapun. Consensus seharusnya TIDAK lolos strong/moderate/weak.",
    evidenceLevel: "Architectural",
    status: "Pending",
    ownerMilestone: "alpha.12",
    evidenceIds: [],
  };
  const baseGraph = buildProvenanceGraph({
    evidencePackages: {},
    registry: reg0,
    extendedPackages: singleRun.extended,
    definitionPairs: singleRun.definitionVersionPairs,
  });
  const noEvidenceGraph = enrichGraphWithAlpha10FrontiersScaffold(
    {
      envelope: {
        provenanceRegistry: reg0,
        claims: { [fakeClaimId]: fakeClaim } as unknown as Readonly<
          Record<string, CertificationClaim>
        >,
        evidencePackages: {},
      },
      baseGraph,
    },
    { classifierId: "alpha12-falsif-nullevidence" },
  );
  const consensusMap = computeClaimConsensusBaseline(
    {
      claims: { [fakeClaimId]: fakeClaim } as unknown as Readonly<
        Record<string, CertificationClaim>
      >,
      evidencePackages: {},
    },
    noEvidenceGraph,
    noEvidenceGraph.observationQualityIndex,
  );
  const classification: ClaimConsensusClassification | undefined =
    consensusMap[fakeClaimId];
  const strength = classification?.strength ?? "undefined";
  const isInconclusive = strength === "inconclusive";
  const totalW = classification?.totalWeight ?? -1;
  record(
    "12C.2",
    "Claim DENGAN NOL evidence edges (evidenceIds=[]) → consensus strength = inconclusive (TIDAK strong/moderate/weak)",
    isInconclusive,
    `strength=${strength} totalWeight=${totalW}`,
    "HARUS inconclusive (bukan strong/moderate/weak)",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// C.3 — Field semanticOutcome diubah (seharusnya bagian dari identity hash canonical bundle). Jika diubah tanpa recompute identity, detect mismatch.
// Juga uji: ubah index0, sourceChannel, observedAt (semua frozen field pasal 3) — identity HARUS berubah jika apapun frozen field diubah.
// ─────────────────────────────────────────────────────────────────────────────
{
  const baseline = anyObs;
  // Semua field frozen di identity chain menurut PASAL 3:
  // provenanceVersion, experimentExecutionId, index0, content, observedAt, sourceChannel, semanticOutcome
  const mutateField = <K extends keyof RawObservation>(
    k: K,
    newVal: RawObservation[K],
  ): { readonly idChanged: boolean; readonly fpChanged: boolean } => {
    const mutated: RawObservation = { ...baseline, [k]: newVal };
    const idBaseline = baselineIdentity.id;
    const idMut = computeRawObservationIdSync(mutated).id;
    const fpBaseline = canonicalObservationContentFingerprint(baseline);
    const fpMut = canonicalObservationContentFingerprint(mutated);
    return { idChanged: String(idBaseline) !== String(idMut), fpChanged: fpBaseline !== fpMut };
  };
  const rIndex0 = mutateField("index0", baseline.index0 + 1000);
  const rSemanticOutcome = mutateField(
    "semanticOutcome",
    baseline.semanticOutcome === "supports" ? "contradicts" : "supports",
  );
  const rSourceChannel = mutateField(
    "sourceChannel",
    baseline.sourceChannel + ".FORGERY_ATTEMPT",
  );
  const rObservedAt = mutateField(
    "observedAt",
    new Date(Date.now() + 123_456_789).toISOString(),
  );
  // Content fingerprint EXCLUDE observedAt dan experimentExecutionId (lihat PASAL content fp).
  // Jadi ubah observedAt → fp TIDAK berubah (benar). Tapi identity BERUBAH (karena identity mengikutkan observedAt).
  const allIdFieldsBreakIdentity =
    rIndex0.idChanged && rSemanticOutcome.idChanged && rSourceChannel.idChanged && rObservedAt.idChanged;
  // Content fingerprint stability: ubah observedAt seharusnya fp TIDAK berubah (karena observedAt dikecualikan di content-fp)
  const observedAtFpStable = rObservedAt.fpChanged === false;
  record(
    "12C.3",
    "Pasal 3 Frozen Identity Fields: ubah index0/semanticOutcome/sourceChannel/observedAt → identity SHA-256 BERUBAH SEMUA (bukan stabil). Tambahan: ubah observedAt → content fingerprint TIDAK berubah (sesuai content fp spec exclude observedAt).",
    allIdFieldsBreakIdentity && observedAtFpStable,
    `idBreak(index0=${rIndex0.idChanged} semOut=${rSemanticOutcome.idChanged} srcCh=${rSourceChannel.idChanged} obsAt=${rObservedAt.idChanged}). fpChange(observedAt=${rObservedAt.fpChanged}).`,
    "SEMUA identity field ubah → id BERUBAH. observedAt ubah → fp TIDAK berubah (sesuai spec).",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// C.4 — Forged identity claim: RawObservation dengan id dipasang id PALSU (bukan hasil compute → verifyRawObservationIdentity() mendeteksi mismatch
// ─────────────────────────────────────────────────────────────────────────────
{
  const forgedId = "rawobs:sha256:000000000000000000000000000000000000000000000000000000000000ffff" as never;
  const identityWithForgedId = {
    ...baselineIdentity,
    id: forgedId,
  };
  const verify = verifyRawObservationIdentity(identityWithForgedId);
  const forgedDetected = verify.ok === false;
  record(
    "12C.4",
    "RawObservationIdentity dengan id PALSU (bukan hasil sha256 nyata) → verifyRawObservationIdentity MENGEMBALIKAN ok=false (mendeteksi pemalsuan)",
    forgedDetected,
    `ok=${verify.ok} recomputedId=${String(verify.recomputedId).slice(0,16)}… expected=${String(verify.expected).slice(0,16)}…`,
    "HARUS ok=false (mendeteksi mismatch)",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// C.5 — 2 registries DENGAN delibrately DIVERGENT observations → buildEmpiricalReplicationGroups TIDAK BOLEH menghasilkan replicated-strong (harus replication-failed / not-replicated)
// ─────────────────────────────────────────────────────────────────────────────
{
  const runA = produceRunArtifacts("ALPHA12-DIVERGENT-RUN-A");
  const runBBase = produceRunArtifacts("ALPHA12-DIVERGENT-RUN-B");
  const regBModified: ProvenanceRegistryCollection = JSON.parse(
    JSON.stringify(runBBase.registry),
  );
  const divergeCount = 60;
  const existingCountBefore = Object.keys(regBModified.rawObservations).length;
  const anyExeIdStr = Object.keys(regBModified.experimentExecutions)[0];
  const anyExe: ExperimentExecution =
    regBModified.experimentExecutions[anyExeIdStr].exe;
  const targetDefinitionId = String(anyExe.experimentDefinitionId);
  for (let i = 0; i < divergeCount; i++) {
    const content = `ALPHA12_DIVERGENT_INJECTED_ONLY_RUNB index=${i} pid=${process.pid} ts=${Date.now() + i * 7}`;
    const obs: RawObservation = {
      provenanceVersion: "1.0",
      experimentExecutionId: anyExe.id,
      index0: 9000 + i,
      content,
      observedAt: new Date(Date.now() + i).toISOString(),
      sourceChannel: `alpha12.forgery.attempt.${i}`,
      semanticOutcome: "supports",
    };
    const ident = computeRawObservationIdSync(obs);
    regBModified.rawObservations[String(ident.id)] = {
      id: ident.id,
      computed: ident,
      obs,
    };
  }
  const aggregateR = buildEmpiricalReplicationGroupsFromMultipleRegistries([
    runA.registry,
    regBModified,
  ]);
  // Fokus: group yang SAMA dengan target definition ID (yang 60 obs divergen ditambahkan)
  // Group LAINNYA (tanpa injection) BOLEH tetap strong (tidak relevan dengan pemalsuan group ini).
  const targetGroup = Object.values(aggregateR.replicationGroups).find(
    (g) => String(g.experimentDefinitionId) === targetDefinitionId,
  );
  const targetNotStrong = targetGroup?.replicationStatus !== "replicated-strong";
  const targetConvergenceDropped =
    (targetGroup?.observationConvergenceRatio01 ?? 1) < 0.95;
  const robust = targetNotStrong && targetConvergenceDropped;
  record(
    "12C.5",
    "Target group (dengan 60 obs HANYA ada di run-B → injection delibrate) → status group INI TIDAK BOLEH replicated-strong DAN convergence group INI < 0.95. Group LAINNYA tanpa injection BOLEH strong (tidak relevan).",
    robust,
    `targetDefId=${targetDefinitionId.slice(0, 18)}… groupStatus=${targetGroup?.replicationStatus} groupConvergence=${targetGroup?.observationConvergenceRatio01} strongTotalSeluruhGroup=${Object.values(aggregateR.replicationGroups).filter(g=>g.replicationStatus === "replicated-strong").length}`,
    "HARUS status group target ≠ strong & convergence < 0.95",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// C.6 — 2 observations BENAR-BENAR berbeda (synthetic) identity TIDAK menghasilkan collision (sha256 unik untuk 2 payload berbeda)
// ─────────────────────────────────────────────────────────────────────────────
{
  const oA: RawObservation = {
    provenanceVersion: "1.0",
    experimentExecutionId:
      "exe:sha256:00000000000000000000000000000000000000000000000000000000000000a1" as never,
    index0: 0,
    content: "payload A anti collision synthetic AAAAAAAA 0xAA",
    observedAt: "2025-01-01T00:00:00.000Z",
    sourceChannel: "alpha12.collision.test.a",
    semanticOutcome: "supports",
  };
  const oB: RawObservation = { ...oA, content: "payload B anti collision synthetic BBBBB 0xBB", semanticOutcome: "contradicts" };
  const idA = computeRawObservationIdSync(oA);
  const idB = computeRawObservationIdSync(oB);
  const noCollision = idA.id !== idB.id;
  const fpA = canonicalObservationContentFingerprint(oA);
  const fpB = canonicalObservationContentFingerprint(oB);
  const fpAlsoDiff = fpA !== fpB;
  record(
    "12C.6",
    "2 observations synthetic berbeda (content + outcome berbeda) → TIDAK terjadi hash collision (SHA-256 id berbeda) dan content fp juga berbeda",
    noCollision && fpAlsoDiff,
    `idA=${String(idA.id).slice(0, 16)}… idB=${String(idB.id).slice(0, 16)}… fpA=${fpA.slice(0, 10)}… fpB=${fpB.slice(0,10)}…`,
    "HARUS id berbeda & fp berbeda",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────────────────────────
let passed = results.filter((r) => r.pass).length;
const total = results.length;
const overallPass = passed >= 5 && passed === total;

console.log("");
console.log("─── Invariant Results ───");
for (const r of results) {
  const tag = r.pass ? "PASS " : "FAIL ";
  const thresholdLine = r.threshold ? ` | ${r.threshold}` : "";
  console.log(
    `${tag} ${r.id.padEnd(6, " ")} [${r.desc}] | actual: ${r.actual}${thresholdLine}`,
  );
}
console.log("");
console.log(`TOTAL: ${passed} PASS / ${total - passed} FAIL / ${total} CHECKS`);
if (overallPass) {
  console.log("Verdict: SUCCESS — Frontier C (Falsification) Alpha.12: seluruh 6 percobaan pemalsuan BERHASIL dideteksi sistem.");
  process.exit(0);
} else {
  console.error(`Verdict: FAIL — Sebagian percobaan pemalsuan TIDAK dideteksi (${passed}/${total}). Sistem BOCOR.`);
  process.exit(1);
}
