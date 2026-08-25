import {
  ArchiveDocumentInput,
  ArchiveDocumentOutput,
  CreateDocumentInput,
  CreateDocumentOutput,
  DocumentAggregate,
  ReviewDocumentInput,
  ReviewDocumentOutput,
  SignDocumentInput,
  SignDocumentOutput,
  UpdateDocumentInput,
  UpdateDocumentOutput,
} from "../contracts/document.contracts.js";
import type { CapabilityCommand } from "@repo/core-kernel";
import { recordRuntimeInvocation, executionContext } from "@repo/core-runtime";
import {
  DocumentRepositoryInMemory,
  newDocumentId,
  defaultDocumentStatus,
  getDocumentRepositoryPostgres,
} from "../repository/index.js";
// Environment-based repository toggle (match identity production rail)
const documentRepository = process.env.DATABASE_URL 
  ? getDocumentRepositoryPostgres() 
  : DocumentRepositoryInMemory;

type CreateDocumentCommand = CapabilityCommand<CreateDocumentInput, CreateDocumentOutput>;
type ReviewDocumentCommand = CapabilityCommand<ReviewDocumentInput, ReviewDocumentOutput>;
type SignDocumentCommand = CapabilityCommand<SignDocumentInput, SignDocumentOutput>;
type ArchiveDocumentCommand = CapabilityCommand<ArchiveDocumentInput, ArchiveDocumentOutput>;
type UpdateDocumentCommand = CapabilityCommand<UpdateDocumentInput, UpdateDocumentOutput>;

// WORK-015: Schema initialized via core database migration manager
let schemaInitialized = false;
async function ensureSchema() {
  if (!schemaInitialized && process.env.DATABASE_URL) {
    schemaInitialized = true;
  }
}

export const createDocument: CreateDocumentCommand = {
  kind: "command",
  name: "document.create",
  version: "0.1.0",
  async execute(input: CreateDocumentInput) {
    await ensureSchema();
    const trimmed = input.title.trim();
    if (trimmed.length === 0) {
      throw new Error("[document.create] Document title cannot be empty");
    }
    const now = new Date();
    const entity: DocumentAggregate & { tenantId?: string; workspaceId?: string; actorId?: string } = {
      id: newDocumentId(),
      title: trimmed,
      ...(input.workId ? { workId: input.workId } : {}),
      ...(input.description !== undefined && input.description !== ""
        ? { description: input.description }
        : {}),
      status: defaultDocumentStatus,
      ...(input.matterId !== undefined ? { matterId: input.matterId } : {}),
      ...(input.author !== undefined ? { author: input.author } : {}),
      // Include tenant/workspace/actor context for production isolation
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      createdAt: now,
      updatedAt: now,
    };
    // WORK-015: Pass tenant/workspace/actor context to repository for isolation enforcement
    await documentRepository.save(entity, { 
      tenantId: input.tenantId, 
      workspaceId: input.workspaceId, 
      actorId: input.actorId 
    });
    
    // Record execution lineage for W1
    const invocationEvent = {
      capabilityId: "legal-document",
      operationId: "document.create",
      sourceRef: "createDocument.execute",
      success: true,
      input,
      result: { id: entity.id, status: entity.status, createdAt: now, workId: entity.workId, matterId: entity.matterId },
      decision_id: input.workId ?? null,
      outputRefs: [entity.id], // Link execution ke artifact yang dihasilkan
    };
    recordRuntimeInvocation(invocationEvent);
    
    return { id: entity.id, status: entity.status, createdAt: now, workId: entity.workId, matterId: entity.matterId };
  },
};

