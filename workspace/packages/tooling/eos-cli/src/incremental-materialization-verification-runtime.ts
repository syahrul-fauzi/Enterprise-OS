import { DigestEngine } from "@repo/core-kernel";
import type {
  GovernanceIncrementalMaterializationReport,
  GovernanceMaterializationNodeId,
} from "./incremental-materialization-runtime.js";

export type GovernanceIncrementalMaterializationVerificationReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly summary: {
    readonly invalidation_graph_status: "PASS" | "FAIL";
    readonly selective_execution_status: "PASS" | "FAIL";
    readonly delta_basis_status: "PASS" | "FAIL";
    readonly reuse_observability_status: "PASS" | "FAIL";
    readonly impact_consistency_status: "PASS" | "FAIL";
    readonly overall_status: "PASS" | "FAIL";
  };
  readonly execution_scope: "verify-constitution" | "verify-foundation";
  readonly session_id: string;
  readonly baseline: {
    readonly report_digest: string;
    readonly previous_report_digest: string | null;
    readonly node_count: number;
    readonly edge_count: number;
    readonly changed_node_count: number;
    readonly impacted_node_count: number;
    readonly reusable_node_count: number;
    readonly session_digest_changed: boolean;
    readonly session_projection_digest_changed: boolean;
    readonly delta_mode:
      | "NO_PREVIOUS_BASELINE"
      | "SESSION_DELTA"
      | "PROJECTION_DELTA"
      | "NO_CHANGE";
    readonly delta_scope_status:
      | "NO_CHANGE"
      | "METADATA_ONLY"
      | "MATERIALIZATION_REQUIRED";
    readonly directly_changed_nodes: readonly GovernanceMaterializationNodeId[];
    readonly impacted_nodes: readonly GovernanceMaterializationNodeId[];
  };
  readonly claim_boundary: string;
};

export function materializeGovernanceIncrementalMaterializationVerificationReport(
  report: GovernanceIncrementalMaterializationReport,
): GovernanceIncrementalMaterializationVerificationReport {
  const changedNodeSet = new Set(report.summary.directly_changed_nodes);
  const impactedNodeSet = new Set(report.summary.impacted_nodes);
  const impactConsistencyStatus = [...changedNodeSet].every((nodeId) =>
    impactedNodeSet.has(nodeId),
  )
    ? ("PASS" as const)
    : ("FAIL" as const);
  const invalidationGraphStatus =
    report.invalidation_lineage_status === "EXPLICIT" &&
    report.summary.node_count === report.nodes.length &&
    report.summary.edge_count === report.edges.length &&
    report.nodes.length > 0 &&
    report.edges.length > 0
      ? ("PASS" as const)
      : ("FAIL" as const);
  const selectiveExecutionStatus =
    report.selective_execution_status === "APPLIED"
      ? ("PASS" as const)
      : ("FAIL" as const);
  const deltaBasisStatus =
    report.delta_basis.basis_version === "1.0.0" &&
    report.delta_basis.session_digest_changed ===
      report.summary.session_digest_changed &&
    report.delta_basis.session_projection_digest_changed ===
      report.summary.session_projection_digest_changed &&
    report.delta_basis.delta_mode === report.summary.delta_mode &&
    report.delta_basis.delta_scope_status === report.summary.delta_scope_status
      ? ("PASS" as const)
      : ("FAIL" as const);
  const reuseObservabilityStatus =
    report.summary.reusable_node_count > 0 ? ("PASS" as const) : ("FAIL" as const);
  const summary = {
    invalidation_graph_status: invalidationGraphStatus,
    selective_execution_status: selectiveExecutionStatus,
    delta_basis_status: deltaBasisStatus,
    reuse_observability_status: reuseObservabilityStatus,
    impact_consistency_status: impactConsistencyStatus,
    overall_status:
      invalidationGraphStatus === "PASS" &&
      selectiveExecutionStatus === "PASS" &&
      deltaBasisStatus === "PASS" &&
      reuseObservabilityStatus === "PASS" &&
      impactConsistencyStatus === "PASS"
        ? ("PASS" as const)
        : ("FAIL" as const),
  };
  const baseline = {
    report_digest: report.report_digest,
    previous_report_digest: report.previous_report_digest,
    node_count: report.summary.node_count,
    edge_count: report.summary.edge_count,
    changed_node_count: report.summary.changed_node_count,
    impacted_node_count: report.summary.impacted_node_count,
    reusable_node_count: report.summary.reusable_node_count,
    session_digest_changed: report.summary.session_digest_changed,
    session_projection_digest_changed:
      report.summary.session_projection_digest_changed,
    delta_mode: report.summary.delta_mode,
    delta_scope_status: report.summary.delta_scope_status,
    directly_changed_nodes: report.summary.directly_changed_nodes,
    impacted_nodes: report.summary.impacted_nodes,
  };
  const payload = {
    summary,
    execution_scope: report.execution_scope,
    session_id: report.session_id,
    baseline,
  };

  return {
    report_version: "1.0.0",
    report_digest: DigestEngine.digest(payload),
    ...payload,
    claim_boundary:
      "Incremental materialization verification turns the invalidation graph into an operational governance control. It proves that the graph is explicit, selective execution is applied, digest-based delta basis is coherent, reuse remains observable, and impacted nodes consistently include all directly changed nodes before the report is trusted by repository governance.",
  };
}
