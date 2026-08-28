// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine.js";
import { performance } from "node:perf_hooks";
import type {
  ConstitutionClaims,
  ConstitutionClaim,
  ConstitutionSummary,
} from "./certificate-runtime.js";

export type GovernanceReadModelSourceSession = {
  readonly session_id: string;
  readonly session_digest: string;
  readonly session_lineage_digest: string;
};

export type GovernanceSummaryView = {
  readonly view_id: string;
  readonly view_digest: string;
  readonly view_kind: "summary";
  readonly source_session_id: string;
  readonly source_session_digest: string;
  readonly source_session_lineage_digest: string;
  readonly source_claims_digest: string;
  readonly source_summary_digest: string;
  readonly status: "PASS" | "FAIL";
  readonly claim_count: number;
  readonly violated_law_count: number;
  readonly laws_passed: number;
  readonly laws_failed: number;
  readonly constitutional_digest: string;
  readonly law_profile: string;
  readonly proof_strength: "baseline" | "proof-centric";
  readonly view_boundary: string;
};

export type GovernanceClaimsView = {
  readonly view_id: string;
  readonly view_digest: string;
  readonly view_kind: "claims";
  readonly source_session_id: string;
  readonly source_session_digest: string;
  readonly source_session_lineage_digest: string;
  readonly source_claims_digest: string;
  readonly status: "PASS" | "FAIL";
  readonly claim_count: number;
  readonly violated_law_count: number;
  readonly laws_passed: number;
  readonly laws_failed: number;
  readonly constitutional_digest: string;
  readonly proof_strength: "baseline" | "proof-centric";
  readonly claims: readonly ConstitutionClaim[];
  readonly view_boundary: string;
};

export type GovernanceHealthView = {
  readonly view_id: string;
  readonly view_digest: string;
  readonly view_kind: "health";
  readonly source_session_id: string;
  readonly source_session_digest: string;
  readonly source_session_lineage_digest: string;
  readonly source_summary_digest: string;
  readonly health_status: "HEALTHY" | "DEGRADED" | "UNVERIFIED";
  readonly governance_status: "PASS" | "FAIL" | "UNVERIFIED";
  readonly proof_strength: "baseline" | "proof-centric";
  readonly claim_count: number;
  readonly violated_law_count: number;
  readonly laws_failed: number;
  readonly constitutional_digest: string;
  readonly view_boundary: string;
};

export type GovernanceDashboardView = {
  readonly view_id: string;
  readonly view_digest: string;
  readonly view_kind: "dashboard";
  readonly source_session_id: string;
  readonly source_session_digest: string;
  readonly source_session_lineage_digest: string;
  readonly source_claims_digest: string;
  readonly source_summary_digest: string;
  readonly status: "PASS" | "FAIL";
  readonly proof_strength: "baseline" | "proof-centric";
  readonly claim_count: number;
  readonly violated_law_count: number;
  readonly laws_passed: number;
  readonly laws_failed: number;
  readonly constitutional_digest: string;
  readonly highlighted_claims: readonly ConstitutionClaim[];
  readonly view_boundary: string;
};

export type GovernanceReadModelMetric = {
  readonly view_kind: "summary" | "claims" | "health" | "dashboard";
  readonly source_digest: string;
  readonly generation_digest: string;
  readonly materialization_latency_ms: number;
  readonly generation_duration_ms: number;
  readonly freshness_ms: number;
  readonly consumer_count: number;
};

export type GovernanceReadModelMetrics = {
  readonly metrics_id: string;
  readonly metrics_digest: string;
  readonly capability_id: "governance-read-model";
  readonly source_session_id: string;
  readonly source_session_digest: string;
  readonly source_session_lineage_digest: string;
  readonly generated_at_utc: string;
  readonly source_generated_at_utc: string | null;
  readonly source_digest: string;
  readonly generation_digest: string;
  readonly freshness_ms: number;
  readonly materialization_latency_ms: number;
  readonly generation_duration_ms: number;
  readonly consumer_count: number;
  readonly read_models: readonly GovernanceReadModelMetric[];
  readonly claim_boundary: string;
};

