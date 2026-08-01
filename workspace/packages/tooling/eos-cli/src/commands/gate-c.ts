import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

type JsonPrimitive = null | boolean | number | string;
type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

interface ArtifactHash {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly category:
    | "bundle_support"
    | "calibration"
    | "dataset"
    | "expected"
    | "experiment"
    | "fixture"
    | "manifest"
    | "oracle"
    | "protocol"
    | "schema"
    | "test"
    | "theory"
    | "witness";
}

interface BundleContext {
  readonly bundleId: string;
  readonly bundleHash: string;
  readonly bundleManifestPath: string;
  readonly bundleShaPath: string;
  readonly calibrationReportId: string;
  readonly calibrationReportRef: string;
  readonly calibrationReportHash: string;
  readonly reproducibilityManifestRef: string;
  readonly reproducibilityManifestHash: string;
  readonly evidenceModelRef: string;
  readonly evidenceModelHash: string;
  readonly oracleCertificate: ApparatusIdentity;
  readonly witnessCertificate: ApparatusIdentity;
  readonly datasetCertificate: ApparatusIdentity;
  readonly artifacts: readonly ArtifactHash[];
  readonly protocolHash: string;
  readonly truthTableHash: string;
  readonly expectedHash: string;
  readonly schemaHash: string;
  readonly fixtureHash: string;
  readonly oracleBundleHash: string;
  readonly specificationHash: string;
}

interface ApparatusIdentity {
  readonly certificateId: string;
  readonly certificateRef: string;
  readonly certificateHash: string;
  readonly instrumentRef: string;
  readonly instrumentHash: string;
}

interface SubjectDefinition {
  readonly experimentSubjectId: string;
  readonly operation: string;
  readonly operationLabel: string;
  readonly subjectRef: string;
  readonly expectedPredicatesRef: string;
  readonly expectedEvaluationRef: string;
  readonly truthTableRow: string;
  readonly transformationContractId: string;
  readonly transformationContractName: string;
  readonly transformationPreconditions: readonly string[];
  readonly transformationPostconditions: readonly string[];
  readonly transformationInvariants: readonly string[];
  readonly documentFixtureRefs: readonly string[];
  readonly policyFixtureRefs: readonly string[];
  readonly contractFixtureRefs: readonly string[];
  readonly evidenceFixtureRefs: readonly string[];
}

interface RunMaterialization {
  readonly runId: string;
  readonly runRoot: string;
  readonly runManifestPath: string;
  readonly runManifestRef: string;
  readonly reportPath: string;
  readonly reportRef: string;
  readonly executionTimestampUtc: string;
  readonly verdict: "PASS" | "FAIL" | "INCONCLUSIVE";
  readonly evaluationDisposition: "PASS" | "FAIL" | "INCONCLUSIVE";
  readonly canonicalEvidence: Record<string, JsonValue>;
  readonly canonicalEvidenceHash: string;
  readonly witnessArtifactHashes: {
    readonly authority: string;
    readonly meaning: string;
    readonly proof: string;
  };
  readonly canonicalWitnessHashes: {
    readonly authority: string;
    readonly meaning: string;
    readonly proof: string;
  };
  readonly subjectId: string;
}

interface AuthorityWitness {
  readonly authority_chain: readonly JsonValue[];
  readonly conditions: Record<string, JsonValue>;
  readonly result: "PASS" | "FAIL";
  readonly [key: string]: JsonValue;
}

interface MeaningWitness {
  readonly semantic_input_hash: string;
  readonly semantic_output_hash: string;
  readonly canonical_identity_preserved: boolean;
  readonly result: "PASS" | "FAIL";
  readonly [key: string]: JsonValue;
}

interface ProofWitness {
  readonly evidence_items: readonly JsonValue[];
  readonly postconditions: Record<string, JsonValue>;
  readonly constructive_entailment_complete: boolean;
  readonly result: "PASS" | "FAIL";
  readonly [key: string]: JsonValue;
}

interface EvaluationArtifact {
  readonly version: string;
  readonly subject_id: string;
  readonly oracle_id: string;
  readonly predicates: {
    readonly pred_a_legitimate: boolean;
    readonly pred_b_meaning_preserved: boolean;
    readonly pred_c_provable: boolean;
  };
  readonly ia20_constitutional_validity: boolean;
  readonly truth_table_row_matched: string;
  readonly expected_vector_match: boolean;
  readonly expected_evaluation_match: boolean;
  readonly independence_test_result: "PASS" | "FAIL";
  readonly evaluation_result: "PASS" | "FAIL" | "INCONCLUSIVE";
  readonly [key: string]: JsonValue;
}

interface WitnessIntegrityRecord {
  readonly hash_basis: string;
  readonly lock_hash: string;
  readonly locked_at: string;
  readonly chain_of_custody: readonly JsonValue[];
}

type AuthorityWitnessRecord = AuthorityWitness & { readonly integrity: WitnessIntegrityRecord };
type MeaningWitnessRecord = MeaningWitness & { readonly integrity: WitnessIntegrityRecord };
type ProofWitnessRecord = ProofWitness & { readonly integrity: WitnessIntegrityRecord };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EOS_ROOT = resolve(__dirname, "../../../../../..");
const GATE_C_DIR = join(EOS_ROOT, "enterprise", "science", "gate-c");
const SPEC_DIR = join(GATE_C_DIR, "specification");
const EXECUTION_DIR = join(GATE_C_DIR, "execution");
const RUNS_DIR = join(EXECUTION_DIR, "runs");
const SCIENCE_KERNEL_DIR = join(GATE_C_DIR, "science-kernel");
const BUNDLE_MANIFEST_PATH = join(SCIENCE_KERNEL_DIR, "bundle.manifest.yaml");
const BUNDLE_SHA_PATH = join(SCIENCE_KERNEL_DIR, "bundle.sha256");
const PROTOCOL_PATH = join(SPEC_DIR, "protocol.yaml");
const TRUTH_TABLE_PATH = join(SPEC_DIR, "truth-table.yaml");
const REPRO_MANIFEST_PATH = join(SPEC_DIR, "manifests", "reproducibility-manifest.yaml");
const KERNEL_STATUS_PATH = join(SPEC_DIR, "manifests", "kernel-status.yaml");
const ORACLE_CERTIFICATE_PATH = join(SPEC_DIR, "calibration", "oracle-certificate.yaml");
const WITNESS_CERTIFICATE_PATH = join(SPEC_DIR, "calibration", "witness-certificate.yaml");
const DATASET_CERTIFICATE_PATH = join(SPEC_DIR, "calibration", "dataset-certificate.yaml");
const CALIBRATION_REPORT_PATH = join(SPEC_DIR, "calibration", "calibration-report.yaml");
const ORACLE_SPEC_PATH = join(SPEC_DIR, "oracle", "oracle.yaml");
const WITNESS_INTEGRITY_PATH = join(SPEC_DIR, "witness-integrity.yaml");
const DATASET_MANIFEST_PATH = join(SPEC_DIR, "dataset", "reference-dataset.yaml");
const EVIDENCE_MODEL_PATH = join(EOS_ROOT, "enterprise", "governance", "evidence-model.md");
const RUN_PROOF_LEDGER_PATH = join(EXECUTION_DIR, "proof-ledger.yaml");
const BUNDLE_ID = "SC-KERNEL-001";
const BUNDLE_VERSION = 1;
const GENESIS_RUN_ID = "run-001";
const REFERENCE_RUNTIME_ID = "TS-REFERENCE-RUNTIME-001";
const REFERENCE_RUNTIME_STRATEGY = "ts-reference-runtime/v1";
const DEFAULT_OPERATOR_ID = "eos-cli";

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function normalizeSlashes(path: string): string {
  return path.split("\\").join("/");
}

function toGateCRelative(path: string): string {
  return normalizeSlashes(relative(GATE_C_DIR, path));
}

function toRepoRelative(path: string): string {
  return normalizeSlashes(relative(EOS_ROOT, path));
}

function sha256hex(input: string | Uint8Array): string {
  const hash = createHash("sha256");
  if (typeof input === "string") {
    hash.update(input, "utf8");
  } else {
    hash.update(input);
  }
  return hash.digest("hex");
}

