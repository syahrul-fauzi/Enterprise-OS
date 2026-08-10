export type DocumentStatus = "draft" | "review" | "signed" | "archived";
export type DocumentId = string & {
    readonly __documentId: unique symbol;
};
export declare function DocumentId(value: string): DocumentId;
export interface DocumentAggregate {
    readonly id: DocumentId;
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
}
export interface CreateDocumentOutput {
    readonly id: DocumentId;
    readonly status: DocumentStatus;
    readonly createdAt: Date;
}
export interface SignDocumentInput {
    readonly id: DocumentId;
    readonly signer?: string;
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
}
export interface UpdateDocumentOutput {
    readonly id: DocumentId;
    readonly status: DocumentStatus;
    readonly updatedAt: Date;
}
export interface GetDocumentInput {
    readonly id: DocumentId;
}
export type GetDocumentOutput = DocumentAggregate | undefined;
export interface SearchDocumentsInput {
    readonly query?: string;
    readonly status?: DocumentStatus | "all";
    readonly matterId?: string;
    readonly author?: string;
    readonly limit?: number;
    readonly offset?: number;
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
}
export type ListDocumentsByStatusOutput = readonly DocumentAggregate[];
export type DocumentRepository = {
    readonly entityName: "Document";
    readonly kind: "repository";
    byId(id: DocumentId): DocumentAggregate | undefined;
    list(): readonly DocumentAggregate[];
    save(entity: DocumentAggregate): DocumentAggregate;
    remove(id: DocumentId): boolean;
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
//# sourceMappingURL=document.contracts.d.ts.map