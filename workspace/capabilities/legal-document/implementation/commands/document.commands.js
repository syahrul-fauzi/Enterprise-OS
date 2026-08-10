"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentCommands = exports.updateDocument = exports.archiveDocument = exports.signDocument = exports.createDocument = void 0;
exports.nextDocumentId = nextDocumentId;
const repository_1 = require("../repository");
exports.createDocument = {
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
            id: (0, repository_1.newDocumentId)(),
            title: trimmed,
            ...(input.description !== undefined && input.description !== ""
                ? { description: input.description }
                : {}),
            status: repository_1.defaultDocumentStatus,
            ...(input.matterId !== undefined ? { matterId: input.matterId } : {}),
            ...(input.author !== undefined ? { author: input.author } : {}),
            createdAt: now,
            updatedAt: now,
        };
        repository_1.DocumentRepositoryInMemory.save(entity);
        return { id: entity.id, status: entity.status, createdAt: now };
    },
};
exports.signDocument = {
    kind: "command",
    name: "document.sign",
    version: "0.1.0",
    execute(input) {
        const current = repository_1.DocumentRepositoryInMemory.byId(input.id);
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
        repository_1.DocumentRepositoryInMemory.save(next);
        return {
            id: next.id,
            status: "signed",
            signedAt,
            signer: input.signer,
        };
    },
};
exports.archiveDocument = {
    kind: "command",
    name: "document.archive",
    version: "0.1.0",
    execute(input) {
        const current = repository_1.DocumentRepositoryInMemory.byId(input.id);
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
        repository_1.DocumentRepositoryInMemory.save(next);
        return { id: next.id, status: "archived", archivedAt };
    },
};
exports.updateDocument = {
    kind: "command",
    name: "document.update",
    version: "0.1.0",
    execute(input) {
        const current = repository_1.DocumentRepositoryInMemory.byId(input.id);
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
        const saved = repository_1.DocumentRepositoryInMemory.save(next);
        return { id: saved.id, status: saved.status, updatedAt: saved.updatedAt };
    },
};
exports.documentCommands = {
    "document.create": exports.createDocument,
    "document.sign": exports.signDocument,
    "document.archive": exports.archiveDocument,
    "document.update": exports.updateDocument,
};
function nextDocumentId() {
    return (0, repository_1.newDocumentId)();
}
