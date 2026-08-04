import assert from "node:assert/strict";
import test from "node:test";
import type { EnterpriseControlGraph } from "../src/enterprise-control-graph-runtime.js";
import { evaluateEnterpriseQuery } from "../src/enterprise-query-runtime.js";

function createGraphFixture(): EnterpriseControlGraph {
  return {
    graph_version: "1.0.0",
    graph_id: "enterprise-control-graph:test",
    graph_digest: "enterprise-control-graph-digest",
    summary: {
      node_count: 10,
      edge_count: 12,
      capability_count: 2,
      evidence_node_count: 3,
      read_model_count: 1,
      dependency_edge_count: 1,
      disconnected_node_count: 0,
      traversal_ready_status: "PASS",
    },
    nodes: [
      {
        node_id: "capability:governance-evidence",
        node_kind: "capability",
        display_name: "governance-evidence",
        digest: "digest-governance-evidence",
        status: "PASS",
        attributes: {
          version: "1.0.0",
          dependency_health_status: "PASS",
        },
      },
      {
        node_id: "capability:governance-read-model",
        node_kind: "capability",
        display_name: "governance-read-model",
        digest: "digest-governance-read-model",
        status: "PASS",
        attributes: {
          version: "1.0.0",
          dependency_health_status: "WARN",
          unstable_dependency_count: 1,
        },
      },
      {
        node_id: "control-surface:capability-governance:1",
        node_kind: "control_surface",
        display_name: "Capability Governance",
        digest: "capability-governance-digest",
        status: "PASS",
        attributes: {
          capability_count: 2,
          compatibility_status: "PASS",
        },
      },
      {
        node_id: "control-surface:capability-graph:1",
        node_kind: "control_surface",
        display_name: "Capability Graph",
        digest: "capability-graph-digest",
        status: "WARN",
        attributes: {
          warn_capability_count: 1,
        },
      },
      {
        node_id: "control-surface:gate-c:1",
        node_kind: "control_surface",
        display_name: "Gate C Snapshot",
        digest: "gate-c-digest",
        status: "WARN",
        attributes: {
          contributor_count: 4,
        },
      },
      {
        node_id: "verification-run:1",
        node_kind: "verification_run",
        display_name: "Verification Run",
        digest: "verification-run-digest",
        status: "PASS",
        attributes: {},
      },
      {
        node_id: "governance-session:1",
        node_kind: "governance_session",
        display_name: "Governance Session",
        digest: "governance-session-digest",
        status: "COMPLETED",
        attributes: {},
      },
      {
        node_id: "evidence-package:abc123",
        node_kind: "evidence_package",
        display_name: "evidence-package:abc123",
        digest: "evidence-package-digest",
        status: "MATERIALIZED",
        attributes: {},
      },
      {
        node_id: "certificate:abc123",
        node_kind: "certificate",
        display_name: "certificate:abc123",
        digest: "certificate-digest",
        status: "ISSUED",
        attributes: {},
      },
      {
        node_id: "attestation-event:abc123",
        node_kind: "attestation",
        display_name: "AttestationVerified",
        digest: "attestation-digest",
        status: "VERIFIED",
        attributes: {},
      },
      {
        node_id: "governance-view:health:1",
        node_kind: "read_model",
        display_name: "GovernanceHealthView",
        digest: "health-view-digest",
        status: "HEALTHY",
        attributes: {
          view_kind: "health",
        },
      },
    ],
    edges: [
      {
        edge_id: "edge-1",
        edge_kind: "DEPENDS_ON",
        from_node_id: "capability:governance-read-model",
        to_node_id: "capability:governance-evidence",
        rationale: "Read model depends on evidence.",
      },
      {
        edge_id: "edge-2",
          edge_kind: "CATALOGED_IN",
          from_node_id: "capability:governance-evidence",
          to_node_id: "control-surface:capability-governance:1",
          rationale: "Capability is cataloged in governance projection.",
        },
        {
          edge_id: "edge-3",
          edge_kind: "CATALOGED_IN",
          from_node_id: "capability:governance-read-model",
          to_node_id: "control-surface:capability-governance:1",
          rationale: "Capability is cataloged in governance projection.",
        },
        {
          edge_id: "edge-4",
          edge_kind: "PROJECTS_TO",
          from_node_id: "control-surface:capability-governance:1",
          to_node_id: "control-surface:capability-graph:1",
          rationale: "Governance projects dependency graph.",
        },
        {
          edge_id: "edge-5",
          edge_kind: "PROJECTS_TO",
          from_node_id: "control-surface:capability-graph:1",
          to_node_id: "control-surface:gate-c:1",
          rationale: "Capability graph projects drift signal to Gate C.",
        },
        {
          edge_id: "edge-6",
          edge_kind: "MATERIALIZES",
          from_node_id: "capability:governance-evidence",
          to_node_id: "evidence-package:abc123",
          rationale: "Evidence capability materializes package.",
        },
        {
          edge_id: "edge-7",
        edge_kind: "MATERIALIZES",
          from_node_id: "capability:governance-read-model",
          to_node_id: "governance-view:health:1",
          rationale: "Read model capability materializes view.",
        },
        {
          edge_id: "edge-8",
          edge_kind: "CERTIFIED_AS",
        from_node_id: "evidence-package:abc123",
        to_node_id: "certificate:abc123",
        rationale: "Package becomes certificate.",
      },
      {
          edge_id: "edge-9",
        edge_kind: "ATTESTED_BY",
        from_node_id: "certificate:abc123",
        to_node_id: "attestation-event:abc123",
        rationale: "Certificate is attested.",
      },
      {
          edge_id: "edge-10",
        edge_kind: "BINDS_SESSION",
        from_node_id: "verification-run:1",
        to_node_id: "governance-session:1",
        rationale: "Run binds session.",
      },
      {
          edge_id: "edge-11",
        edge_kind: "PROJECTS_TO",
        from_node_id: "governance-session:1",
        to_node_id: "governance-view:health:1",
        rationale: "Session projects read model.",
      },
      {
          edge_id: "edge-12",
        edge_kind: "ASSESSES",
        from_node_id: "verification-run:1",
        to_node_id: "evidence-package:abc123",
        rationale: "Run assesses evidence chain.",
      },
    ],
    claim_boundary: "fixture",
  };
}

