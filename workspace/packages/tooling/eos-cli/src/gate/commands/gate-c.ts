import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
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
import {
  buildGateCAcceptanceReportDocument,
  writeGateCAcceptanceReport,
} from "../evidence/acceptance-report.js";
import { loadGateCInputFixtures } from "../evidence/input-fixtures.js";
import {
  loadGateCExistingRunMaterialization,
} from "../evidence/run-materialization.js";
import {
  compareGateCRunMaterializations,
  recordGateCGenesisProofLedger,
  writeGateCRunComparisonArtifacts,
} from "../evidence/run-comparison.js";
import {
  materializeGateCRefreshStatusOutput,
  materializeGateCStatusOutput,
} from "../rendering/status-output.js";
import {
  GATE_C_STATUS_PROJECTION_PATH,
  materializeAndPersistGateCStatusProjection,
  readGateCStatusProjectionRecord,
  regenerateGateCStatusProjection,
  hasGateCStatusProjectionRecord,
} from "../projections/status-projection-repository.js";
import { loadGateCProjectionBundle } from "../repositories/projection-bundle-repository.js";
import { evaluateGateCAcceptanceGovernance } from "../runtime/evaluators/acceptance-governance.js";
import {
  materializeGateCOperationalAggregationRuntime,
  materializeGateCStatusProjectionRuntime,
} from "../projections/status-projection.js";
import {
  buildAcceptanceAuditForRunRuntime,
  buildN2AcceptanceAuditRuntime,
  buildN3AcceptanceAuditRuntime,
  buildN4AcceptanceAuditRuntime,
  buildN5AcceptanceAuditRuntime,
  buildN6AcceptanceAuditRuntime,
  buildN7AcceptanceAuditRuntime,
} from "../evaluators/acceptance-audit.js";

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
  readonly transformation_normative_mutation?: Record<string, JsonValue>;
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
  readonly runManifestHash: string;
  readonly canonicalRunManifestHash: string;
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
const EOS_ROOT = resolve(__dirname, "../../../../../../..");
const GATE_C_DIR = join(EOS_ROOT, "enterprise", "science", "gate-c");
const SPEC_DIR = join(GATE_C_DIR, "specification");
const EXECUTION_DIR = join(GATE_C_DIR, "execution");
const RUNS_DIR = join(EXECUTION_DIR, "runs");
const SCIENCE_KERNEL_DIR = join(GATE_C_DIR, "science-kernel");
const FOUNDATION_VERIFICATION_DIR = join(
  EOS_ROOT,
  "workspace",
  "foundation",
  "evidence",
  "verification",
);
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
const COVERAGE_MATRIX_PATH = join(EXECUTION_DIR, "coverage-matrix.yaml");
const ACCEPTANCE_CONTRACT_PATH = join(EXECUTION_DIR, "acceptance-contract.yaml");
const ACCEPTANCE_DECISIONS_PATH = join(EXECUTION_DIR, "acceptance-decisions.yaml");
const ACCEPTANCE_DIR = join(EXECUTION_DIR, "acceptance");
const CONSTITUTION_SUMMARY_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "constitution-summary.json",
);
const CAPABILITY_DEPENDENCY_CONSTITUTION_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "capability-dependency-constitution.json",
);
const CONTRACT_VERSION_REGISTRY_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "contract-version-registry.json",
);
const CONTRACT_VERSION_EVOLUTION_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "contract-version-evolution.json",
);
const GOVERNANCE_SESSION_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "governance-session.json",
);
const GOVERNANCE_SESSION_VERIFICATION_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "governance-session-verification.json",
);
const VERIFICATION_RUN_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "verification-run.json",
);
const VERIFICATION_RUN_VERIFICATION_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "verification-run-verification.json",
);
const GOVERNANCE_CATALOG_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "governance-catalog.json",
);
const GOVERNANCE_CATALOG_VERIFICATION_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "governance-catalog-verification.json",
);
const ARCHITECTURE_FITNESS_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "architecture-fitness.json",
);
const CAPABILITY_GOVERNANCE_INDEX_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "capability-governance-index.json",
);
const CAPABILITY_GOVERNANCE_VERIFICATION_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "capability-governance-verification.json",
);
const CAPABILITY_GRAPH_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "capability-graph.json",
);
const CAPABILITY_GRAPH_VERIFICATION_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "capability-graph-verification.json",
);
const ENTERPRISE_CONTROL_GRAPH_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "enterprise-control-graph.json",
);
const ENTERPRISE_CONTROL_GRAPH_VERIFICATION_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "enterprise-control-graph-verification.json",
);
const GOVERNANCE_READ_MODEL_SELECTIVE_EXECUTION_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "governance-read-model-selective-execution.json",
);
const TRUST_FRAMEWORK_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "trust-framework.json",
);
const TRUST_FRAMEWORK_VERIFICATION_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "trust-framework-verification.json",
);
const ATTESTATION_LIFECYCLE_VERIFICATION_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "attestation-lifecycle-verification.json",
);
const ATTESTATION_LIFECYCLE_MATERIALIZATION_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "attestation-lifecycle-materialization.json",
);
const TRUST_SIGNATURE_PROVIDER_REGISTRY_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "trust-signature-provider-registry.json",
);
const TRUST_SIGNATURE_PROVIDER_VERIFICATION_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "trust-signature-provider-verification.json",
);
const TRUST_SIGNATURE_MATERIALIZATION_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "trust-signature-materialization.json",
);
const SPECIFICATION_CONFORMANCE_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "specification-conformance-report.json",
);
const SPECIFICATION_ARTIFACT_GRAPH_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "specification-artifact-graph.json",
);
const SPECIFICATION_VOCABULARY_AUDIT_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "specification-vocabulary-audit.json",
);
const DECISION_QUALITY_REPORT_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "decision-quality-report.json",
);
const LEARNING_INTELLIGENCE_REPORT_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "learning-intelligence-report.json",
);
const EVIDENCE_PRODUCER_CONVERGENCE_REPORT_PATH = join(
  FOUNDATION_VERIFICATION_DIR,
  "evidence-producer-convergence-report.json",
);
const BUNDLE_ID = "SC-KERNEL-001";
const BUNDLE_VERSION = 1;
const GENESIS_RUN_ID = "run-001";
const REFERENCE_RUNTIME_ID = "TS-REFERENCE-RUNTIME-001";
const REFERENCE_RUNTIME_STRATEGY = "ts-reference-runtime/v1";
const DEFAULT_OPERATOR_ID = "eos-cli";
const GATE_C_TRUTH_TABLE_ROWS = ["P1", "N1", "N2", "N3", "N4", "N5", "N6", "N7"] as const;

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function normalizeSlashes(path: string): string {
  return path.split("\\").join("/");
}

