import {
  DocumentAggregate,
  type GetDocumentInput,
  type GetDocumentOutput,
  type SearchDocumentsInput,
  type SearchDocumentsOutput,
  type ListDocumentsByStatusInput,
  type ListDocumentsByStatusOutput,
} from "../contracts/document.contracts.js";
import type { CapabilityQuery } from "../../../../packages/core/kernel/src/index.js";
import { DocumentRepositoryInMemory, getDocumentRepositoryPostgres } from "../repository/index.js";

// Environment-based repository toggle (production-ready Postgres persistence)
const documentRepository = process.env.DATABASE_URL 
  ? getDocumentRepositoryPostgres() 
  : DocumentRepositoryInMemory;

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
  async execute(input: GetDocumentInput) {
    // WORK-015: Extract tenant and workspace context from request metadata
    const context = (input as any).context;
    return await documentRepository.byId(input.id, context);
  },
};

export const searchDocuments: SearchDocumentsQuery = {
  kind: "query",
  name: "document.search",
  version: "0.1.0",
  async execute(input: SearchDocumentsInput) {
    // WORK-015: Extract tenant and workspace context from request metadata
    const context = (input as any).context;
    const all = await documentRepository.list(context);
    const q = (input.query ?? "").trim().toLowerCase();
    let filtered: readonly DocumentAggregate[] = all;
    if (input.status !== undefined && input.status !== "all") {
      filtered = filtered.filter((d) => d.status === input.status);
    }
    if (input.matterId !== undefined) {
      // Use repository's listByMatter with tenant isolation instead of in-memory filtering
      const matterDocuments = await documentRepository.listByMatter(input.matterId, context);
      filtered = matterDocuments.filter((d) => {
        if (input.status !== undefined && input.status !== "all" && d.status !== input.status) return false;
        if (input.author !== undefined && d.author !== input.author) return false;
        if (q.length > 0) {
          const hay = `${d.title}\n${d.description ?? ""}\n${d.id}\n${d.author ?? ""}\n${d.matterId ?? ""}`.toLowerCase();
          return hay.includes(q);
        }
        return true;
      });
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
  async execute(input: ListDocumentsByStatusInput) {
    // WORK-015: Extract tenant and workspace context from request metadata
    const context = (input as any).context;
    const all = await documentRepository.list(context);
    return all.filter((d) => d.status === input.status);
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