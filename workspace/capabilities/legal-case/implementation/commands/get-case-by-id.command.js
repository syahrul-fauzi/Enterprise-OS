"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCaseByIdCommand = exports.GetCaseByIdInputSchema = void 0;
const zod_1 = require("zod");
const case_postgres_repository_1 = require("../repository/case-postgres.repository");
const repository_1 = require("../../../legal-document/implementation/repository");
const base_repository_1 = require("../../../identity/implementation/repositories/base.repository");
const session_repository_1 = require("../../../identity/implementation/repositories/session.repository");
exports.GetCaseByIdInputSchema = zod_1.z.object({
    caseId: zod_1.z.string().min(1).startsWith("case-"),
    // Required context for tenant isolation and authentication
    sessionId: zod_1.z.string().min(1),
    tenantId: zod_1.z.string().min(1),
    workspaceId: zod_1.z.string().min(1),
    actorId: zod_1.z.string().min(1),
});
exports.getCaseByIdCommand = {
    kind: "command",
    name: "case.getById",
    version: "2.0.0",
    async execute(input) {
        await (0, base_repository_1.initIdentitySchema)();
        const parsed = exports.GetCaseByIdInputSchema.parse(input);
        const { caseId, sessionId, tenantId, workspaceId, actorId } = parsed;
        // Validate session exists and is active
        const session = await session_repository_1.SessionRepositoryPostgres.byId(sessionId);
        if (!session) {
            throw new Error("[case.getById] Invalid or expired session");
        }
        // Validate tenant and workspace isolation
        if (session.tenantId !== tenantId) {
            throw new Error("[case.getById] Session tenant mismatch - tenant isolation violation");
        }
        if (session.workspaceId !== workspaceId) {
            throw new Error("[case.getById] Session workspace mismatch - tenant isolation violation");
        }
        if (session.actorId !== actorId) {
            throw new Error("[case.getById] Session actor mismatch - authentication violation");
        }
        const c = await case_postgres_repository_1.CaseRepositoryPostgres.byId(caseId);
        if (c === undefined) {
            return undefined;
        }
        // Additional case-level tenant isolation check
        if (c.tenantId !== tenantId || c.workspaceId !== workspaceId) {
            throw new Error("[case.getById] Case does not belong to the current tenant/workspace - access denied");
        }
        const evidenceCount = repository_1.DocumentRepositoryInMemory.list().filter((d) => d.matterId === caseId).length;
        return {
            type: "lawyershub.case",
            id: caseId,
            displayTitle: c.title,
            displaySubtitle: c.description ?? "Legal Matter",
            rawStatus: c.status,
            owner: c.lawyerId,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
            evidenceCount,
            priority: c.priority,
        };
    },
};
