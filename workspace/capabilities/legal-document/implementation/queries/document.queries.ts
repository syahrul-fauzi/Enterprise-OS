import {
  DocumentAggregate,
  type GetDocumentInput,
  type GetDocumentOutput,
  type SearchDocumentsInput,
  type SearchDocumentsOutput,
  type ListDocumentsByStatusInput,
  type ListDocumentsByStatusOutput,
} from "../contracts";
import type { CapabilityQuery } from "@repo/core-kernel";
import { DocumentRepositoryInMemory } from "../repository";

type GetDocumentQuery = CapabilityQuery<GetDocumentInput, GetDocumentOutput>;
type SearchDocumentsQuery = CapabilityQuery<SearchDocumentsInput, SearchDocumentsOutput>;
type ListDocumentsByStatusQuery = CapabilityQuery<
  ListDocumentsByStatusInput,
  ListDocumentsByStatusOutput
>;

export const getDocument: GetDocumentQuery = {
  kind: "query",
  name: "document.get",
  version: "0.1.0",
  execute(input) {
    return DocumentRepositoryInMemory.byId(input.id);
  },
};

export const searchDocuments: SearchDocumentsQuery = {
  kind: "query",
  name: "document.search",
  version: "0.1.0",
  execute(input) {
    const all = DocumentRepositoryInMemory.list();
    const q = (input.query ?? "").trim().toLowerCase();
    let filtered: readonly DocumentAggregate[] = all;
    if (input.status !== undefined && input.status !== "all") {
      filtered = filtered.filter((d) => d.status === input.status);
    }
    if (input.matterId !== undefined) {
      filtered = filtered.filter((d) => d.matterId === input.matterId);
    }
    if (input.author !== undefined) {
      filtered = filtered.filter((d) => d.author === input.author);
    }
    if (q.length > 0) {
      filtered = filtered.filter((d) => {
        const hay = `${d.title}\n${d.description ?? ""}\n${d.id}\n${d.author ?? ""}\n${d.matterId ?? ""}`.toLowerCase();
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

export const listDocumentsByStatus: ListDocumentsByStatusQuery = {
  kind: "query",
  name: "document.listByStatus",
  version: "0.1.0",
  execute(input) {
    return DocumentRepositoryInMemory.list().filter((d) => d.status === input.status);
  },
};

export const documentQueries: Readonly<Record<string, CapabilityQuery>> = {
  "document.get": getDocument,
  "document.search": searchDocuments,
  "document.listByStatus": listDocumentsByStatus,
} as const;

export type {
  GetDocumentQuery,
  SearchDocumentsQuery,
  ListDocumentsByStatusQuery,
};