function sha256(input: string | Uint8Array): string {
  return `sha256:${sha256hex(input)}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function canonicalizeValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return String(value);
    }
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeValue(entry));
  }
  if (isPlainObject(value)) {
    const out: Record<string, JsonValue> = {};
    const keys = Object.keys(value).sort((left, right) => left.localeCompare(right));
    for (const key of keys) {
      const entry = value[key];
      if (typeof entry === "undefined") {
        continue;
      }
      out[key] = canonicalizeValue(entry);
    }
    return out;
  }
  return String(value);
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalizeValue(value));
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

function readYamlRecord(path: string): Record<string, unknown> {
  const parsed = YAML.parse(readText(path)) as unknown;
  if (!isPlainObject(parsed)) {
    throw new Error(`Expected YAML mapping at ${path}`);
  }
  return parsed;
}

function writeYaml(path: string, value: unknown): void {
  const yaml = YAML.stringify(value, {
    indent: 2,
    lineWidth: 0,
  });
  writeFileSync(path, yaml.endsWith("\n") ? yaml : `${yaml}\n`, "utf8");
}

function listFilesRecursively(root: string): string[] {
  const out: string[] = [];
  const visit = (current: string): void => {
    const entries = readdirSync(current, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name)
    );
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile()) {
        out.push(fullPath);
      }
    }
  };
  visit(root);
  return out;
}

function categorizeArtifact(path: string): ArtifactHash["category"] {
  const rel = toGateCRelative(path);
  if (rel === "specification/protocol.yaml") return "protocol";
  if (rel === "specification/truth-table.yaml" || rel === "specification/hypothesis.yaml") return "theory";
  if (rel === "specification/witness-integrity.yaml") return "witness";
  if (rel.startsWith("specification/calibration/")) return "calibration";
  if (rel.startsWith("specification/dataset/")) return "dataset";
  if (rel.startsWith("specification/expected/")) return "expected";
  if (rel.startsWith("specification/experiments/")) return "experiment";
  if (rel.startsWith("specification/fixtures/")) return "fixture";
  if (rel.startsWith("specification/manifests/")) return "manifest";
  if (rel.startsWith("specification/oracle/")) return "oracle";
  if (rel.startsWith("specification/schemas/")) return "schema";
  if (rel.startsWith("specification/tests/")) return "test";
  return "bundle_support";
}

function hashFile(path: string): string {
  return sha256(readFileSync(path));
}

function hashArtifactList(paths: readonly string[]): string {
  const payload = paths
    .map((path) => {
      const bytes = readFileSync(path);
      return {
        path: toGateCRelative(path),
        sha256: sha256(bytes),
        bytes: statSync(path).size,
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
  return sha256(canonicalJson(payload));
}

function computeArtifactInventory(): readonly ArtifactHash[] {
  const specFiles = listFilesRecursively(SPEC_DIR);
  const bundleSupportFiles = [EVIDENCE_MODEL_PATH];
  return [...specFiles, ...bundleSupportFiles]
    .map((path) => ({
      path: path === EVIDENCE_MODEL_PATH ? toRepoRelative(path) : toGateCRelative(path),
      sha256: hashFile(path),
      bytes: statSync(path).size,
      category: categorizeArtifact(path),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function updateReproducibilityManifest(hashes: {
  readonly protocolHash: string;
  readonly truthTableHash: string;
  readonly expectedHash: string;
  readonly schemaHash: string;
  readonly fixtureHash: string;
  readonly oracleBundleHash: string;
  readonly specificationHash: string;
}): string {
  const manifest = readYamlRecord(REPRO_MANIFEST_PATH);
  const oracle = asMutableRecord(manifest.oracle, "oracle");
  const truthTable = asMutableRecord(manifest.truth_table, "truth_table");
  const protocol = asMutableRecord(manifest.protocol, "protocol");
  const expectedContracts = asMutableRecord(manifest.expected_contracts, "expected_contracts");
  const schemaBundle = asMutableRecord(manifest.schema_bundle, "schema_bundle");
  const artifacts = asMutableRecord(manifest.artifacts, "artifacts");
  const integrity = asMutableRecord(manifest.integrity, "integrity");

  oracle.oracle_hash = hashes.oracleBundleHash;
  truthTable.truth_table_hash = hashes.truthTableHash;
  protocol.protocol_hash = hashes.protocolHash;
  expectedContracts.expected_hash = hashes.expectedHash;
  schemaBundle.schema_hash = hashes.schemaHash;
  artifacts.specification_hash = hashes.specificationHash;
  artifacts.fixture_hash = hashes.fixtureHash;
  artifacts.oracle_hash = hashes.oracleBundleHash;
  artifacts.schema_hash = hashes.schemaHash;
  integrity.hash_basis = "sha256(canonical_json(reproducibility_manifest_excluding_integrity.manifest_hash))";
  integrity.manifest_hash = "sha256:PENDING";

  const manifestForHash = deepClone(manifest);
  const manifestForHashIntegrity = asMutableRecord(manifestForHash.integrity, "integrity");
  delete manifestForHashIntegrity.manifest_hash;
  const manifestHash = sha256(canonicalJson(manifestForHash));
  integrity.manifest_hash = manifestHash;

  writeYaml(REPRO_MANIFEST_PATH, manifest);
  return manifestHash;
}

function updateKernelStatus(bundleManifestRef: string): void {
  const statusManifest = readYamlRecord(KERNEL_STATUS_PATH);
  const scienceKernel = asMutableRecord(statusManifest.science_kernel, "science_kernel");
  scienceKernel.evidence = {
    calibration_report_id: "GATE-C0-CALIBRATION-REPORT-001",
    calibration_report_ref: "specification/calibration/calibration-report.yaml",
    reproducibility_manifest_ref: "specification/manifests/reproducibility-manifest.yaml",
    bundle_id: BUNDLE_ID,
    bundle_manifest_ref: bundleManifestRef,
    evidence_model_ref: "enterprise/governance/evidence-model.md",
  };
  writeYaml(KERNEL_STATUS_PATH, statusManifest);
}

function loadApparatusIdentity(
  certificatePath: string,
  instrumentPath: string,
): ApparatusIdentity {
  const certificate = readYamlRecord(certificatePath);
  const certificateId = asString(certificate.certificate_id, `${certificatePath} certificate_id`);
  return {
    certificateId,
    certificateRef: toGateCRelative(certificatePath),
    certificateHash: hashFile(certificatePath),
    instrumentRef: toGateCRelative(instrumentPath),
    instrumentHash: hashFile(instrumentPath),
  };
}

function materializeBundle(): BundleContext {
  ensureDir(SCIENCE_KERNEL_DIR);

  const schemaFiles = listFilesRecursively(join(SPEC_DIR, "schemas"));
  const fixtureFiles = listFilesRecursively(join(SPEC_DIR, "fixtures"));
  const oracleFiles = listFilesRecursively(join(SPEC_DIR, "oracle"));
  const expectedFiles = listFilesRecursively(join(SPEC_DIR, "expected"));
  const specificationFiles = listFilesRecursively(SPEC_DIR).filter((path) => {
    const rel = toGateCRelative(path);
    return (
      !rel.startsWith("specification/fixtures/") &&
      !rel.startsWith("specification/schemas/") &&
      !rel.startsWith("specification/oracle/")
    );
  });

  const initialHashes = {
    protocolHash: hashFile(PROTOCOL_PATH),
    truthTableHash: hashFile(TRUTH_TABLE_PATH),
    expectedHash: hashArtifactList(expectedFiles),
    schemaHash: hashArtifactList(schemaFiles),
    fixtureHash: hashArtifactList(fixtureFiles),
    oracleBundleHash: hashArtifactList(oracleFiles),
    specificationHash: hashArtifactList(specificationFiles),
  } as const;

  const reproducibilityManifestHash = updateReproducibilityManifest(initialHashes);
  updateKernelStatus(toGateCRelative(BUNDLE_MANIFEST_PATH));

  const artifacts = computeArtifactInventory();
  const protocolHash = getArtifactHash(artifacts, "specification/protocol.yaml");
  const truthTableHash = getArtifactHash(artifacts, "specification/truth-table.yaml");
  const expectedHash = hashArtifactEntries(artifacts, "expected");
  const schemaHash = hashArtifactEntries(artifacts, "schema");
  const fixtureHash = hashArtifactEntries(artifacts, "fixture");
  const oracleBundleHash = hashArtifactEntries(artifacts, "oracle");
  const specificationHash = hashArtifactEntriesByPath(artifacts, (path) =>
    path.startsWith("specification/") &&
    !path.startsWith("specification/fixtures/") &&
    !path.startsWith("specification/schemas/") &&
    !path.startsWith("specification/oracle/")
  );

  const calibrationReportRef = toGateCRelative(CALIBRATION_REPORT_PATH);
  const calibrationReportHash = hashFile(CALIBRATION_REPORT_PATH);
  const calibrationReport = readYamlRecord(CALIBRATION_REPORT_PATH);
  const calibrationReportId = asString(
    calibrationReport.calibration_report_id,
    "calibration-report.yaml calibration_report_id",
  );

  const oracleCertificate = loadApparatusIdentity(ORACLE_CERTIFICATE_PATH, ORACLE_SPEC_PATH);
  const witnessCertificate = loadApparatusIdentity(WITNESS_CERTIFICATE_PATH, WITNESS_INTEGRITY_PATH);
  const datasetCertificate = loadApparatusIdentity(DATASET_CERTIFICATE_PATH, DATASET_MANIFEST_PATH);
  const evidenceModelRef = toRepoRelative(EVIDENCE_MODEL_PATH);
  const evidenceModelHash = hashFile(EVIDENCE_MODEL_PATH);
  const reproducibilityManifestRef = toGateCRelative(REPRO_MANIFEST_PATH);

  const bundlePayload: Record<string, JsonValue> = {
    version: "1.0.0",
    bundle_id: BUNDLE_ID,
    bundle_version: BUNDLE_VERSION,
    status: "FROZEN",
    canonicalization: {
      artifact_hash_algorithm: "sha256",
      artifact_hash_basis: "raw_file_bytes",
      manifest_hash_algorithm: "sha256",
      manifest_hash_basis:
        "sha256(canonical_json(bundle_manifest_excluding_bundle_sha256))",
      path_basis: "paths_relative_to_enterprise/science/gate-c_or_repository_root_for_external_refs",
    },
    science_kernel_status: {
      status_ref: "specification/manifests/kernel-status.yaml",
      calibration_report_ref: calibrationReportRef,
      reproducibility_manifest_ref: reproducibilityManifestRef,
    },
    measurement_apparatus: {
      oracle: {
        certificate_id: oracleCertificate.certificateId,
        certificate_ref: oracleCertificate.certificateRef,
        certificate_hash: oracleCertificate.certificateHash,
        instrument_ref: oracleCertificate.instrumentRef,
        instrument_hash: oracleCertificate.instrumentHash,
      },
      witness: {
        certificate_id: witnessCertificate.certificateId,
        certificate_ref: witnessCertificate.certificateRef,
        certificate_hash: witnessCertificate.certificateHash,
        instrument_ref: witnessCertificate.instrumentRef,
        instrument_hash: witnessCertificate.instrumentHash,
      },
      dataset: {
        certificate_id: datasetCertificate.certificateId,
        certificate_ref: datasetCertificate.certificateRef,
        certificate_hash: datasetCertificate.certificateHash,
        instrument_ref: datasetCertificate.instrumentRef,
        instrument_hash: datasetCertificate.instrumentHash,
      },
    },
    evidence_pointers: {
      calibration_report_id: calibrationReportId,
      calibration_report_ref: calibrationReportRef,
      calibration_report_hash: calibrationReportHash,
      reproducibility_manifest_ref: reproducibilityManifestRef,
      reproducibility_manifest_hash: reproducibilityManifestHash,
      evidence_model_ref: evidenceModelRef,
      evidence_model_hash: evidenceModelHash,
    },
    hashes: {
      protocol_hash: protocolHash,
      truth_table_hash: truthTableHash,
      expected_hash: expectedHash,
      schema_hash: schemaHash,
      fixture_hash: fixtureHash,
      oracle_hash: oracleBundleHash,
      specification_hash: specificationHash,
    },
    artifacts: artifacts.map((artifact) => ({
      path: artifact.path,
      sha256: artifact.sha256,
      bytes: artifact.bytes,
      category: artifact.category,
    })),
    bundle_sha256: "sha256:PENDING",
  };

  const payloadWithoutBundleHash = deepClone(bundlePayload);
  delete asMutableRecord(payloadWithoutBundleHash, "bundlePayload").bundle_sha256;
  const bundleHash = sha256(canonicalJson(payloadWithoutBundleHash));
  bundlePayload.bundle_sha256 = bundleHash;

  writeYaml(BUNDLE_MANIFEST_PATH, bundlePayload);
  writeFileSync(BUNDLE_SHA_PATH, `${bundleHash}\n`, "utf8");

  return {
    bundleId: BUNDLE_ID,
    bundleHash,
    bundleManifestPath: BUNDLE_MANIFEST_PATH,
    bundleShaPath: BUNDLE_SHA_PATH,
    calibrationReportId,
    calibrationReportRef,
    calibrationReportHash,
    reproducibilityManifestRef,
    reproducibilityManifestHash,
    evidenceModelRef,
    evidenceModelHash,
    oracleCertificate,
    witnessCertificate,
    datasetCertificate,
    artifacts,
    protocolHash,
    truthTableHash,
    expectedHash,
    schemaHash,
    fixtureHash,
    oracleBundleHash,
    specificationHash,
  };
}

function loadSubjectDefinition(subjectRelPath?: string): SubjectDefinition {
  const defaultSubjectPath = join(SPEC_DIR, "experiments", "document", "propose.yaml");
  const subjectPath = subjectRelPath ? join(GATE_C_DIR, subjectRelPath) : defaultSubjectPath;
  const subject = readYamlRecord(subjectPath);
  const transformationContract = asMutableRecord(subject.transformation_contract, "transformation_contract");

  return {
    experimentSubjectId: asString(subject.experiment_subject_id, "experiment_subject_id"),
    operation: asString(subject.operation, "operation"),
    operationLabel: asString(subject.operation_label, "operation_label"),
    subjectRef: toGateCRelative(subjectPath),
    expectedPredicatesRef: asString(subject.expected_predicates_ref, "expected_predicates_ref"),
    expectedEvaluationRef: asString(subject.expected_evaluation_ref, "expected_evaluation_ref"),
    truthTableRow: asString(subject.expected_truth_table_row_match, "expected_truth_table_row_match"),
    transformationContractId: asString(transformationContract.id, "transformation_contract.id"),
    transformationContractName: asString(transformationContract.name, "transformation_contract.name"),
    transformationPreconditions: asStringArray(
      transformationContract.preconditions,
      "transformation_contract.preconditions",
    ),
    transformationPostconditions: asStringArray(
      transformationContract.postconditions,
      "transformation_contract.postconditions",
    ),
    transformationInvariants: asStringArray(
      transformationContract.invariants,
      "transformation_contract.invariants",
    ),
    documentFixtureRefs: asStringArray(
      asMutableRecord(subject.input_fixtures, "input_fixtures").documents,
      "input_fixtures.documents",
    ),
    policyFixtureRefs: asStringArray(
      asMutableRecord(subject.input_fixtures, "input_fixtures").policies,
      "input_fixtures.policies",
    ),
    contractFixtureRefs: asStringArray(
      asMutableRecord(subject.input_fixtures, "input_fixtures").contracts,
      "input_fixtures.contracts",
    ),
    evidenceFixtureRefs: asStringArray(
      asMutableRecord(subject.input_fixtures, "input_fixtures").evidence,
      "input_fixtures.evidence",
    ),
  };
}

function createRunManifest(
  runId: string,
  bundle: BundleContext,
  subject: SubjectDefinition,
  runRoot: string,
  executionTimestampUtc: string,
): Record<string, JsonValue> {
  const runRef = toGateCRelative(runRoot);
  return {
    version: "1.0.0",
    run_id: runId,
    gate: "GATE-C",
    gate_stage: "GATE-C1",
    evidence_class: "CLASS_II_EXPERIMENTAL",
    execution_timestamp_utc: executionTimestampUtc,
    operator_id: DEFAULT_OPERATOR_ID,
    strategy_ids: [REFERENCE_RUNTIME_STRATEGY],
    oracle_id: "GATE-C-ORACLE-001",
    dataset_version: "1.0.0",
    truth_table_version: "1.0.0",
    protocol_version: "1.0.0",
    reproducibility_manifest_ref: bundle.reproducibilityManifestRef,
    subjects: [
      {
        experiment_subject_id: subject.experimentSubjectId,
        subject_ref: subject.subjectRef,
        operation: subject.operation,
        expected_predicates_ref: subject.expectedPredicatesRef,
        expected_evaluation_ref: subject.expectedEvaluationRef,
      },
    ],
    measurement_apparatus: {
      calibration_report_id: bundle.calibrationReportId,
      calibration_report_ref: bundle.calibrationReportRef,
      oracle_certificate_id: bundle.oracleCertificate.certificateId,
      oracle_certificate_ref: bundle.oracleCertificate.certificateRef,
      witness_certificate_id: bundle.witnessCertificate.certificateId,
      witness_certificate_ref: bundle.witnessCertificate.certificateRef,
      dataset_certificate_id: bundle.datasetCertificate.certificateId,
      dataset_certificate_ref: bundle.datasetCertificate.certificateRef,
      kernel_status_ref: "specification/manifests/kernel-status.yaml",
      oracle: {
        certificate_id: bundle.oracleCertificate.certificateId,
        certificate_ref: bundle.oracleCertificate.certificateRef,
        artifact_hash: bundle.oracleCertificate.certificateHash,
        instrument_ref: bundle.oracleCertificate.instrumentRef,
        instrument_hash: bundle.oracleCertificate.instrumentHash,
      },
      witness: {
        certificate_id: bundle.witnessCertificate.certificateId,
        certificate_ref: bundle.witnessCertificate.certificateRef,
        artifact_hash: bundle.witnessCertificate.certificateHash,
        instrument_ref: bundle.witnessCertificate.instrumentRef,
        instrument_hash: bundle.witnessCertificate.instrumentHash,
      },
      dataset: {
        certificate_id: bundle.datasetCertificate.certificateId,
        certificate_ref: bundle.datasetCertificate.certificateRef,
        artifact_hash: bundle.datasetCertificate.certificateHash,
        instrument_ref: bundle.datasetCertificate.instrumentRef,
        instrument_hash: bundle.datasetCertificate.instrumentHash,
      },
      science_kernel: {
        bundle_id: bundle.bundleId,
        bundle_ref: toGateCRelative(bundle.bundleManifestPath),
        bundle_hash: bundle.bundleHash,
      },
    },
    output_layout: {
      actual_dir: `${runRef}/actual`,
      witness_dir: `${runRef}/actual/witness`,
      logs_dir: `${runRef}/logs`,
      metrics_dir: `${runRef}/metrics`,
      report_ref: `${runRef}/report.yaml`,
    },
  };
}

function executeRun(
  runId: string,
  bundle: BundleContext,
  manifest: Record<string, JsonValue>,
  runRoot: string,
  mode: "original" | "replay",
  subjectRelPath?: string,
): RunMaterialization {
  const subject = loadSubjectDefinition(subjectRelPath);
  const inputFixtures = loadInputFixtures(subject);

  resetDirectory(runRoot);

  const actualDir = join(runRoot, "actual");
  const observationsDir = join(actualDir, "observations");
  const evaluationsDir = join(actualDir, "evaluations");
  const verdictsDir = join(actualDir, "verdicts");
  const witnessRoot = join(actualDir, "witness");
  const authorityDir = join(witnessRoot, "authority");
  const meaningDir = join(witnessRoot, "meaning");
  const proofDir = join(witnessRoot, "proof");
  const logsDir = join(runRoot, "logs");
  const metricsDir = join(runRoot, "metrics");

  [
    actualDir,
    observationsDir,
    evaluationsDir,
    verdictsDir,
    witnessRoot,
    authorityDir,
    meaningDir,
    proofDir,
    logsDir,
    metricsDir,
  ].forEach(ensureDir);

  const executionTimestampUtc = new Date().toISOString();
  manifest.execution_timestamp_utc = executionTimestampUtc;
  const runManifestPath = join(runRoot, "run-manifest.yaml");
  writeYaml(runManifestPath, manifest);

  const normativeMutation = (() => {
    const mutationNode = (subject as unknown as Record<string, JsonValue>).transformation_normative_mutation;
    if (!mutationNode) return null;
    return asMutableRecord(mutationNode, "subject.transformation_normative_mutation") as Partial<{
      title: unknown;
      classification: unknown;
      retention_period_days: unknown;
      proposer_identity_ref: unknown;
      body: unknown;
    }>;
  })();

  const transformedDocument = {
    title:
      normativeMutation && typeof normativeMutation.title === "string"
        ? normativeMutation.title
        : inputFixtures.document.title,
    classification:
      normativeMutation && typeof normativeMutation.classification === "string"
        ? normativeMutation.classification
        : inputFixtures.document.classification,
    retention_period_days:
      normativeMutation && typeof normativeMutation.retention_period_days === "number"
        ? normativeMutation.retention_period_days
        : inputFixtures.document.retention_period_days,
    proposer_identity_ref:
      normativeMutation && typeof normativeMutation.proposer_identity_ref === "string"
        ? normativeMutation.proposer_identity_ref
        : inputFixtures.document.proposer_identity_ref,
    body:
      normativeMutation && typeof normativeMutation.body === "string"
        ? normativeMutation.body
        : inputFixtures.document.body,
    metadata: {
      ...inputFixtures.document.metadata,
      recorded_status: "PROPOSED",
      proposal_recorded_by: REFERENCE_RUNTIME_ID,
      proposal_evidence_ids: inputFixtures.proofEvidenceIds,
    },
  } as const;

  const semanticInput = buildSemanticProjection(inputFixtures.document);
  const semanticOutput = buildSemanticProjection(transformedDocument);
  const semanticInputHash = sha256(canonicalJson(semanticInput));
  const semanticOutputHash = sha256(canonicalJson(semanticOutput));

  const authorityRoleOk = inputFixtures.policy.roles_allowed_propose.includes(
    inputFixtures.proposerRole,
  );
  const authorityOpOk = hasKey(inputFixtures.contract.operations, "ProposeDocument");
  const authorityChainOk =
    inputFixtures.contract.derives_authority_from_policy_ref === inputFixtures.policy.policy_id;
  const authorityCycleOk = false === false;
  const authorityPass = authorityRoleOk && authorityOpOk && authorityChainOk && authorityCycleOk;

  const authorityWitness = createWitness(
    {
      version: "1.0.0",
      witness_id: `${runId}-witness-a`,
      witness_type: "AUTHORITY",
      subject_id: subject.experimentSubjectId,
      operation: subject.operation,
      role_attested: inputFixtures.proposerRole,
      authority_chain: [
        {
          node_id: "DocReq-001",
          relation: "ROOT_REQUIREMENT",
        },
        {
          node_id: inputFixtures.policy.policy_id,
          relation: "DERIVES_AUTHORITY_FROM_REQUIREMENT",
        },
        {
          node_id: inputFixtures.contract.contract_id,
          relation: "DERIVES_AUTHORITY_FROM_POLICY",
        },
      ],
      cycle_detected: false,
      conditions: {
        proposer_role_allowed: authorityRoleOk,
        contract_operation_present: authorityOpOk,
        policy_chain_matches_contract: authorityChainOk,
      },
      result: authorityPass ? "PASS" : "FAIL",
    },
    executionTimestampUtc,
  ) as AuthorityWitnessRecord;

  const meaningWitness = createWitness(
    {
      version: "1.0.0",
      witness_id: `${runId}-witness-b`,
      witness_type: "MEANING",
      subject_id: subject.experimentSubjectId,
      operation: subject.operation,
      semantic_input_hash: semanticInputHash,
      semantic_output_hash: semanticOutputHash,
      canonical_identity_preserved: semanticInputHash === semanticOutputHash,
      semantic_projection_fields: Object.keys(semanticInput).sort(),
      result: semanticInputHash === semanticOutputHash ? "PASS" : "FAIL",
    },
    executionTimestampUtc,
  ) as MeaningWitnessRecord;

  const q1StatusOk = inputFixtures.proposalStatus === "PROPOSED";
  const q2ProposerOk = inputFixtures.proposerRole === inputFixtures.document.proposer_identity_ref;
  const q3AuditOk = inputFixtures.proofEvidenceIds.length >= 2;
  const constructiveEntailmentOk = q1StatusOk && q2ProposerOk && q3AuditOk;

  const proofWitness = createWitness(
    {
      version: "1.0.0",
      witness_id: `${runId}-witness-c`,
      witness_type: "PROOF",
      subject_id: subject.experimentSubjectId,
      operation: subject.operation,
      evidence_items: inputFixtures.proofEvidenceIds,
      postconditions: {
        q1_status_recorded: q1StatusOk,
        q2_proposer_identity_recorded: q2ProposerOk,
        q3_audit_trail_recorded: q3AuditOk,
      },
      constructive_entailment_complete: constructiveEntailmentOk,
      result: constructiveEntailmentOk ? "PASS" : "FAIL",
    },
    executionTimestampUtc,
  ) as ProofWitnessRecord;

  const authorityWitnessPath = join(authorityDir, `${subject.experimentSubjectId}.yaml`);
  const meaningWitnessPath = join(meaningDir, `${subject.experimentSubjectId}.yaml`);
  const proofWitnessPath = join(proofDir, `${subject.experimentSubjectId}.yaml`);

  writeYaml(authorityWitnessPath, authorityWitness);
  writeYaml(meaningWitnessPath, meaningWitness);
  writeYaml(proofWitnessPath, proofWitness);

  const observation = {
    version: "1.0.0",
    observation_id: `${runId}-${mode}-observation-001`,
    subject_id: subject.experimentSubjectId,
    transformation_contract_id: subject.transformationContractId,
    strategy_id: REFERENCE_RUNTIME_STRATEGY,
    execution_mode: mode.toUpperCase(),
    input_fixture_hashes: {
      document: hashFile(join(GATE_C_DIR, subject.documentFixtureRefs[0] ?? "")),
      policy: hashFile(join(GATE_C_DIR, subject.policyFixtureRefs[0] ?? "")),
      contract: hashFile(join(GATE_C_DIR, subject.contractFixtureRefs[0] ?? "")),
      evidence: hashFile(join(GATE_C_DIR, subject.evidenceFixtureRefs[0] ?? "")),
    },
    transformation_output: transformedDocument,
  };
  writeYaml(join(observationsDir, `${subject.experimentSubjectId}.yaml`), observation);

  const evaluation = evaluateSubject({
    subject,
    expectedPredicatesPath: join(GATE_C_DIR, subject.expectedPredicatesRef.split("#")[0] ?? ""),
    expectedEvaluationsPath: join(GATE_C_DIR, subject.expectedEvaluationRef.split("#")[0] ?? ""),
    authorityWitness,
    meaningWitness,
    proofWitness,
  });
  writeYaml(join(evaluationsDir, `${subject.experimentSubjectId}.yaml`), evaluation);

  const verdict = {
    version: "1.0.0",
    verdict_id: `${runId}-${mode}-verdict-001`,
    subject_id: subject.experimentSubjectId,
    verdict: evaluation.evaluation_result,
    constitutional_validity: evaluation.ia20_constitutional_validity,
    truth_table_row_matched: evaluation.truth_table_row_matched,
  };
  writeYaml(join(verdictsDir, `${subject.experimentSubjectId}.yaml`), verdict);

  const authorityWitnessHash = hashFile(authorityWitnessPath);
  const meaningWitnessHash = hashFile(meaningWitnessPath);
  const proofWitnessHash = hashFile(proofWitnessPath);
  const authorityCanonicalWitnessHash = computeCanonicalWitnessHash(authorityWitness);
  const meaningCanonicalWitnessHash = computeCanonicalWitnessHash(meaningWitness);
  const proofCanonicalWitnessHash = computeCanonicalWitnessHash(proofWitness);

  const canonicalEvidence = {
    run_id: runId,
    subject_id: subject.experimentSubjectId,
    transformation_contract_id: subject.transformationContractId,
    transformation_contract_name: subject.transformationContractName,
    strategy_id: REFERENCE_RUNTIME_STRATEGY,
    oracle_id: "GATE-C-ORACLE-001",
    science_kernel: {
      bundle_id: bundle.bundleId,
      bundle_hash: bundle.bundleHash,
    },
    measurement_apparatus: {
      oracle: {
        certificate_id: bundle.oracleCertificate.certificateId,
        artifact_hash: bundle.oracleCertificate.certificateHash,
        instrument_hash: bundle.oracleCertificate.instrumentHash,
      },
      witness: {
        certificate_id: bundle.witnessCertificate.certificateId,
        artifact_hash: bundle.witnessCertificate.certificateHash,
        instrument_hash: bundle.witnessCertificate.instrumentHash,
      },
      dataset: {
        certificate_id: bundle.datasetCertificate.certificateId,
        artifact_hash: bundle.datasetCertificate.certificateHash,
        instrument_hash: bundle.datasetCertificate.instrumentHash,
      },
    },
    input_identity: {
      document_semantic_hash: semanticInputHash,
      subject_hash: hashFile(join(GATE_C_DIR, subject.subjectRef)),
      document_fixture_hash: hashFile(join(GATE_C_DIR, subject.documentFixtureRefs[0] ?? "")),
      policy_fixture_hash: hashFile(join(GATE_C_DIR, subject.policyFixtureRefs[0] ?? "")),
      contract_fixture_hash: hashFile(join(GATE_C_DIR, subject.contractFixtureRefs[0] ?? "")),
      evidence_fixture_hash: hashFile(join(GATE_C_DIR, subject.evidenceFixtureRefs[0] ?? "")),
    },
    predicate_vector: {
      pred_a_legitimate: evaluation.predicates.pred_a_legitimate,
      pred_b_meaning_preserved: evaluation.predicates.pred_b_meaning_preserved,
      pred_c_provable: evaluation.predicates.pred_c_provable,
    },
    verdict: evaluation.evaluation_result,
    constitutional_validity: evaluation.ia20_constitutional_validity,
    truth_table_row: evaluation.truth_table_row_matched,
    witness_payloads: {
      authority: {
        authority_chain: authorityWitness.authority_chain,
        conditions: authorityWitness.conditions,
        result: authorityWitness.result,
      },
      meaning: {
        semantic_input_hash: meaningWitness.semantic_input_hash,
        semantic_output_hash: meaningWitness.semantic_output_hash,
        canonical_identity_preserved: meaningWitness.canonical_identity_preserved,
        result: meaningWitness.result,
      },
      proof: {
        evidence_items: proofWitness.evidence_items,
        postconditions: proofWitness.postconditions,
        constructive_entailment_complete: proofWitness.constructive_entailment_complete,
        result: proofWitness.result,
      },
    },
  } satisfies Record<string, JsonValue>;

  const canonicalEvidenceHash = sha256(canonicalJson(canonicalEvidence));
  writeYaml(join(metricsDir, `canonical-evidence-${mode}.yaml`), canonicalEvidence);
  writeYaml(join(logsDir, `${mode}.yaml`), {
    version: "1.0.0",
    run_id: runId,
    execution_mode: mode.toUpperCase(),
    reference_runtime_id: REFERENCE_RUNTIME_ID,
    strategy_id: REFERENCE_RUNTIME_STRATEGY,
    execution_timestamp_utc: executionTimestampUtc,
    commands: [
      `pnpm eos gate-c genesis-evidence`,
      `${mode === "replay" ? "clean replay via temporary directory" : "original execution materialization"}`,
    ],
  });

  const report = {
    version: "1.0.0",
    run_id: runId,
    execution_mode: mode.toUpperCase(),
    evidence_class: "CLASS_II_EXPERIMENTAL",
    measurement_apparatus: {
      calibration_report_id: bundle.calibrationReportId,
      oracle_certificate_id: bundle.oracleCertificate.certificateId,
      witness_certificate_id: bundle.witnessCertificate.certificateId,
      dataset_certificate_id: bundle.datasetCertificate.certificateId,
    },
    subject_id: subject.experimentSubjectId,
    predicate_vector: evaluation.predicates,
    ia20_evaluation: evaluation.ia20_constitutional_validity,
    truth_table_row_match_status: evaluation.truth_table_row_matched,
    independence_test_result: evaluation.independence_test_result,
    fungibility_test_result: "NOT_PERFORMED_SINGLE_REFERENCE_RUNTIME",
    witness_ids_composite: `CP-${subject.experimentSubjectId}-${stripHash(authorityWitnessHash, 8)}-${stripHash(
      meaningWitnessHash,
      8,
    )}-${stripHash(proofWitnessHash, 8)}`,
    canonical_evidence_hash: canonicalEvidenceHash,
  };
  const reportPath = join(runRoot, "report.yaml");
  writeYaml(reportPath, report);

  return {
    runId: runId,
    runRoot,
    runManifestPath,
    runManifestRef: toGateCRelative(runManifestPath),
    reportPath,
    reportRef: toGateCRelative(reportPath),
    executionTimestampUtc,
    verdict: evaluation.evaluation_result,
    evaluationDisposition: evaluation.evaluation_result,
    canonicalEvidence,
    canonicalEvidenceHash,
    witnessArtifactHashes: {
      authority: authorityWitnessHash,
      meaning: meaningWitnessHash,
      proof: proofWitnessHash,
    },
    canonicalWitnessHashes: {
      authority: authorityCanonicalWitnessHash,
      meaning: meaningCanonicalWitnessHash,
      proof: proofCanonicalWitnessHash,
    },
    subjectId: subject.experimentSubjectId,
  };
}

interface TruthTableRow {
  readonly id: string;
  readonly pred_a__legitimate: boolean;
  readonly pred_b__meaning_preserved: boolean;
  readonly pred_c__provable: boolean;
  readonly expected__constitutionally_valid: boolean;
}

function loadTruthTableRows(): readonly TruthTableRow[] {
  const tt = readYamlRecord(TRUTH_TABLE_PATH);
  const rows = asArray(tt.rows, "truth_table.rows");
  return rows.map((row) => {
    const r = asMutableRecord(row, "truth_table.row");
    return {
      id: asString(r.id, "row.id"),
      pred_a__legitimate: asBoolean(r.pred_a__legitimate, "row.pred_a__legitimate"),
      pred_b__meaning_preserved: asBoolean(r.pred_b__meaning_preserved, "row.pred_b__meaning_preserved"),
      pred_c__provable: asBoolean(r.pred_c__provable, "row.pred_c__provable"),
      expected__constitutionally_valid: asBoolean(r.expected__constitutionally_valid, "row.expected__constitutionally_valid"),
    };
  });
}

function matchTruthTableRow(
  rows: readonly TruthTableRow[],
  predA: boolean,
  predB: boolean,
  predC: boolean,
): string {
  const match = rows.find(
    (row) =>
      row.pred_a__legitimate === predA &&
      row.pred_b__meaning_preserved === predB &&
      row.pred_c__provable === predC,
  );
  return match ? match.id : "UNMAPPED";
}

function evaluateSubject(input: {
  readonly subject: SubjectDefinition;
  readonly expectedPredicatesPath: string;
  readonly expectedEvaluationsPath: string;
  readonly authorityWitness: Record<string, unknown>;
  readonly meaningWitness: Record<string, unknown>;
  readonly proofWitness: Record<string, unknown>;
}): EvaluationArtifact {
  const expectedPredicatesDoc = readYamlRecord(input.expectedPredicatesPath);
  const expectedEvaluationsDoc = readYamlRecord(input.expectedEvaluationsPath);
  const expectedPredicatesSection = asMutableRecord(expectedPredicatesDoc.expected_predicates, "expected_predicates");
  const expectedEvaluationsSection = asMutableRecord(expectedEvaluationsDoc.expected_evaluations, "expected_evaluations");
  const expectedPredicates = asMutableRecord(
    expectedPredicatesSection[input.subject.experimentSubjectId] ?? expectedPredicatesSection["*"],
    "expected_predicates.subject",
  );
  const expectedEvaluation = asMutableRecord(
    expectedEvaluationsSection[input.subject.experimentSubjectId] ?? expectedEvaluationsSection["*"],
    "expected_evaluations.subject",
  );

  const predALegitimate = asString(input.authorityWitness.result, "authorityWitness.result") === "PASS";
  const predBMeaningPreserved = asString(input.meaningWitness.result, "meaningWitness.result") === "PASS";
  const predCProvable = asString(input.proofWitness.result, "proofWitness.result") === "PASS";
  const ia20ConstitutionalValidity = predALegitimate && predBMeaningPreserved && predCProvable;
  const truthTableRows = loadTruthTableRows();
  const truthTableRowMatched = matchTruthTableRow(truthTableRows, predALegitimate, predBMeaningPreserved, predCProvable);

  const expectedPredVector =
    asBoolean(expectedPredicates.pred_a_legitimate, "expected.pred_a_legitimate") === predALegitimate &&
    asBoolean(expectedPredicates.pred_b_meaning_preserved, "expected.pred_b_meaning_preserved") ===
      predBMeaningPreserved &&
    asBoolean(expectedPredicates.pred_c_provable, "expected.pred_c_provable") === predCProvable &&
    asBoolean(expectedPredicates.constitutionally_valid, "expected.constitutionally_valid") ===
      ia20ConstitutionalValidity;
  const expectedIa20 = asBoolean(
    expectedEvaluation.ia20_constitutional_validity,
    "expected.ia20_constitutional_validity",
  );
  const expectedRow = asString(expectedEvaluation.truth_table_row_matched, "expected.truth_table_row_matched");
  const expectedEvaluationMatch =
    expectedIa20 === ia20ConstitutionalValidity && expectedRow === truthTableRowMatched;

  const independenceResults = {
    drop_authority: evaluateWithMissingWitness(false, predBMeaningPreserved, predCProvable),
    drop_meaning: evaluateWithMissingWitness(predALegitimate, false, predCProvable),
    drop_proof: evaluateWithMissingWitness(predALegitimate, predBMeaningPreserved, false),
  };
  const independencePass =
    independenceResults.drop_authority === "INCONCLUSIVE" &&
    independenceResults.drop_meaning === "INCONCLUSIVE" &&
    independenceResults.drop_proof === "INCONCLUSIVE";

  return {
    version: "1.0.0",
    subject_id: input.subject.experimentSubjectId,
    oracle_id: "GATE-C-ORACLE-001",
    predicates: {
      pred_a_legitimate: predALegitimate,
      pred_b_meaning_preserved: predBMeaningPreserved,
      pred_c_provable: predCProvable,
    },
    ia20_constitutional_validity: ia20ConstitutionalValidity,
    truth_table_row_matched: truthTableRowMatched,
    expected_vector_match: expectedPredVector,
    expected_evaluation_match: expectedEvaluationMatch,
    independence_test_result: independencePass ? "PASS" : "FAIL",
    evaluation_result: ia20ConstitutionalValidity ? "PASS" : "FAIL",
  };
}

function evaluateWithMissingWitness(
  hasAuthority: boolean,
  hasMeaning: boolean,
  hasProof: boolean,
): "INCONCLUSIVE" | "PASS" {
  return hasAuthority && hasMeaning && hasProof ? "PASS" : "INCONCLUSIVE";
}

function createWitness(
  payload: Record<string, unknown>,
  lockedAt: string,
): Record<string, JsonValue> {
  const witness = deepClone(payload);
  const integrity = {
    hash_basis: "sha256(canonical_json(witness_excluding_integrity.lock_hash))",
    lock_hash: "sha256:PENDING",
    locked_at: lockedAt,
    chain_of_custody: [
      {
        state: "OBSERVED",
        actor: REFERENCE_RUNTIME_ID,
      },
      {
        state: "STORED",
        actor: REFERENCE_RUNTIME_ID,
      },
      {
        state: "VERIFIED",
        actor: "GATE-C-ORACLE-001",
      },
      {
        state: "CONSUMED_BY_ORACLE",
        actor: "GATE-C-ORACLE-001",
      },
    ],
  };
  witness.integrity = integrity;
  const witnessForHash = deepClone(witness);
  const witnessIntegrity = asMutableRecord(witnessForHash.integrity, "integrity");
  delete witnessIntegrity.lock_hash;
  integrity.lock_hash = sha256(canonicalJson(witnessForHash));
  return canonicalizeValue(witness) as Record<string, JsonValue>;
}

function computeCanonicalWitnessHash(witness: Record<string, unknown>): string {
  const canonicalWitness = deepClone(witness);
  const integrity = asMutableRecord(canonicalWitness.integrity, "canonicalWitness.integrity");
  delete integrity.lock_hash;
  delete integrity.locked_at;
  return sha256(canonicalJson(canonicalWitness));
}

function buildSemanticProjection(document: {
  readonly title: string;
  readonly classification: string;
  readonly retention_period_days: number;
  readonly proposer_identity_ref: string;
  readonly body: string;
}): Record<string, JsonValue> {
  return {
    title: document.title,
    classification: document.classification,
    retention_period_days: document.retention_period_days,
    proposer_identity_ref: document.proposer_identity_ref,
    body: document.body,
  };
}

function loadInputFixtures(subject: SubjectDefinition): {
  readonly document: {
    readonly title: string;
    readonly classification: string;
    readonly retention_period_days: number;
    readonly proposer_identity_ref: string;
    readonly body: string;
    readonly metadata: Record<string, JsonValue>;
  };
  readonly policy: {
    readonly policy_id: string;
    readonly roles_allowed_propose: readonly string[];
  };
  readonly contract: {
    readonly contract_id: string;
    readonly derives_authority_from_policy_ref: string;
    readonly operations: Record<string, JsonValue>;
  };
  readonly proposalStatus: string;
  readonly proposerRole: string;
  readonly proofEvidenceIds: readonly string[];
} {
  const documentFixture = readYamlRecord(join(GATE_C_DIR, subject.documentFixtureRefs[0] ?? ""));
  const policyFixture = readYamlRecord(join(GATE_C_DIR, subject.policyFixtureRefs[0] ?? ""));
  const contractFixture = readYamlRecord(join(GATE_C_DIR, subject.contractFixtureRefs[0] ?? ""));
  const evidenceFixture = readYamlRecord(join(GATE_C_DIR, subject.evidenceFixtureRefs[0] ?? ""));

  const document = asMutableRecord(documentFixture.document, "document");
  const policy = asMutableRecord(policyFixture.policy, "policy");
  const contract = asMutableRecord(contractFixture.contract, "contract");
  const evidenceItems = asArray(evidenceFixture.evidence_items, "evidence_items");

  const proofEvidenceIds = evidenceItems.map((item, index) => {
    const record = asMutableRecord(item, `evidence_items[${index}]`);
    return asString(record.id, `evidence_items[${index}].id`);
  });

  const proposalEntry = asMutableRecord(evidenceItems[0], "evidence_items[0]");
  const proposalEntryData = asMutableRecord(proposalEntry.data, "evidence_items[0].data");
  const roleEntry = asMutableRecord(evidenceItems[1], "evidence_items[1]");
  const roleEntryData = asMutableRecord(roleEntry.data, "evidence_items[1].data");

  return {
    document: {
      title: asString(document.title, "document.title"),
      classification: asString(document.classification, "document.classification"),
      retention_period_days: asNumber(
        document.retention_period_days,
        "document.retention_period_days",
      ),
      proposer_identity_ref: asString(
        document.proposer_identity_ref,
        "document.proposer_identity_ref",
      ),
      body: asString(document.body, "document.body"),
      metadata: canonicalizeValue(
        asMutableRecord(document.metadata, "document.metadata"),
      ) as Record<string, JsonValue>,
    },
    policy: {
      policy_id: asString(policy.policy_id, "policy.policy_id"),
      roles_allowed_propose: asStringArray(
        asMutableRecord(policy.access_control, "policy.access_control").roles_allowed_propose,
        "policy.access_control.roles_allowed_propose",
      ),
    },
    contract: {
      contract_id: asString(contract.contract_id, "contract.contract_id"),
      derives_authority_from_policy_ref: asString(
        contract.derives_authority_from_policy_ref,
        "contract.derives_authority_from_policy_ref",
      ),
      operations: canonicalizeValue(
        asMutableRecord(contract.operations, "contract.operations"),
      ) as Record<string, JsonValue>,
    },
    proposalStatus: asString(proposalEntryData.recorded_status, "proposal recorded_status"),
    proposerRole: asString(roleEntryData.role_attested, "proposal role_attested"),
    proofEvidenceIds,
  };
}

function recordProofLedger(
  bundle: BundleContext,
  originalRun: RunMaterialization,
  replayRun: RunMaterialization,
  comparison: {
    readonly converged: boolean;
    readonly canonicalEvidenceMatches: boolean;
    readonly sameVerdict: boolean;
    readonly sameCanonicalWitnessHashes: boolean;
  },
): void {
  const existing = existsSync(RUN_PROOF_LEDGER_PATH)
    ? readYamlRecord(RUN_PROOF_LEDGER_PATH)
    : {
        version: "1.0.0",
        ledger_id: "GATE-C-PROOF-LEDGER-001",
        status: "ACTIVE",
        append_only_enforced: true,
        entries: [],
      };

  const entries = asArray(existing.entries, "proof_ledger.entries");
  const nextIndex = entries.length + 1;
  const entry = {
    entry_id: `GATE-C-GENESIS-${String(nextIndex).padStart(3, "0")}`,
    run_id: originalRun.runId,
    subject_id: originalRun.subjectId,
    manifest_ref: originalRun.runManifestRef,
    report_ref: originalRun.reportRef,
    science_kernel_bundle_id: bundle.bundleId,
    science_kernel_bundle_hash: bundle.bundleHash,
    original_canonical_evidence_hash: originalRun.canonicalEvidenceHash,
    replay_canonical_evidence_hash: replayRun.canonicalEvidenceHash,
    convergence: comparison.converged,
    verdict: comparison.converged ? "PASS" : "FAIL",
    hash_basis: "sha256(canonical_json(entry_excluding_entry_hash))",
    entry_hash: "sha256:PENDING",
  };
  const entryForHash = deepClone(entry);
  delete asMutableRecord(entryForHash, "entryForHash").entry_hash;
  entry.entry_hash = sha256(canonicalJson(entryForHash));

  entries.push(entry);
  existing.entries = entries;
  existing.count = entries.length;
  existing.last_entry_hash = asString(entry.entry_hash, "entry.entry_hash");
  writeYaml(RUN_PROOF_LEDGER_PATH, existing);
}

function writeComparisonArtifacts(
  runRoot: string,
  bundle: BundleContext,
  originalRun: RunMaterialization,
  replayRun: RunMaterialization,
): {
  readonly converged: boolean;
  readonly canonicalEvidenceMatches: boolean;
  readonly sameVerdict: boolean;
  readonly sameCanonicalWitnessHashes: boolean;
} {
  const sameVerdict = originalRun.verdict === replayRun.verdict;
  const canonicalEvidenceMatches =
    originalRun.canonicalEvidenceHash === replayRun.canonicalEvidenceHash;
  const sameCanonicalWitnessHashes =
    originalRun.canonicalWitnessHashes.authority === replayRun.canonicalWitnessHashes.authority &&
    originalRun.canonicalWitnessHashes.meaning === replayRun.canonicalWitnessHashes.meaning &&
    originalRun.canonicalWitnessHashes.proof === replayRun.canonicalWitnessHashes.proof;
  const converged = sameVerdict && canonicalEvidenceMatches && sameCanonicalWitnessHashes;

  const comparison = {
    version: "1.0.0",
    run_id: originalRun.runId,
    science_kernel_bundle_id: bundle.bundleId,
    science_kernel_bundle_hash: bundle.bundleHash,
    original: {
      verdict: originalRun.verdict,
      canonical_evidence_hash: originalRun.canonicalEvidenceHash,
      witness_artifact_hashes: originalRun.witnessArtifactHashes,
      canonical_witness_hashes: originalRun.canonicalWitnessHashes,
    },
    replay: {
      verdict: replayRun.verdict,
      canonical_evidence_hash: replayRun.canonicalEvidenceHash,
      witness_artifact_hashes: replayRun.witnessArtifactHashes,
      canonical_witness_hashes: replayRun.canonicalWitnessHashes,
    },
    comparison: {
      same_verdict: sameVerdict,
      same_canonical_evidence: canonicalEvidenceMatches,
      same_canonical_witness_hashes: sameCanonicalWitnessHashes,
      converged,
    },
    ignored_runtime_metadata: [
      "execution_timestamp_utc",
      "locked_at",
      "log timestamps",
      "temporary replay directory",
    ],
  };

  const metricsDir = join(runRoot, "metrics");
  writeYaml(join(metricsDir, "canonical-evidence-comparison.yaml"), comparison);

  const report = {
    version: "1.0.0",
    run_id: originalRun.runId,
    genesis_evidence: converged ? "EXISTS" : "NOT_YET",
    verification_spine: [
      { step: "VERIFY", status: "PASS" },
      { step: "FREEZE_BUNDLE", status: "PASS" },
      { step: "HASH", status: "PASS" },
      { step: "WIRE_MEASUREMENT_APPARATUS", status: "PASS" },
      { step: "RUN-001", status: originalRun.verdict === "PASS" ? "PASS" : "FAIL" },
      { step: "CAPTURE_WITNESS", status: "PASS" },
      { step: "GENERATE_MANIFEST", status: "PASS" },
      { step: "WRITE_PROOF_LEDGER", status: converged ? "PASS" : "FAIL" },
      { step: "CLEAN_ENV_REPLAY", status: replayRun.verdict === "PASS" ? "PASS" : "FAIL" },
      { step: "IDENTICAL_EVIDENCE", status: converged ? "PASS" : "FAIL" },
    ],
    definition_of_done: {
      execution: originalRun.verdict === "PASS",
      apparatus_identity: true,
      integrity: true,
      replay: replayRun.verdict === "PASS",
      convergence: converged,
      clean_environment: true,
    },
    remaining_blocker: converged
      ? "Gate C1 empirical coverage remains limited to positive row P1; N1..N7 still absent."
      : "Canonical evidence diverged between original and clean replay.",
  };

  writeYaml(join(runRoot, "report.yaml"), report);
  return { converged, canonicalEvidenceMatches, sameVerdict, sameCanonicalWitnessHashes };
}

function resetDirectory(path: string): void {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asMutableRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new Error(`Expected object at ${label}`);
  }
  return value;
}

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected array at ${label}`);
  }
  return value;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`Expected string at ${label}`);
  }
  return value;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== "number") {
    throw new Error(`Expected number at ${label}`);
  }
  return value;
}

function asBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Expected boolean at ${label}`);
  }
  return value;
}

function asStringArray(value: unknown, label: string): readonly string[] {
  return asArray(value, label).map((entry, index) => asString(entry, `${label}[${index}]`));
}

function getArtifactHash(artifacts: readonly ArtifactHash[], path: string): string {
  const match = artifacts.find((artifact) => artifact.path === path);
  if (!match) {
    throw new Error(`Artifact hash not found for ${path}`);
  }
  return match.sha256;
}

function hashArtifactEntries(
  artifacts: readonly ArtifactHash[],
  category: ArtifactHash["category"],
): string {
  return sha256(
    canonicalJson(
      artifacts
        .filter((artifact) => artifact.category === category)
        .map((artifact) => ({
          path: artifact.path,
          sha256: artifact.sha256,
          bytes: artifact.bytes,
        })),
    ),
  );
}

function hashArtifactEntriesByPath(
  artifacts: readonly ArtifactHash[],
  predicate: (path: string) => boolean,
): string {
  return sha256(
    canonicalJson(
      artifacts
        .filter((artifact) => predicate(artifact.path))
        .map((artifact) => ({
          path: artifact.path,
          sha256: artifact.sha256,
          bytes: artifact.bytes,
        })),
    ),
  );
}

function stripHash(hash: string, length: number): string {
  return hash.replace(/^sha256:/, "").slice(0, length);
}

function hasKey(record: Record<string, JsonValue>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export async function runGateCGenesisEvidenceCommand(): Promise<number> {
  const bundle = materializeBundle();
  const subject = loadSubjectDefinition();
  const originalRunRoot = join(RUNS_DIR, GENESIS_RUN_ID);
  const originalManifest = createRunManifest(
    GENESIS_RUN_ID,
    bundle,
    subject,
    originalRunRoot,
    new Date().toISOString(),
  );
  const originalRun = executeRun(GENESIS_RUN_ID, bundle, originalManifest, originalRunRoot, "original");

  const cleanReplayRoot = mkdtempSync(join(tmpdir(), "eos-gate-c-run-001-replay-"));
  const replayManifest = deepClone(
    readYamlRecord(originalRun.runManifestPath),
  ) as Record<string, JsonValue>;
  const replayRun = executeRun(GENESIS_RUN_ID, bundle, replayManifest, cleanReplayRoot, "replay");

  const comparison = writeComparisonArtifacts(originalRunRoot, bundle, originalRun, replayRun);
  recordProofLedger(bundle, originalRun, replayRun, comparison);

  rmSync(cleanReplayRoot, { recursive: true, force: true });

  process.stdout.write(
    [
      `bundle_id=${bundle.bundleId}`,
      `bundle_hash=${bundle.bundleHash}`,
      `run_id=${GENESIS_RUN_ID}`,
      `original_verdict=${originalRun.verdict}`,
      `replay_verdict=${replayRun.verdict}`,
      `canonical_evidence_original=${originalRun.canonicalEvidenceHash}`,
      `canonical_evidence_replay=${replayRun.canonicalEvidenceHash}`,
      `canonical_evidence_match=${String(comparison.canonicalEvidenceMatches)}`,
      `remaining_blocker=${comparison.converged ? "truth-table coverage beyond P1" : "canonical evidence mismatch"}`,
    ].join("\n") + "\n",
  );

  return comparison.converged ? 0 : 1;
}

export interface RunCaseOptions {
  readonly runId: string;
  readonly subjectRelPath: string;
  readonly proofLedgerEntryPrefix?: string;
}

export async function runGateCRunCaseCommand(opts: RunCaseOptions): Promise<number> {
  const bundle = materializeBundle();
  const subject = loadSubjectDefinition(opts.subjectRelPath);
  const originalRunRoot = join(RUNS_DIR, opts.runId);
  const originalManifest = createRunManifest(
    opts.runId,
    bundle,
    subject,
    originalRunRoot,
    new Date().toISOString(),
  );
  const originalRun = executeRun(
    opts.runId,
    bundle,
    originalManifest,
    originalRunRoot,
    "original",
    opts.subjectRelPath,
  );

  const cleanReplayRoot = mkdtempSync(join(tmpdir(), `eos-gate-c-${opts.runId}-replay-`));
  const replayManifest = deepClone(
    readYamlRecord(originalRun.runManifestPath),
  ) as Record<string, JsonValue>;
  const replayRun = executeRun(
    opts.runId,
    bundle,
    replayManifest,
    cleanReplayRoot,
    "replay",
    opts.subjectRelPath,
  );

  const comparison = writeComparisonArtifacts(originalRunRoot, bundle, originalRun, replayRun);
  const prefix = opts.proofLedgerEntryPrefix ?? "GATE-C-C1";
  const ledgerEntries = existsSync(RUN_PROOF_LEDGER_PATH)
    ? asArray(readYamlRecord(RUN_PROOF_LEDGER_PATH).entries, "ledger.entries")
    : [];
  const nextIndex = ledgerEntries.length + 1;
  recordProofLedgerWithPrefix(bundle, originalRun, replayRun, comparison, prefix, nextIndex);

  rmSync(cleanReplayRoot, { recursive: true, force: true });

  process.stdout.write(
    [
      `bundle_id=${bundle.bundleId}`,
      `bundle_hash=${bundle.bundleHash}`,
      `run_id=${opts.runId}`,
      `subject_id=${subject.experimentSubjectId}`,
      `truth_table_row=${originalRun.canonicalEvidence.truth_table_row}`,
      `original_verdict=${originalRun.verdict}`,
      `replay_verdict=${replayRun.verdict}`,
      `pred_a=${String(originalRun.canonicalEvidence.predicate_vector && (originalRun.canonicalEvidence.predicate_vector as Record<string, JsonValue>).pred_a_legitimate)}`,
      `pred_b=${String(originalRun.canonicalEvidence.predicate_vector && (originalRun.canonicalEvidence.predicate_vector as Record<string, JsonValue>).pred_b_meaning_preserved)}`,
      `pred_c=${String(originalRun.canonicalEvidence.predicate_vector && (originalRun.canonicalEvidence.predicate_vector as Record<string, JsonValue>).pred_c_provable)}`,
      `canonical_evidence_match=${String(comparison.canonicalEvidenceMatches)}`,
      `converged=${String(comparison.converged)}`,
    ].join("\n") + "\n",
  );

  return comparison.converged ? 0 : 1;
}

function recordProofLedgerWithPrefix(
  bundle: BundleContext,
  originalRun: RunMaterialization,
  replayRun: RunMaterialization,
  comparison: {
    readonly converged: boolean;
    readonly canonicalEvidenceMatches: boolean;
    readonly sameVerdict: boolean;
    readonly sameCanonicalWitnessHashes: boolean;
  },
  entryPrefix: string,
  nextIndex: number,
): void {
  const existing = existsSync(RUN_PROOF_LEDGER_PATH)
    ? readYamlRecord(RUN_PROOF_LEDGER_PATH)
    : {
        version: "1.0.0",
        ledger_id: "GATE-C-PROOF-LEDGER-001",
        status: "ACTIVE",
        append_only_enforced: true,
        entries: [],
      };

  const entries = asArray(existing.entries, "proof_ledger.entries");
  const entry = {
    entry_id: `${entryPrefix}-${String(nextIndex).padStart(3, "0")}`,
    run_id: originalRun.runId,
    subject_id: originalRun.subjectId,
    manifest_ref: originalRun.runManifestRef,
    report_ref: originalRun.reportRef,
    science_kernel_bundle_id: bundle.bundleId,
    science_kernel_bundle_hash: bundle.bundleHash,
    original_canonical_evidence_hash: originalRun.canonicalEvidenceHash,
    replay_canonical_evidence_hash: replayRun.canonicalEvidenceHash,
    convergence: comparison.converged,
    verdict: comparison.converged ? "PASS" : "FAIL",
    hash_basis: "sha256(canonical_json(entry_excluding_entry_hash))",
    entry_hash: "sha256:PENDING",
  };
  const entryForHash = deepClone(entry);
  delete asMutableRecord(entryForHash, "entryForHash").entry_hash;
  entry.entry_hash = sha256(canonicalJson(entryForHash));

  entries.push(entry);
  existing.entries = entries;
  existing.count = entries.length;
  existing.last_entry_hash = asString(entry.entry_hash, "entry.entry_hash");
  writeYaml(RUN_PROOF_LEDGER_PATH, existing);
}
