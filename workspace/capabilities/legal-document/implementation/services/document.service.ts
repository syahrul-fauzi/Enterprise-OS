import {
  ArchiveDocumentInput,
  ArchiveDocumentOutput,
  CreateDocumentInput,
  CreateDocumentOutput,
  DocumentAggregate,
  GetDocumentInput,
  GetDocumentOutput,
  ListDocumentsByStatusInput,
  ListDocumentsByStatusOutput,
  ReviewDocumentInput,
  ReviewDocumentOutput,
  SearchDocumentsInput,
  SearchDocumentsOutput,
  SignDocumentInput,
  SignDocumentOutput,
  UpdateDocumentInput,
  UpdateDocumentOutput,
} from "../contracts/index.js";
import {
  createDocument,
  reviewDocument,
  signDocument,
  archiveDocument,
  updateDocument,
} from "../commands/index.js";
import {
  getDocument,
  searchDocuments,
  listDocumentsByStatus,
} from "../queries/index.js";
import { DocumentRepositoryInMemory, getDocumentRepositoryPostgres } from "../repository/index.js";

// Environment-based repository toggle (production-ready Postgres persistence)
const documentRepository = process.env.DATABASE_URL 
  ? getDocumentRepositoryPostgres() 
  : DocumentRepositoryInMemory;

export class DocumentService {
  readonly repositories = { Document: documentRepository } as const;

  createDocument(input: CreateDocumentInput): CreateDocumentOutput {
    return createDocument.execute(input) as CreateDocumentOutput;
  }
  signDocument(input: SignDocumentInput): SignDocumentOutput {
    return signDocument.execute(input) as SignDocumentOutput;
  }
  reviewDocument(input: ReviewDocumentInput): ReviewDocumentOutput {
    return reviewDocument.execute(input) as ReviewDocumentOutput;
  }
  archiveDocument(input: ArchiveDocumentInput): ArchiveDocumentOutput {
    return archiveDocument.execute(input) as ArchiveDocumentOutput;
  }
  updateDocument(input: UpdateDocumentInput): UpdateDocumentOutput {
    return updateDocument.execute(input) as UpdateDocumentOutput;
  }
  getDocument(input: GetDocumentInput): GetDocumentOutput {
    return getDocument.execute(input) as GetDocumentOutput;
  }
  searchDocuments(input: SearchDocumentsInput): SearchDocumentsOutput {
    return searchDocuments.execute(input) as SearchDocumentsOutput;
  }
  listDocumentsByStatus(
    input: ListDocumentsByStatusInput
  ): ListDocumentsByStatusOutput {
    return listDocumentsByStatus.execute(input) as ListDocumentsByStatusOutput;
  }
  async listDocuments(context?: { tenantId: string; workspaceId: string }): Promise<readonly DocumentAggregate[]> {
    // WORK-015: Pass tenant/workspace context to enforce tenant isolation during read
    return await documentRepository.list(context);
  }
}

export const documentService = new DocumentService();

export * from "../contracts/index.js";
export * from "../commands/index.js";
export * from "../queries/index.js";
export * from "../repository/index.js";