export type GovernanceReadModelArtifacts = {
  readonly summaryView: GovernanceSummaryView;
  readonly claimsView: GovernanceClaimsView;
  readonly healthView: GovernanceHealthView;
  readonly dashboardView: GovernanceDashboardView;
  readonly metrics: GovernanceReadModelMetrics;
};

type TimedResult<T> = {
  readonly value: T;
  readonly durationMs: number;
};

function time<T>(work: () => T): TimedResult<T> {
  const startedAt = performance.now();
  const value = work();
  return {
    value,
    durationMs: Number((performance.now() - startedAt).toFixed(3)),
  };
}

function sourceDigestForView(input: {
  readonly sourceSessionLineageDigest?: string;
  readonly sourceClaimsDigest?: string;
  readonly sourceSummaryDigest?: string;
}): string {
  return DigestEngine.digest({
    source_session_lineage_digest: input.sourceSessionLineageDigest ?? null,
    source_claims_digest: input.sourceClaimsDigest ?? null,
    source_summary_digest: input.sourceSummaryDigest ?? null,
  });
}

export function computeGovernanceSummaryViewLineageDigest(input: {
  readonly sourceSessionLineageDigest: string;
  readonly sourceClaimsDigest: string;
  readonly sourceSummaryDigest: string;
}): string {
  return DigestEngine.digest({
    view_kind: "summary",
    source_session_lineage_digest: input.sourceSessionLineageDigest,
    source_claims_digest: input.sourceClaimsDigest,
    source_summary_digest: input.sourceSummaryDigest,
  });
}

export function computeGovernanceClaimsViewLineageDigest(input: {
  readonly sourceSessionLineageDigest: string;
  readonly sourceClaimsDigest: string;
}): string {
  return DigestEngine.digest({
    view_kind: "claims",
    source_session_lineage_digest: input.sourceSessionLineageDigest,
    source_claims_digest: input.sourceClaimsDigest,
  });
}

export function computeGovernanceHealthViewLineageDigest(input: {
  readonly sourceSessionLineageDigest: string;
  readonly sourceSummaryDigest: string;
}): string {
  return DigestEngine.digest({
    view_kind: "health",
    source_session_lineage_digest: input.sourceSessionLineageDigest,
    source_summary_digest: input.sourceSummaryDigest,
  });
}

export function computeGovernanceDashboardViewLineageDigest(input: {
  readonly sourceSessionLineageDigest: string;
  readonly sourceClaimsDigest: string;
  readonly sourceSummaryDigest: string;
}): string {
  return DigestEngine.digest({
    view_kind: "dashboard",
    source_session_lineage_digest: input.sourceSessionLineageDigest,
    source_claims_digest: input.sourceClaimsDigest,
    source_summary_digest: input.sourceSummaryDigest,
  });
}

