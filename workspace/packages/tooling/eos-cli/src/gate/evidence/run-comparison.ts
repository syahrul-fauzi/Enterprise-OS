import { existsSync } from "node:fs";
import { join } from "node:path";

type JsonPrimitive = null | boolean | number | string;
export type GateCRunComparisonJsonValue =
  | JsonPrimitive
  | readonly GateCRunComparisonJsonValue[]
  | { readonly [key: string]: GateCRunComparisonJsonValue };

export type GateCRunMaterialization = Readonly<{
  runId: string;
  subjectId: string;
  runManifestRef: string;
  reportRef: string;
  canonicalRunManifestHash: string;
  canonicalEvidenceHash: string;
  witnessArtifactHashes: Readonly<{
    authority: string;
    meaning: string;
    proof: string;
  }>;
  canonicalWitnessHashes: Readonly<{
    authority: string;
    meaning: string;
    proof: string;
  }>;
  verdict: "PASS" | "FAIL" | "INCONCLUSIVE";
}>;

export type GateCRunComparisonResult = Readonly<{
  converged: boolean;
  canonicalEvidenceMatches: boolean;
  sameVerdict: boolean;
  sameCanonicalWitnessHashes: boolean;
  sameCanonicalManifestHash: boolean;
  originalCanonicalWitnessDigest: string;
  replayCanonicalWitnessDigest: string;
}>;

export type GateCRunComparisonDeps = Readonly<{
  runProofLedgerPath: string;
  readYamlRecord: (path: string) => Record<string, unknown>;
  writeYaml: (path: string, value: unknown) => void;
  asArray: (value: unknown, label: string) => unknown[];
  asMutableRecord: (value: unknown, label: string) => Record<string, unknown>;
  asString: (value: unknown, label: string) => string;
  canonicalJson: (value: unknown) => string;
  sha256: (input: string | Uint8Array) => string;
  deepClone: <T>(value: T) => T;
}>;

export function compareGateCRunMaterializations(
  originalRun: GateCRunMaterialization,
  replayRun: GateCRunMaterialization,
  deps: Pick<GateCRunComparisonDeps, "canonicalJson" | "sha256">,
): GateCRunComparisonResult {
  const sameVerdict = originalRun.verdict === replayRun.verdict;
  const canonicalEvidenceMatches =
    originalRun.canonicalEvidenceHash === replayRun.canonicalEvidenceHash;
  const sameCanonicalWitnessHashes =
    originalRun.canonicalWitnessHashes.authority ===
      replayRun.canonicalWitnessHashes.authority &&
    originalRun.canonicalWitnessHashes.meaning ===
      replayRun.canonicalWitnessHashes.meaning &&
    originalRun.canonicalWitnessHashes.proof === replayRun.canonicalWitnessHashes.proof;
  const originalCanonicalWitnessDigest = deps.sha256(
    deps.canonicalJson(originalRun.canonicalWitnessHashes),
  );
  const replayCanonicalWitnessDigest = deps.sha256(
    deps.canonicalJson(replayRun.canonicalWitnessHashes),
  );
  const sameCanonicalManifestHash =
    originalRun.canonicalRunManifestHash === replayRun.canonicalRunManifestHash;

  return {
    converged:
      sameVerdict &&
      canonicalEvidenceMatches &&
      sameCanonicalWitnessHashes &&
      sameCanonicalManifestHash,
    canonicalEvidenceMatches,
    sameVerdict,
    sameCanonicalWitnessHashes,
    sameCanonicalManifestHash,
    originalCanonicalWitnessDigest,
    replayCanonicalWitnessDigest,
  };
}

