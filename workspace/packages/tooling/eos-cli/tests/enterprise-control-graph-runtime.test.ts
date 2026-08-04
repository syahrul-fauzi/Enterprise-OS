import assert from "node:assert/strict";
import test from "node:test";
import { materializeEnterpriseControlGraph } from "../src/enterprise-control-graph-runtime.js";

function createFixture() {
  return {
    capabilityGovernance: {
      index: {
        projection_digest: "capability-governance-digest",
        summary: {
          capability_count: 3,
        },
      },
      verification: {
        summary: {
          overall_status: "PASS",
          compatibility_governance_status: "PASS",
        },
      },
      capabilities: [
        {
          capability_id: "governance-evidence",
          manifest: {
            governance_status: "PASS",
          },
          version: {
            version_digest: "digest-governance-evidence",
            governance_status: "PASS",
            version: "1.0.0",
            stability: "stable",
            lifecycle_stage: "active",
          },
        },
        {
          capability_id: "governance-read-model",
          manifest: {
            governance_status: "PASS",
          },
          version: {
            version_digest: "digest-governance-read-model",
            governance_status: "PASS",
            version: "1.0.0",
            stability: "stable",
            lifecycle_stage: "active",
          },
        },
        {
          capability_id: "trust-framework",
          manifest: {
            governance_status: "PASS",
          },
          version: {
            version_digest: "digest-trust-framework",
            governance_status: "PASS",
            version: "1.0.0",
            stability: "stable",
            lifecycle_stage: "active",
          },
        },
      ],
    },
    capabilityGraph: {
      graph_digest: "capability-graph-digest",
      summary: {
        dependency_edge_count: 2,
        warn_capability_count: 0,
        fail_capability_count: 0,
        governance_health_status: "PASS",
      },
        capability_health: [
          {
            capability_id: "governance-evidence",
            unknown_dependency_count: 0,
            unstable_dependency_count: 0,
            circular_dependency_count: 0,
            health_status: "PASS",
          },
          {
            capability_id: "governance-read-model",
            unknown_dependency_count: 0,
            unstable_dependency_count: 0,
            circular_dependency_count: 0,
            health_status: "PASS",
          },
          {
            capability_id: "trust-framework",
            unknown_dependency_count: 0,
            unstable_dependency_count: 0,
            circular_dependency_count: 0,
            health_status: "PASS",
          },
        ],
      capabilities: [
        {
          capability_id: "governance-evidence",
          depends_on: [],
        },
        {
          capability_id: "governance-read-model",
          depends_on: [
            {
              dependency_id: "governance-evidence",
              resolution_status: "RESOLVED_CAPABILITY",
              rationale: "Read models depend on evidence.",
            },
          ],
        },
        {
          capability_id: "trust-framework",
          depends_on: [
            {
              dependency_id: "node:crypto",
              resolution_status: "SYSTEM_DEPENDENCY",
              dependency_health: "SYSTEM_RUNTIME",
              dependency_class: "system_runtime",
              rationale: "Trust adapters depend on runtime crypto.",
            },
          ],
        },
      ],
    },
    lawResults: [
      {
        result_id: "law-result:1",
        result_digest: "law-result-digest",
        law: { law_id: "ReplayLaw" },
        predicate: { predicate_id: "predicate:replay" },
        evaluation: {
          status: "PASS",
          proof_id: "proof:replay",
        },
      },
    ],
    evidencePackages: [
      {
        package_id: "evidence-package:1",
        package_digest: "evidence-package-digest",
        package_scope: "single_law_evaluation",
        law_ids: ["ReplayLaw"],
        result_ids: ["law-result:1"],
      },
    ],
    lawCertificates: [
      {
        certificate_id: "certificate:1",
        certificate_digest: "certificate-digest",
        package_id: "evidence-package:1",
      },
    ],
    lawAttestations: [
      {
        event_id: "attestation-event:1",
        event_digest: "attestation-event-digest",
        event_type: "AttestationVerified",
        attestation_id: "attestation:1",
        attestation_status: "VERIFIED",
        certificate_id: "certificate:1",
        policy_id: "attestation-policy:1",
      },
    ],
    governanceReadModels: {
      summaryView: {
        view_id: "governance-view:summary:1",
        view_digest: "summary-digest",
        view_kind: "summary",
        status: "PASS",
      },
      claimsView: {
        view_id: "governance-view:claims:1",
        view_digest: "claims-digest",
        view_kind: "claims",
        status: "PASS",
      },
      healthView: {
        view_id: "governance-view:health:1",
        view_digest: "health-digest",
        view_kind: "health",
        health_status: "HEALTHY",
      },
      dashboardView: {
        view_id: "governance-view:dashboard:1",
        view_digest: "dashboard-digest",
        view_kind: "dashboard",
        status: "PASS",
      },
      metrics: {
        metrics_id: "governance-read-model-metrics:1",
        metrics_digest: "metrics-digest",
      },
    },
    governanceSession: {
      session_id: "governance-session:1",
      session_digest: "governance-session-digest",
      session_status: "COMPLETED",
      execution_scope: "verify-foundation",
      session_projection_digest: "governance-session-projection-digest",
    },
    verificationRun: {
      run_id: "verification-run:1",
      run_digest: "verification-run-digest",
      run_scope: "verify-foundation",
      readiness: {
        overall_status: "PASS",
      },
      governance_session: {
        session_id: "governance-session:1",
      },
    },
  };
}

test("enterprise control graph connects capability, evidence, and session lineage", () => {
  const projection = materializeEnterpriseControlGraph(
    createFixture() as never,
  );

  assert.equal(projection.graph.summary.traversal_ready_status, "PASS");
  assert.equal(projection.verification.summary.overall_status, "PASS");
  assert.equal(projection.graph.summary.read_model_count, 5);
  assert.equal(projection.graph.summary.capability_count, 3);
  assert.ok(
    projection.graph.edges.some(
      (edge) =>
        edge.edge_kind === "BINDS_SESSION" &&
        edge.from_node_id === "verification-run:1" &&
        edge.to_node_id === "governance-session:1",
    ),
  );
  assert.ok(
    projection.graph.edges.some(
      (edge) =>
        edge.edge_kind === "CERTIFIED_AS" &&
        edge.from_node_id === "evidence-package:1" &&
        edge.to_node_id === "certificate:1",
    ),
  );
  assert.ok(
    projection.graph.edges.some(
      (edge) =>
        edge.edge_kind === "DEPENDS_ON" &&
        edge.from_node_id === "capability:governance-read-model" &&
        edge.to_node_id === "capability:governance-evidence",
    ),
  );
  assert.ok(
    projection.graph.nodes.some(
      (node) =>
        node.node_kind === "control_surface" &&
        node.display_name === "Gate C Snapshot" &&
        node.status === "PASS",
    ),
  );
  assert.ok(
    projection.graph.edges.some(
      (edge) =>
        edge.edge_kind === "PROJECTS_TO" &&
        edge.from_node_id.startsWith("control-surface:capability-graph:") &&
        edge.to_node_id === "control-surface:gate-c:governance-session:1",
    ),
  );
});

test("enterprise control graph fails when evidence chain is broken", () => {
  const fixture = createFixture();
  fixture.lawCertificates[0].package_id = "evidence-package:missing";

  const projection = materializeEnterpriseControlGraph(fixture as never);

  assert.equal(projection.verification.summary.evidence_chain_status, "FAIL");
  assert.equal(projection.verification.summary.overall_status, "FAIL");
});