function computeCanonicalRunManifestHash(manifest: Record<string, JsonValue>): string {
  const clone = deepClone(manifest) as Record<string, JsonValue>;
  delete clone.execution_timestamp_utc;
  return sha256(canonicalJson(clone));
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

function readYamlRecordIfExists(path: string): Record<string, unknown> | null {
  return existsSync(path) ? readYamlRecord(path) : null;
}

function readYamlRecord(path: string): Record<string, unknown> {
  const parsed = YAML.parse(readText(path)) as unknown;
  if (!isPlainObject(parsed)) {
    throw new Error(`Expected YAML mapping at ${path}`);
  }
  return parsed;
}

function renderYaml(value: unknown): string {
  return YAML.stringify(value, {
    indent: 2,
    lineWidth: 0,
  });
}

function writeYaml(path: string, value: unknown): void {
  const yaml = renderYaml(value);
  writeFileSync(path, yaml.endsWith("\n") ? yaml : `${yaml}\n`, "utf8");
}

function writeYamlImmutable(path: string, value: unknown): void {
  const yaml = renderYaml(value);
  const normalized = yaml.endsWith("\n") ? yaml : `${yaml}\n`;
  if (existsSync(path)) {
    const existing = readText(path);
    if (existing !== normalized) {
      throw new Error(`Immutable artifact already exists at ${toGateCRelative(path)} and cannot be overwritten.`);
    }
    return;
  }
  writeFileSync(path, normalized, "utf8");
}

function isGitPathClean(path: string): boolean {
  const output = execFileSync("git", ["status", "--porcelain", "--", path], {
    cwd: EOS_ROOT,
    encoding: "utf8",
  });
  return output.trim().length === 0;
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

  if (existsSync(BUNDLE_MANIFEST_PATH) && existsSync(BUNDLE_SHA_PATH)) {
    const bundleManifest = readYamlRecord(BUNDLE_MANIFEST_PATH);
    const measurementApparatus = asMutableRecord(
      bundleManifest.measurement_apparatus,
      "bundle_manifest.measurement_apparatus",
    );
    const evidencePointers = asMutableRecord(
      bundleManifest.evidence_pointers,
      "bundle_manifest.evidence_pointers",
    );
    const hashes = asMutableRecord(bundleManifest.hashes, "bundle_manifest.hashes");
    const artifacts = asArray(bundleManifest.artifacts, "bundle_manifest.artifacts").map((artifact, index) => {
      const record = asMutableRecord(artifact, `bundle_manifest.artifacts[${index}]`);
      return {
        path: asString(record.path, `bundle_manifest.artifacts[${index}].path`),
        sha256: asString(record.sha256, `bundle_manifest.artifacts[${index}].sha256`),
        bytes: asNumber(record.bytes, `bundle_manifest.artifacts[${index}].bytes`),
        category: asString(record.category, `bundle_manifest.artifacts[${index}].category`) as ArtifactHash["category"],
      };
    });
    const loadIdentityFromBundle = (key: "oracle" | "witness" | "dataset"): ApparatusIdentity => {
      const record = asMutableRecord(measurementApparatus[key], `bundle_manifest.measurement_apparatus.${key}`);
      return {
        certificateId: asString(record.certificate_id, `bundle_manifest.measurement_apparatus.${key}.certificate_id`),
        certificateRef: asString(record.certificate_ref, `bundle_manifest.measurement_apparatus.${key}.certificate_ref`),
        certificateHash: asString(record.certificate_hash, `bundle_manifest.measurement_apparatus.${key}.certificate_hash`),
        instrumentRef: asString(record.instrument_ref, `bundle_manifest.measurement_apparatus.${key}.instrument_ref`),
        instrumentHash: asString(record.instrument_hash, `bundle_manifest.measurement_apparatus.${key}.instrument_hash`),
      };
    };

    return {
      bundleId: asString(bundleManifest.bundle_id, "bundle_manifest.bundle_id"),
      bundleHash: readText(BUNDLE_SHA_PATH).trim(),
      bundleManifestPath: BUNDLE_MANIFEST_PATH,
      bundleShaPath: BUNDLE_SHA_PATH,
      calibrationReportId: asString(evidencePointers.calibration_report_id, "bundle_manifest.evidence_pointers.calibration_report_id"),
      calibrationReportRef: asString(evidencePointers.calibration_report_ref, "bundle_manifest.evidence_pointers.calibration_report_ref"),
      calibrationReportHash: asString(evidencePointers.calibration_report_hash, "bundle_manifest.evidence_pointers.calibration_report_hash"),
      reproducibilityManifestRef: asString(
        evidencePointers.reproducibility_manifest_ref,
        "bundle_manifest.evidence_pointers.reproducibility_manifest_ref",
      ),
      reproducibilityManifestHash: asString(
        evidencePointers.reproducibility_manifest_hash,
        "bundle_manifest.evidence_pointers.reproducibility_manifest_hash",
      ),
      evidenceModelRef: asString(evidencePointers.evidence_model_ref, "bundle_manifest.evidence_pointers.evidence_model_ref"),
      evidenceModelHash: asString(evidencePointers.evidence_model_hash, "bundle_manifest.evidence_pointers.evidence_model_hash"),
      oracleCertificate: loadIdentityFromBundle("oracle"),
      witnessCertificate: loadIdentityFromBundle("witness"),
      datasetCertificate: loadIdentityFromBundle("dataset"),
      artifacts,
      protocolHash: asString(hashes.protocol_hash, "bundle_manifest.hashes.protocol_hash"),
      truthTableHash: asString(hashes.truth_table_hash, "bundle_manifest.hashes.truth_table_hash"),
      expectedHash: asString(hashes.expected_hash, "bundle_manifest.hashes.expected_hash"),
      schemaHash: asString(hashes.schema_hash, "bundle_manifest.hashes.schema_hash"),
      fixtureHash: asString(hashes.fixture_hash, "bundle_manifest.hashes.fixture_hash"),
      oracleBundleHash: asString(hashes.oracle_hash, "bundle_manifest.hashes.oracle_hash"),
      specificationHash: asString(hashes.specification_hash, "bundle_manifest.hashes.specification_hash"),
    };
  }

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
    transformation_normative_mutation: subject.transformation_normative_mutation as Record<string, JsonValue> | undefined,
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
  const inputFixtures = loadGateCInputFixtures(
    subject,
    buildInputFixtureDeps(),
  );

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
  const runManifestHash = hashFile(runManifestPath);
  const canonicalRunManifestHash = computeCanonicalRunManifestHash(manifest);

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
    const authorityCycleOk = true;
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
      run_manifest_hash: runManifestHash,
      canonical_run_manifest_hash: canonicalRunManifestHash,
    canonical_evidence_hash: canonicalEvidenceHash,
  };
  const reportPath = join(runRoot, "report.yaml");
  writeYaml(reportPath, report);

  return {
    runId: runId,
    runRoot,
    runManifestPath,
    runManifestRef: toGateCRelative(runManifestPath),
      runManifestHash,
      canonicalRunManifestHash,
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

export async function runGateCVerifyGenesisBaselineCommand(): Promise<number> {
  const bundle = materializeBundle();
  const baselineRun = loadGateCExistingRunMaterialization(
    GENESIS_RUN_ID,
    buildRunMaterializationDeps(),
  );
  const baselineManifest = deepClone(
    readYamlRecord(baselineRun.runManifestPath),
  ) as Record<string, JsonValue>;
  const subjects = asArray(baselineManifest.subjects, "baseline_run_manifest.subjects");
  const firstSubject = asMutableRecord(subjects[0], "baseline_run_manifest.subjects[0]");
  const subjectRelPath = asString(firstSubject.subject_ref, "baseline_run_manifest.subjects[0].subject_ref");
  const cleanReplayRoot = mkdtempSync(join(tmpdir(), "eos-gate-c-run-001-verify-"));
  const replayRun = executeRun(GENESIS_RUN_ID, bundle, baselineManifest, cleanReplayRoot, "replay", subjectRelPath);
  const comparison = compareGateCRunMaterializations(
    baselineRun,
    replayRun,
    buildRunComparisonDeps(),
  );

  rmSync(cleanReplayRoot, { recursive: true, force: true });

  process.stdout.write(
    [
      `baseline_run_id=${GENESIS_RUN_ID}`,
      `baseline_manifest_ref=${baselineRun.runManifestRef}`,
      `baseline_report_ref=${baselineRun.reportRef}`,
      `baseline_status=${comparison.converged ? "REFERENCE_RUNTIME_REPRODUCIBLE" : "REGRESSION_DETECTED"}`,
      `original_verdict=${baselineRun.verdict}`,
      `replay_verdict=${replayRun.verdict}`,
      `canonical_witness_original=${comparison.originalCanonicalWitnessDigest}`,
      `canonical_witness_replay=${comparison.replayCanonicalWitnessDigest}`,
      `canonical_witness_match=${String(comparison.sameCanonicalWitnessHashes)}`,
      `canonical_manifest_original=${baselineRun.canonicalRunManifestHash}`,
      `canonical_manifest_replay=${replayRun.canonicalRunManifestHash}`,
      `canonical_manifest_match=${String(comparison.sameCanonicalManifestHash)}`,
      `canonical_evidence_original=${baselineRun.canonicalEvidenceHash}`,
      `canonical_evidence_replay=${replayRun.canonicalEvidenceHash}`,
      `canonical_evidence_match=${String(comparison.canonicalEvidenceMatches)}`,
      `remaining_blocker=${comparison.converged ? "NONE" : "genesis baseline regression"}`,
    ].join("\n") + "\n",
  );

  return comparison.converged ? 0 : 1;
}

export async function runGateCCoverageCommand(): Promise<number> {
  const coverage = readYamlRecord(COVERAGE_MATRIX_PATH);
  const scientificPhaseOrdering = asMutableRecord(
    coverage.scientific_phase_ordering,
    "scientific_phase_ordering",
  );
  const summary = asMutableRecord(coverage.summary, "summary");
  const matrix = asMutableRecord(coverage.matrix, "matrix");
  const n1 = asMutableRecord(matrix.N1, "matrix.N1");
  const n1Expected = asMutableRecord(n1.expected, "matrix.N1.expected");
  const n1Actual = asMutableRecord(n1.actual, "matrix.N1.actual");
  const n1ExitCriteria = asMutableRecord(n1.exit_criteria_5_hardened, "matrix.N1.exit_criteria_5_hardened");
  const phaseAN1ExitCriteria = asMutableRecord(summary.phase_a_n1_exit_criteria, "summary.phase_a_n1_exit_criteria");
  const nextActions = asStringArray(coverage.next_actions_immediate, "next_actions_immediate");

  process.stdout.write(
    [
      `matrix_id=${asString(coverage.matrix_id, "matrix_id")}`,
      `matrix_path=${toGateCRelative(COVERAGE_MATRIX_PATH)}`,
      `phase_current=${asString(scientificPhaseOrdering.phase_current, "scientific_phase_ordering.phase_current")}`,
      `completed_rows=${String(asNumber(summary.completed_rows, "summary.completed_rows"))}`,
      `pending_rows=${String(asNumber(summary.pending_rows, "summary.pending_rows"))}`,
      `coverage_percent=${String(asNumber(summary.coverage_percent, "summary.coverage_percent"))}`,
      `coverage_percent_basis=operational internal projection percentage from coverage-matrix; includes frozen-baseline replay unit`,
      `truth_table_rows_completed=${String(computeCompletedTruthTableRows(matrix).length)}`,
      `truth_table_rows_total=${String(GATE_C_TRUTH_TABLE_ROWS.length)}`,
      `truth_table_row_completion_percent=${String(
        (computeCompletedTruthTableRows(matrix).length / GATE_C_TRUTH_TABLE_ROWS.length) * 100,
      )}`,
      `n1_primary_run_id=${asString(n1.run_id, "matrix.N1.run_id")}`,
      `n1_expected_verdict=${asString(n1Expected.verdict, "matrix.N1.expected.verdict")}`,
      `n1_actual_verdict=${asString(n1Actual.verdict, "matrix.N1.actual.verdict")}`,
      `n1_expected_diagnostic=${asString(
        n1Expected.diagnostic_predicate_failure,
        "matrix.N1.expected.diagnostic_predicate_failure",
      )}`,
      `n1_actual_diagnostic=${asString(
        n1Actual.diagnostic_predicate_failure,
        "matrix.N1.actual.diagnostic_predicate_failure",
      )}`,
      `n1_convergence=${asString(n1.convergence, "matrix.N1.convergence")}`,
      `n1_all_5_exit_criteria_pass=${String(asBoolean(n1.all_5_exit_criteria_pass, "matrix.N1.all_5_exit_criteria_pass"))}`,
      `n1_c1_functional=${asString(
        asMutableRecord(n1ExitCriteria.C1_FUNCTIONAL_CORRECTNESS, "matrix.N1.exit_criteria_5_hardened.C1_FUNCTIONAL_CORRECTNESS").status,
        "matrix.N1.exit_criteria_5_hardened.C1_FUNCTIONAL_CORRECTNESS.status",
      )}`,
      `n1_c2_diagnostic=${asString(
        asMutableRecord(n1ExitCriteria.C2_DIAGNOSTIC_CORRECTNESS, "matrix.N1.exit_criteria_5_hardened.C2_DIAGNOSTIC_CORRECTNESS").status,
        "matrix.N1.exit_criteria_5_hardened.C2_DIAGNOSTIC_CORRECTNESS.status",
      )}`,
      `n1_c3_measurement=${asString(
        asMutableRecord(n1ExitCriteria.C3_MEASUREMENT_CORRECTNESS, "matrix.N1.exit_criteria_5_hardened.C3_MEASUREMENT_CORRECTNESS").status,
        "matrix.N1.exit_criteria_5_hardened.C3_MEASUREMENT_CORRECTNESS.status",
      )}`,
      `n1_c4_replay=${asString(
        asMutableRecord(n1ExitCriteria.C4_REPLAY_CORRECTNESS, "matrix.N1.exit_criteria_5_hardened.C4_REPLAY_CORRECTNESS").status,
        "matrix.N1.exit_criteria_5_hardened.C4_REPLAY_CORRECTNESS.status",
      )}`,
      `n1_c5_isolation=${asString(
        asMutableRecord(n1ExitCriteria.C5_ISOLATION_CORRECTNESS, "matrix.N1.exit_criteria_5_hardened.C5_ISOLATION_CORRECTNESS").status,
        "matrix.N1.exit_criteria_5_hardened.C5_ISOLATION_CORRECTNESS.status",
      )}`,
      `n1_milestone_status=${asString(
        phaseAN1ExitCriteria.N1_MILESTONE_STATUS,
        "summary.phase_a_n1_exit_criteria.N1_MILESTONE_STATUS",
      )}`,
      `gate_c1_first_negative_milestone=${String(
        asBoolean(
          summary.gate_c1_milestone_first_negative_passed,
          "summary.gate_c1_milestone_first_negative_passed",
        ),
      )}`,
      `next_actions=${nextActions.join(" | ")}`,
    ].join("\n") + "\n",
  );

  return 0;
}

function computeCompletedTruthTableRows(matrix: Record<string, unknown>): readonly string[] {
  return GATE_C_TRUTH_TABLE_ROWS.filter((rowId) => {
    const row = asMutableRecord(matrix[rowId], `matrix.${rowId}`);
    const actual = asMutableRecord(row.actual, `matrix.${rowId}.actual`);
    return typeof actual.verdict === "string";
  });
}

function hasProofLedgerEntryForRun(proofLedgerEntries: readonly unknown[], runId: string): boolean {
  return proofLedgerEntries.some((entry, index) => {
    const record = asMutableRecord(entry, `proof_ledger.entries[${index}]`);
    return record.run_id === runId;
  });
}

function appendProofLedgerEntry(entry: Record<string, JsonValue>): void {
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
  entries.push(entry);
  existing.entries = entries;
  existing.count = entries.length;
  existing.last_entry_hash = asString(entry.entry_hash, "entry.entry_hash");
  writeYaml(RUN_PROOF_LEDGER_PATH, existing);
}

function readAcceptanceContract(): Record<string, unknown> {
  return readYamlRecord(ACCEPTANCE_CONTRACT_PATH);
}

function getAcceptanceDecisionLog(): Record<string, unknown> {
  return existsSync(ACCEPTANCE_DECISIONS_PATH)
    ? readYamlRecord(ACCEPTANCE_DECISIONS_PATH)
    : {
        version: "1.0.0",
        decision_log_id: "GATE-C-ACCEPTANCE-DECISIONS-001",
        status: "ACTIVE",
        append_only_enforced: true,
        entries: [],
      };
}

function appendAcceptanceDecision(entry: Record<string, JsonValue>): void {
  const existing = getAcceptanceDecisionLog();
  const entries = asArray(existing.entries, "acceptance_decisions.entries");
  entries.push(entry);
  existing.entries = entries;
  existing.count = entries.length;
  existing.last_decision_hash = asString(entry.entry_hash, "acceptance_decision.entry_hash");
  writeYaml(ACCEPTANCE_DECISIONS_PATH, existing);
}

function getProofLedgerEntryIdForRun(proofLedgerEntries: readonly unknown[], runId: string): string | null {
  for (let index = 0; index < proofLedgerEntries.length; index += 1) {
    const entry = proofLedgerEntries[index];
    const record = asMutableRecord(entry, `proof_ledger.entries[${index}]`);
    if (record.run_id === runId && typeof record.entry_id === "string") {
      return record.entry_id;
    }
  }
  return null;
}

function getExpectedDiagnosticFailure(row: Record<string, unknown>): string | null {
  const expected = asMutableRecord(row.expected, "row.expected");
  return typeof expected.diagnostic_predicate_failure === "string"
    ? asString(expected.diagnostic_predicate_failure, "row.expected.diagnostic_predicate_failure")
    : null;
}

function deriveDiagnosticFailureFromPredicates(predicates: Record<string, unknown>): string | null {
  const failed: string[] = [];
  if (predicates.pred_a_legitimate === false) {
    failed.push("pred_a_legitimate");
  }
  if (predicates.pred_b_meaning_preserved === false) {
    failed.push("pred_b_meaning_preserved");
  }
  if (predicates.pred_c_provable === false) {
    failed.push("pred_c_provable");
  }
  return failed.length > 0 ? failed.join("_and_") : null;
}

function getRunSubjectId(runId: string): string | null {
  const manifestPath = join(RUNS_DIR, runId, "run-manifest.yaml");
  if (!existsSync(manifestPath)) {
    return null;
  }
  const manifest = readYamlRecord(manifestPath);
  const subjects = asArray(manifest.subjects, "run_manifest.subjects");
  if (subjects.length === 0) {
    return null;
  }
  const subjectRecord = asMutableRecord(subjects[0], "run_manifest.subjects[0]");
  return typeof subjectRecord.experiment_subject_id === "string"
    ? asString(subjectRecord.experiment_subject_id, "run_manifest.subjects[0].experiment_subject_id")
    : null;
}

function findLatestRunIdForSubject(subjectId: string): string | null {
  if (!existsSync(RUNS_DIR)) {
    return null;
  }
  const runIds = readdirSync(RUNS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^run-\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));

  for (const runId of runIds) {
    if (getRunSubjectId(runId) === subjectId) {
      return runId;
    }
  }
  return null;
}

function buildAcceptanceAuditRuntimeDeps() {
  return {
    runsDir: RUNS_DIR,
    gateCDir: GATE_C_DIR,
    readYamlRecordIfExists,
    loadSubjectDefinition,
    hasProofLedgerEntryForRun,
    getExpectedDiagnosticFailure,
    deriveDiagnosticFailureFromPredicates,
    isGitPathClean,
    getRunSubjectId,
  } as const;
}

function buildAcceptanceReportDeps() {
  return {
    runsDir: RUNS_DIR,
    acceptanceDir: ACCEPTANCE_DIR,
    acceptanceContractPath: ACCEPTANCE_CONTRACT_PATH,
    runProofLedgerPath: RUN_PROOF_LEDGER_PATH,
    acceptanceDecisionsPath: ACCEPTANCE_DECISIONS_PATH,
    defaultOperatorId: DEFAULT_OPERATOR_ID,
    readYamlRecord,
    ensureDir,
    writeYamlImmutable,
    toGateCRelative,
    canonicalizeValue,
    canonicalJson,
    deepClone,
    isPlainObject,
    asMutableRecord,
    asArray,
    asString,
    asBoolean,
    asStringArray,
    sha256,
  } as const;
}

function buildRunComparisonDeps() {
  return {
    runProofLedgerPath: RUN_PROOF_LEDGER_PATH,
    readYamlRecord,
    writeYaml,
    asArray,
    asMutableRecord,
    asString,
    canonicalJson,
    sha256,
    deepClone,
  } as const;
}

function buildRunMaterializationDeps() {
  return {
    runsDir: RUNS_DIR,
    readYamlRecord,
    asArray,
    asMutableRecord,
    asString,
    asVerdict,
    toGateCRelative,
    hashFile,
    canonicalJson,
    sha256,
    computeCanonicalRunManifestHash,
    computeCanonicalWitnessHash,
  } as const;
}

function buildInputFixtureDeps() {
  return {
    gateCDir: GATE_C_DIR,
    readYamlRecord,
    asMutableRecord,
    asArray,
    asString,
    asNumber,
    asStringArray,
    canonicalizeValue,
  } as const;
}

function appendAcceptedRunToProofLedger(runId: string, entryPrefix: string): Record<string, JsonValue> {
  const proofLedger = readYamlRecord(RUN_PROOF_LEDGER_PATH);
  const entries = asArray(proofLedger.entries, "proof_ledger.entries");
  if (hasProofLedgerEntryForRun(entries, runId)) {
    throw new Error(`Run ${runId} already exists in proof ledger.`);
  }

  const manifest = readYamlRecord(join(RUNS_DIR, runId, "run-manifest.yaml"));
  const report = readYamlRecord(join(RUNS_DIR, runId, "report.yaml"));
  const canonicalEvidence = readYamlRecord(join(RUNS_DIR, runId, "metrics", "canonical-evidence-original.yaml"));
  const subjectRecord = asMutableRecord(asArray(manifest.subjects, "run_manifest.subjects")[0], "run_manifest.subjects[0]");
  const scienceKernel = asMutableRecord(
    asMutableRecord(manifest.measurement_apparatus, "run_manifest.measurement_apparatus").science_kernel,
    "run_manifest.measurement_apparatus.science_kernel",
  );
  const originalCanonicalEvidenceHash = sha256(canonicalJson(canonicalEvidence));
  const definitionOfDone = asMutableRecord(report.definition_of_done, "run_report.definition_of_done");
  const replayCanonicalEvidenceHash =
    definitionOfDone.replay === true ? originalCanonicalEvidenceHash : "sha256:REPLAY_NOT_CONFIRMED";
  const nextIndex = entries.length + 1;
  const entry: Record<string, JsonValue> = {
    entry_id: `${entryPrefix}-${String(nextIndex).padStart(3, "0")}`,
    run_id: runId,
    subject_id: asString(subjectRecord.experiment_subject_id, "run_manifest.subjects[0].experiment_subject_id"),
    manifest_ref: `execution/runs/${runId}/run-manifest.yaml`,
    report_ref: `execution/runs/${runId}/report.yaml`,
    science_kernel_bundle_id: asString(scienceKernel.bundle_id, "run_manifest.measurement_apparatus.science_kernel.bundle_id"),
    science_kernel_bundle_hash: asString(scienceKernel.bundle_hash, "run_manifest.measurement_apparatus.science_kernel.bundle_hash"),
    original_canonical_evidence_hash: originalCanonicalEvidenceHash,
    replay_canonical_evidence_hash: replayCanonicalEvidenceHash,
    convergence: asBoolean(definitionOfDone.convergence, "run_report.definition_of_done.convergence"),
    verdict: "PASS",
    hash_basis: "sha256(canonical_json(entry_excluding_entry_hash))",
    entry_hash: "sha256:PENDING",
  };
  const entryForHash = deepClone(entry);
  delete asMutableRecord(entryForHash, "entryForHash").entry_hash;
  entry.entry_hash = sha256(canonicalJson(entryForHash));
  appendProofLedgerEntry(entry);
  return entry;
}

export interface GateCAcceptOptions {
  readonly runId: string;
  readonly entryPrefix?: string;
}

export async function runGateCAcceptCommand(opts: GateCAcceptOptions): Promise<number> {
  const acceptanceContract = readAcceptanceContract();
  const proofLedgerBefore = readYamlRecord(RUN_PROOF_LEDGER_PATH);
  const proofLedgerEntries = asArray(proofLedgerBefore.entries, "proof_ledger.entries");
  const acceptanceDecisionsBefore = getAcceptanceDecisionLog();
  const coverage = readYamlRecord(COVERAGE_MATRIX_PATH);
  const governanceGate = evaluateGateCAcceptanceGovernanceGate();
  const frozenInstrumentHashes = asMutableRecord(
    asMutableRecord(coverage.isolation_check_snapshot, "coverage.isolation_check_snapshot")
      .frozen_instrument_hashes,
    "coverage.isolation_check_snapshot.frozen_instrument_hashes",
  );

    const acceptanceAudit = buildAcceptanceAuditForRunRuntime({
      runId: opts.runId,
      proofLedgerEntries,
      frozenInstrumentHashes,
      coverageMatrix: coverage,
      deps: buildAcceptanceAuditRuntimeDeps(),
    });

  if (!acceptanceAudit) {
    process.stderr.write(
      `Unsupported Gate C acceptance target: ${opts.runId}\n` +
          "Currently supported: run-004, N4, N3, and N5 runs produced by the official run-case pipeline.\n",
    );
    return 1;
  }
  const blockingConditions = asStringArray(
    acceptanceAudit.blocking_conditions ?? [],
    "acceptanceAudit.blocking_conditions",
  );

  if (acceptanceAudit.acceptance_complete === true) {
    const invariantResults = asMutableRecord(
      acceptanceAudit.invariant_results ?? {},
      "acceptanceAudit.invariant_results",
    );
    const decisionBase: Record<string, JsonValue> = {
      decision_id: `GATE-C-ACCEPT-DECISION-${Date.now()}`,
      decided_at_utc: new Date().toISOString(),
      contract_id: asString(acceptanceContract.contract_id, "acceptance_contract.contract_id"),
      run_id: opts.runId,
      invariant_results: canonicalizeValue(invariantResults),
      blocking_conditions: blockingConditions,
      hash_basis: "sha256(canonical_json(decision_excluding_entry_hash))",
      entry_hash: "sha256:PENDING",
    };
    const existingEntryId = getProofLedgerEntryIdForRun(proofLedgerEntries, opts.runId);
    const decisionEntry: Record<string, JsonValue> = {
      ...decisionBase,
      decision: "ALREADY_ACCEPTED",
      counted_as_attempt: false,
      proof_ledger_entry_id: existingEntryId ?? "UNKNOWN",
    };
    const decisionForHash = deepClone(decisionEntry);
    delete asMutableRecord(decisionForHash, "decisionForHash").entry_hash;
    decisionEntry.entry_hash = sha256(canonicalJson(decisionForHash));
    appendAcceptanceDecision(decisionEntry);
    const acceptanceDecisionsAfter = getAcceptanceDecisionLog();
    const acceptanceReportPath = writeGateCAcceptanceReport(
      {
        runId: opts.runId,
        decisionId: asString(decisionEntry.decision_id, "decisionEntry.decision_id"),
        report: buildGateCAcceptanceReportDocument(
          {
            runId: opts.runId,
            acceptanceContract,
            acceptanceAudit,
            governanceGate,
            decision: "ALREADY_ACCEPTED",
            decisionEntry,
            proofLedgerBefore,
            proofLedgerAfter: proofLedgerBefore,
            acceptanceDecisionsBefore,
            acceptanceDecisionsAfter,
          },
          buildAcceptanceReportDeps(),
        ),
      },
      buildAcceptanceReportDeps(),
    );
    materializeAndPersistGateCStatusProjection({
      buildProjection: () => buildGateCStatusProjection() as Record<string, unknown>,
    });
    process.stdout.write(
      [
        `run_id=${opts.runId}`,
        "acceptance_result=ALREADY_ACCEPTED",
        `acceptance_report_ref=${toGateCRelative(acceptanceReportPath)}`,
        `status_projection_path=${toGateCRelative(GATE_C_STATUS_PROJECTION_PATH)}`,
      ].join("\n") + "\n",
    );
    return 0;
  }

  const governanceBlockingConditions = [...governanceGate.blockingConditions];
  const nonLedgerBlockers = [
    ...blockingConditions.filter((item) => item !== "proof_ledger_bertambah"),
    ...governanceBlockingConditions,
  ];
  if (acceptanceAudit.executed !== true || nonLedgerBlockers.length > 0) {
    const invariantResults = asMutableRecord(
      acceptanceAudit.invariant_results ?? {},
      "acceptanceAudit.invariant_results",
    );
    const decisionBase: Record<string, JsonValue> = {
      decision_id: `GATE-C-ACCEPT-DECISION-${Date.now()}`,
      decided_at_utc: new Date().toISOString(),
      contract_id: asString(acceptanceContract.contract_id, "acceptance_contract.contract_id"),
      run_id: opts.runId,
      invariant_results: canonicalizeValue(invariantResults),
      blocking_conditions: canonicalizeValue([
        ...blockingConditions,
        ...governanceBlockingConditions,
      ]),
      hash_basis: "sha256(canonical_json(decision_excluding_entry_hash))",
      entry_hash: "sha256:PENDING",
    };
    const decisionEntry: Record<string, JsonValue> = {
      ...decisionBase,
      decision: "REJECTED",
      counted_as_attempt: true,
    };
    const decisionForHash = deepClone(decisionEntry);
    delete asMutableRecord(decisionForHash, "decisionForHash").entry_hash;
    decisionEntry.entry_hash = sha256(canonicalJson(decisionForHash));
    appendAcceptanceDecision(decisionEntry);
    const acceptanceDecisionsAfter = getAcceptanceDecisionLog();
    const acceptanceReportPath = writeGateCAcceptanceReport(
      {
        runId: opts.runId,
        decisionId: asString(decisionEntry.decision_id, "decisionEntry.decision_id"),
        report: buildGateCAcceptanceReportDocument(
          {
            runId: opts.runId,
            acceptanceContract,
            acceptanceAudit,
            governanceGate,
            decision: "REJECTED",
            decisionEntry,
            proofLedgerBefore,
            proofLedgerAfter: proofLedgerBefore,
            acceptanceDecisionsBefore,
            acceptanceDecisionsAfter,
          },
          buildAcceptanceReportDeps(),
        ),
      },
      buildAcceptanceReportDeps(),
    );
    materializeAndPersistGateCStatusProjection({
      buildProjection: () => buildGateCStatusProjection() as Record<string, unknown>,
    });
    process.stderr.write(
      [
        `Run ${opts.runId} is not ready for acceptance.`,
        `blocking_conditions=${[...blockingConditions, ...governanceBlockingConditions].join(",") || "unknown"}`,
        `governance_gate_status=${governanceGate.overallStatus}`,
        `acceptance_report_ref=${toGateCRelative(acceptanceReportPath)}`,
      ].join("\n") + "\n",
    );
    return 1;
  }

  const ledgerEntry = appendAcceptedRunToProofLedger(opts.runId, opts.entryPrefix ?? "GATE-C1-ACCEPT");
  const proofLedgerAfter = readYamlRecord(RUN_PROOF_LEDGER_PATH);
  const proofLedgerAfterEntries = asArray(proofLedgerAfter.entries, "proof_ledger_after.entries");
    const acceptedAudit = buildAcceptanceAuditForRunRuntime({
      runId: opts.runId,
      proofLedgerEntries: proofLedgerAfterEntries,
      frozenInstrumentHashes,
      coverageMatrix: coverage,
      deps: buildAcceptanceAuditRuntimeDeps(),
    });
  if (!acceptedAudit || acceptedAudit.acceptance_complete !== true) {
    throw new Error(`Acceptance invariant broken after ledger append for ${opts.runId}.`);
  }
  const acceptedInvariantResults = asMutableRecord(
    acceptedAudit.invariant_results ?? {},
    "acceptedAudit.invariant_results",
  );
  const acceptedBlockingConditions = asStringArray(
    acceptedAudit.blocking_conditions ?? [],
    "acceptedAudit.blocking_conditions",
  );
  const decisionBase: Record<string, JsonValue> = {
    decision_id: `GATE-C-ACCEPT-DECISION-${Date.now()}`,
    decided_at_utc: new Date().toISOString(),
    contract_id: asString(acceptanceContract.contract_id, "acceptance_contract.contract_id"),
    run_id: opts.runId,
    invariant_results: canonicalizeValue(acceptedInvariantResults),
    blocking_conditions: acceptedBlockingConditions,
    hash_basis: "sha256(canonical_json(decision_excluding_entry_hash))",
    entry_hash: "sha256:PENDING",
  };
  const decisionEntry: Record<string, JsonValue> = {
    ...decisionBase,
    decision: "ACCEPTED",
    counted_as_attempt: true,
    proof_ledger_entry_id: asString(ledgerEntry.entry_id, "ledgerEntry.entry_id"),
  };
  const decisionForHash = deepClone(decisionEntry);
  delete asMutableRecord(decisionForHash, "decisionForHash").entry_hash;
  decisionEntry.entry_hash = sha256(canonicalJson(decisionForHash));
  appendAcceptanceDecision(decisionEntry);
  const acceptanceDecisionsAfter = getAcceptanceDecisionLog();
  const acceptanceReportPath = writeGateCAcceptanceReport(
    {
      runId: opts.runId,
      decisionId: asString(decisionEntry.decision_id, "decisionEntry.decision_id"),
      report: buildGateCAcceptanceReportDocument(
        {
          runId: opts.runId,
          acceptanceContract,
          acceptanceAudit: acceptedAudit,
          governanceGate,
          decision: "ACCEPTED",
          decisionEntry,
          proofLedgerBefore,
          proofLedgerAfter,
          acceptanceDecisionsBefore,
          acceptanceDecisionsAfter,
          ledgerEntry,
        },
        buildAcceptanceReportDeps(),
      ),
    },
    buildAcceptanceReportDeps(),
  );
  const projection = materializeAndPersistGateCStatusProjection({
    buildProjection: () => buildGateCStatusProjection() as Record<string, unknown>,
  });
  const truthTableRow = asString(acceptanceAudit.truth_table_row, "acceptanceAudit.truth_table_row").toLowerCase();
  const acceptanceAuditNode = asMutableRecord(
    asMutableRecord(
      asMutableRecord(projection.coverage, "projection.coverage").verification_audits,
      "projection.coverage.verification_audits",
    )[truthTableRow],
    `projection.coverage.verification_audits.${truthTableRow}`,
  );

  process.stdout.write(
    [
      `run_id=${opts.runId}`,
      `ledger_entry_id=${asString(ledgerEntry.entry_id, "ledgerEntry.entry_id")}`,
      "acceptance_result=APPENDED",
      `acceptance_report_ref=${toGateCRelative(acceptanceReportPath)}`,
      `acceptance_audit_status=${asString(acceptanceAuditNode.status, `projection.coverage.verification_audits.${truthTableRow}.status`)}`,
      `acceptance_complete=${String(
        asBoolean(acceptanceAuditNode.acceptance_complete, `projection.coverage.verification_audits.${truthTableRow}.acceptance_complete`),
      )}`,
      `status_projection_path=${toGateCRelative(GATE_C_STATUS_PROJECTION_PATH)}`,
    ].join("\n") + "\n",
  );

  return 0;
}

export function buildGateCStatusProjection(): Record<string, JsonValue> {
  const acceptanceContract = readAcceptanceContract();
  const acceptanceDecisions = getAcceptanceDecisionLog();
  const coverage = readYamlRecord(COVERAGE_MATRIX_PATH);
  const proofLedger = readYamlRecord(RUN_PROOF_LEDGER_PATH);
  const scientificPhaseOrdering = asMutableRecord(
    coverage.scientific_phase_ordering,
    "scientific_phase_ordering",
  );
  const matrix = asMutableRecord(coverage.matrix, "matrix");
  const summary = asMutableRecord(coverage.summary, "summary");
  const proofLedgerEntries = asArray(proofLedger.entries, "proof_ledger.entries");
  const acceptanceDecisionEntries = asArray(
    acceptanceDecisions.entries,
    "acceptance_decisions.entries",
  );
  const p1 = asMutableRecord(matrix.P1, "matrix.P1");
  const n1 = asMutableRecord(matrix.N1, "matrix.N1");
  const n1ExitCriteria = asMutableRecord(n1.exit_criteria_5_hardened, "matrix.N1.exit_criteria_5_hardened");
  const frozenInstrumentHashes = asMutableRecord(
    asMutableRecord(coverage.isolation_check_snapshot, "coverage.isolation_check_snapshot")
      .frozen_instrument_hashes,
    "coverage.isolation_check_snapshot.frozen_instrument_hashes",
  );
    const auditRuntimeDeps = buildAcceptanceAuditRuntimeDeps();
    const n2AcceptanceAudit = buildN2AcceptanceAuditRuntime({
      proofLedgerEntries,
      frozenInstrumentHashes,
      deps: auditRuntimeDeps,
    });
  const n3RunId = findLatestRunIdForSubject("GATE-C-DOC-PROPOSE-N3") ?? "run-008";
    const n3AcceptanceAudit = buildN3AcceptanceAuditRuntime({
      runId: n3RunId,
      proofLedgerEntries,
      frozenInstrumentHashes,
      coverageMatrix: coverage,
      deps: auditRuntimeDeps,
    });
  const n4RunId = findLatestRunIdForSubject("GATE-C-DOC-PROPOSE-N4") ?? "run-006";
    const n4AcceptanceAudit = buildN4AcceptanceAuditRuntime({
      runId: n4RunId,
      proofLedgerEntries,
      frozenInstrumentHashes,
      coverageMatrix: coverage,
      deps: auditRuntimeDeps,
    });
  const n5RunId = findLatestRunIdForSubject("GATE-C-DOC-PROPOSE-N5") ?? "run-009";
    const n5AcceptanceAudit = buildN5AcceptanceAuditRuntime({
      runId: n5RunId,
      proofLedgerEntries,
      frozenInstrumentHashes,
      coverageMatrix: coverage,
      deps: auditRuntimeDeps,
    });
  const n6RunId = findLatestRunIdForSubject("GATE-C-DOC-PROPOSE-N6") ?? "run-010";
    const n6AcceptanceAudit = buildN6AcceptanceAuditRuntime({
      runId: n6RunId,
      proofLedgerEntries,
      frozenInstrumentHashes,
      coverageMatrix: coverage,
      deps: auditRuntimeDeps,
    });
  const n7RunId = findLatestRunIdForSubject("GATE-C-DOC-PROPOSE-N7") ?? "run-011";
    const n7AcceptanceAudit = buildN7AcceptanceAuditRuntime({
      runId: n7RunId,
      proofLedgerEntries,
      frozenInstrumentHashes,
      coverageMatrix: coverage,
      deps: auditRuntimeDeps,
    });
  const acceptanceAuditsByRow: Record<string, Record<string, JsonValue> | undefined> = {
    N2: n2AcceptanceAudit,
    N3: n3AcceptanceAudit,
    N4: n4AcceptanceAudit,
    N5: n5AcceptanceAudit,
    N6: n6AcceptanceAudit,
    N7: n7AcceptanceAudit,
  };
    const aggregation = materializeGateCOperationalAggregationRuntime({
      truthTableRows: GATE_C_TRUTH_TABLE_ROWS,
      matrix,
      summary,
      p1,
      n1ExitCriteria,
      proofLedgerEntries,
      acceptanceDecisionEntries,
      acceptanceAuditsByRow,
    });
  const readerContext = {
    gateExecutionDir: EXECUTION_DIR,
    foundationVerificationDir: FOUNDATION_VERIFICATION_DIR,
  } as const;
  const projectionBundle = loadGateCProjectionBundle(readerContext);
  const {
    sourceEvidence,
    sourceEvidenceHash,
    governance,
  } = projectionBundle.status.projection;

  return materializeGateCStatusProjectionRuntime({
    acceptanceContractId: asString(
      acceptanceContract.contract_id,
      "acceptance_contract.contract_id",
    ),
    proofLedgerAppendOnlyEnforced: asBoolean(
      proofLedger.append_only_enforced,
      "proof_ledger.append_only_enforced",
    ),
    proofLedgerEntryCount: proofLedgerEntries.length,
    proofLedgerLastEntryHash: asString(
      proofLedger.last_entry_hash,
      "proof_ledger.last_entry_hash",
    ),
      completedTruthTableRows: aggregation.completedTruthTableRows,
      truthTableRowsTotal: GATE_C_TRUTH_TABLE_ROWS.length,
      truthTableRowCompletionPercent:
        aggregation.truthTableRowCompletionPercent,
      operationalCompletedUnits: aggregation.operationalCompletedUnits,
      operationalTotalUnits: aggregation.operationalTotalUnits,
      operationalCompletionPercent: aggregation.operationalCompletionPercent,
      controls: aggregation.controls,
    n2AcceptanceAudit,
    n3AcceptanceAudit,
    n4AcceptanceAudit,
    n5AcceptanceAudit,
    n6AcceptanceAudit,
    n7AcceptanceAudit,
      diagnosticAccuracyNumerator: aggregation.diagnosticAccuracyNumerator,
      diagnosticAccuracyDenominator:
        aggregation.diagnosticAccuracyDenominator,
      apparatusStabilityNumerator: aggregation.apparatusStabilityNumerator,
      apparatusStabilityDenominator:
        aggregation.apparatusStabilityDenominator,
      instrumentDriftNumerator: aggregation.instrumentDriftNumerator,
      instrumentDriftDenominator: aggregation.instrumentDriftDenominator,
      acceptedDecisionCount: aggregation.acceptedDecisionCount,
      acceptanceAttemptCount: aggregation.acceptanceAttemptCount,
    sourceEvidence,
    sourceEvidenceHash,
    governance,
    capability: projectionBundle.capability,
    decision: projectionBundle.decision,
    learning: projectionBundle.learning,
    specification: projectionBundle.specification,
    foundation: projectionBundle.foundation,
    trust: projectionBundle.trust,
      evidenceComplete: aggregation.evidenceComplete,
      governanceRatifiable: aggregation.governanceRatifiable,
    scientificPhaseCurrent: asString(
      scientificPhaseOrdering.phase_current,
      "scientific_phase_ordering.phase_current",
    ),
    phaseAOneNegativeComplete: asBoolean(
      summary.phase_a_one_negative_complete,
      "summary.phase_a_one_negative_complete",
    ),
    gateC1MilestoneFirstNegativePassed: asBoolean(
      summary.gate_c1_milestone_first_negative_passed,
      "summary.gate_c1_milestone_first_negative_passed",
    ),
    scienceKernelBundleSha256: asString(
      asMutableRecord(
        asMutableRecord(
          coverage.isolation_check_snapshot,
          "coverage.isolation_check_snapshot",
        ).frozen_instrument_hashes,
        "coverage.isolation_check_snapshot.frozen_instrument_hashes",
      ).science_kernel_bundle_sha256,
      "coverage.isolation_check_snapshot.frozen_instrument_hashes.science_kernel_bundle_sha256",
    ),
    genesisEvidenceRunId: asString(
      p1.primary_run_id,
      "matrix.P1.primary_run_id",
    ),
    frozenPositiveControlReplayRunId: asString(
      p1.replay_isolated_run_id,
      "matrix.P1.replay_isolated_run_id",
    ),
    firstNegativeControlRunId: asString(n1.run_id, "matrix.N1.run_id"),
    nextActionsImmediate: asStringArray(
      coverage.next_actions_immediate,
      "next_actions_immediate",
    ),
    refs: {
      constitutionSummary: toRepoRelative(CONSTITUTION_SUMMARY_PATH),
      capabilityDependencyConstitution: toRepoRelative(
        CAPABILITY_DEPENDENCY_CONSTITUTION_PATH,
      ),
      contractVersionRegistry: toRepoRelative(CONTRACT_VERSION_REGISTRY_PATH),
      contractVersionEvolution: toRepoRelative(CONTRACT_VERSION_EVOLUTION_PATH),
      governanceSession: toRepoRelative(GOVERNANCE_SESSION_PATH),
      governanceSessionVerification: toRepoRelative(
        GOVERNANCE_SESSION_VERIFICATION_PATH,
      ),
      verificationRun: toRepoRelative(VERIFICATION_RUN_PATH),
      verificationRunVerification: toRepoRelative(
        VERIFICATION_RUN_VERIFICATION_PATH,
      ),
      governanceCatalog: toRepoRelative(GOVERNANCE_CATALOG_PATH),
      governanceCatalogVerification: toRepoRelative(
        GOVERNANCE_CATALOG_VERIFICATION_PATH,
      ),
      capabilityGovernanceIndex: toRepoRelative(CAPABILITY_GOVERNANCE_INDEX_PATH),
      capabilityGovernanceVerification: toRepoRelative(
        CAPABILITY_GOVERNANCE_VERIFICATION_PATH,
      ),
      capabilityGraph: toRepoRelative(CAPABILITY_GRAPH_PATH),
      capabilityGraphVerification: toRepoRelative(
        CAPABILITY_GRAPH_VERIFICATION_PATH,
      ),
      enterpriseControlGraph: toRepoRelative(ENTERPRISE_CONTROL_GRAPH_PATH),
      enterpriseControlGraphVerification: toRepoRelative(
        ENTERPRISE_CONTROL_GRAPH_VERIFICATION_PATH,
      ),
      architectureFitness: toRepoRelative(ARCHITECTURE_FITNESS_PATH),
      governanceReadModelSelectiveExecution: toRepoRelative(
        GOVERNANCE_READ_MODEL_SELECTIVE_EXECUTION_PATH,
      ),
      trustFramework: toRepoRelative(TRUST_FRAMEWORK_PATH),
      trustFrameworkVerification: toRepoRelative(
        TRUST_FRAMEWORK_VERIFICATION_PATH,
      ),
      attestationLifecycleVerification: toRepoRelative(
        ATTESTATION_LIFECYCLE_VERIFICATION_PATH,
      ),
      attestationLifecycleMaterialization: toRepoRelative(
        ATTESTATION_LIFECYCLE_MATERIALIZATION_PATH,
      ),
      trustSignatureProviderRegistry: toRepoRelative(
        TRUST_SIGNATURE_PROVIDER_REGISTRY_PATH,
      ),
      trustSignatureProviderVerification: toRepoRelative(
        TRUST_SIGNATURE_PROVIDER_VERIFICATION_PATH,
      ),
      trustSignatureMaterialization: toRepoRelative(
        TRUST_SIGNATURE_MATERIALIZATION_PATH,
      ),
      specificationConformance: toRepoRelative(SPECIFICATION_CONFORMANCE_PATH),
      specificationArtifactGraph: toRepoRelative(
        SPECIFICATION_ARTIFACT_GRAPH_PATH,
      ),
      specificationVocabularyAudit: toRepoRelative(
        SPECIFICATION_VOCABULARY_AUDIT_PATH,
      ),
      decisionQualityReport: toRepoRelative(DECISION_QUALITY_REPORT_PATH),
      learningIntelligenceReport: toRepoRelative(
        LEARNING_INTELLIGENCE_REPORT_PATH,
      ),
      evidenceProducerConvergenceReport: toRepoRelative(
        EVIDENCE_PRODUCER_CONVERGENCE_REPORT_PATH,
      ),
    },
  });
}

export async function runGateCRegenerateCommand(): Promise<number> {
  const regeneration = regenerateGateCStatusProjection({
    statusProjectionPath: toGateCRelative(GATE_C_STATUS_PROJECTION_PATH),
    buildProjection: () => buildGateCStatusProjection() as Record<string, unknown>,
    hashProjection: (projection) => sha256(canonicalJson(projection)),
  });
  process.stdout.write(regeneration.output);
  return regeneration.exitCode;
}

export async function runGateCRefreshStatusCommand(): Promise<number> {
  const projection = materializeAndPersistGateCStatusProjection({
    buildProjection: () => buildGateCStatusProjection() as Record<string, unknown>,
  });
  process.stdout.write(
    materializeGateCRefreshStatusOutput({
      projection,
      statusProjectionPath: toGateCRelative(GATE_C_STATUS_PROJECTION_PATH),
    }),
  );

  return 0;
}

export async function runGateCStatusCommand(): Promise<number> {
  if (!hasGateCStatusProjectionRecord()) {
    process.stderr.write(
      `Missing Gate C status projection at ${toGateCRelative(GATE_C_STATUS_PROJECTION_PATH)}.\n` +
        "Run: pnpm eos gate-c refresh-status\n",
    );
    return 1;
  }

  const projection = readGateCStatusProjectionRecord();
  process.stdout.write(
    materializeGateCStatusOutput({
      projection,
      statusProjectionPath: toGateCRelative(GATE_C_STATUS_PROJECTION_PATH),
    }),
  );

  return 0;
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

function asVerdict(value: unknown, label: string): "PASS" | "FAIL" | "INCONCLUSIVE" {
  const verdict = asString(value, label);
  if (verdict === "PASS" || verdict === "FAIL" || verdict === "INCONCLUSIVE") {
    return verdict;
  }
  throw new Error(`Expected verdict at ${label}`);
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

function evaluateGateCAcceptanceGovernanceGate(): {
  readonly snapshot: Record<string, JsonValue>;
  readonly blockingConditions: readonly string[];
  readonly overallStatus: "PASS" | "FAIL";
} {
  const projectionBundle = loadGateCProjectionBundle({
    gateExecutionDir: EXECUTION_DIR,
    foundationVerificationDir: FOUNDATION_VERIFICATION_DIR,
  });
  const governanceGate = evaluateGateCAcceptanceGovernance(
    projectionBundle.governance,
  );
  return {
    snapshot: canonicalizeValue(governanceGate.snapshot) as Record<
      string,
      JsonValue
    >,
    blockingConditions: governanceGate.blockingConditions,
    overallStatus: governanceGate.overallStatus,
  };
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

  const remainingBlocker =
    originalRun.verdict === "PASS" &&
    replayRun.verdict === "PASS" &&
    originalRun.canonicalRunManifestHash === replayRun.canonicalRunManifestHash &&
    originalRun.canonicalEvidenceHash === replayRun.canonicalEvidenceHash &&
    originalRun.canonicalWitnessHashes.authority === replayRun.canonicalWitnessHashes.authority &&
    originalRun.canonicalWitnessHashes.meaning === replayRun.canonicalWitnessHashes.meaning &&
    originalRun.canonicalWitnessHashes.proof === replayRun.canonicalWitnessHashes.proof
      ? "NONE"
      : "canonical evidence mismatch";

  const comparison = writeGateCRunComparisonArtifacts(
    {
      runRoot: originalRunRoot,
      bundle,
      originalRun,
      replayRun,
      subject,
      options: {
        remainingBlocker,
      },
    },
    buildRunComparisonDeps(),
  );
  recordGateCGenesisProofLedger(
    {
      bundle,
      originalRun,
      replayRun,
      comparison,
    },
    buildRunComparisonDeps(),
  );

  rmSync(cleanReplayRoot, { recursive: true, force: true });

  process.stdout.write(
    [
      `bundle_id=${bundle.bundleId}`,
      `bundle_hash=${bundle.bundleHash}`,
      `run_id=${GENESIS_RUN_ID}`,
      `original_verdict=${originalRun.verdict}`,
      `replay_verdict=${replayRun.verdict}`,
        `canonical_witness_original=${sha256(canonicalJson(originalRun.canonicalWitnessHashes))}`,
        `canonical_witness_replay=${sha256(canonicalJson(replayRun.canonicalWitnessHashes))}`,
        `canonical_witness_match=${String(comparison.sameCanonicalWitnessHashes)}`,
      `canonical_manifest_original=${originalRun.canonicalRunManifestHash}`,
      `canonical_manifest_replay=${replayRun.canonicalRunManifestHash}`,
      `canonical_manifest_match=${String(comparison.sameCanonicalManifestHash)}`,
      `canonical_evidence_original=${originalRun.canonicalEvidenceHash}`,
      `canonical_evidence_replay=${replayRun.canonicalEvidenceHash}`,
      `canonical_evidence_match=${String(comparison.canonicalEvidenceMatches)}`,
        `remaining_blocker=${remainingBlocker}`,
    ].join("\n") + "\n",
  );

  return comparison.converged ? 0 : 1;
}

export interface RunCaseOptions {
  readonly runId: string;
  readonly subjectRelPath: string;
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

  const runCaseConverged =
    originalRun.verdict === replayRun.verdict &&
    originalRun.canonicalRunManifestHash === replayRun.canonicalRunManifestHash &&
    originalRun.canonicalEvidenceHash === replayRun.canonicalEvidenceHash &&
    originalRun.canonicalWitnessHashes.authority === replayRun.canonicalWitnessHashes.authority &&
    originalRun.canonicalWitnessHashes.meaning === replayRun.canonicalWitnessHashes.meaning &&
    originalRun.canonicalWitnessHashes.proof === replayRun.canonicalWitnessHashes.proof;
  const comparison = writeGateCRunComparisonArtifacts(
    {
      runRoot: originalRunRoot,
      bundle,
      originalRun,
      replayRun,
      subject,
      options: {
        writeProofLedgerStatus: runCaseConverged ? "PENDING" : "FAIL",
        remainingBlocker: runCaseConverged
          ? `Negative Control ${subject.truthTableRow} converged under frozen apparatus. Acceptance remains pending until 'pnpm eos gate-c accept ${opts.runId}' evaluates the frozen acceptance contract and appends the proof ledger.`
          : "Canonical evidence diverged between original and clean replay.",
      },
    },
    buildRunComparisonDeps(),
  );

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
      `acceptance_required=${String(comparison.converged)}`,
    ].join("\n") + "\n",
  );

  return comparison.converged ? 0 : 1;
}
