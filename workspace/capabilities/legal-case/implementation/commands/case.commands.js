import { z } from "zod";
import { newCaseId, defaultCasePriority, defaultCaseStatus } from "../repository";
import { CaseRepositoryPostgres } from "../repository/case-postgres.repository";
import { initIdentitySchema } from "../../../identity/implementation/repositories/base.repository";
import { SessionRepositoryPostgres } from "../../../identity/implementation/repositories/session.repository";
const CreateCaseWithContextSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    // Required context for tenant isolation
    sessionId: z.string().min(1),
    tenantId: z.string().min(1),
    workspaceId: z.string().min(1),
    actorId: z.string().min(1),
});
const ListCasesWithContextSchema = z.object({
    query: z.string().optional(),
    status: z.enum(["draft", "open", "in_progress", "closed", "all"]).optional(),
    priority: z.enum(["low", "medium", "high", "critical", "all"]).optional(),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
    // Required context for tenant isolation
    sessionId: z.string().min(1),
    tenantId: z.string().min(1),
    workspaceId: z.string().min(1),
    actorId: z.string().min(1),
});
export const createCase = {
    kind: "command",
    name: "case.create",
    version: "2.0.0",
    async execute(input) {
        await initIdentitySchema();
        const parsed = CreateCaseWithContextSchema.parse(input);
        const { title, description, priority, tenantId, workspaceId, sessionId, actorId } = parsed;
        // 1. Validate session exists and is active (enforce authentication)
        const session = await SessionRepositoryPostgres.byId(sessionId);
        if (!session || session.revokedAt !== null) {
            throw new Error("[case.create] Invalid or revoked session - authentication violation");
        }
        // 2. Enforce actor match - session actor must match request actor
        if (session.actorId !== actorId) {
            throw new Error("[case.create] Session actor mismatch - authentication violation");
        }
        // 3. Enforce tenant isolation - requested tenant must match session's tenant
        if (session.tenantId !== tenantId) {
            throw new Error("[case.create] Cross-tenant access attempt blocked - security violation");
        }
        // 4. Enforce workspace isolation - requested workspace must match session's workspace
        if (session.workspaceId !== workspaceId) {
            throw new Error("[case.create] Cross-workspace access attempt blocked - security violation");
        }
        const entity = {
            id: newCaseId(),
            title: title.trim(),
            ...(description !== undefined && description !== ""
                ? { description: description }
                : {}),
            status: defaultCaseStatus,
            priority: priority ?? defaultCasePriority,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // Add tenant/workspace context for isolation
        entity.tenantId = tenantId;
        entity.workspaceId = workspaceId;
        await CaseRepositoryPostgres.save(entity);
        return { id: entity.id, status: entity.status };
    },
};
export const closeCase = {
    kind: "command",
    name: "case.close",
    version: "2.0.0",
    async execute(input) {
        await initIdentitySchema();
        const current = await CaseRepositoryPostgres.byId(input.id);
        if (current === undefined) {
            throw new Error(`[case.close] Case not found: ${input.id}`);
        }
        if (current.status === "closed") {
            return { id: current.id, status: "closed", closedAt: current.closedAt ?? new Date() };
        }
        const closedAt = new Date();
        const next = { ...current, status: "closed", closedAt };
        await CaseRepositoryPostgres.save(next);
        return { id: next.id, status: "closed", closedAt };
    },
};
export const assignLawyer = {
    kind: "command",
    name: "case.assignLawyer",
    version: "2.0.0",
    async execute(input) {
        await initIdentitySchema();
        const current = await CaseRepositoryPostgres.byId(input.id);
        if (current === undefined) {
            throw new Error(`[case.assignLawyer] Case not found: ${input.id}`);
        }
        if (current.status === "closed") {
            throw new Error(`[case.assignLawyer] Cannot assign lawyer to closed case: ${input.id}`);
        }
        const nextStatus = current.status === "draft" ? "open" : current.status;
        const next = {
            ...current,
            lawyerId: input.lawyerId,
            status: nextStatus,
        };
        await CaseRepositoryPostgres.save(next);
        return { id: next.id, lawyerId: next.lawyerId, status: next.status };
    },
};
export const listCasesByWorkspace = {
    kind: "command",
    name: "case.listByWorkspace",
    version: "2.0.0",
    async execute(input) {
        await initIdentitySchema();
        const parsed = ListCasesWithContextSchema.parse(input);
        const { sessionId, tenantId, workspaceId, actorId, limit, offset } = parsed;
        // Validate session exists and is active
        const session = await SessionRepositoryPostgres.byId(sessionId);
        if (!session) {
            throw new Error("[case.listByWorkspace] Invalid or expired session");
        }
        // Validate tenant and workspace isolation
        if (session.tenantId !== tenantId) {
            throw new Error("[case.listByWorkspace] Session tenant mismatch - tenant isolation violation");
        }
        if (session.workspaceId !== workspaceId) {
            throw new Error("[case.listByWorkspace] Session workspace mismatch - tenant isolation violation");
        }
        if (session.actorId !== actorId) {
            throw new Error("[case.listByWorkspace] Session actor mismatch - authentication violation");
        }
        // Get all cases for this workspace (already filtered by workspace for isolation)
        const allWorkspaceCases = await CaseRepositoryPostgres.listByWorkspace(workspaceId);
        // Apply filters if provided
        let filteredCases = [...allWorkspaceCases];
        // Filter by status if not "all"
        if (parsed.status && parsed.status !== "all") {
            filteredCases = filteredCases.filter(c => c.status === parsed.status);
        }
        // Filter by priority if not "all"
        if (parsed.priority && parsed.priority !== "all") {
            filteredCases = filteredCases.filter(c => c.priority === parsed.priority);
        }
        // Filter by search query if provided
        if (parsed.query) {
            const query = parsed.query.toLowerCase();
            filteredCases = filteredCases.filter(c => c.title.toLowerCase().includes(query) ||
                (c.description?.toLowerCase().includes(query) ?? false));
        }
        // Apply pagination
        const paginatedCases = filteredCases.slice(offset, offset + limit);
        return {
            items: paginatedCases,
            total: allWorkspaceCases.length,
            matched: filteredCases.length,
            offset,
            limit,
        };
    },
};
import { getCaseByIdCommand } from "./get-case-by-id.command";
export const caseCommands = {
    "case.create": createCase,
    "case.close": closeCase,
    "case.assignLawyer": assignLawyer,
    "case.getById": getCaseByIdCommand,
    "case.listByWorkspace": listCasesByWorkspace,
};
export function nextCaseId() {
    return newCaseId();
}
