import {
  ArchiveDocumentInput,
  ArchiveDocumentOutput,
  CreateDocumentInput,
  CreateDocumentOutput,
  DocumentAggregate,
  SignDocumentInput,
  SignDocumentOutput,
  UpdateDocumentInput,
  UpdateDocumentOutput,
} from "../contracts/index.js";
import type { CapabilityCommand } from "@repo/core-kernel";
import {
  DocumentRepositoryInMemory,
  newDocumentId,
  defaultDocumentStatus,
} from "../repository/index.js";

type CreateDocumentCommand = CapabilityCommand<CreateDocumentInput, CreateDocumentOutput>;
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
    return { id: next.id, status: "archived", archivedAt };
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
    };
    const saved = DocumentRepositoryInMemory.save(next);
    return { id: saved.id, status: saved.status, updatedAt: saved.updatedAt };
  },
};

export const documentCommands: Readonly<Record<string, CapabilityCommand>> = {
  "document.create": createDocument,
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
