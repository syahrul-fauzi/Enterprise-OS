// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine.js";
import type {
  ConstitutionClaims,
  ConstitutionSummary,
} from "./certificate-runtime.js";
import {
  computeGovernanceClaimsViewLineageDigest,
  computeGovernanceDashboardViewLineageDigest,
  computeGovernanceHealthViewLineageDigest,
  computeGovernanceSummaryViewLineageDigest,
  materializeGovernanceClaimsView,
  materializeGovernanceDashboardView,
  materializeGovernanceHealthView,
  materializeGovernanceReadModelMetrics,
  materializeGovernanceSummaryView,
  type GovernanceClaimsView,
  type GovernanceDashboardView,
  type GovernanceHealthView,
  type GovernanceReadModelArtifacts,
  type GovernanceReadModelSourceSession,
  type GovernanceSummaryView,
} from "./governance-read-model-runtime.js";

export type GovernanceReadModelSelectiveExecutionNodeId =
  | "summary_view"
  | "claims_view"
  | "health_view"
  | "dashboard_view"
  | "read_model_metrics";

export type GovernanceReadModelSelectiveExecutionDecision = {
  readonly node_id: GovernanceReadModelSelectiveExecutionNodeId;
  readonly action: "REUSE" | "REMATERIALIZE";
  readonly lineage_digest: string;
  readonly previous_output_digest: string | null;
  readonly current_output_digest: string;
  readonly reason: string;
};

export type GovernanceReadModelSelectiveExecutionReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly execution_scope: "verify-constitution" | "verify-foundation";
  readonly planner_status: "APPLIED";
  readonly delta_basis: {
    readonly basis_version: "1.0.0";
    readonly previous_source_session_digest: string | null;
    readonly previous_source_session_lineage_digest: string | null;
    readonly source_session_digest_changed: boolean;
    readonly source_session_lineage_changed: boolean;
    readonly delta_scope_status:
      | "NO_PREVIOUS_BASELINE"
      | "NO_CHANGE"
      | "METADATA_ONLY"
      | "MATERIALIZATION_REQUIRED";
  };
  readonly summary: {
    readonly reusable_node_count: number;
    readonly reused_node_count: number;
    readonly rematerialized_node_count: number;
    readonly execution_mode:
      | "FULL_REMATERIALIZATION"
      | "SELECTIVE_REUSE"
      | "METADATA_ONLY_REBIND";
    readonly reused_nodes: readonly GovernanceReadModelSelectiveExecutionNodeId[];
    readonly rematerialized_nodes: readonly GovernanceReadModelSelectiveExecutionNodeId[];
  };
  readonly decisions: readonly GovernanceReadModelSelectiveExecutionDecision[];
  readonly claim_boundary: string;
};

export type GovernanceReadModelSelectiveExecutionArtifacts = {
  readonly artifacts: GovernanceReadModelArtifacts;
  readonly report: GovernanceReadModelSelectiveExecutionReport;
};

function rebindSummaryView(
  previousView: GovernanceSummaryView,
  sourceSession: GovernanceReadModelSourceSession,
): GovernanceSummaryView {
  const payload = {
    view_kind: "summary" as const,
    source_session_id: sourceSession.session_id,
    source_session_digest: sourceSession.session_digest,
    source_session_lineage_digest: sourceSession.session_lineage_digest,
    source_claims_digest: previousView.source_claims_digest,
    source_summary_digest: previousView.source_summary_digest,
    status: previousView.status,
    claim_count: previousView.claim_count,
    violated_law_count: previousView.violated_law_count,
    laws_passed: previousView.laws_passed,
    laws_failed: previousView.laws_failed,
    constitutional_digest: previousView.constitutional_digest,
    law_profile: previousView.law_profile,
    proof_strength: previousView.proof_strength,
  };
  const viewDigest = DigestEngine.digest(payload);
  return {
    view_id: `governance-view:summary:${viewDigest.slice(0, 16)}`,
    view_digest: viewDigest,
    ...payload,
    view_boundary: previousView.view_boundary,
  };
}

function rebindClaimsView(
  previousView: GovernanceClaimsView,
  sourceSession: GovernanceReadModelSourceSession,
): GovernanceClaimsView {
  const payload = {
    view_kind: "claims" as const,
    source_session_id: sourceSession.session_id,
    source_session_digest: sourceSession.session_digest,
    source_session_lineage_digest: sourceSession.session_lineage_digest,
    source_claims_digest: previousView.source_claims_digest,
    status: previousView.status,
    claim_count: previousView.claim_count,
    violated_law_count: previousView.violated_law_count,
    laws_passed: previousView.laws_passed,
    laws_failed: previousView.laws_failed,
    constitutional_digest: previousView.constitutional_digest,
    proof_strength: previousView.proof_strength,
    claims: previousView.claims,
  };
  const viewDigest = DigestEngine.digest(payload);
  return {
    view_id: `governance-view:claims:${viewDigest.slice(0, 16)}`,
    view_digest: viewDigest,
    ...payload,
    view_boundary: previousView.view_boundary,
  };
}

