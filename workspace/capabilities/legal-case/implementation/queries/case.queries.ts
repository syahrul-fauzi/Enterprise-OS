import {
  CaseAggregate,
  type GetCaseInput,
  type GetCaseOutput,
  type SearchCasesInput,
  type SearchCasesOutput,
} from "../contracts/index.js";
import type { CapabilityQuery } from "@repo/core-kernel";
import { CaseRepositoryInMemory } from "../repository/index.js";

type GetCaseQuery = CapabilityQuery<GetCaseInput, GetCaseOutput>;
type SearchCasesQuery = CapabilityQuery<SearchCasesInput, SearchCasesOutput>;

export const getCase: GetCaseQuery = {
  kind: "query",
  name: "case.get",
  version: "0.1.0",
  execute(input) {
    return CaseRepositoryInMemory.byId(input.id);
  },
};

export const searchCases: SearchCasesQuery = {
  kind: "query",
  name: "case.search",
  version: "0.1.0",
  execute(input) {
    const all = CaseRepositoryInMemory.list();
    const q = (input.query ?? "").trim().toLowerCase();
    let filtered: readonly CaseAggregate[] = all;
    if (input.status !== undefined && input.status !== "all") {
      filtered = filtered.filter((c) => c.status === input.status);
    }
    if (input.priority !== undefined && input.priority !== "all") {
      filtered = filtered.filter((c) => c.priority === input.priority);
    }
    if (q.length > 0) {
      filtered = filtered.filter((c) => {
        const hay = `${c.title}\n${c.description ?? ""}\n${c.id}\n${c.lawyerId ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    const total = all.length;
    const matched = filtered.length;
    const limit = Math.max(1, Math.min(500, input.limit ?? 50));
    const offset = Math.max(0, input.offset ?? 0);
    const items = filtered.slice(offset, offset + limit);
    return {
      items,
      total,
      matched,
      limit,
      offset,
    };
  },
};

export const caseQueries: Readonly<Record<string, CapabilityQuery>> = {
  "case.get": getCase,
  "case.search": searchCases,
} as const;

export type { GetCaseQuery, SearchCasesQuery };