export function materializeGovernanceReadModelMetrics(input: {
  readonly summaryView: GovernanceSummaryView;
  readonly claimsView: GovernanceClaimsView;
  readonly healthView: GovernanceHealthView;
  readonly dashboardView: GovernanceDashboardView;
  readonly summaryDurationMs: number;
  readonly claimsDurationMs: number;
  readonly healthDurationMs: number;
  readonly dashboardDurationMs: number;
  readonly generationDurationMs: number;
  readonly consumerCount: number;
  readonly generatedAtUtc: string;
  readonly sourceGeneratedAtUtc: string | null;
}): GovernanceReadModelMetrics {
  const generatedAtMs = Date.parse(input.generatedAtUtc);
  const sourceGeneratedAtMs = input.sourceGeneratedAtUtc
    ? Date.parse(input.sourceGeneratedAtUtc)
    : NaN;
  const freshnessMs = Number.isFinite(generatedAtMs) &&
    Number.isFinite(sourceGeneratedAtMs)
    ? Math.max(0, generatedAtMs - sourceGeneratedAtMs)
    : 0;
  const readModels: readonly GovernanceReadModelMetric[] = [
    {
      view_kind: "summary",
      source_digest: sourceDigestForView({
        sourceSessionLineageDigest:
          input.summaryView.source_session_lineage_digest,
        sourceClaimsDigest: input.summaryView.source_claims_digest,
        sourceSummaryDigest: input.summaryView.source_summary_digest,
      }),
      generation_digest: input.summaryView.view_digest,
      materialization_latency_ms: input.summaryDurationMs,
      generation_duration_ms: input.summaryDurationMs,
      freshness_ms: freshnessMs,
      consumer_count: input.consumerCount,
    },
    {
      view_kind: "claims",
      source_digest: sourceDigestForView({
        sourceSessionLineageDigest:
          input.claimsView.source_session_lineage_digest,
        sourceClaimsDigest: input.claimsView.source_claims_digest,
      }),
      generation_digest: input.claimsView.view_digest,
      materialization_latency_ms: input.claimsDurationMs,
      generation_duration_ms: input.claimsDurationMs,
      freshness_ms: freshnessMs,
      consumer_count: input.consumerCount,
    },
    {
      view_kind: "health",
      source_digest: sourceDigestForView({
        sourceSessionLineageDigest:
          input.healthView.source_session_lineage_digest,
        sourceSummaryDigest: input.healthView.source_summary_digest,
      }),
      generation_digest: input.healthView.view_digest,
      materialization_latency_ms: input.healthDurationMs,
      generation_duration_ms: input.healthDurationMs,
      freshness_ms: freshnessMs,
      consumer_count: input.consumerCount,
    },
    {
      view_kind: "dashboard",
      source_digest: sourceDigestForView({
        sourceSessionLineageDigest:
          input.dashboardView.source_session_lineage_digest,
        sourceClaimsDigest: input.dashboardView.source_claims_digest,
        sourceSummaryDigest: input.dashboardView.source_summary_digest,
      }),
      generation_digest: input.dashboardView.view_digest,
      materialization_latency_ms: input.dashboardDurationMs,
      generation_duration_ms: input.dashboardDurationMs,
      freshness_ms: freshnessMs,
      consumer_count: input.consumerCount,
    },
  ];
  const sourceDigest = DigestEngine.digest(readModels.map((entry) => entry.source_digest));
  const generationDigest = DigestEngine.digest(
    readModels.map((entry) => entry.generation_digest),
  );
  const payload = {
    capability_id: "governance-read-model" as const,
    source_session_id: input.summaryView.source_session_id,
    source_session_digest: input.summaryView.source_session_digest,
    source_session_lineage_digest:
      input.summaryView.source_session_lineage_digest,
    generated_at_utc: input.generatedAtUtc,
    source_generated_at_utc: input.sourceGeneratedAtUtc,
    source_digest: sourceDigest,
    generation_digest: generationDigest,
    freshness_ms: freshnessMs,
    materialization_latency_ms: Math.max(
      input.summaryDurationMs,
      input.claimsDurationMs,
      input.healthDurationMs,
      input.dashboardDurationMs,
    ),
    generation_duration_ms: input.generationDurationMs,
    consumer_count: input.consumerCount,
    read_models: readModels,
  };
  const metricsDigest = DigestEngine.digest(payload);

  return {
    metrics_id: `governance-read-model-metrics:${metricsDigest.slice(0, 16)}`,
    metrics_digest: metricsDigest,
    ...payload,
    claim_boundary:
      "Governance read model metrics capture materialization freshness, generation timing, source digests, output digests, and consumer exposure for the governance-read-model capability. They evaluate projection quality without inspecting governance evidence internals.",
  };
}