export const signDocument: SignDocumentCommand = {
  kind: "command",
  name: "document.sign",
  version: "0.1.0",
  async execute(input: SignDocumentInput) {
    await ensureSchema();
    // WORK-015: Pass tenant/workspace context to enforce tenant isolation during read
    const current = await documentRepository.byId(input.id, { 
      tenantId: input.tenantId, 
      workspaceId: input.workspaceId 
    });
    if (current === undefined) {
      throw new Error(`[document.sign] Document not found: ${input.id}`);
    }
    if (current.status === "archived") {
      throw new Error(
        `[document.sign] Cannot sign an archived document: ${input.id}`
      );
    }
    if (!input.signer) {
      throw new Error(`[document.sign] Signer is required to sign document: ${input.id}`);
    }
    const signedAt = new Date();
    const next: DocumentAggregate = {
      ...current,
      status: "signed",
      signedAt,
    };
    // WORK-015: Pass tenant/workspace/actor context to repository for isolation enforcement
    await documentRepository.save(next, { 
      tenantId: input.tenantId, 
      workspaceId: input.workspaceId, 
      actorId: input.signer // TypeScript narrows this to string after runtime check
    });
    
    // Ambient decision_id check - verifikasi W1 terpropagasi dengan benar
    const ambient = executionContext.get();
    console.log(`[document.sign] Ambient decision_id: ${ambient?.decision_id}, Document workId: ${current.workId}`);
    
    // Record execution lineage untuk W1: execution B (sign) yang mengkonsumsi output dari execution A (create/update)
    const invocationEventSign = {
      capabilityId: "legal-document",
      operationId: "document.sign",
      sourceRef: "signDocument.execute",
      success: true,
      input,
      result: { id: next.id, status: "signed", signedAt, signer: input.signer },
      decision_id: current.workId ?? null,
      inputRefs: [current.id], // Referensi ke artifact yang dikonsumsi (dokumen yang di-sign)
      outputRefs: [next.id], // Artifact baru yang dihasilkan (dokumen signed)
    };
    recordRuntimeInvocation(invocationEventSign);
    
    return {
      id: next.id,
      status: "signed",
      signedAt,
      signer: input.signer,
    };
  },
};

export const archiveDocument: ArchiveDocumentCommand = {
  kind: "command",
  name: "document.archive",
  version: "0.1.0",
  async execute(input: ArchiveDocumentInput) {
    await ensureSchema();
    // WORK-015: Pass tenant/workspace context to enforce tenant isolation during read
    const current = await documentRepository.byId(input.id, { 
      tenantId: input.tenantId, 
      workspaceId: input.workspaceId 
    });
    if (current === undefined) {
      throw new Error(`[document.archive] Document not found: ${input.id}`);
    }
    if (current.status === "archived") {
      const invocationEvent = {
        capabilityId: "legal-document",
        operationId: "document.archive",
        sourceRef: "legal-document/commands/archiveDocument",
        success: true,
        input: input,
        result: { id: current.id, status: "archived", archivedAt: current.archivedAt ?? new Date() },
        productId: "legal-document",
        inputRefs: [`document:${input.id}`],
        outputRefs: [`archived-document:${current.id}`],
      };
      recordRuntimeInvocation(invocationEvent);
      return {
        id: current.id,
        status: "archived",
        archivedAt: current.archivedAt ?? new Date(),
      };
    }
    const archivedAt = new Date();
    const next: DocumentAggregate = {
      ...current,
      status: "archived",
      archivedAt,
    };
    // WORK-015: Pass tenant/workspace/actor context to repository for isolation enforcement
    await documentRepository.save(next, { 
      tenantId: input.tenantId, 
      workspaceId: input.workspaceId, 
      actorId: input.archiverId || input.actorId 
    });
    const invocationEvent = {
      capabilityId: "legal-document",
      operationId: "document.archive",
      sourceRef: "legal-document/commands/archiveDocument",
      success: true,
      input: input,
      result: { id: next.id, status: "archived", archivedAt },
      productId: "legal-document",
      inputRefs: [`document:${input.id}`],
      outputRefs: [`archived-document:${next.id}`],
    };
    recordRuntimeInvocation(invocationEvent);
    return { id: next.id, status: "archived", archivedAt };
  },
};

export const reviewDocument: ReviewDocumentCommand = {
  kind: "command",
  name: "document.review",
  version: "0.1.0",
  async execute(input: ReviewDocumentInput) {
    await ensureSchema();
    // WORK-015: Pass tenant/workspace context to enforce tenant isolation during read
    const current = await documentRepository.byId(input.id, { 
      tenantId: input.tenantId, 
      workspaceId: input.workspaceId 
    });
    if (current === undefined) {
      throw new Error(`[document.review] Document not found: ${input.id}`);
    }
    if (current.status === "signed" || current.status === "archived") {
      throw new Error(
        `[document.review] Cannot review document in terminal status="${current.status}": ${input.id}`
      );
    }
    const reviewedAt = new Date();
    const next: DocumentAggregate = {
      ...current,
      status: input.approval ? "review" : "draft",
      updatedAt: reviewedAt,
    };
    // WORK-015: Pass tenant/workspace/actor context to repository for isolation enforcement
    await documentRepository.save(next, { 
      tenantId: input.tenantId, 
      workspaceId: input.workspaceId, 
      actorId: input.reviewerId || input.reviewer || input.actorId 
    });
    
    // Ambient decision_id check - verifikasi W1 terpropagasi dengan benar untuk C17 pressure-test
    const ambient = executionContext.get();
    console.log(`[document.review] Ambient decision_id: ${ambient?.decision_id}, Document workId: ${current.workId}`);
    
    // Record execution lineage untuk W1: execution E2 (review) yang mengkonsumsi output dari execution E1 (create)
    const invocationEventReview = {
      capabilityId: "legal-document",
      operationId: "document.review",
      sourceRef: "reviewDocument.execute",
      success: true,
      input,
      result: { 
        id: next.id, 
        status: next.status, 
        reviewedAt,
        reviewer: input.reviewer,
        approval: input.approval,
        comments: input.comments
      },
      decision_id: current.workId ?? null,
      inputRefs: [current.id], // Referensi ke artifact yang dikonsumsi (dokumen yang di-review)
      outputRefs: [next.id], // Artifact baru yang dihasilkan (dokumen dalam status review)
    };
    recordRuntimeInvocation(invocationEventReview);
    
    return {
      id: next.id,
      status: next.status as "review" | "draft",
      reviewedAt,
      reviewer: input.reviewer,
      approval: input.approval,
      comments: input.comments,
    };
  },
};

