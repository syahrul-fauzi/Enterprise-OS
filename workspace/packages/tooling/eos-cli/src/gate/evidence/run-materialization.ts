import { join } from "node:path";

import type { GateCRunComparisonJsonValue } from "./run-comparison.js";
import { createFilesystemYamlEvidenceSource } from "./sources/filesystem-yaml-source.js";

export type GateCLoadedRunMaterialization = Readonly<{
  runId: string;
  runRoot: string;
  runManifestPath: string;
  runManifestRef: string;
  runManifestHash: string;
  canonicalRunManifestHash: string;
  reportPath: string;
  reportRef: string;
  executionTimestampUtc: string;
  verdict: "PASS" | "FAIL" | "INCONCLUSIVE";
  evaluationDisposition: "PASS" | "FAIL" | "INCONCLUSIVE";
  canonicalEvidence: Record<string, GateCRunComparisonJsonValue>;
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
  subjectId: string;
}>;

export type GateCLoadedRunMaterializationDeps = Readonly<{
  runsDir: string;
  readYamlRecord: (path: string) => Record<string, unknown>;
  asArray: (value: unknown, label: string) => unknown[];
  asMutableRecord: (value: unknown, label: string) => Record<string, unknown>;
  asString: (value: unknown, label: string) => string;
  asVerdict: (
    value: unknown,
    label: string,
  ) => "PASS" | "FAIL" | "INCONCLUSIVE";
  toGateCRelative: (path: string) => string;
  hashFile: (path: string) => string;
  canonicalJson: (value: unknown) => string;
  sha256: (input: string | Uint8Array) => string;
  computeCanonicalRunManifestHash: (
    manifest: Record<string, GateCRunComparisonJsonValue>,
  ) => string;
  computeCanonicalWitnessHash: (witness: Record<string, unknown>) => string;
}>;

export function loadGateCExistingRunMaterialization(
  runId: string,
  deps: GateCLoadedRunMaterializationDeps,
): GateCLoadedRunMaterialization {
  const runRoot = join(deps.runsDir, runId);
  const runArtifactSource = createFilesystemYamlEvidenceSource({
    rootDir: runRoot,
    readYamlRecord: deps.readYamlRecord,
  });
  const runManifestPath = join(runRoot, "run-manifest.yaml");
  const reportPath = join(runRoot, "report.yaml");
  const manifest = runArtifactSource.read("run-manifest.yaml") as Record<
    string,
    GateCRunComparisonJsonValue
  >;
  const subjects = deps.asArray(manifest.subjects, "run_manifest.subjects");
  const firstSubject = deps.asMutableRecord(subjects[0], "run_manifest.subjects[0]");
  const subjectId = deps.asString(
    firstSubject.experiment_subject_id,
    "run_manifest.subjects[0].experiment_subject_id",
  );
  const verdictRelPath = join("actual", "verdicts", `${subjectId}.yaml`);
  const verdictRecord = runArtifactSource.read(verdictRelPath);
  const authorityWitnessRelPath = join(
    "actual",
    "witness",
    "authority",
    `${subjectId}.yaml`,
  );
  const meaningWitnessRelPath = join(
    "actual",
    "witness",
    "meaning",
    `${subjectId}.yaml`,
  );
  const proofWitnessRelPath = join(
    "actual",
    "witness",
    "proof",
    `${subjectId}.yaml`,
  );
  const authorityWitnessPath = join(runRoot, authorityWitnessRelPath);
  const meaningWitnessPath = join(runRoot, meaningWitnessRelPath);
  const proofWitnessPath = join(runRoot, proofWitnessRelPath);
  const authorityWitness = runArtifactSource.read(authorityWitnessRelPath);
  const meaningWitness = runArtifactSource.read(meaningWitnessRelPath);
  const proofWitness = runArtifactSource.read(proofWitnessRelPath);
  const canonicalEvidenceRelPath = join(
    "metrics",
    "canonical-evidence-original.yaml",
  );
  const canonicalEvidence = runArtifactSource.read(canonicalEvidenceRelPath) as Record<
    string,
    GateCRunComparisonJsonValue
  >;

  return {
    runId,
    runRoot,
    runManifestPath,
    runManifestRef: deps.toGateCRelative(runManifestPath),
    runManifestHash: deps.hashFile(runManifestPath),
    canonicalRunManifestHash: deps.computeCanonicalRunManifestHash(manifest),
    reportPath,
    reportRef: deps.toGateCRelative(reportPath),
    executionTimestampUtc: deps.asString(
      manifest.execution_timestamp_utc,
      "run_manifest.execution_timestamp_utc",
    ),
    verdict: deps.asVerdict(verdictRecord.verdict, "verdict.verdict"),
    evaluationDisposition: deps.asVerdict(verdictRecord.verdict, "verdict.verdict"),
    canonicalEvidence,
    canonicalEvidenceHash: deps.sha256(deps.canonicalJson(canonicalEvidence)),
    witnessArtifactHashes: {
      authority: deps.hashFile(authorityWitnessPath),
      meaning: deps.hashFile(meaningWitnessPath),
      proof: deps.hashFile(proofWitnessPath),
    },
    canonicalWitnessHashes: {
      authority: deps.computeCanonicalWitnessHash(authorityWitness),
      meaning: deps.computeCanonicalWitnessHash(meaningWitness),
      proof: deps.computeCanonicalWitnessHash(proofWitness),
    },
    subjectId,
  };
}