export function materializeGovernanceSummaryView(input: {
  readonly claims: ConstitutionClaims;
  readonly summary: ConstitutionSummary;
  readonly sourceSession: GovernanceReadModelSourceSession;
}): GovernanceSummaryView {
  const sourceClaimsDigest = DigestEngine.digest(input.claims);
  const sourceSummaryDigest = DigestEngine.digest(input.summary);
  const payload = {
    view_kind: "summary" as const,
    source_session_id: input.sourceSession.session_id,
    source_session_digest: input.sourceSession.session_digest,
    source_session_lineage_digest: input.sourceSession.session_lineage_digest,
    source_claims_digest: sourceClaimsDigest,
    source_summary_digest: sourceSummaryDigest,
    status: input.summary.status,
    claim_count: input.summary.claim_count,
    violated_law_count: input.summary.violated_law_count,
    laws_passed: input.summary.laws_passed,
    laws_failed: input.summary.laws_failed,
    constitutional_digest: input.summary.constitutional_digest,
    law_profile: input.summary.law_profile,
    proof_strength: input.summary.proof_strength,
  };
  const viewDigest = DigestEngine.digest(payload);

  return {
    view_id: `governance-view:summary:${viewDigest.slice(0, 16)}`,
    view_digest: viewDigest,
    ...payload,
    view_boundary:
      "Governance summary view is the application read model for governance status. It is projected from presentation-safe governance artifacts and does not expose proof fragments or law-result payloads.",
  };
}

export function materializeGovernanceClaimsView(
  input: {
    readonly claims: ConstitutionClaims;
    readonly sourceSession: GovernanceReadModelSourceSession;
  },
): GovernanceClaimsView {
  const sourceClaimsDigest = DigestEngine.digest(input.claims);
  const payload = {
    view_kind: "claims" as const,
    source_session_id: input.sourceSession.session_id,
    source_session_digest: input.sourceSession.session_digest,
    source_session_lineage_digest: input.sourceSession.session_lineage_digest,
    source_claims_digest: sourceClaimsDigest,
    status: input.claims.status,
    claim_count: input.claims.claim_count,
    violated_law_count: input.claims.violated_law_count,
    laws_passed: input.claims.laws_passed,
    laws_failed: input.claims.laws_failed,
    constitutional_digest: input.claims.constitutional_digest,
    proof_strength: input.claims.proof_strength,
    claims: input.claims.claims,
  };
  const viewDigest = DigestEngine.digest(payload);

  return {
    view_id: `governance-view:claims:${viewDigest.slice(0, 16)}`,
    view_digest: viewDigest,
    ...payload,
    view_boundary:
      "Governance claims view is the application-facing projection of digest-addressed constitutional claims. It remains safe for reporting and dashboard consumers.",
  };
}

export function materializeGovernanceHealthView(
  summaryView: GovernanceSummaryView,
): GovernanceHealthView {
  const governanceStatus = summaryView.status;
  const lawsFailed = summaryView.laws_failed;
  const healthStatus =
    governanceStatus === "PASS" && lawsFailed === 0
      ? ("HEALTHY" as const)
      : governanceStatus === "FAIL"
        ? ("DEGRADED" as const)
        : ("UNVERIFIED" as const);
  const normalizedGovernanceStatus =
    governanceStatus === "PASS" || governanceStatus === "FAIL"
      ? governanceStatus
      : ("UNVERIFIED" as const);
  const payload = {
    view_kind: "health" as const,
    source_session_id: summaryView.source_session_id,
    source_session_digest: summaryView.source_session_digest,
    source_session_lineage_digest: summaryView.source_session_lineage_digest,
    source_summary_digest: summaryView.source_summary_digest,
    health_status: healthStatus,
    governance_status: normalizedGovernanceStatus,
    proof_strength: summaryView.proof_strength,
    claim_count: summaryView.claim_count,
    violated_law_count: summaryView.violated_law_count,
    laws_failed: summaryView.laws_failed,
    constitutional_digest: summaryView.constitutional_digest,
  };
  const viewDigest = DigestEngine.digest(payload);

  return {
    view_id: `governance-view:health:${viewDigest.slice(0, 16)}`,
    view_digest: viewDigest,
    ...payload,
    view_boundary:
      "Governance health view is a derived application health projection from governance summary view. It intentionally collapses governance state into health semantics for clients.",
  };
}

