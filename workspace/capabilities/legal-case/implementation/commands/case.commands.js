"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseCommands = exports.listCasesByWorkspace = exports.assignLawyer = exports.closeCase = exports.createCase = void 0;
exports.nextCaseId = nextCaseId;
const zod_1 = require("zod");
const repository_1 = require("../repository");
const case_postgres_repository_1 = require("../repository/case-postgres.repository");
const base_repository_1 = require("../../../identity/implementation/repositories/base.repository");
const session_repository_1 = require("../../../identity/implementation/repositories/session.repository");
const CreateCaseWithContextSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    priority: zod_1.z.enum(["low", "medium", "high", "critical"]).optional(),
    // Required context for tenant isolation
    sessionId: zod_1.z.string().min(1),
    tenantId: zod_1.z.string().min(1),
    workspaceId: zod_1.z.string().min(1),
    actorId: zod_1.z.string().min(1),
});
const ListCasesWithContextSchema = zod_1.z.object({
    query: zod_1.z.string().optional(),
    status: zod_1.z.enum(["draft", "open", "in_progress", "closed", "all"]).optional(),
    priority: zod_1.z.enum(["low", "medium", "high", "critical", "all"]).optional(),
    limit: zod_1.z.number().int().min(1).max(100).default(20),
    offset: zod_1.z.number().int().min(0).default(0),
    // Required context for tenant isolation
    sessionId: zod_1.z.string().min(1),
    tenantId: zod_1.z.string().min(1),
    workspaceId: zod_1.z.string().min(1),
    actorId: zod_1.z.string().min(1),
});
exports.createCase = {
    kind: "command",
    name: "case.create",
    version: "2.0.0",
    async execute(input) {
        await (0, base_repository_1.initIdentitySchema)();
        const parsed = CreateCaseWithContextSchema.parse(input);
        const { title, description, priority, tenantId, workspaceId, sessionId, actorId } = parsed;
        // 1. Validate session exists and is active (enforce authentication)
        const session = await session_repository_1.SessionRepositoryPostgres.byId(sessionId);
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
            id: (0, repository_1.newCaseId)(),
            title: title.trim(),
            ...(description !== undefined && description !== ""
                ? { description: description }
                : {}),
            status: repository_1.defaultCaseStatus,
            priority: priority ?? repository_1.defaultCasePriority,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // Add tenant/workspace context for isolation
        entity.tenantId = tenantId;
        entity.workspaceId = workspaceId;
        await case_postgres_repository_1.CaseRepositoryPostgres.save(entity);
        return { id: entity.id, status: entity.status };
    },
};
exports.closeCase = {
    kind: "command",
    name: "case.close",
    version: "2.0.0",
    async execute(input) {
        await (0, base_repository_1.initIdentitySchema)();
        const current = await case_postgres_repository_1.CaseRepositoryPostgres.byId(input.id);
        if (current === undefined) {
            throw new Error(`[case.close] Case not found: ${input.id}`);
        }
        if (current.status === "closed") {
            return { id: current.id, status: "closed", closedAt: current.closedAt ?? new Date() };
        }
        const closedAt = new Date();
        const next = { ...current, status: "closed", closedAt };
        await case_postgres_repository_1.CaseRepositoryPostgres.save(next);
        return { id: next.id, status: "closed", closedAt };
    },
};
exports.assignLawyer = {
    kind: "command",
    name: "case.assignLawyer",
    version: "2.0.0",
    async execute(input) {
        await (0, base_repository_1.initIdentitySchema)();
        const current = await case_postgres_repository_1.CaseRepositoryPostgres.byId(input.id);
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
        await case_postgres_repository_1.CaseRepositoryPostgres.save(next);
        return { id: next.id, lawyerId: next.lawyerId, status: next.status };
    },
};
exports.listCasesByWorkspace = {
    kind: "command",
    name: "case.listByWorkspace",
    version: "2.0.0",
    async execute(input) {
        await (0, base_repository_1.initIdentitySchema)();
        const parsed = ListCasesWithContextSchema.parse(input);
        const { sessionId, tenantId, workspaceId, actorId, limit, offset } = parsed;
        // Validate session exists and is active
        const session = await session_repository_1.SessionRepositoryPostgres.byId(sessionId);
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
        const allWorkspaceCases = await case_postgres_repository_1.CaseRepositoryPostgres.listByWorkspace(workspaceId);
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
const get_case_by_id_command_1 = require("./get-case-by-id.command");
exports.caseCommands = {
    "case.create": exports.createCase,
    "case.close": exports.closeCase,
    "case.assignLawyer": exports.assignLawyer,
    "case.getById": get_case_by_id_command_1.getCaseByIdCommand,
    "case.listByWorkspace": exports.listCasesByWorkspace,
};
function nextCaseId() {
    return (0, repository_1.newCaseId)();
}
