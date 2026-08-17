import type {
  EvidenceRecord,
  EvidenceRecordKind,
  GetEvidenceRecordInput,
  GetEvidenceRecordOutput,
  SearchEvidenceRegistryInput,
  SearchEvidenceRegistryOutput,
  SearchEvidenceRegistrySummary,
} from "../contracts/index.js";
import { EvidenceRegistryRepositoryFileSystem } from "../repository/index.js";

function normalizeSearchValue(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized === "" ? undefined : normalized;
}

function matchesQuery(record: EvidenceRecord, query: string | undefined): boolean {
  if (query === undefined) {
    return true;
  }

  const haystack = [
    record.name,
    record.path,
    record.kind,
    record.scope,
    ...record.tags,
    ...record.requirementRefs,
    record.runId ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function buildSummary(records: readonly EvidenceRecord[]): SearchEvidenceRegistrySummary {
  const kindBreakdown = records.reduce<Record<EvidenceRecordKind, number>>(
    (acc, record) => {
      acc[record.kind] += 1;
      return acc;
    },
    {
      ledger: 0,
      matrix: 0,
      status: 0,
      acceptance: 0,
      metrics: 0,
      specification: 0,
      record: 0,
      contract: 0,
    },
  );

  return {
    totalRecords: records.length,
    visibleRecords: records.length,
    kindBreakdown,
  };
}

export const getEvidenceRecord = {
  id: "evidence.get",
  execute(input: GetEvidenceRecordInput): GetEvidenceRecordOutput {
    return EvidenceRegistryRepositoryFileSystem.byId(input.id);
  },
} as const;

export const searchEvidenceRegistry = {
  id: "evidence.search",
  execute(input: SearchEvidenceRegistryInput): SearchEvidenceRegistryOutput {
    const query = normalizeSearchValue(input.q);
    const offset = input.offset ?? 0;
    const limit = input.limit ?? 50;

    const matched = EvidenceRegistryRepositoryFileSystem.list()
      .filter((record) => matchesQuery(record, query))
      .filter((record) =>
        input.kind !== undefined && input.kind !== "all" ? record.kind === input.kind : true,
      )
      .filter((record) =>
        input.scope !== undefined && input.scope !== "all" ? record.scope === input.scope : true,
      )
      .filter((record) => (input.runId !== undefined ? record.runId === input.runId : true))
      .filter((record) =>
        input.requirementRef !== undefined
          ? record.requirementRefs.includes(input.requirementRef.toUpperCase())
          : true,
      )
      .filter((record) => (input.tag !== undefined ? record.tags.includes(input.tag) : true));

    return {
      items: matched.slice(offset, offset + limit),
      total: EvidenceRegistryRepositoryFileSystem.list().length,
      matched: matched.length,
      offset,
      limit,
      summary: buildSummary(matched),
    };
  },
} as const;

export const evidenceRegistryQueries = {
  [getEvidenceRecord.id]: getEvidenceRecord,
  [searchEvidenceRegistry.id]: searchEvidenceRegistry,
} as const;
