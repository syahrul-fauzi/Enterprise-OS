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
} from "../contracts/index.js";
import type { CapabilityCommand } from "@repo/core-kernel";
import { recordRuntimeInvocation, executionContext } from "@repo/core-runtime";
import {
  DocumentRepositoryInMemory,
  newDocumentId,
  defaultDocumentStatus,
} from "../repository/index.js";

type CreateDocumentCommand = CapabilityCommand<CreateDocumentInput, CreateDocumentOutput>;
type ReviewDocumentCommand = CapabilityCommand<ReviewDocumentInput, ReviewDocumentOutput>;
type SignDocumentCommand = CapabilityCommand<SignDocumentInput, SignDocumentOutput>;
type ArchiveDocumentCommand = CapabilityCommand<ArchiveDocumentInput, ArchiveDocumentOutput>;
type UpdateDocumentCommand = CapabilityCommand<UpdateDocumentInput, UpdateDocumentOutput>;

export const createDocument: CreateDocumentCommand = {
  kind: "command",
  name: "document.create",
  version: "0.1.0",
  execute(input) {
    const trimmed = input.title.trim();
    if (trimmed.length === 0) {
      throw new Error("[document.create] Document title cannot be empty");
    }
    const now = new Date();
    const entity: DocumentAggregate = {
      id: newDocumentId(),
      title: trimmed,
      ...(input.workId ? { workId: input.workId } : {}),
      ...(input.description !== undefined && input.description !== ""
        ? { description: input.description }
        : {}),
      status: defaultDocumentStatus,
      ...(input.matterId !== undefined ? { matterId: input.matterId } : {}),
      ...(input.author !== undefined ? { author: input.author } : {}),
      createdAt: now,
      updatedAt: now,
    };
    DocumentRepositoryInMemory.save(entity);
    
    // Record execution lineage for W1
    const invocationEvent = {
      capabilityId: "legal-document",
      operationId: "document.create",
      sourceRef: "createDocument.execute",
      success: true,
      input,
      result: { id: entity.id, status: entity.status, createdAt: now },
      decision_id: input.workId ?? null,
      outputRefs: [entity.id], // Link execution ke artifact yang dihasilkan
    };
    recordRuntimeInvocation(invocationEvent);
    
    return { id: entity.id, status: entity.status, createdAt: now };
  },
};

export const signDocument: SignDocumentCommand = {
  kind: "command",
  name: "document.sign",
  version: "0.1.0",
  execute(input) {
    const current = DocumentRepositoryInMemory.byId(input.id);
    if (current === undefined) {
      throw new Error(`[document.sign] Document not found: ${input.id}`);
    }
    if (current.status === "archived") {
      throw new Error(
        `[document.sign] Cannot sign an archived document: ${input.id}`
      );
    }
    const signedAt = new Date();
    const next: DocumentAggregate = {
      ...current,
      status: "signed",
      signedAt,
    };
    DocumentRepositoryInMemory.save(next);
    
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
  execute(input) {
    const current = DocumentRepositoryInMemory.byId(input.id);
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
    DocumentRepositoryInMemory.save(next);
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
  execute(input) {
    const current = DocumentRepositoryInMemory.byId(input.id);
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
    DocumentRepositoryInMemory.save(next);
    
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
  execute(input) {
    const current = DocumentRepositoryInMemory.byId(input.id);
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
    const saved = DocumentRepositoryInMemory.save(next);
    
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
    
    return { id: saved.id, status: saved.status, updatedAt: saved.updatedAt };
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