function createGateCFixture() {
  return {
    overall: {
      capability_graph_governance_health_status: "WARN",
      capability_graph_unstable_dependency_count: 8,
      capability_graph_cycle_count: 0,
      enterprise_control_graph_status: "PASS",
      capability_governance_compatibility_status: "PASS",
      architecture_fitness_status: "PASS",
      governance_incremental_materialization_status: "PASS",
      governance_read_model_selective_execution_status: "APPLIED",
      trust_framework_status: "PASS",
    },
  };
}

test("SHOW capabilities filters by dependency health status", () => {
  const result = evaluateEnterpriseQuery({
    rawQuery: "SHOW capabilities WHERE dependency_health_status = WARN",
    graph: createGraphFixture(),
    gateCStatus: createGateCFixture(),
  });
  const payload = result.result as {
    readonly match_count: number;
    readonly matches: readonly Record<string, unknown>[];
  };

  assert.equal(result.status, "PASS");
  assert.equal(result.kind, "SHOW");
  assert.equal(payload.match_count, 1);
  assert.equal(payload.matches[0]?.display_name, "governance-read-model");
});

test("TRACE certificate returns upstream and downstream lineage", () => {
  const result = evaluateEnterpriseQuery({
    rawQuery: "TRACE certificate abc123",
    graph: createGraphFixture(),
    gateCStatus: createGateCFixture(),
  });
  const payload = result.result as {
    readonly start_node: Record<string, unknown>;
    readonly upstream_nodes: readonly Record<string, unknown>[];
    readonly downstream_nodes: readonly Record<string, unknown>[];
  };

  assert.equal(result.kind, "TRACE");
  assert.equal(payload.start_node.node_id, "certificate:abc123");
  assert.ok(
    payload.upstream_nodes.some(
      (node: Record<string, unknown>) => node.node_id === "evidence-package:abc123",
    ),
  );
  assert.ok(
    payload.downstream_nodes.some(
      (node: Record<string, unknown>) => node.node_id === "attestation-event:abc123",
    ),
  );
});

test("IMPACT capability includes dependents and materialized outputs", () => {
  const result = evaluateEnterpriseQuery({
    rawQuery: "IMPACT capability governance-evidence",
    graph: createGraphFixture(),
    gateCStatus: createGateCFixture(),
  });
  const payload = result.result as {
    readonly impacted_nodes: readonly Record<string, unknown>[];
  };

  assert.equal(result.kind, "IMPACT");
  assert.ok(
    payload.impacted_nodes.some(
      (node: Record<string, unknown>) => node.node_id === "capability:governance-read-model",
    ),
  );
  assert.ok(
    payload.impacted_nodes.some(
      (node: Record<string, unknown>) => node.node_id === "certificate:abc123",
    ),
  );
});

test("WHY gate-c = WARN explains graph health drift", () => {
  const result = evaluateEnterpriseQuery({
    rawQuery: "WHY gate-c = WARN",
    graph: createGraphFixture(),
    gateCStatus: createGateCFixture(),
  });
  const payload = result.result as {
    readonly gate_c_node: Record<string, unknown>;
    readonly reason_count: number;
    readonly reasons: readonly Record<string, unknown>[];
  };

  assert.equal(result.kind, "WHY");
  assert.equal(payload.gate_c_node.node_id, "control-surface:gate-c:1");
  assert.equal(payload.reason_count, 1);
  assert.equal(
    payload.reasons[0]?.node_id,
    "control-surface:capability-graph:1",
  );
  assert.deepEqual(payload.reasons[0]?.contributing_capabilities, [
    "governance-read-model",
  ]);
});
