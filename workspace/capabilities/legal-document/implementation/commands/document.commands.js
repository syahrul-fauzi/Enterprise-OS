import { DocumentRepositoryInMemory, newDocumentId, defaultDocumentStatus, } from "../repository";
export const createDocument = {
    kind: "command",
    name: "document.create",
    version: "0.1.0",
    execute(input) {
        const trimmed = input.title.trim();
        if (trimmed.length === 0) {
            throw new Error("[document.create] Document title cannot be empty");
        }
        const now = new Date();
        const entity = {
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
export const signDocument = {
    kind: "command",
    name: "document.sign",
    version: "0.1.0",
    execute(input) {
        const current = DocumentRepositoryInMemory.byId(input.id);
        if (current === undefined) {
            throw new Error(`[document.sign] Document not found: ${input.id}`);
        }
        if (current.status === "archived") {
            throw new Error(`[document.sign] Cannot sign an archived document: ${input.id}`);
        }
        const signedAt = new Date();
        const next = {
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
export const archiveDocument = {
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
        const next = {
            ...current,
            status: "archived",
            archivedAt,
        };
        DocumentRepositoryInMemory.save(next);
        return { id: next.id, status: "archived", archivedAt };
    },
};
export const updateDocument = {
    kind: "command",
    name: "document.update",
    version: "0.1.0",
    execute(input) {
        const current = DocumentRepositoryInMemory.byId(input.id);
        if (current === undefined) {
            throw new Error(`[document.update] Document not found: ${input.id}`);
        }
        if (current.status === "signed" || current.status === "archived") {
            throw new Error(`[document.update] Cannot modify document in terminal status="${current.status}": ${input.id}`);
        }
        const next = {
            ...current,
            ...(input.title !== undefined ? { title: input.title.trim() || current.title } : {}),
            ...(input.description !== undefined
                ? input.description === ""
                    ? (() => {
                        const { description: _ignored, ...rest } = current;
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
export const documentCommands = {
    "document.create": createDocument,
    "document.sign": signDocument,
    "document.archive": archiveDocument,
    "document.update": updateDocument,
};
export function nextDocumentId() {
    return newDocumentId();
}