export function materializeGovernanceDashboardView(input: {
  readonly claimsView: GovernanceClaimsView;
  readonly summaryView: GovernanceSummaryView;
}): GovernanceDashboardView {
  const highlightedClaims = input.claimsView.claims
    .filter((claim) => claim.status !== "PASS")
    .slice(0, 5);
  const payload = {
    view_kind: "dashboard" as const,
    source_session_id: input.summaryView.source_session_id,
    source_session_digest: input.summaryView.source_session_digest,
    source_session_lineage_digest:
      input.summaryView.source_session_lineage_digest,
    source_claims_digest: input.claimsView.source_claims_digest,
    source_summary_digest: input.summaryView.source_summary_digest,
    status: input.summaryView.status,
    proof_strength: input.summaryView.proof_strength,
    claim_count: input.summaryView.claim_count,
    violated_law_count: input.summaryView.violated_law_count,
    laws_passed: input.summaryView.laws_passed,
    laws_failed: input.summaryView.laws_failed,
    constitutional_digest: input.summaryView.constitutional_digest,
    highlighted_claims: highlightedClaims,
  };
  const viewDigest = DigestEngine.digest(payload);

  return {
    view_id: `governance-view:dashboard:${viewDigest.slice(0, 16)}`,
    view_digest: viewDigest,
    ...payload,
    view_boundary:
      "Governance dashboard view is the application dashboard projection. It surfaces status metrics and highlighted claims without exposing governance evidence internals.",
  };
}

export function materializeGovernanceReadModelArtifacts(input: {
  readonly claims: ConstitutionClaims;
  readonly summary: ConstitutionSummary;
}, options?: {
  readonly consumerCount?: number;
  readonly sourceGeneratedAtUtc?: string | null;
  readonly sourceSession?: GovernanceReadModelSourceSession;
}): GovernanceReadModelArtifacts {
  const sourceSession = options?.sourceSession ?? {
    session_id: "governance-session:unbound",
    session_digest: "UNBOUND",
    session_lineage_digest: "UNBOUND",
  };
  const generationStartedAt = performance.now();
  const timedSummaryView = time(() =>
    materializeGovernanceSummaryView({
      ...input,
      sourceSession,
    }),
  );
  const timedClaimsView = time(() =>
    materializeGovernanceClaimsView({
      claims: input.claims,
      sourceSession,
    }),
  );
  const timedHealthView = time(() =>
    materializeGovernanceHealthView(timedSummaryView.value),
  );
  const timedDashboardView = time(() =>
    materializeGovernanceDashboardView({
      claimsView: timedClaimsView.value,
      summaryView: timedSummaryView.value,
    }),
  );
  const generatedAtUtc = new Date().toISOString();
  const metrics = materializeGovernanceReadModelMetrics({
    summaryView: timedSummaryView.value,
    claimsView: timedClaimsView.value,
    healthView: timedHealthView.value,
    dashboardView: timedDashboardView.value,
    summaryDurationMs: timedSummaryView.durationMs,
    claimsDurationMs: timedClaimsView.durationMs,
    healthDurationMs: timedHealthView.durationMs,
    dashboardDurationMs: timedDashboardView.durationMs,
    generationDurationMs: Number(
      (performance.now() - generationStartedAt).toFixed(3),
    ),
    consumerCount: options?.consumerCount ?? 0,
    generatedAtUtc,
    sourceGeneratedAtUtc: options?.sourceGeneratedAtUtc ?? null,
  });

  return {
    summaryView: timedSummaryView.value,
    claimsView: timedClaimsView.value,
    healthView: timedHealthView.value,
    dashboardView: timedDashboardView.value,
    metrics,
  };
}