function rebindHealthView(
  previousView: GovernanceHealthView,
  sourceSession: GovernanceReadModelSourceSession,
): GovernanceHealthView {
  const payload = {
    view_kind: "health" as const,
    source_session_id: sourceSession.session_id,
    source_session_digest: sourceSession.session_digest,
    source_session_lineage_digest: sourceSession.session_lineage_digest,
    source_summary_digest: previousView.source_summary_digest,
    health_status: previousView.health_status,
    governance_status: previousView.governance_status,
    proof_strength: previousView.proof_strength,
    claim_count: previousView.claim_count,
    violated_law_count: previousView.violated_law_count,
    laws_failed: previousView.laws_failed,
    constitutional_digest: previousView.constitutional_digest,
  };
  const viewDigest = DigestEngine.digest(payload);
  return {
    view_id: `governance-view:health:${viewDigest.slice(0, 16)}`,
    view_digest: viewDigest,
    ...payload,
    view_boundary: previousView.view_boundary,
  };
}

function rebindDashboardView(
  previousView: GovernanceDashboardView,
  sourceSession: GovernanceReadModelSourceSession,
): GovernanceDashboardView {
  const payload = {
    view_kind: "dashboard" as const,
    source_session_id: sourceSession.session_id,
    source_session_digest: sourceSession.session_digest,
    source_session_lineage_digest: sourceSession.session_lineage_digest,
    source_claims_digest: previousView.source_claims_digest,
    source_summary_digest: previousView.source_summary_digest,
    status: previousView.status,
    proof_strength: previousView.proof_strength,
    claim_count: previousView.claim_count,
    violated_law_count: previousView.violated_law_count,
    laws_passed: previousView.laws_passed,
    laws_failed: previousView.laws_failed,
    constitutional_digest: previousView.constitutional_digest,
    highlighted_claims: previousView.highlighted_claims,
  };
  const viewDigest = DigestEngine.digest(payload);
  return {
    view_id: `governance-view:dashboard:${viewDigest.slice(0, 16)}`,
    view_digest: viewDigest,
    ...payload,
    view_boundary: previousView.view_boundary,
  };
}

