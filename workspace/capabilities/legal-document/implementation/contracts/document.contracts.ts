import type { TenantId, WorkspaceId, ActorId, SessionId, WorkId, UserId } from "@repo/capabilities-work-core";

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
  readonly author?: UserId;
  // Work identity binding (from decision_id)
  readonly workId?: WorkId;
  // Required context for tenant isolation (canonical branded types from @repo/capabilities-work-core)
  readonly sessionId: SessionId;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
}

export interface CreateDocumentOutput {
  readonly id: DocumentId;
  readonly status: DocumentStatus;
  readonly createdAt: Date;
}

export interface SignDocumentInput {
  readonly id: DocumentId;
  readonly signer?: UserId;
  // Required context for tenant isolation (canonical branded types from @repo/capabilities-work-core)
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
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
  // Required context for tenant isolation (canonical branded types from @repo/capabilities-work-core)
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
  readonly archiverId?: UserId;
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
  readonly workId?: WorkId;
  readonly parentContextTraceId?: string;
  // Required context for tenant isolation (canonical branded types from @repo/capabilities-work-core)
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
  readonly updaterId?: UserId;
}

export interface UpdateDocumentOutput {
  readonly id: DocumentId;
  readonly status: DocumentStatus;
  readonly updatedAt: Date;
}

export interface ReviewDocumentInput {
  readonly id: DocumentId;
  readonly reviewer?: UserId;
  readonly approval: boolean;
  readonly comments?: string;
  // Required context for tenant isolation (canonical branded types from @repo/capabilities-work-core)
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
  readonly reviewerId?: UserId;
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
  // Required context for tenant isolation (canonical branded types from @repo/capabilities-work-core)
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly context?: { tenantId: TenantId; workspaceId: WorkspaceId };
}

export type GetDocumentOutput = DocumentAggregate | undefined;

export interface SearchDocumentsInput {
  readonly query?: string;
  readonly status?: DocumentStatus | "all";
  readonly matterId?: string;
  readonly author?: UserId;
  readonly limit?: number;
  readonly offset?: number;
  // Required context for tenant isolation (canonical branded types from @repo/capabilities-work-core)
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly context?: { tenantId: TenantId; workspaceId: WorkspaceId };
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
  // Required context for tenant isolation (canonical branded types from @repo/capabilities-work-core)
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly context?: { tenantId: TenantId; workspaceId: WorkspaceId };
}

export type ListDocumentsByStatusOutput = readonly DocumentAggregate[];

export type DocumentRepository = {
  readonly entityName: "Document";
  readonly kind: "repository";
  byId(id: DocumentId, context?: { tenantId: TenantId; workspaceId: WorkspaceId }): Promise<DocumentAggregate | undefined> | DocumentAggregate | undefined;
  list(context?: { tenantId: TenantId; workspaceId: WorkspaceId }): Promise<readonly DocumentAggregate[]> | readonly DocumentAggregate[];
  listByMatter(matterId: string, context?: { tenantId: TenantId; workspaceId: WorkspaceId }): Promise<readonly DocumentAggregate[]> | readonly DocumentAggregate[];
  save(entity: DocumentAggregate, context?: { tenantId: TenantId; workspaceId: WorkspaceId; actorId: ActorId }): Promise<DocumentAggregate> | DocumentAggregate;
  remove(id: DocumentId, context?: { tenantId: TenantId; workspaceId: WorkspaceId }): Promise<boolean> | boolean;
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