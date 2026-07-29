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
  SearchDocumentsInput,
  SearchDocumentsOutput,
  SignDocumentInput,
  SignDocumentOutput,
  UpdateDocumentInput,
  UpdateDocumentOutput,
} from "../contracts";
import {
  createDocument,
  signDocument,
  archiveDocument,
  updateDocument,
} from "../commands";
import {
  getDocument,
  searchDocuments,
  listDocumentsByStatus,
} from "../queries";
import { DocumentRepositoryInMemory } from "../repository";

export class DocumentService {
  readonly repositories = { Document: DocumentRepositoryInMemory } as const;

  createDocument(input: CreateDocumentInput): CreateDocumentOutput {
    return createDocument.execute(input) as CreateDocumentOutput;
  }
  signDocument(input: SignDocumentInput): SignDocumentOutput {
    return signDocument.execute(input) as SignDocumentOutput;
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
  listDocuments(): readonly DocumentAggregate[] {
    return DocumentRepositoryInMemory.list();
  }
}

export const documentService = new DocumentService();

export * from "../contracts";
export * from "../commands";
export * from "../queries";
export * from "../repository";
