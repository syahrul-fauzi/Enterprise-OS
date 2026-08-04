import assert from "node:assert/strict";
import test from "node:test";
import {
  materializeConstitutionClaims,
  materializeConstitutionProofBundle,
  materializeConstitutionSummary,
  type ConstitutionCertificateSet,
} from "../src/certificate-runtime.js";
import { materializeGovernanceReadModelArtifacts } from "../src/governance-read-model-runtime.js";
import { materializeGovernanceReadModelArtifactsWithSelectiveExecution } from "../src/read-model-selective-execution-runtime.js";
import {
  computeGovernanceSessionLineageDigest,
  materializeGovernanceSession,
  materializeGovernanceSessionProvenance,
} from "../src/governance-session-runtime.js";
import { materializeGovernanceSessionVerificationReport } from "../src/governance-session-verification-runtime.js";
import { materializeVerificationRun, materializeVerificationRunVerificationReport } from "../src/verification-run-runtime.js";
import { materializeTrustFrameworkCatalog } from "../src/trust-framework-runtime.js";
import { materializeGovernanceIncrementalMaterializationReport } from "../src/incremental-materialization-runtime.js";
import type { ArchitectureFitnessReport } from "../src/architecture-fitness-runtime.js";
import type { AttestationLifecycleVerificationReport } from "../src/attestation-lifecycle-runtime.js";
import type {
  CapabilityGovernanceIndex,
  CapabilityGovernanceVerificationReport,
} from "../src/capability-governance-runtime.js";
import type { ContractVersionEvolutionVerificationReport } from "../src/contract-version-evolution-runtime.js";
import type { GovernanceIncrementalMaterializationVerificationReport } from "../src/incremental-materialization-verification-runtime.js";
import type { TrustFrameworkVerificationReport } from "../src/trust-framework-verification-runtime.js";
import type { TrustSignatureMaterializationReport } from "../src/trust-signature-materialization-runtime.js";
import type { TrustSignatureProviderVerificationReport } from "../src/trust-signature-provider-runtime.js";

