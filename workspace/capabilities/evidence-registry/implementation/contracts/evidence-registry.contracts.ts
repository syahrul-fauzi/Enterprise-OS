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
