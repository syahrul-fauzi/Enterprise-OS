"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirementCommands = exports.verifyRequirement = exports.markRequirementImplemented = exports.startRequirementDelivery = exports.approveRequirement = exports.updateRequirement = exports.createRequirement = void 0;
const repository_1 = require("../repository");
function trimOptional(value) {
    const next = value?.trim();
    return next && next.length > 0 ? next : undefined;
}
exports.createRequirement = {
    kind: "command",
    name: "requirement.create",
    version: "0.1.0",
    execute(input) {
        const title = input.title.trim();
        if (title.length === 0) {
            throw new Error("[requirement.create] Requirement title cannot be empty");
        }
        const now = new Date();
        const entity = {
            id: (0, repository_1.newRequirementId)(),
            title,
            ...(trimOptional(input.summary) !== undefined ? { summary: trimOptional(input.summary) } : {}),
            ...(trimOptional(input.description) !== undefined
                ? { description: trimOptional(input.description) }
                : {}),
            status: repository_1.defaultRequirementStatus,
            priority: input.priority ?? repository_1.defaultRequirementPriority,
            ...(trimOptional(input.owner) !== undefined ? { owner: trimOptional(input.owner) } : {}),
            ...(trimOptional(input.source) !== undefined ? { source: trimOptional(input.source) } : {}),
            linkedCapabilityIds: [...(input.linkedCapabilityIds ?? [])],
            acceptanceCriteria: [...(input.acceptanceCriteria ?? [])].map((item) => item.trim()).filter(Boolean),
            verificationStatus: repository_1.defaultRequirementVerificationStatus,
            dependsOn: [],
            createdAt: now,
            updatedAt: now,
        };
        repository_1.RequirementRepositoryCurrent.save(entity);
        return {
            id: entity.id,
            status: entity.status,
            verificationStatus: entity.verificationStatus,
            createdAt: now,
        };
    },
};
exports.updateRequirement = {
    kind: "command",
    name: "requirement.update",
    version: "0.1.0",
    execute(input) {
        const current = repository_1.RequirementRepositoryCurrent.byId(input.id);
        if (current === undefined) {
            throw new Error(`[requirement.update] Requirement not found: ${input.id}`);
        }
        const next = {
            ...current,
            ...(input.title !== undefined ? { title: input.title.trim() || current.title } : {}),
            ...(input.summary !== undefined ? { summary: trimOptional(input.summary) } : {}),
            ...(input.description !== undefined
                ? { description: trimOptional(input.description) }
                : {}),
            ...(input.priority !== undefined ? { priority: input.priority } : {}),
            ...(input.owner !== undefined ? { owner: trimOptional(input.owner) } : {}),
            ...(input.source !== undefined ? { source: trimOptional(input.source) } : {}),
            ...(input.linkedCapabilityIds !== undefined
                ? { linkedCapabilityIds: [...input.linkedCapabilityIds] }
                : {}),
            ...(input.acceptanceCriteria !== undefined
                ? {
                    acceptanceCriteria: input.acceptanceCriteria
                        .map((item) => item.trim())
                        .filter(Boolean),
                }
                : {}),
        };
        const saved = repository_1.RequirementRepositoryCurrent.save(next);
        return { id: saved.id, status: saved.status, updatedAt: saved.updatedAt };
    },
};
exports.approveRequirement = {
    kind: "command",
    name: "requirement.approve",
    version: "0.1.0",
    execute(input) {
        const current = repository_1.RequirementRepositoryCurrent.byId(input.id);
        if (current === undefined) {
            throw new Error(`[requirement.approve] Requirement not found: ${input.id}`);
        }
        if (current.status !== "draft") {
            throw new Error(`[requirement.approve] Requirement must be in draft status before approval: ${input.id}`);
        }
        const approvedAt = new Date();
        const next = {
            ...current,
            status: "approved",
            verificationStatus: "not_ready",
            approvedAt,
        };
        repository_1.RequirementRepositoryCurrent.save(next);
        return { id: next.id, status: "approved", approvedAt };
    },
};
exports.startRequirementDelivery = {
    kind: "command",
    name: "requirement.startDelivery",
    version: "0.1.0",
    execute(input) {
        const current = repository_1.RequirementRepositoryCurrent.byId(input.id);
        if (current === undefined) {
            throw new Error(`[requirement.startDelivery] Requirement not found: ${input.id}`);
        }
        if (current.status !== "approved") {
            throw new Error(`[requirement.startDelivery] Requirement must be approved before delivery starts: ${input.id}`);
        }
        const next = {
            ...current,
            status: "in_delivery",
            verificationStatus: "pending",
        };
        repository_1.RequirementRepositoryCurrent.save(next);
        return { id: next.id, status: "in_delivery" };
    },
};
exports.markRequirementImplemented = {
    kind: "command",
    name: "requirement.markImplemented",
    version: "0.1.0",
    execute(input) {
        const current = repository_1.RequirementRepositoryCurrent.byId(input.id);
        if (current === undefined) {
            throw new Error(`[requirement.markImplemented] Requirement not found: ${input.id}`);
        }
        if (current.status !== "in_delivery") {
            throw new Error(`[requirement.markImplemented] Requirement must be in delivery before implementation is recorded: ${input.id}`);
        }
        const implementedAt = new Date();
        const next = {
            ...current,
            status: "implemented",
            verificationStatus: "pending",
            implementedAt,
        };
        repository_1.RequirementRepositoryCurrent.save(next);
        return { id: next.id, status: "implemented", implementedAt };
    },
};
exports.verifyRequirement = {
    kind: "command",
    name: "requirement.verify",
    version: "0.1.0",
    execute(input) {
        const current = repository_1.RequirementRepositoryCurrent.byId(input.id);
        if (current === undefined) {
            throw new Error(`[requirement.verify] Requirement not found: ${input.id}`);
        }
        if (current.status !== "implemented") {
            throw new Error(`[requirement.verify] Requirement must be implemented before verification: ${input.id}`);
        }
        const verifiedAt = new Date();
        const next = {
            ...current,
            status: "verified",
            verificationStatus: "passed",
            verifiedAt,
        };
        repository_1.RequirementRepositoryCurrent.save(next);
        return {
            id: next.id,
            status: "verified",
            verificationStatus: "passed",
            verifiedAt,
        };
    },
};
exports.requirementCommands = {
    "requirement.create": exports.createRequirement,
    "requirement.update": exports.updateRequirement,
    "requirement.approve": exports.approveRequirement,
    "requirement.startDelivery": exports.startRequirementDelivery,
    "requirement.markImplemented": exports.markRequirementImplemented,
    "requirement.verify": exports.verifyRequirement,
};
