import assert from "node:assert/strict";
import test from "node:test";
import {
  materializeConstitutionClaims,
  materializeConstitutionSummary,
  type ConstitutionCertificateSet,
} from "../src/certificate-runtime.js";
import { materializeFoundationReport } from "../src/foundation-reporting-runtime.js";
import { materializeGovernanceReadModelArtifacts } from "../src/governance-read-model-runtime.js";
import { createProjection } from "../src/projection-domain.js";

function createCertificateSet(): ConstitutionCertificateSet {
  return {
    constitution_version: "1.0.0",
    law_profile: "enterprise",
    attestation_profile: "local_unsigned",
    attestation_policy: {
      policy_id: "attestation-policy:local-unsigned",
      policy_digest: "digest-attestation-policy-1",
      profile: "local_unsigned",
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
        reason:
          "Cryptographic attestation is not materialized yet. This policy records local unsigned verification for CI and workstation execution.",
      },
      policy_boundary:
        "Local unsigned attestation is the default trust posture for non-distributed runtime verification.",
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
          description:
            "Observed topology must come from execution chain facts.",
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
          description:
            "Observed topology must come from execution chain facts.",
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
        attestation_id: "attestation:certificate:GraphPurityLaw:1234:5678",
        attestation_digest: "digest-attestation-1",
        policy_id: "attestation-policy:local-unsigned",
        policy_digest: "digest-attestation-policy-1",
        certificate_id: "certificate:GraphPurityLaw:1234",
        certificate_digest: "digest-certificate-1",
        attested_at_utc: null,
        attestation_status: "DECLARED",
        attestation_boundary:
          "Attestation carries trust assertions about a certificate.",
      },
    ],
  };
}

test("constitution summary remains distinct from claims", () => {
  const certificates = createCertificateSet();
  const claims = materializeConstitutionClaims(certificates);
  const summary = materializeConstitutionSummary(certificates, claims);

  assert.equal(summary.status, "PASS");
  assert.equal(summary.claim_count, 1);
  assert.equal(summary.proof_strength, "proof-centric");
  assert.equal(summary.law_profile, "enterprise");
  assert.equal("claims" in summary, false);
  assert.equal(Array.isArray(claims.claims), true);
  assert.equal(certificates.attestation_profile, "local_unsigned");
  assert.equal(certificates.attestation_policy.profile, "local_unsigned");
  assert.equal(typeof certificates.attestation_policy.policy_digest, "string");
  assert.equal(
    typeof certificates.evidence_packages[0]?.package_digest,
    "string",
  );
  assert.equal("signature" in certificates.law_certificates[0]!, false);
  assert.equal(typeof certificates.law_certificates[0]?.package_id, "string");
  assert.equal(
    certificates.law_attestations[0]?.attestation_status,
    "DECLARED",
    "attestation-policy:local-unsigned",
  );
});