export function materializeGovernanceReadModelArtifactsWithSelectiveExecution(input: {
  readonly executionScope: "verify-constitution" | "verify-foundation";
  readonly claims: ConstitutionClaims;
  readonly summary: ConstitutionSummary;
}, options?: {
  readonly consumerCount?: number;
  readonly sourceGeneratedAtUtc?: string | null;
  readonly sourceSession?: GovernanceReadModelSourceSession;
  readonly previousArtifacts?: GovernanceReadModelArtifacts | null;
}): GovernanceReadModelSelectiveExecutionArtifacts {
  const sourceSession = options?.sourceSession ?? {
    session_id: "governance-session:unbound",
    session_digest: "UNBOUND",
    session_lineage_digest: "UNBOUND",
  };
  const currentClaimsDigest = DigestEngine.digest(input.claims);
  const currentSummaryDigest = DigestEngine.digest(input.summary);
  const previousArtifacts = options?.previousArtifacts ?? null;
  const previousSourceSessionDigest =
    previousArtifacts?.summaryView.source_session_digest ?? null;
  const previousSourceSessionLineageDigest =
    previousArtifacts?.summaryView.source_session_lineage_digest ?? null;
  const sourceSessionDigestChanged =
    previousSourceSessionDigest === null
      ? true
      : previousSourceSessionDigest !== sourceSession.session_digest;
  const sourceSessionLineageChanged =
    previousSourceSessionLineageDigest === null
      ? true
      : previousSourceSessionLineageDigest !==
        sourceSession.session_lineage_digest;

  const summaryLineageDigest = computeGovernanceSummaryViewLineageDigest({
    sourceSessionLineageDigest: sourceSession.session_lineage_digest,
    sourceClaimsDigest: currentClaimsDigest,
    sourceSummaryDigest: currentSummaryDigest,
  });
  const claimsLineageDigest = computeGovernanceClaimsViewLineageDigest({
    sourceSessionLineageDigest: sourceSession.session_lineage_digest,
    sourceClaimsDigest: currentClaimsDigest,
  });
  const healthLineageDigest = computeGovernanceHealthViewLineageDigest({
    sourceSessionLineageDigest: sourceSession.session_lineage_digest,
    sourceSummaryDigest: currentSummaryDigest,
  });
  const dashboardLineageDigest = computeGovernanceDashboardViewLineageDigest({
    sourceSessionLineageDigest: sourceSession.session_lineage_digest,
    sourceClaimsDigest: currentClaimsDigest,
    sourceSummaryDigest: currentSummaryDigest,
  });

  const summaryReusable =
    previousArtifacts?.summaryView.source_session_lineage_digest ===
      sourceSession.session_lineage_digest &&
    previousArtifacts.summaryView.source_claims_digest === currentClaimsDigest &&
    previousArtifacts.summaryView.source_summary_digest === currentSummaryDigest;
  const claimsReusable =
    previousArtifacts?.claimsView.source_session_lineage_digest ===
      sourceSession.session_lineage_digest &&
    previousArtifacts.claimsView.source_claims_digest === currentClaimsDigest;
  const healthReusable =
    previousArtifacts?.healthView.source_session_lineage_digest ===
      sourceSession.session_lineage_digest &&
    previousArtifacts.healthView.source_summary_digest === currentSummaryDigest;
  const dashboardReusable =
    previousArtifacts?.dashboardView.source_session_lineage_digest ===
      sourceSession.session_lineage_digest &&
    previousArtifacts.dashboardView.source_claims_digest === currentClaimsDigest &&
    previousArtifacts.dashboardView.source_summary_digest === currentSummaryDigest;
  const deltaScopeStatus =
    previousArtifacts === null
      ? ("NO_PREVIOUS_BASELINE" as const)
      : !sourceSessionDigestChanged && !sourceSessionLineageChanged
        ? ("NO_CHANGE" as const)
        : sourceSessionDigestChanged && !sourceSessionLineageChanged
          ? ("METADATA_ONLY" as const)
          : ("MATERIALIZATION_REQUIRED" as const);

  const summaryView = summaryReusable
    ? rebindSummaryView(previousArtifacts.summaryView, sourceSession)
    : materializeGovernanceSummaryView({
        claims: input.claims,
        summary: input.summary,
        sourceSession,
      });
  const claimsView = claimsReusable
    ? rebindClaimsView(previousArtifacts.claimsView, sourceSession)
    : materializeGovernanceClaimsView({
        claims: input.claims,
        sourceSession,
      });
  const healthView = healthReusable
    ? rebindHealthView(previousArtifacts.healthView, sourceSession)
    : materializeGovernanceHealthView(summaryView);
  const dashboardView = dashboardReusable
    ? rebindDashboardView(previousArtifacts.dashboardView, sourceSession)
    : materializeGovernanceDashboardView({
        claimsView,
        summaryView,
      });
  const metrics = materializeGovernanceReadModelMetrics({
    summaryView,
    claimsView,
    healthView,
    dashboardView,
    summaryDurationMs: summaryReusable ? 0 : 1,
    claimsDurationMs: claimsReusable ? 0 : 1,
    healthDurationMs: healthReusable ? 0 : 1,
    dashboardDurationMs: dashboardReusable ? 0 : 1,
    generationDurationMs: 1,
    consumerCount: options?.consumerCount ?? 0,
    generatedAtUtc: new Date().toISOString(),
    sourceGeneratedAtUtc: options?.sourceGeneratedAtUtc ?? null,
  });

  const decisions = [
    {
      node_id: "summary_view" as const,
      action: summaryReusable ? ("REUSE" as const) : ("REMATERIALIZE" as const),
      lineage_digest: summaryLineageDigest,
      previous_output_digest: previousArtifacts?.summaryView.view_digest ?? null,
      current_output_digest: summaryView.view_digest,
      reason: summaryReusable
        ? deltaScopeStatus === "METADATA_ONLY"
          ? "Summary view lineage is unchanged and the session delta is metadata-only, so the prior projection is rebound without semantic rematerialization."
          : "Summary view lineage is unchanged, so the prior projection is rebound to the current session."
        : "Summary view lineage changed or prior projection is unavailable, so the view is rematerialized.",
    },
    {
      node_id: "claims_view" as const,
      action: claimsReusable ? ("REUSE" as const) : ("REMATERIALIZE" as const),
      lineage_digest: claimsLineageDigest,
      previous_output_digest: previousArtifacts?.claimsView.view_digest ?? null,
      current_output_digest: claimsView.view_digest,
      reason: claimsReusable
        ? deltaScopeStatus === "METADATA_ONLY"
          ? "Claims view lineage is unchanged and the session delta is metadata-only, so the prior projection is rebound without semantic rematerialization."
          : "Claims view lineage is unchanged, so the prior projection is rebound to the current session."
        : "Claims view lineage changed or prior projection is unavailable, so the view is rematerialized.",
    },
    {
      node_id: "health_view" as const,
      action: healthReusable ? ("REUSE" as const) : ("REMATERIALIZE" as const),
      lineage_digest: healthLineageDigest,
      previous_output_digest: previousArtifacts?.healthView.view_digest ?? null,
      current_output_digest: healthView.view_digest,
      reason: healthReusable
        ? deltaScopeStatus === "METADATA_ONLY"
          ? "Health view lineage is unchanged and the session delta is metadata-only, so the prior projection is rebound without semantic rematerialization."
          : "Health view lineage is unchanged, so the prior projection is rebound to the current session."
        : "Health view lineage changed or prior projection is unavailable, so the view is rematerialized.",
    },
    {
      node_id: "dashboard_view" as const,
      action: dashboardReusable
        ? ("REUSE" as const)
        : ("REMATERIALIZE" as const),
      lineage_digest: dashboardLineageDigest,
      previous_output_digest: previousArtifacts?.dashboardView.view_digest ?? null,
      current_output_digest: dashboardView.view_digest,
      reason: dashboardReusable
        ? deltaScopeStatus === "METADATA_ONLY"
          ? "Dashboard view lineage is unchanged and the session delta is metadata-only, so the prior projection is rebound without semantic rematerialization."
          : "Dashboard view lineage is unchanged, so the prior projection is rebound to the current session."
        : "Dashboard view lineage changed or prior projection is unavailable, so the view is rematerialized.",
    },
    {
      node_id: "read_model_metrics" as const,
      action: "REMATERIALIZE" as const,
      lineage_digest: DigestEngine.digest({
        source_session_lineage_digest: sourceSession.session_lineage_digest,
        source_generated_at_utc: options?.sourceGeneratedAtUtc ?? null,
        summary_view_digest: summaryView.view_digest,
        claims_view_digest: claimsView.view_digest,
        health_view_digest: healthView.view_digest,
        dashboard_view_digest: dashboardView.view_digest,
      }),
      previous_output_digest: previousArtifacts?.metrics.metrics_digest ?? null,
      current_output_digest: metrics.metrics_digest,
      reason:
        deltaScopeStatus === "METADATA_ONLY"
          ? "Read-model metrics remain freshly materialized even for metadata-only session deltas so timing and freshness evidence stay execution-accurate while semantic projections are reused."
          : "Read-model metrics remain freshly materialized so timing and freshness evidence stay execution-accurate.",
    },
  ] as const;
  const executionMode =
    deltaScopeStatus === "METADATA_ONLY"
      ? ("METADATA_ONLY_REBIND" as const)
      : decisions
            .filter((entry) => entry.node_id !== "read_model_metrics")
            .every((entry) => entry.action === "REMATERIALIZE")
        ? ("FULL_REMATERIALIZATION" as const)
        : ("SELECTIVE_REUSE" as const);

  const summary = {
    reusable_node_count: decisions.length - 1,
    reused_node_count: decisions.filter((entry) => entry.action === "REUSE")
      .length,
    rematerialized_node_count: decisions.filter(
      (entry) => entry.action === "REMATERIALIZE",
    ).length,
    execution_mode: executionMode,
    reused_nodes: decisions
      .filter((entry) => entry.action === "REUSE")
      .map((entry) => entry.node_id),
    rematerialized_nodes: decisions
      .filter((entry) => entry.action === "REMATERIALIZE")
      .map((entry) => entry.node_id),
  };
  const payload = {
    execution_scope: input.executionScope,
    planner_status: "APPLIED" as const,
    delta_basis: {
      basis_version: "1.0.0" as const,
      previous_source_session_digest: previousSourceSessionDigest,
      previous_source_session_lineage_digest: previousSourceSessionLineageDigest,
      source_session_digest_changed: sourceSessionDigestChanged,
      source_session_lineage_changed: sourceSessionLineageChanged,
      delta_scope_status: deltaScopeStatus,
    },
    summary,
    decisions,
  };

  return {
    artifacts: {
      summaryView,
      claimsView,
      healthView,
      dashboardView,
      metrics,
    },
    report: {
      report_version: "1.0.0",
      report_digest: DigestEngine.digest(payload),
      ...payload,
      claim_boundary:
        "Read-model selective execution reuses semantic projections when the session lineage and source digests are unchanged, then rebinds them to the current session execution. It now makes metadata-only session deltas explicit so downstream schedulers can skip semantic rematerialization while keeping operational metrics fresh and truthful.",
    },
  };
}