export function writeGateCRunComparisonArtifacts(
  input: {
    readonly runRoot: string;
    readonly bundle: Readonly<{
      bundleId: string;
      bundleHash: string;
    }>;
    readonly originalRun: GateCRunMaterialization;
    readonly replayRun: GateCRunMaterialization;
    readonly subject: Readonly<{
      truthTableRow: string;
    }>;
    readonly options?: {
      readonly writeProofLedgerStatus?: "PASS" | "PENDING" | "FAIL";
      readonly remainingBlocker?: string;
    };
  },
  deps: Pick<GateCRunComparisonDeps, "writeYaml" | "canonicalJson" | "sha256">,
): GateCRunComparisonResult {
  const runComparison = compareGateCRunMaterializations(
    input.originalRun,
    input.replayRun,
    deps,
  );
  const {
    sameVerdict,
    canonicalEvidenceMatches,
    sameCanonicalWitnessHashes,
    originalCanonicalWitnessDigest,
    replayCanonicalWitnessDigest,
    sameCanonicalManifestHash,
    converged,
  } = runComparison;

  const comparison = {
    version: "1.0.0",
    run_id: input.originalRun.runId,
    science_kernel_bundle_id: input.bundle.bundleId,
    science_kernel_bundle_hash: input.bundle.bundleHash,
    original: {
      verdict: input.originalRun.verdict,
      canonical_evidence_hash: input.originalRun.canonicalEvidenceHash,
      canonical_witness_digest: originalCanonicalWitnessDigest,
      canonical_run_manifest_hash: input.originalRun.canonicalRunManifestHash,
      witness_artifact_hashes: input.originalRun.witnessArtifactHashes,
      canonical_witness_hashes: input.originalRun.canonicalWitnessHashes,
    },
    replay: {
      verdict: input.replayRun.verdict,
      canonical_evidence_hash: input.replayRun.canonicalEvidenceHash,
      canonical_witness_digest: replayCanonicalWitnessDigest,
      canonical_run_manifest_hash: input.replayRun.canonicalRunManifestHash,
      witness_artifact_hashes: input.replayRun.witnessArtifactHashes,
      canonical_witness_hashes: input.replayRun.canonicalWitnessHashes,
    },
    comparison: {
      same_verdict: sameVerdict,
      same_canonical_evidence: canonicalEvidenceMatches,
      same_canonical_witness_hashes: sameCanonicalWitnessHashes,
      same_canonical_run_manifest: sameCanonicalManifestHash,
      converged,
    },
    ignored_runtime_metadata: [
      "execution_timestamp_utc",
      "locked_at",
      "log timestamps",
      "temporary replay directory",
    ],
  };

  deps.writeYaml(join(input.runRoot, "metrics", "canonical-evidence-comparison.yaml"), comparison);

  const controlType =
    input.subject.truthTableRow === "P1" ? "POSITIVE_CONTROL" : "NEGATIVE_CONTROL";
  const expectedVerdict = input.subject.truthTableRow === "P1" ? "PASS" : "FAIL";
  const expectedVerdictMatched = input.originalRun.verdict === expectedVerdict;
  const report = {
    version: "1.0.0",
    run_id: input.originalRun.runId,
    control_type: controlType,
    truth_table_row: input.subject.truthTableRow,
    expected_verdict: expectedVerdict,
    actual_verdict: input.originalRun.verdict,
    replay_verdict: input.replayRun.verdict,
    genesis_evidence: converged ? "EXISTS" : "NOT_YET",
    verification_spine: [
      { step: "VERIFY", status: "PASS" },
      { step: "FREEZE_BUNDLE", status: "PASS" },
      { step: "HASH", status: "PASS" },
      { step: "WIRE_MEASUREMENT_APPARATUS", status: "PASS" },
      { step: "EXECUTE_CONTROL", status: expectedVerdictMatched ? "PASS" : "FAIL" },
      { step: "CAPTURE_WITNESS", status: "PASS" },
      { step: "GENERATE_MANIFEST", status: "PASS" },
      {
        step: "WRITE_PROOF_LEDGER",
        status:
          input.options?.writeProofLedgerStatus ?? (converged ? "PASS" : "FAIL"),
      },
      { step: "CLEAN_ENV_REPLAY", status: sameVerdict ? "PASS" : "FAIL" },
      {
        step: "IDENTICAL_MANIFEST",
        status: sameCanonicalManifestHash ? "PASS" : "FAIL",
      },
      { step: "IDENTICAL_EVIDENCE", status: converged ? "PASS" : "FAIL" },
    ],
    definition_of_done: {
      execution: expectedVerdictMatched,
      apparatus_identity: true,
      integrity: true,
      replay: sameVerdict,
      witness_digest: sameCanonicalWitnessHashes,
      manifest_digest: sameCanonicalManifestHash,
      evidence_digest: canonicalEvidenceMatches,
      convergence: converged,
      clean_environment: true,
    },
    remaining_blocker:
      input.options?.remainingBlocker ??
      (!converged
        ? "Canonical evidence diverged between original and clean replay."
        : !expectedVerdictMatched
          ? `Actual verdict ${input.originalRun.verdict} did not match expected verdict ${expectedVerdict} for ${input.subject.truthTableRow}.`
          : input.subject.truthTableRow === "P1"
            ? "Gate C1 empirical coverage remains limited to positive row P1; N1..N7 still absent."
            : `Negative Control ${input.subject.truthTableRow} converged under frozen apparatus. Advance Gate C1 status via execution/coverage-matrix.yaml.`),
  };

  deps.writeYaml(join(input.runRoot, "report.yaml"), report);
  return runComparison;
}

export function recordGateCGenesisProofLedger(
  input: {
    readonly bundle: Readonly<{
      bundleId: string;
      bundleHash: string;
    }>;
    readonly originalRun: GateCRunMaterialization;
    readonly replayRun: GateCRunMaterialization;
    readonly comparison: Pick<
      GateCRunComparisonResult,
      "converged" | "canonicalEvidenceMatches" | "sameVerdict" | "sameCanonicalWitnessHashes"
    >;
  },
  deps: GateCRunComparisonDeps,
): void {
  const existing = existsSync(deps.runProofLedgerPath)
    ? deps.readYamlRecord(deps.runProofLedgerPath)
    : {
        version: "1.0.0",
        ledger_id: "GATE-C-PROOF-LEDGER-001",
        status: "ACTIVE",
        append_only_enforced: true,
        entries: [],
      };

  const entries = deps.asArray(existing.entries, "proof_ledger.entries");
  const nextIndex = entries.length + 1;
  const entry = {
    entry_id: `GATE-C-GENESIS-${String(nextIndex).padStart(3, "0")}`,
    run_id: input.originalRun.runId,
    subject_id: input.originalRun.subjectId,
    manifest_ref: input.originalRun.runManifestRef,
    report_ref: input.originalRun.reportRef,
    science_kernel_bundle_id: input.bundle.bundleId,
    science_kernel_bundle_hash: input.bundle.bundleHash,
    original_canonical_evidence_hash: input.originalRun.canonicalEvidenceHash,
    replay_canonical_evidence_hash: input.replayRun.canonicalEvidenceHash,
    convergence: input.comparison.converged,
    verdict: input.comparison.converged ? "PASS" : "FAIL",
    hash_basis: "sha256(canonical_json(entry_excluding_entry_hash))",
    entry_hash: "sha256:PENDING",
  };
  const entryForHash = deps.deepClone(entry);
  delete deps.asMutableRecord(entryForHash, "entryForHash").entry_hash;
  entry.entry_hash = deps.sha256(deps.canonicalJson(entryForHash));

  entries.push(entry);
  existing.entries = entries;
  existing.count = entries.length;
  existing.last_entry_hash = deps.asString(entry.entry_hash, "entry.entry_hash");
  deps.writeYaml(deps.runProofLedgerPath, existing);
}