function createCertificateSet(): ConstitutionCertificateSet {
  return {
    constitution_version: "1.0.0",
    law_profile: "enterprise",
    attestation_profile: "local_unsigned",
    attestation_policy: {
      policy_id: "attestation-policy:local-unsigned",
      policy_digest: "digest-attestation-policy-1",
      profile: "local_unsigned",
      trust_framework: {
        framework_id: "trust-framework:local-development",
        framework_digest: "digest-trust-framework-1",
        verification_profile_id: "verification-profile:local-development",
        signature_provider_spi: "DECLARED",
        framework_boundary:
          "Trust framework reference keeps certificate identity separate from trust implementation.",
      },
      issuer: {
        issuer_id: "UNATTESTED",
        display_name: "Local Unsigned Runtime",
      },
      trust_chain: "UNATTESTED_LOCAL",
      signature: {
        status: "UNSIGNED",
        scheme: null,
        value: null,
        key_id: null,
        reason: "Fixture uses unsigned local attestation.",
      },
      policy_boundary:
        "Local unsigned attestation is enough for governance fixture coverage.",
    },
    constitutional_digest: "digest-constitution",
    proof_digest: "digest-proof",
    constitutional_fingerprint: {
      declared_graph_digest: "digest-declared",
      execution_chain_digest: "digest-chain",
      projection_api_version: "1.0.0",
      constitution_version: "1.0.0",
    },
    graph_purity_certificate: { status: "PASS" },
    proof_determinism_certificate: { status: "PASS" },
    dependency_constitution: { status: "PASS" },
    projection_certificates: [],
    replay_certificates: [],
    projection_determinism_certificates: [],
    executed_laws: [
      {
        law_id: "GraphPurityLaw",
        description: "Observed graph topology must be chain-projected.",
        predicate: {
          predicate_id: "graph.observed_topology.chain_projected_only",
          description: "Observed topology must come from execution chain facts.",
          blocking: true,
        },
        proof: {
          proof_id: "proof-graph-purity",
          status: "PASS",
          report_key: "graph_purity_certificate",
          report_digest: "digest-graph-purity",
        },
        blocking_status: "PASS",
      },
    ],
    law_proofs: [
      {
        law_id: "GraphPurityLaw",
        predicate_id: "graph.observed_topology.chain_projected_only",
        proof_id: "proof-graph-purity",
        status: "PASS",
        report_key: "graph_purity_certificate",
        report_digest: "digest-graph-purity",
        blocking_status: "PASS",
      },
    ],
    law_results: [
      {
        result_id: "law-result:GraphPurityLaw:1234",
        result_digest: "digest-result-1",
        law: {
          law_id: "GraphPurityLaw",
          description: "Observed graph topology must be chain-projected.",
        },
        predicate: {
          predicate_id: "graph.observed_topology.chain_projected_only",
          description: "Observed topology must come from execution chain facts.",
          blocking: true,
        },
        inputs: {
          constitution_version: "1.0.0",
          constitutional_digest: "digest-constitution",
          proof_digest: "digest-proof",
          constitutional_fingerprint: {
            declared_graph_digest: "digest-declared",
            execution_chain_digest: "digest-chain",
            projection_api_version: "1.0.0",
            constitution_version: "1.0.0",
          },
        },
        evaluation: {
          status: "PASS",
          blocking_status: "PASS",
          proof_id: "proof-graph-purity",
          proof_digest: "digest-graph-purity",
          artifact_key: "graph_purity_certificate",
          deterministic: null,
          replayable: null,
          duration_ms: null,
          observations: {
            artifact_kind: "record",
            check_count: 1,
            violation_count: 0,
          },
          reason:
            "GraphPurityLaw satisfied its predicate for the evaluated evidence set.",
        },
        evidence: {
          artifact: {
            status: "PASS",
          },
        },
        result_boundary:
          "Law result is the domain evaluation artifact for a single constitutional law.",
      },
    ],
    evidence_packages: [
      {
        package_id: "evidence-package:GraphPurityLaw:1234",
        package_digest: "digest-evidence-package-1",
        package_scope: "single_law_evaluation",
        law_ids: ["GraphPurityLaw"],
        result_ids: ["law-result:GraphPurityLaw:1234"],
        result_digests: ["digest-result-1"],
        proof_ids: ["proof-graph-purity"],
        proof_digests: ["digest-graph-purity"],
        artifact_keys: ["graph_purity_certificate"],
        constitutional_digest: "digest-constitution",
        proof_digest: "digest-proof",
        constitutional_fingerprint: {
          declared_graph_digest: "digest-declared",
          execution_chain_digest: "digest-chain",
          projection_api_version: "1.0.0",
          constitution_version: "1.0.0",
        },
        proof_fragments_digest: "digest-proof-fragments-1",
        proof_fragments: {
          graph_purity_certificate_digest: "digest-graph-purity-fragment",
          proof_determinism_certificate_digest:
            "digest-proof-determinism-fragment",
          dependency_constitution_digest: "digest-dependency-fragment",
          projection_certificates_digest: "digest-projection-fragment",
          replay_certificates_digest: "digest-replay-fragment",
          projection_determinism_certificates_digest:
            "digest-projection-determinism-fragment",
        },
        package_boundary:
          "Evidence package is the immutable aggregate of governance proof fragments.",
      },
    ],
    law_certificates: [
      {
        certificate_id: "certificate:GraphPurityLaw:1234",
        certificate_digest: "digest-certificate-1",
        package_id: "evidence-package:GraphPurityLaw:1234",
        package_digest: "digest-evidence-package-1",
        issued_at_utc: null,
        certificate_boundary:
          "Certificate is the immutable identity reference to a law-result digest.",
      },
    ],
    law_attestations: [
      {
        attestation_id: "attestation:certificate:GraphPurityLaw:1234:created",
        attestation_reference:
          "attestation-ref:certificate:GraphPurityLaw:1234:created",
        event_id: "attestation-event:created",
        event_digest: "digest-attestation-created",
        event_type: "AttestationCreated",
        event_index: 0,
        policy_id: "attestation-policy:local-unsigned",
        policy_digest: "digest-attestation-policy-1",
        trust_framework_id: "trust-framework:local-development",
        verification_profile_id: "verification-profile:local-development",
        certificate_id: "certificate:GraphPurityLaw:1234",
        certificate_digest: "digest-certificate-1",
        occurred_at_utc: null,
        attestation_status: "ACTIVE",
        signature_reference: null,
        event_boundary:
          "Attestation created event binds trust policy to certificate identity.",
      },
      {
        attestation_id: "attestation:certificate:GraphPurityLaw:1234:verified",
        attestation_reference:
          "attestation-ref:certificate:GraphPurityLaw:1234:verified",
        event_id: "attestation-event:verified",
        event_digest: "digest-attestation-verified",
        event_type: "AttestationVerified",
        event_index: 1,
        policy_id: "attestation-policy:local-unsigned",
        policy_digest: "digest-attestation-policy-1",
        trust_framework_id: "trust-framework:local-development",
        verification_profile_id: "verification-profile:local-development",
        certificate_id: "certificate:GraphPurityLaw:1234",
        certificate_digest: "digest-certificate-1",
        occurred_at_utc: null,
        attestation_status: "VERIFIED",
        signature_reference: null,
        event_boundary:
          "Attestation verified event preserves append-only trust lifecycle.",
      },
    ],
  };
}

