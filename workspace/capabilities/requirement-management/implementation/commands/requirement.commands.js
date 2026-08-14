import { z } from "zod";
import { defaultRequirementPriority, defaultRequirementStatus, defaultRequirementVerificationStatus, newRequirementId, RequirementRepositoryCurrent, } from "../repository";
import { getRequirementsByOwnerCommand } from "./get-requirements-by-owner.command";
import { getAllRequirementsCommand } from "./get-all-requirements.command";
import { SessionRepositoryPostgres } from "../../../identity/implementation/repositories/session.repository";
import { initIdentitySchema } from "../../../identity/implementation/repositories/base.repository";
const CreateRequirementWithContextSchema = z.object({
    title: z.string().min(1),
    summary: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    owner: z.string().optional(),
    source: z.string().optional(),
    linkedCapabilityIds: z.array(z.string()).optional(),
    acceptanceCriteria: z.array(z.string()).optional(),
    // Required context for tenant isolation
    sessionId: z.string().min(1),
    tenantId: z.string().min(1),
    workspaceId: z.string().min(1),
    actorId: z.string().min(1),
});
const UpdateRequirementWithContextSchema = z.object({
    id: z.string().min(1),
    title: z.string().optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    owner: z.string().optional(),
    source: z.string().optional(),
    linkedCapabilityIds: z.array(z.string()).optional(),
    acceptanceCriteria: z.array(z.string()).optional(),
    // Required context for tenant isolation
    sessionId: z.string().min(1),
    tenantId: z.string().min(1),
    workspaceId: z.string().min(1),
    actorId: z.string().min(1),
});
function trimOptional(value) {
    const next = value?.trim();
    return next && next.length > 0 ? next : undefined;
}
export const createRequirement = {
    kind: "command",
    name: "requirement.create",
    version: "0.2.0",
    async execute(input) {
        await initIdentitySchema();
        const parsed = CreateRequirementWithContextSchema.parse(input);
        const { title, summary, description, priority, owner, source, linkedCapabilityIds, acceptanceCriteria, tenantId, workspaceId, sessionId, actorId } = parsed;
        // 1. Validate session exists and is active (enforce authentication)
        const session = await SessionRepositoryPostgres.byId(sessionId);
        if (!session || session.revokedAt !== null) {
            throw new Error("[requirement.create] Invalid or revoked session - authentication violation");
        }
        // 2. Enforce actor match - session actor must match request actor
        if (session.actorId !== actorId) {
            throw new Error("[requirement.create] Session actor mismatch - authentication violation");
        }
        // 3. Enforce tenant isolation - requested tenant must match session's tenant
        if (session.tenantId !== tenantId) {
            throw new Error("[requirement.create] Cross-tenant access attempt blocked - security violation");
        }
        // 4. Enforce workspace isolation - requested workspace must match session's workspace
        if (session.workspaceId !== workspaceId) {
            throw new Error("[requirement.create] Cross-workspace access attempt blocked - security violation");
        }
        const cleanTitle = title.trim();
        if (cleanTitle.length === 0) {
            throw new Error("[requirement.create] Requirement title cannot be empty");
        }
        const now = new Date();
        const entity = {
            id: newRequirementId(),
            title: cleanTitle,
            ...(trimOptional(summary) !== undefined ? { summary: trimOptional(summary) } : {}),
            ...(trimOptional(description) !== undefined
                ? { description: trimOptional(description) }
                : {}),
            status: defaultRequirementStatus,
            priority: priority ?? defaultRequirementPriority,
            ...(trimOptional(owner) !== undefined ? { owner: trimOptional(owner) } : {}),
            ...(trimOptional(source) !== undefined ? { source: trimOptional(source) } : {}),
            linkedCapabilityIds: [...(linkedCapabilityIds ?? [])],
            acceptanceCriteria: [...(acceptanceCriteria ?? [])].map((item) => item.trim()).filter(Boolean),
            verificationStatus: defaultRequirementVerificationStatus,
            dependsOn: [],
            createdAt: now,
            updatedAt: now,
        };
        // Add tenant/workspace context for isolation
        entity.tenantId = tenantId;
        entity.workspaceId = workspaceId;
        RequirementRepositoryCurrent.save(entity);
        return {
            id: entity.id,
            status: entity.status,
            verificationStatus: entity.verificationStatus,
            createdAt: now,
        };
    },
};
export const updateRequirement = {
    kind: "command",
    name: "requirement.update",
    version: "0.2.0",
    async execute(input) {
        await initIdentitySchema();
        const parsed = UpdateRequirementWithContextSchema.parse(input);
        const { id, title, summary, description, priority, owner, source, linkedCapabilityIds, acceptanceCriteria, tenantId, workspaceId, sessionId, actorId } = parsed;
        // 1. Validate session exists and is active (enforce authentication)
        const session = await SessionRepositoryPostgres.byId(sessionId);
        if (!session || session.revokedAt !== null) {
            throw new Error("[requirement.update] Invalid or revoked session - authentication violation");
        }
        // 2. Enforce actor match - session actor must match request actor
        if (session.actorId !== actorId) {
            throw new Error("[requirement.update] Session actor mismatch - authentication violation");
        }
        // 3. Enforce tenant isolation - requested tenant must match session's tenant
        if (session.tenantId !== tenantId) {
            throw new Error("[requirement.update] Cross-tenant access attempt blocked - security violation");
        }
        // 4. Enforce workspace isolation - requested workspace must match session's workspace
        if (session.workspaceId !== workspaceId) {
            throw new Error("[requirement.update] Cross-workspace access attempt blocked - security violation");
        }
        const current = RequirementRepositoryCurrent.byId(id);
        if (current === undefined) {
            throw new Error(`[requirement.update] Requirement not found: ${id}`);
        }
        // 5. Enforce requirement belongs to the same tenant/workspace
        if (current.tenantId !== tenantId || current.workspaceId !== workspaceId) {
            throw new Error("[requirement.update] Requirement not found in workspace - security violation");
        }
        const next = {
            ...current,
            ...(title !== undefined ? { title: title.trim() || current.title } : {}),
            ...(summary !== undefined ? { summary: trimOptional(summary) } : {}),
            ...(description !== undefined
                ? { description: trimOptional(description) }
                : {}),
            ...(priority !== undefined ? { priority: priority } : {}),
            ...(owner !== undefined ? { owner: trimOptional(owner) } : {}),
            ...(source !== undefined ? { source: trimOptional(source) } : {}),
            ...(linkedCapabilityIds !== undefined
                ? { linkedCapabilityIds: [...linkedCapabilityIds] }
                : {}),
            ...(acceptanceCriteria !== undefined
                ? {
                    acceptanceCriteria: acceptanceCriteria
                        .map((item) => item.trim())
                        .filter(Boolean),
                }
                : {}),
        };
        const saved = RequirementRepositoryCurrent.save(next);
        return { id: saved.id, status: saved.status, updatedAt: saved.updatedAt };
    },
};
const ApproveRequirementWithContextSchema = z.object({
    id: z.string().min(1),
    // Required context for tenant isolation
    sessionId: z.string().min(1),
    tenantId: z.string().min(1),
    workspaceId: z.string().min(1),
    actorId: z.string().min(1),
});
const StartRequirementDeliveryWithContextSchema = z.object({
    id: z.string().min(1),
    // Required context for tenant isolation
    sessionId: z.string().min(1),
    tenantId: z.string().min(1),
    workspaceId: z.string().min(1),
    actorId: z.string().min(1),
});
const MarkRequirementImplementedWithContextSchema = z.object({
    id: z.string().min(1),
    // Required context for tenant isolation
    sessionId: z.string().min(1),
    tenantId: z.string().min(1),
    workspaceId: z.string().min(1),
    actorId: z.string().min(1),
});
const VerifyRequirementWithContextSchema = z.object({
    id: z.string().min(1),
    // Required context for tenant isolation
    sessionId: z.string().min(1),
    tenantId: z.string().min(1),
    workspaceId: z.string().min(1),
    actorId: z.string().min(1),
});
export const approveRequirement = {
    kind: "command",
    name: "requirement.approve",
    version: "0.2.0",
    async execute(input) {
        await initIdentitySchema();
        const parsed = ApproveRequirementWithContextSchema.parse(input);
        const { id, sessionId, tenantId, workspaceId, actorId } = parsed;
        // 1. Validate session exists and is active (enforce authentication)
        const session = await SessionRepositoryPostgres.byId(sessionId);
        if (!session || session.revokedAt !== null) {
            throw new Error("[requirement.approve] Invalid or revoked session - authentication violation");
        }
        // 2. Enforce actor match - session actor must match request actor
        if (session.actorId !== actorId) {
            throw new Error("[requirement.approve] Session actor mismatch - authentication violation");
        }
        // 3. Enforce tenant isolation - requested tenant must match session's tenant
        if (session.tenantId !== tenantId) {
            throw new Error("[requirement.approve] Cross-tenant access attempt blocked - security violation");
        }
        // 4. Enforce workspace isolation - requested workspace must match session's workspace
        if (session.workspaceId !== workspaceId) {
            throw new Error("[requirement.approve] Cross-workspace access attempt blocked - security violation");
        }
        const current = RequirementRepositoryCurrent.byId(id);
        if (current === undefined) {
            throw new Error(`[requirement.approve] Requirement not found: ${id}`);
        }
        // 5. Enforce requirement belongs to the same tenant/workspace
        if (current.tenantId !== tenantId || current.workspaceId !== workspaceId) {
            throw new Error("[requirement.approve] Requirement not found in workspace - security violation");
        }
        if (current.status !== "draft") {
            throw new Error(`[requirement.approve] Requirement must be in draft status before approval: ${id}`);
        }
        const approvedAt = new Date();
        const next = {
            ...current,
            status: "approved",
            verificationStatus: "not_ready",
            approvedAt,
        };
        RequirementRepositoryCurrent.save(next);
        return { id: next.id, status: "approved", approvedAt };
    },
};
export const startRequirementDelivery = {
    kind: "command",
    name: "requirement.startDelivery",
    version: "0.2.0",
    async execute(input) {
        await initIdentitySchema();
        const parsed = StartRequirementDeliveryWithContextSchema.parse(input);
        const { id, sessionId, tenantId, workspaceId, actorId } = parsed;
        // 1. Validate session exists and is active (enforce authentication)
        const session = await SessionRepositoryPostgres.byId(sessionId);
        if (!session || session.revokedAt !== null) {
            throw new Error("[requirement.startDelivery] Invalid or revoked session - authentication violation");
        }
        // 2. Enforce actor match - session actor must match request actor
        if (session.actorId !== actorId) {
            throw new Error("[requirement.startDelivery] Session actor mismatch - authentication violation");
        }
        // 3. Enforce tenant isolation - requested tenant must match session's tenant
        if (session.tenantId !== tenantId) {
            throw new Error("[requirement.startDelivery] Cross-tenant access attempt blocked - security violation");
        }
        // 4. Enforce workspace isolation - requested workspace must match session's workspace
        if (session.workspaceId !== workspaceId) {
            throw new Error("[requirement.startDelivery] Cross-workspace access attempt blocked - security violation");
        }
        const current = RequirementRepositoryCurrent.byId(id);
        if (current === undefined) {
            throw new Error(`[requirement.startDelivery] Requirement not found: ${id}`);
        }
        // 5. Enforce requirement belongs to the same tenant/workspace
        if (current.tenantId !== tenantId || current.workspaceId !== workspaceId) {
            throw new Error("[requirement.startDelivery] Requirement not found in workspace - security violation");
        }
        if (current.status !== "approved") {
            throw new Error(`[requirement.startDelivery] Requirement must be approved before delivery starts: ${id}`);
        }
        const next = {
            ...current,
            status: "in_delivery",
            verificationStatus: "pending",
        };
        RequirementRepositoryCurrent.save(next);
        return { id: next.id, status: "in_delivery" };
    },
};
export const markRequirementImplemented = {
    kind: "command",
    name: "requirement.markImplemented",
    version: "0.2.0",
    async execute(input) {
        await initIdentitySchema();
        const parsed = MarkRequirementImplementedWithContextSchema.parse(input);
        const { id, sessionId, tenantId, workspaceId, actorId } = parsed;
        // 1. Validate session exists and is active (enforce authentication)
        const session = await SessionRepositoryPostgres.byId(sessionId);
        if (!session || session.revokedAt !== null) {
            throw new Error("[requirement.markImplemented] Invalid or revoked session - authentication violation");
        }
        // 2. Enforce actor match - session actor must match request actor
        if (session.actorId !== actorId) {
            throw new Error("[requirement.markImplemented] Session actor mismatch - authentication violation");
        }
        // 3. Enforce tenant isolation - requested tenant must match session's tenant
        if (session.tenantId !== tenantId) {
            throw new Error("[requirement.markImplemented] Cross-tenant access attempt blocked - security violation");
        }
        // 4. Enforce workspace isolation - requested workspace must match session's workspace
        if (session.workspaceId !== workspaceId) {
            throw new Error("[requirement.markImplemented] Cross-workspace access attempt blocked - security violation");
        }
        const current = RequirementRepositoryCurrent.byId(id);
        if (current === undefined) {
            throw new Error(`[requirement.markImplemented] Requirement not found: ${id}`);
        }
        // 5. Enforce requirement belongs to the same tenant/workspace
        if (current.tenantId !== tenantId || current.workspaceId !== workspaceId) {
            throw new Error("[requirement.markImplemented] Requirement not found in workspace - security violation");
        }
        if (current.status !== "in_delivery") {
            throw new Error(`[requirement.markImplemented] Requirement must be in delivery before implementation is recorded: ${id}`);
        }
        const implementedAt = new Date();
        const next = {
            ...current,
            status: "implemented",
            verificationStatus: "pending",
            implementedAt,
        };
        RequirementRepositoryCurrent.save(next);
        return { id: next.id, status: "implemented", implementedAt };
    },
};
export const verifyRequirement = {
    kind: "command",
    name: "requirement.verify",
    version: "0.2.0",
    async execute(input) {
        await initIdentitySchema();
        const parsed = VerifyRequirementWithContextSchema.parse(input);
        const { id, sessionId, tenantId, workspaceId, actorId } = parsed;
        // 1. Validate session exists and is active (enforce authentication)
        const session = await SessionRepositoryPostgres.byId(sessionId);
        if (!session || session.revokedAt !== null) {
            throw new Error("[requirement.verify] Invalid or revoked session - authentication violation");
        }
        // 2. Enforce actor match - session actor must match request actor
        if (session.actorId !== actorId) {
            throw new Error("[requirement.verify] Session actor mismatch - authentication violation");
        }
        // 3. Enforce tenant isolation - requested tenant must match session's tenant
        if (session.tenantId !== tenantId) {
            throw new Error("[requirement.verify] Cross-tenant access attempt blocked - security violation");
        }
        // 4. Enforce workspace isolation - requested workspace must match session's workspace
        if (session.workspaceId !== workspaceId) {
            throw new Error("[requirement.verify] Cross-workspace access attempt blocked - security violation");
        }
        const current = RequirementRepositoryCurrent.byId(id);
        if (current === undefined) {
            throw new Error(`[requirement.verify] Requirement not found: ${id}`);
        }
        // 5. Enforce requirement belongs to the same tenant/workspace
        if (current.tenantId !== tenantId || current.workspaceId !== workspaceId) {
            throw new Error("[requirement.verify] Requirement not found in workspace - security violation");
        }
        if (current.status !== "implemented") {
            throw new Error(`[requirement.verify] Requirement must be implemented before verification: ${id}`);
        }
        const verifiedAt = new Date();
        const next = {
            ...current,
            status: "verified",
            verificationStatus: "passed",
            verifiedAt,
        };
        RequirementRepositoryCurrent.save(next);
        return {
            id: next.id,
            status: "verified",
            verificationStatus: "passed",
            verifiedAt,
        };
    },
};
export const requirementCommands = {
    "requirement.create": createRequirement,
    "requirement.update": updateRequirement,
    "requirement.approve": approveRequirement,
    "requirement.startDelivery": startRequirementDelivery,
    "requirement.markImplemented": markRequirementImplemented,
    "requirement.verify": verifyRequirement,
    "requirement.getByOwner": getRequirementsByOwnerCommand,
    "requirement.getAll": getAllRequirementsCommand,
};