test("foundation report exposes governance summary instead of constitution internals", () => {
  const certificates = createCertificateSet();
  const summary = materializeConstitutionSummary(
    certificates,
    materializeConstitutionClaims(certificates),
  );
  const topologyDrift = createProjection({
    projectionType: "TopologyDriftProjection",
    schemaVersion: "1.0.0",
    generatedFrom: [],
    generatedAtUtc: "1970-01-01T00:00:00.000Z",
    payload: {
      drift_status: "ALIGNED",
      summary: {
        aligned_products: 1,
      },
    },
  });

  const report = materializeFoundationReport({
    foundationMetrics: {
      foundation_status: "HEALTHY_BASELINE",
    },
    graphHealth: {
      registry_health: "HEALTHY",
      graph_integrity_status: "HEALTHY",
    },
    executionEvidence: {
      summary: {
        observed_capabilities: 1,
      },
    },
    executionPlan: {
      products_with_execution_plan: 1,
    },
    executionChain: {
      total_invocations: 1,
    },
    topologyDrift,
    architectureTrend: {
      payload: {
        trend_status: "STABLE",
        latest_epoch: "epoch-001",
        total_epochs: 1,
      },
    },
    governanceSummary: summary,
    executionGraphProof: {
      constitutional_version: "1.0.0",
      proof_digest: "digest-proof",
      proof_determinism_status: "PASS",
      declared_graph_digest: "digest-declared",
      execution_chain_digest: "digest-chain",
      constitutional_digest: "digest-constitution",
      constitutional_claims: null,
      graph_version: "1.0.0",
      projection_version: "1.0.0",
      projection_digest: "digest-projection",
      generated_from: [],
      generated_at_utc: "1970-01-01T00:00:00.000Z",
      total_nodes: 1,
      total_edges: 1,
      declared_edges: 1,
      observed_edges: 1,
      claim_boundary: "Execution graph proof is presentation-safe.",
    },
    graphFitness: {
      fitness_status: "STABLE",
    },
    specificationSystem: {
      overall_status: "WARN",
      registry_artifacts: 37,
      registry_edges: 75,
      rfc_count: 6,
      conf_count: 6,
      spec_count: 4,
      conformance_status: "WARN",
      vocabulary_status: "PASS",
      conformance_failures: 0,
      conformance_warnings: 12,
      vocabulary_terms: 10,
      vocabulary_duplicates: 0,
      report_ref:
        "workspace/foundation/evidence/verification/specification-conformance-report.json",
      projection_ref:
        "workspace/foundation/evidence/verification/specification-conformance-projection.json",
    },
    decisionQuality: {
      status: "PARTIAL",
      decision_count: 4,
      decision_traceability_coverage: 1,
      decision_outcome_coverage: 0.75,
      decision_learning_closure: 0.5,
      decision_reproducibility: 1,
      decision_reversibility: 1,
      decision_impact_graph_completeness: 0.75,
      engineering_leverage_measurement_coverage: 0.25,
      decision_effectiveness: 0.625,
      decision_success_rate: 0.5,
      false_decision_rate: 0.25,
      decision_reversal_rate: 0.25,
      evidence_utilization_rate: 0.75,
      knowledge_reuse_rate: 0.5,
      evidence_strength_index: 1,
      outcome_improvement_rate: 0.5,
      mean_time_to_outcome_ms: 240000,
      learning_velocity_ms: 60000,
      decision_confidence_index: 0.83,
      decision_confidence_growth: 0.08,
      knowledge_weighted_quality_index: 0.6042,
      report_ref:
        "workspace/foundation/evidence/verification/decision-quality-report.json",
    },
    learningIntelligence: {
      status: "PARTIAL",
      decision_count: 4,
      outcome_count: 3,
      outcome_registry_coverage: 0.75,
      decision_quality_index: 0.6042,
      learning_velocity_ms: 180000,
      knowledge_gain_units: 5,
      knowledge_gain: 1.25,
      knowledge_object_count: 3,
      operationalized_knowledge_count: 1,
      knowledge_availability_rate: 0.3333,
      knowledge_reuse_rate: 0.3333,
      reused_knowledge_object_count: 1,
      improved_knowledge_object_count: 1,
      knowledge_lineage_count: 3,
      knowledge_lineage_preview: [
        {
          knowledge_id: "knowledge:preview-1",
          knowledge_key: "knowledge-key:preview-1",
          evolution_stage: "IMPROVED",
          source_learning_count: 2,
          reuse_count: 1,
          improved_outcome_count: 1,
          source_learning_ids: ["learning-1", "learning-2"],
          reused_by_decision_entry_ids: ["decision-entry-2"],
        },
      ],
      recommendation_effectiveness_rate: 0.5,
      decision_pattern_change_rate: 0.75,
      recommendation_acceptance_rate: 0.5,
      behavior_change_rate: 0.75,
      engineering_leverage_ratio: 1,
      repeated_mistake_count: 1,
      future_decision_improvement_rate: 0.5,
      report_ref:
        "workspace/foundation/evidence/verification/learning-intelligence-report.json",
      learning_registry_ref:
        "workspace/foundation/evidence/verification/learning-registry.json",
      knowledge_registry_ref:
        "workspace/foundation/evidence/verification/knowledge-registry.json",
    },
    evidenceConvergence: {
      status: "WARN",
      producer_count: 6,
      canonical_schema_versions: ["1.0.0"],
      artifact_type_count: 6,
      subject_type_count: 5,
      target_producer_count: 9,
      registered_target_producer_count: 6,
      target_coverage_ratio: 0.6667,
      report_ref:
        "workspace/foundation/evidence/verification/evidence-producer-convergence-report.json",
    },
    producers: [
      {
        producer_id: "specification",
        producer_class: "specification",
        status: "WARN",
        health: "WARN",
        coverage_ratio: 2.027,
        subject: {
          subject_ref: "enterprise/specifications/specification-registry.yaml",
          subject_type: "specification-registry",
        },
        evidence_ref:
          "workspace/foundation/evidence/verification/specification-conformance-evidence.json",
        projection_ref:
          "workspace/foundation/evidence/verification/specification-conformance-projection.json",
      },
      {
        producer_id: "decision",
        producer_class: "decision",
        status: "PARTIAL",
        health: "PARTIAL",
        coverage_ratio: 0.75,
        subject: {
          subject_ref:
            "workspace/foundation/evidence/verification/decision-quality-report.json",
          subject_type: "decision-ledger",
        },
        evidence_ref:
          "workspace/foundation/evidence/verification/decision-quality-report.json",
        projection_ref: null,
      },
      {
        producer_id: "learning",
        producer_class: "learning",
        status: "PARTIAL",
        health: "PARTIAL",
        coverage_ratio: 0.75,
        subject: {
          subject_ref:
            "workspace/foundation/evidence/verification/learning-intelligence-report.json",
          subject_type: "decision-outcome-registry",
        },
        evidence_ref:
          "workspace/foundation/evidence/verification/learning-intelligence-report.json",
        projection_ref: null,
      },
    ],
    sharedCapabilityInventory: ["identity"],
    products: [],
    governancePortfolioLoaded: true,
  });

  assert.equal(report.governance_summary, summary);
  assert.deepEqual(report.specification_system, {
    overall_status: "WARN",
    registry_artifacts: 37,
    registry_edges: 75,
    rfc_count: 6,
    conf_count: 6,
    spec_count: 4,
    conformance_status: "WARN",
    vocabulary_status: "PASS",
    conformance_failures: 0,
    conformance_warnings: 12,
    vocabulary_terms: 10,
    vocabulary_duplicates: 0,
    report_ref:
      "workspace/foundation/evidence/verification/specification-conformance-report.json",
    projection_ref:
      "workspace/foundation/evidence/verification/specification-conformance-projection.json",
  });
  assert.deepEqual(report.decision_quality, {
    status: "PARTIAL",
    decision_count: 4,
    decision_traceability_coverage: 1,
    decision_outcome_coverage: 0.75,
    decision_learning_closure: 0.5,
    decision_reproducibility: 1,
    decision_reversibility: 1,
    decision_impact_graph_completeness: 0.75,
    engineering_leverage_measurement_coverage: 0.25,
    decision_effectiveness: 0.625,
    decision_success_rate: 0.5,
    false_decision_rate: 0.25,
    decision_reversal_rate: 0.25,
    evidence_utilization_rate: 0.75,
    knowledge_reuse_rate: 0.5,
    evidence_strength_index: 1,
    outcome_improvement_rate: 0.5,
    mean_time_to_outcome_ms: 240000,
    learning_velocity_ms: 60000,
    decision_confidence_index: 0.83,
    decision_confidence_growth: 0.08,
    knowledge_weighted_quality_index: 0.6042,
    report_ref:
      "workspace/foundation/evidence/verification/decision-quality-report.json",
  });
  assert.deepEqual(report.evidence_convergence, {
    status: "WARN",
    producer_count: 6,
    canonical_schema_versions: ["1.0.0"],
    artifact_type_count: 6,
    subject_type_count: 5,
    target_producer_count: 9,
    registered_target_producer_count: 6,
    target_coverage_ratio: 0.6667,
    report_ref:
      "workspace/foundation/evidence/verification/evidence-producer-convergence-report.json",
  });
  assert.deepEqual(report.learning_intelligence, {
    status: "PARTIAL",
    decision_count: 4,
    outcome_count: 3,
    outcome_registry_coverage: 0.75,
    decision_quality_index: 0.6042,
    learning_velocity_ms: 180000,
    knowledge_gain_units: 5,
    knowledge_gain: 1.25,
    knowledge_object_count: 3,
    operationalized_knowledge_count: 1,
    knowledge_availability_rate: 0.3333,
    knowledge_reuse_rate: 0.3333,
    reused_knowledge_object_count: 1,
    improved_knowledge_object_count: 1,
    knowledge_lineage_count: 3,
    knowledge_lineage_preview: [
      {
        knowledge_id: "knowledge:preview-1",
        knowledge_key: "knowledge-key:preview-1",
        evolution_stage: "IMPROVED",
        source_learning_count: 2,
        reuse_count: 1,
        improved_outcome_count: 1,
        source_learning_ids: ["learning-1", "learning-2"],
        reused_by_decision_entry_ids: ["decision-entry-2"],
      },
    ],
    recommendation_effectiveness_rate: 0.5,
    decision_pattern_change_rate: 0.75,
    recommendation_acceptance_rate: 0.5,
    behavior_change_rate: 0.75,
    engineering_leverage_ratio: 1,
    repeated_mistake_count: 1,
    future_decision_improvement_rate: 0.5,
    report_ref:
      "workspace/foundation/evidence/verification/learning-intelligence-report.json",
    learning_registry_ref:
      "workspace/foundation/evidence/verification/learning-registry.json",
    knowledge_registry_ref:
      "workspace/foundation/evidence/verification/knowledge-registry.json",
  });
  assert.deepEqual(report.closed_loop_hypothesis, {
    statement:
      "Evidence -> Decision -> Outcome -> Learning -> Knowledge -> Better Decision -> Better Outcome",
    status: "PARTIAL",
    stages: {
      evidence: {
        status: "PASS",
        metric_name: "evidence_strength_index",
        metric: 1,
        evidence_ref:
          "workspace/foundation/evidence/verification/decision-quality-report.json",
      },
      decision: {
        status: "PASS",
        metric_name: "decision_count",
        metric: 4,
        evidence_ref:
          "workspace/foundation/evidence/verification/decision-quality-report.json",
      },
      outcome: {
        status: "PARTIAL",
        metric_name: "decision_outcome_coverage",
        metric: 0.75,
        evidence_ref:
          "workspace/foundation/evidence/verification/decision-quality-report.json",
      },
      learning: {
        status: "PARTIAL",
        metric_name: "decision_learning_closure",
        metric: 0.5,
        evidence_ref:
          "workspace/foundation/evidence/verification/learning-intelligence-report.json",
      },
      knowledge: {
        status: "PASS",
        metric_name: "knowledge_availability_rate",
        metric: 0.3333,
        evidence_ref:
          "workspace/foundation/evidence/verification/knowledge-registry.json",
      },
      better_decision: {
        status: "PASS",
        metric_name: "knowledge_weighted_quality_index",
        metric: 0.6042,
        evidence_ref:
          "workspace/foundation/evidence/verification/decision-quality-report.json",
      },
      better_outcome: {
        status: "PASS",
        metric_name: "outcome_improvement_rate",
        metric: 0.5,
        evidence_ref:
          "workspace/foundation/evidence/verification/learning-intelligence-report.json",
      },
    },
    claim_boundary:
      "Closed-loop hypothesis status is derived only from the materialized decision-quality and learning-intelligence projections produced during this foundation verification run.",
  });
  assert.deepEqual(report.knowledge_lineage_preview, [
    {
      knowledge_id: "knowledge:preview-1",
      knowledge_key: "knowledge-key:preview-1",
      evolution_stage: "IMPROVED",
      source_learning_count: 2,
      reuse_count: 1,
      improved_outcome_count: 1,
      source_learning_ids: ["learning-1", "learning-2"],
      reused_by_decision_entry_ids: ["decision-entry-2"],
    },
  ]);
  assert.deepEqual(report.producers, {
    specification: {
      producer_id: "specification",
      producer_class: "specification",
      status: "WARN",
      health: "WARN",
      coverage_ratio: 2.027,
      subject: {
        subject_ref: "enterprise/specifications/specification-registry.yaml",
        subject_type: "specification-registry",
      },
      evidence_ref:
        "workspace/foundation/evidence/verification/specification-conformance-evidence.json",
      projection_ref:
        "workspace/foundation/evidence/verification/specification-conformance-projection.json",
    },
    decision: {
      producer_id: "decision",
      producer_class: "decision",
      status: "PARTIAL",
      health: "PARTIAL",
      coverage_ratio: 0.75,
      subject: {
        subject_ref:
          "workspace/foundation/evidence/verification/decision-quality-report.json",
        subject_type: "decision-ledger",
      },
      evidence_ref:
        "workspace/foundation/evidence/verification/decision-quality-report.json",
      projection_ref: null,
    },
    learning: {
      producer_id: "learning",
      producer_class: "learning",
      status: "PARTIAL",
      health: "PARTIAL",
      coverage_ratio: 0.75,
      subject: {
        subject_ref:
          "workspace/foundation/evidence/verification/learning-intelligence-report.json",
        subject_type: "decision-outcome-registry",
      },
      evidence_ref:
        "workspace/foundation/evidence/verification/learning-intelligence-report.json",
      projection_ref: null,
    },
  });
  assert.deepEqual(report.summary, {
    producer_count: 3,
    producer_classes: ["decision", "learning", "specification"],
    average_coverage_ratio: 1.1757,
  });
  assert.deepEqual(report.health, {
    status: "WARN",
    pass_count: 0,
    warn_count: 1,
    fail_count: 0,
    partial_count: 2,
  });
  assert.deepEqual(report.coverage, {
    average_ratio: 1.1757,
    by_producer: {
      specification: 2.027,
      decision: 0.75,
      learning: 0.75,
    },
  });
  assert.deepEqual(report.evidence, {
    by_producer: {
      specification: {
        evidence_ref:
          "workspace/foundation/evidence/verification/specification-conformance-evidence.json",
        projection_ref:
          "workspace/foundation/evidence/verification/specification-conformance-projection.json",
      },
      decision: {
        evidence_ref:
          "workspace/foundation/evidence/verification/decision-quality-report.json",
        projection_ref: null,
      },
      learning: {
        evidence_ref:
          "workspace/foundation/evidence/verification/learning-intelligence-report.json",
        projection_ref: null,
      },
    },
    convergence_status: "WARN",
    target_coverage_ratio: 0.6667,
  });
  assert.equal("constitution" in report, false);
});

test("governance read-model runtime materializes views distinct from governance evidence", () => {
  const certificates = createCertificateSet();
  const claims = materializeConstitutionClaims(certificates);
  const summary = materializeConstitutionSummary(certificates, claims);
  const views = materializeGovernanceReadModelArtifacts({
    claims,
    summary,
  });

  assert.equal(views.summaryView.view_kind, "summary");
  assert.equal(views.claimsView.view_kind, "claims");
  assert.equal(views.healthView.view_kind, "health");
  assert.equal(views.dashboardView.view_kind, "dashboard");
  assert.equal(
    views.summaryView.constitutional_digest,
    summary.constitutional_digest,
  );
  assert.equal(views.claimsView.claims[0]?.digest, claims.claims[0]?.digest);
  assert.equal("claims" in views.summaryView, false);
  assert.equal("highlighted_claims" in views.healthView, false);
  assert.equal(Array.isArray(views.dashboardView.highlighted_claims), true);
});