function createGovernanceFixture() {
  const certificates = createCertificateSet();
  const claims = materializeConstitutionClaims(certificates);
  const summary = materializeConstitutionSummary(certificates, claims);
  const proofBundle = materializeConstitutionProofBundle(certificates, claims);
  const provenance = materializeGovernanceSessionProvenance({
    executionScope: "verify-foundation",
    startedAtUtc: "2026-08-02T00:00:00.000Z",
    completedAtUtc: "2026-08-02T00:01:00.000Z",
    constitutionReport: {
      constitution_version: "1.0.0",
      constitutional_digest: "digest-constitution",
      proof_digest: "digest-proof",
      graph_purity_certificate: { status: "PASS" },
    },
    certificates,
    lawResults: certificates.law_results,
    evidencePackages: certificates.evidence_packages,
    lawCertificates: certificates.law_certificates,
    lawAttestations: certificates.law_attestations,
    claims,
    constitutionSummary: summary,
    proofBundle,
  });
  const readModels = materializeGovernanceReadModelArtifacts(
    {
      claims,
      summary,
    },
    {
      consumerCount: 2,
      sourceGeneratedAtUtc: provenance.completed_at_utc,
      sourceSession: {
        session_id: provenance.session_id,
        session_digest: provenance.session_digest,
        session_lineage_digest:
          computeGovernanceSessionLineageDigest(provenance),
      },
    },
  );
  const session = materializeGovernanceSession({
    provenance,
    governanceReadModels: readModels,
  });

  return {
    certificates,
    claims,
    summary,
    proofBundle,
    provenance,
    readModels,
    session,
    sessionVerification: materializeGovernanceSessionVerificationReport(session),
  };
}

test("verification run stays bound to governance session as orchestration root", () => {
  const fixture = createGovernanceFixture();
  const verificationRun = materializeVerificationRun({
    governanceSession: fixture.session,
    governanceSessionVerification: fixture.sessionVerification,
    contractVersionEvolution: {
      report_digest: "digest-contract-evolution",
      summary: { overall_status: "PASS" },
    } as ContractVersionEvolutionVerificationReport,
    capabilityGovernanceIndex: {
      projection_digest: "digest-capability-governance-index",
    } as CapabilityGovernanceIndex,
    capabilityGovernanceVerification: {
      report_digest: "digest-capability-governance-verification",
      summary: { overall_status: "PASS" },
    } as CapabilityGovernanceVerificationReport,
    architectureFitness: {
      report_digest: "digest-architecture-fitness",
      summary: { fitness_status: "PASS" },
    } as ArchitectureFitnessReport,
    governanceIncrementalMaterializationVerification: {
      report_digest: "digest-incremental-verification",
      summary: { overall_status: "PASS" },
    } as GovernanceIncrementalMaterializationVerificationReport,
    trustFrameworkVerification: {
      report_digest: "digest-trust-framework-verification",
      summary: { overall_status: "PASS" },
    } as TrustFrameworkVerificationReport,
    attestationLifecycleVerification: {
      report_digest: "digest-attestation-lifecycle-verification",
      summary: { overall_status: "PASS" },
    } as AttestationLifecycleVerificationReport,
    trustSignatureProviderVerification: {
      report_digest: "digest-trust-signature-provider-verification",
      summary: { overall_status: "PASS" },
    } as TrustSignatureProviderVerificationReport,
    trustSignatureMaterialization: {
      report_digest: "digest-trust-signature-materialization",
      summary: { overall_status: "PASS" },
    } as TrustSignatureMaterializationReport,
    lawResults: fixture.certificates.law_results,
    evidencePackages: fixture.certificates.evidence_packages,
    lawCertificates: fixture.certificates.law_certificates,
    lawAttestations: fixture.certificates.law_attestations,
    claims: fixture.claims,
    constitutionSummary: fixture.summary,
    proofBundle: fixture.proofBundle,
  });
  const verification = materializeVerificationRunVerificationReport(
    verificationRun,
  );

  assert.equal(verificationRun.run_scope, "verify-foundation");
  assert.equal(
    verificationRun.governance_session.session_id,
    fixture.session.session_id,
  );
  assert.equal(
    verificationRun.governance_session.session_digest,
    fixture.session.session_digest,
  );
  assert.equal(
    verificationRun.governance_session.session_projection_digest,
    fixture.session.session_projection_digest,
  );
  assert.equal(verificationRun.readiness.overall_status, "PASS");
  assert.equal(verification.summary.overall_status, "PASS");
  assert.match(verificationRun.run_boundary, /orchestration aggregate/i);
});

