import type {
  EvidenceRecord,
  EvidenceRecordKind,
  GetEvidenceRecordInput,
  GetEvidenceRecordOutput,
  SearchEvidenceRegistryInput,
  SearchEvidenceRegistryOutput,
  SearchEvidenceRegistrySummary,
  ListEvidenceByWorkIdInput,
  ListEvidenceByWorkIdOutput,
} from "../contracts/index.js";
import { EvidenceRegistryRepositoryFileSystem, getEvidenceRepositoryPostgres } from "../repository/index.js";

// Conditionally use PostgreSQL repository if database is available, maintain backward compatibility
let evidenceRepository: any = EvidenceRegistryRepositoryFileSystem;
if (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL) {
  const pgRepo = getEvidenceRepositoryPostgres();
  if (typeof pgRepo.saveEvidence === "function") {
    evidenceRepository = pgRepo;
  } else {
    throw new Error("[evidence-registry] PostgreSQL repository missing saveEvidence method");
  }
}

export { evidenceRepository };

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
  async execute(input: GetEvidenceRecordInput): Promise<GetEvidenceRecordOutput> {
    if (typeof evidenceRepository.byId === "function") {
      const result = await evidenceRepository.byId(input.id);
      if (result) return result;
    }
    const fallback = EvidenceRegistryRepositoryFileSystem.byId(input.id);
    if (fallback) return fallback;
    return { error: "evidence_not_found", id: input.id };
  },
} as const;

export const listEvidenceByWorkId = {
  id: "evidence.listByWorkId",
  async execute(input: ListEvidenceByWorkIdInput): Promise<ListEvidenceByWorkIdOutput> {
    // Use PostgreSQL repository for work-specific queries if available
    if ((process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL) && typeof evidenceRepository.listByWorkId === "function") {
      const records = await evidenceRepository.listByWorkId(input.workId);
      return {
        items: records,
        total: records.length,
        matched: records.length,
        offset: 0,
        limit: input.limit ?? 50,
      };
    }
    // Fallback to file-system repository filter if no DB
    const matched = EvidenceRegistryRepositoryFileSystem.list()
      .filter(record => (record as any).workId === input.workId);
    return {
      items: matched.slice(0, input.limit ?? 50),
      total: EvidenceRegistryRepositoryFileSystem.list().length,
      matched: matched.length,
      offset: 0,
      limit: input.limit ?? 50,
    };
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
  [listEvidenceByWorkId.id]: listEvidenceByWorkId,
} as const;