export type DocumentStatus = 
  | "draft" 
  | "review" 
  | "signed" 
  | "archived"
  | "internal_review_completed"
  | "lawyer_review_completed"
  | "auditor_review_completed"
  | "notaris_review_completed"
  | "in_progress"
  | "submitted";

export type DocumentId = string & { readonly __documentId: unique symbol };

export function DocumentId(value: string): DocumentId {
  return value as DocumentId;
}

export interface DocumentAggregate {
  readonly id: DocumentId;
  readonly workId?: string; // Work identity binding (from decision_id)
  readonly title: string;
  readonly description?: string;
  readonly status: DocumentStatus;
  readonly matterId?: string;
  readonly author?: string;
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
  readonly signedAt?: Readonly<Date>;
  readonly archivedAt?: Readonly<Date>;
}

export interface CreateDocumentInput {
  readonly title: string;
  readonly description?: string;
  readonly matterId?: string;
  readonly author?: string;
  // Work identity binding (from decision_id)
  readonly workId?: string;
  // Required context for tenant isolation
  readonly sessionId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export interface CreateDocumentOutput {
  readonly id: DocumentId;
  readonly status: DocumentStatus;
  readonly createdAt: Date;
}

export interface SignDocumentInput {
  readonly id: DocumentId;
  readonly signer?: string;
  // Required context for tenant isolation (WORK-015)
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export interface SignDocumentOutput {
  readonly id: DocumentId;
  readonly status: "signed";
  readonly signedAt: Date;
  readonly signer?: string;
}

export interface ArchiveDocumentInput {
  readonly id: DocumentId;
  readonly reason?: string;
  // Required context for tenant isolation (WORK-015)
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly archiverId?: string;
}

export interface ArchiveDocumentOutput {
  readonly id: DocumentId;
  readonly status: "archived";
  readonly archivedAt: Date;
}

export interface UpdateDocumentInput {
  readonly id: DocumentId;
  readonly title?: string;
  readonly description?: string;
  readonly matterId?: string;
  readonly status?: Exclude<DocumentStatus, "signed" | "archived">;
  readonly lineageDepth?: number;
  readonly parentArtifactId?: string;
  readonly workId?: string;
  readonly parentContextTraceId?: string;
  // Required context for tenant isolation (WORK-015)
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly updaterId?: string;
}

export interface UpdateDocumentOutput {
  readonly id: DocumentId;
  readonly status: DocumentStatus;
  readonly updatedAt: Date;
}

export interface ReviewDocumentInput {
  readonly id: DocumentId;
  readonly reviewer?: string;
  readonly approval: boolean;
  readonly comments?: string;
  // Required context for tenant isolation (WORK-015)
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly reviewerId?: string;
}

export interface ReviewDocumentOutput {
  readonly id: DocumentId;
  readonly status: "review" | "draft";
  readonly reviewedAt: Date;
  readonly reviewer?: string;
  readonly approval: boolean;
  readonly comments?: string;
}

export interface GetDocumentInput {
  readonly id: DocumentId;
  // Required context for tenant isolation (WORK-015)
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly context?: { tenantId: string; workspaceId: string };
}

export type GetDocumentOutput = DocumentAggregate | undefined;

export interface SearchDocumentsInput {
  readonly query?: string;
  readonly status?: DocumentStatus | "all";
  readonly matterId?: string;
  readonly author?: string;
  readonly limit?: number;
  readonly offset?: number;
  // Required context for tenant isolation (WORK-015)
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly context?: { tenantId: string; workspaceId: string };
}

export interface SearchDocumentsOutput {
  readonly items: readonly DocumentAggregate[];
  readonly total: number;
  readonly matched: number;
  readonly offset: number;
  readonly limit: number;
}

export interface ListDocumentsByStatusInput {
  readonly status: DocumentStatus;
  // Required context for tenant isolation (WORK-015)
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly context?: { tenantId: string; workspaceId: string };
}

export type ListDocumentsByStatusOutput = readonly DocumentAggregate[];

export type DocumentRepository = {
  readonly entityName: "Document";
  readonly kind: "repository";
  byId(id: DocumentId, context?: { tenantId: string; workspaceId: string }): Promise<DocumentAggregate | undefined> | DocumentAggregate | undefined;
  list(context?: { tenantId: string; workspaceId: string }): Promise<readonly DocumentAggregate[]> | readonly DocumentAggregate[];
  listByMatter(matterId: string, context?: { tenantId: string; workspaceId: string }): Promise<readonly DocumentAggregate[]> | readonly DocumentAggregate[];
  save(entity: DocumentAggregate, context?: { tenantId: string; workspaceId: string; actorId: string }): Promise<DocumentAggregate> | DocumentAggregate;
  remove(id: DocumentId, context?: { tenantId: string; workspaceId: string }): Promise<boolean> | boolean;
};

export interface DocumentDomainEvents {
  readonly "DocumentCreated": {
    readonly id: DocumentId;
    readonly title: string;
    readonly at: Date;
  };
  readonly "DocumentSigned": {
    readonly id: DocumentId;
    readonly signer?: string;
    readonly at: Date;
  };
  readonly "DocumentArchived": {
    readonly id: DocumentId;
    readonly reason?: string;
    readonly at: Date;
  };
  readonly "DocumentUpdated": {
    readonly id: DocumentId;
    readonly at: Date;
  };
}