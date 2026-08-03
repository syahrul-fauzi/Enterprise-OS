export type JsonRecord = Record<string, unknown>;

export type GovernanceReadModelKind =
  "summary" | "claims" | "health" | "dashboard";

export type GovernanceSummaryView = JsonRecord & {
  readonly view_kind: "summary";
  readonly view_id: string;
  readonly view_digest: string;
  readonly source_session_id: string;
  readonly source_session_digest: string;
  readonly source_session_lineage_digest: string;
};

export type GovernanceClaimsView = JsonRecord & {
  readonly view_kind: "claims";
  readonly view_id: string;
  readonly view_digest: string;
  readonly source_session_id: string;
  readonly source_session_digest: string;
  readonly source_session_lineage_digest: string;
};

export type GovernanceHealthView = JsonRecord & {
  readonly view_kind: "health";
  readonly view_id: string;
  readonly view_digest: string;
  readonly source_session_id: string;
  readonly source_session_digest: string;
  readonly source_session_lineage_digest: string;
};

export type GovernanceDashboardView = JsonRecord & {
  readonly view_kind: "dashboard";
  readonly view_id: string;
  readonly view_digest: string;
  readonly source_session_id: string;
  readonly source_session_digest: string;
  readonly source_session_lineage_digest: string;
};

export type GovernanceReadModelLocation = {
  readonly kind: GovernanceReadModelKind;
  readonly path: string;
};

export interface GovernanceReadModelCatalog {
  resolve(kind: GovernanceReadModelKind): GovernanceReadModelLocation;
}

export interface GovernanceReadModelProvider {
  materializeSummary(): GovernanceSummaryView;
  materializeClaims(): GovernanceClaimsView;
  materializeHealth(): GovernanceHealthView;
  materializeDashboard(): GovernanceDashboardView;
}
