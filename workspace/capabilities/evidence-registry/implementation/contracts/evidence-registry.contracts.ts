export type EvidenceRecordKind =
  | "ledger"
  | "matrix"
  | "status"
  | "acceptance"
  | "metrics"
  | "specification"
  | "record"
  | "contract";

export type EvidenceRecordScope = "science" | "requirement";

export interface EvidenceRecord {
  readonly id: string;
  readonly name: string;
  readonly kind: EvidenceRecordKind;
  readonly scope: EvidenceRecordScope;
  readonly path: string;
  readonly sizeBytes: number;
  readonly updatedAt: string;
  readonly runId?: string;
  readonly requirementRefs: readonly string[];
  readonly tags: readonly string[];
}

export interface EvidenceRecordDetail extends EvidenceRecord {
  readonly preview: string;
  readonly lineCount: number;
}

export interface EvidenceRegistryRepository {
  readonly entityName: "EvidenceRecord";
  readonly kind: "repository";
  list(): readonly EvidenceRecord[];
  byId(id: string): EvidenceRecordDetail | undefined;
  save(entity: unknown): never;
  remove(id: string): boolean;
}

export interface SearchEvidenceRegistryInput {
  readonly q?: string;
  readonly kind?: EvidenceRecordKind | "all";
  readonly scope?: EvidenceRecordScope | "all";
  readonly runId?: string;
  readonly requirementRef?: string;
  readonly tag?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly decision_id?: string;
  readonly productId?: string;
}

export interface SearchEvidenceRegistrySummary {
  readonly totalRecords: number;
  readonly visibleRecords: number;
  readonly kindBreakdown: Readonly<Record<EvidenceRecordKind, number>>;
}

export interface SearchEvidenceRegistryOutput {
  readonly items: readonly EvidenceRecord[];
  readonly total: number;
  readonly matched: number;
  readonly offset: number;
  readonly limit: number;
  readonly summary: SearchEvidenceRegistrySummary;
}

export interface GetEvidenceRecordInput {
  readonly id: string;
}

export type GetEvidenceRecordOutput = EvidenceRecordDetail | undefined;

export interface AssessEvidenceInput {
  readonly releaseId: string;
}

export interface AssessEvidenceOutput {
  readonly totalEvidence: number;
  readonly complete: boolean;
  readonly evidencePaths: readonly string[];
}

export interface L1CohortMetricsInput {
  readonly cohortId: string;
  readonly workCategories?: readonly string[];
  readonly providerTypes?: readonly string[];
}

export interface L1CompositionMetrics {
  readonly composition_success_rate: number;
  readonly provider_resolution_rate: number;
  readonly unresolved_requirement_rate: number;
  readonly recomposition_rate: number;
}

export interface L1ContinuityMetrics {
  readonly successful_reentry_rate: number;
  readonly handoff_success_rate: number;
  readonly context_loss_rate: number;
  readonly evidence_recovery_rate: number;
}

export interface L1EconomicMetrics {
  readonly value_created_per_cost: number;
  readonly outcome_per_provider: number;
  readonly outcome_per_human_hour: number;
  // L1.5 Stability Under Variation metrics
  readonly economic_variance_p25: number;
  readonly economic_variance_p50: number;
  readonly economic_variance_p75: number;
}

export interface L1ProviderMetrics {
  readonly provider_independence: number;
  readonly provider_concentration_ratio: number;
  readonly unique_providers_used: number;
}

export interface L1CompositionStabilityMetrics {
  readonly composition_elasticity: number;
  readonly recomposition_required_rate: number;
  readonly cross_category_reuse_rate: number;
}

export interface DiversityBreakdown {
  readonly business_maturity: Readonly<Record<string, number>>;
  readonly digital_maturity: Readonly<Record<string, number>>;
  readonly work_complexity: Readonly<Record<string, number>>;
}

export interface L1CohortMetricsOutput {
  readonly cohortId: string;
  readonly totalWorks: number;
  readonly composition: L1CompositionMetrics;
  readonly composition_stability: L1CompositionStabilityMetrics;
  readonly continuity: L1ContinuityMetrics;
  readonly economic: L1EconomicMetrics;
  readonly provider_metrics: L1ProviderMetrics;
  readonly categoryBreakdown: Readonly<Record<string, { total: number; successful: number }>>;
  readonly diversityBreakdown: DiversityBreakdown;
  readonly calculatedAt: string;
}