export const updateDocument: UpdateDocumentCommand = {
  kind: "command",
  name: "document.update",
  version: "0.1.0",
  async execute(input: UpdateDocumentInput) {
    await ensureSchema();
    // WORK-015: Pass tenant/workspace context to enforce tenant isolation during read
    const current = await documentRepository.byId(input.id, { 
      tenantId: input.tenantId, 
      workspaceId: input.workspaceId 
    });
    if (current === undefined) {
      throw new Error(`[document.update] Document not found: ${input.id}`);
    }
    if (current.status === "signed" || current.status === "archived") {
      throw new Error(
        `[document.update] Cannot modify document in terminal status="${current.status}": ${input.id}`
      );
    }
    const next: DocumentAggregate = {
      ...current,
      ...(input.title !== undefined ? { title: input.title.trim() || current.title } : {}),
      ...(input.description !== undefined
        ? input.description === ""
          ? (() => {
              const { description: _ignored, ...rest } = current as DocumentAggregate & {
                description?: string;
              };
              void _ignored;
              return rest;
            })()
          : { description: input.description }
        : {}),
      ...(input.matterId !== undefined ? { matterId: input.matterId } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      // Update lineage metadata for RWP-005 heavy artifact tracking
      ...(input.lineageDepth !== undefined ? { lineageDepth: input.lineageDepth } : {}),
      ...(input.parentArtifactId !== undefined ? { parentArtifactId: input.parentArtifactId } : {}),
      // Override workId if explicitly provided (maintain backward compatibility)
      workId: input.workId ?? current.workId,
    };
    // WORK-015: Pass tenant/workspace/actor context to repository for isolation enforcement
    const saved = await documentRepository.save(next, { 
      tenantId: input.tenantId, 
      workspaceId: input.workspaceId, 
      actorId: input.updaterId || input.actorId 
    });
    
    // PT-004 context propagation: update executionContext if parentContextTraceId provided
    if ((input as any).parentContextTraceId) {
      (executionContext as any).lastParentTraceId = (input as any).parentContextTraceId;
    }

    // Record execution lineage untuk W1: update yang mengambil artifact sebelumnya dan menghasilkan versi baru
    recordRuntimeInvocation({
      capabilityId: "legal-document",
      operationId: "document.update",
      sourceRef: "updateDocument.execute",
      success: true,
      input,
      result: { id: saved.id, status: saved.status, updatedAt: saved.updatedAt },
      decision_id: saved.workId ?? null,
      inputRefs: input.parentArtifactId ? [current.id, input.parentArtifactId] : [current.id], // Include lineage parent
      outputRefs: [saved.id], // Referensi ke artifact yang dihasilkan (versi baru)
    });
    
    return { 
      id: saved.id, 
      status: saved.status, 
      updatedAt: saved.updatedAt,
      workId: saved.workId,
      matterId: saved.matterId
    };
  },
};

export const documentCommands: Readonly<Record<string, CapabilityCommand>> = {
  "document.create": createDocument,
  "document.review": reviewDocument,
  "document.sign": signDocument,
  "document.archive": archiveDocument,
  "document.update": updateDocument,
} as const;

export type {
  CreateDocumentCommand,
  SignDocumentCommand,
  ArchiveDocumentCommand,
  UpdateDocumentCommand,
};

export function nextDocumentId() {
  return newDocumentId();
}