test("incremental materialization distinguishes metadata-only session delta", () => {
  const fixture = createGovernanceFixture();
  const report = materializeGovernanceIncrementalMaterializationReport({
    executionScope: "verify-foundation",
    trustFrameworkCatalog: materializeTrustFrameworkCatalog(),
    attestationPolicy: fixture.certificates.attestation_policy,
    lawResults: fixture.certificates.law_results,
    evidencePackages: fixture.certificates.evidence_packages,
    lawCertificates: fixture.certificates.law_certificates,
    lawAttestations: fixture.certificates.law_attestations,
    claims: fixture.claims,
    constitutionSummary: fixture.summary,
    proofBundle: fixture.proofBundle,
    sessionProvenance: fixture.provenance,
    summaryView: fixture.readModels.summaryView,
    claimsView: fixture.readModels.claimsView,
    healthView: fixture.readModels.healthView,
    dashboardView: fixture.readModels.dashboardView,
    readModelMetrics: fixture.readModels.metrics,
    governanceSession: fixture.session,
    previousReport: {
      ...materializeGovernanceIncrementalMaterializationReport({
        executionScope: "verify-foundation",
        trustFrameworkCatalog: materializeTrustFrameworkCatalog(),
        attestationPolicy: fixture.certificates.attestation_policy,
        lawResults: fixture.certificates.law_results,
        evidencePackages: fixture.certificates.evidence_packages,
        lawCertificates: fixture.certificates.law_certificates,
        lawAttestations: fixture.certificates.law_attestations,
        claims: fixture.claims,
        constitutionSummary: fixture.summary,
        proofBundle: fixture.proofBundle,
        sessionProvenance: fixture.provenance,
        summaryView: fixture.readModels.summaryView,
        claimsView: fixture.readModels.claimsView,
        healthView: fixture.readModels.healthView,
        dashboardView: fixture.readModels.dashboardView,
        readModelMetrics: fixture.readModels.metrics,
        governanceSession: fixture.session,
        selectiveExecutionStatus: "APPLIED",
      }),
      report_version: "1.0.0",
      report_digest: "digest-previous-incremental-report",
      session_digest: "previous-session-digest",
      session_projection_digest: "previous-session-projection-digest",
    },
    selectiveExecutionStatus: "APPLIED",
  });

  assert.equal(report.selective_execution_status, "APPLIED");
  assert.equal(report.delta_basis.delta_mode, "SESSION_DELTA");
  assert.equal(report.delta_basis.delta_scope_status, "METADATA_ONLY");
  assert.equal(report.delta_basis.full_rebuild_required, false);
  assert.equal(report.summary.changed_node_count, 0);
  assert.equal(report.summary.impacted_node_count, 0);
  assert.equal(report.summary.reusable_node_count, report.summary.node_count);
});

test("read-model selective execution exposes metadata-only rebind mode", () => {
  const fixture = createGovernanceFixture();
  const previousArtifacts = materializeGovernanceReadModelArtifacts(
    {
      claims: fixture.claims,
      summary: fixture.summary,
    },
    {
      consumerCount: 2,
      sourceGeneratedAtUtc: fixture.provenance.completed_at_utc,
      sourceSession: {
        session_id: "governance-session:previous",
        session_digest: "previous-session-digest",
        session_lineage_digest:
          computeGovernanceSessionLineageDigest(fixture.provenance),
      },
    },
  );
  const selectiveExecution =
    materializeGovernanceReadModelArtifactsWithSelectiveExecution(
      {
        executionScope: "verify-foundation",
        claims: fixture.claims,
        summary: fixture.summary,
      },
      {
        consumerCount: 2,
        sourceGeneratedAtUtc: fixture.provenance.completed_at_utc,
        sourceSession: {
          session_id: fixture.provenance.session_id,
          session_digest: fixture.provenance.session_digest,
          session_lineage_digest:
            computeGovernanceSessionLineageDigest(fixture.provenance),
        },
        previousArtifacts,
      },
    );

  assert.equal(
    selectiveExecution.report.delta_basis.delta_scope_status,
    "METADATA_ONLY",
  );
  assert.equal(
    selectiveExecution.report.summary.execution_mode,
    "METADATA_ONLY_REBIND",
  );
  assert.equal(
    selectiveExecution.report.delta_basis.source_session_digest_changed,
    true,
  );
  assert.equal(
    selectiveExecution.report.delta_basis.source_session_lineage_changed,
    false,
  );
  assert.deepEqual(selectiveExecution.report.summary.reused_nodes.sort(), [
    "claims_view",
    "dashboard_view",
    "health_view",
    "summary_view",
  ]);
  assert.deepEqual(
    selectiveExecution.report.summary.rematerialized_nodes,
    ["read_model_metrics"],
  );
});
