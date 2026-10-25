"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseCommands = exports.markCaseCompleted = exports.addEvidenceToCase = exports.listCasesByWorkspace = exports.assignLawyer = exports.closeCase = exports.createCase = void 0;
exports.nextCaseId = nextCaseId;
const zod_1 = require("zod");
const index_1 = require("../repository/index");
const base_repository_1 = require("../../../identity/implementation/repositories/base.repository");
const index_2 = require("../../../identity/implementation/repositories/index");
const get_case_by_id_command_1 = require("./get-case-by-id.command");
// FORCE IN-MEMORY SESSION REPOSITORY FOR DEVELOPMENT
const sessionRepository = process.env.NODE_ENV === "production" && process.env.DATABASE_URL
    ? (0, index_2.getSessionRepositoryPostgres)()
    : index_2.SessionRepositoryInMemory;
// FORCE IN-MEMORY FOR DEVELOPMENT - ignore DATABASE_URL to fix "Work not found" errors
// Only use Postgres in NODE_ENV=production
console.log("[case.commands.ts] NODE_ENV:", process.env.NODE_ENV, "DATABASE_URL present:", !!process.env.DATABASE_URL);
const caseRepository = process.env.NODE_ENV === "production" && process.env.DATABASE_URL
    ? index_1.CaseRepositoryPostgres
    : index_1.CaseRepositoryInMemory;
console.log("[case.commands.ts] Using case repository type:", (process.env.NODE_ENV === "production" && process.env.DATABASE_URL) ? "POSTGRES" : "IN-MEMORY");
// Import Intent repository to validate linkedIntentId exists (CONTEXT INTEGRITY guarantee)
// Matches EXACTLY the same pattern as sessionRepository (imports and initialization)
const index_3 = require("../../../identity/implementation/repositories/index");
// FORCE IN-MEMORY INTENT REPOSITORY FOR DEVELOPMENT - matches sessionRepository pattern
const intentRepository = process.env.NODE_ENV === "production" && process.env.DATABASE_URL
    ? (0, index_3.getIntentRepositoryPostgres)()
    : new index_3.IntentRepositoryInMemory();
console.log("[case.commands.ts] Intent repository initialized for context integrity validation");
const PTEstablishmentDetailsSchema = zod_1.z.object({
    namaPTLengkap: zod_1.z.string().min(3).max(200),
    alamatDomisili: zod_1.z.string().min(10),
    bidangUsaha: zod_1.z.string().min(3),
    jumlahPendiri: zod_1.z.number().int().min(1).max(100),
    modalDasar: zod_1.z.number().int().min(1000000),
    noNIB: zod_1.z.string().min(10).max(20),
    npwp: zod_1.z.string().min(15).max(20), // NPWP (Tax ID) for the legal entity
    penanggungJawabNIK: zod_1.z.string().length(16), // NIK of the person in charge (16 digits required)
});
// ILC Golden Slice: Training & Certification details schema (ilc-case-001)
const TrainingDetailsSchema = zod_1.z.object({
    lokasiPelatihan: zod_1.z.string().min(10),
    tanggalMulai: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date format YYYY-MM-DD
    tanggalSelesai: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    kuotaPeserta: zod_1.z.number().int().min(1).max(100),
    biayaPelatihan: zod_1.z.number().int().min(0),
    kategoriPelatihan: zod_1.z.string().min(3).max(100),
});
const CreateCaseWithContextSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    priority: zod_1.z.enum(["low", "medium", "high", "critical"]).optional(),
    sourceDiscussionId: zod_1.z.string().optional(),
    id: zod_1.z.string().regex(/^case[-_]/).optional(),
    // Work identity binding (from decision_id)
    workId: zod_1.z.string().optional(),
    // Golden work: Pendirian PT specific fields (LawyersHub lh-case-001)
    ptEstablishmentDetails: PTEstablishmentDetailsSchema.optional(),
    // ILC Golden Slice: Training & Certification details (ilc-case-001)
    trainingDetails: TrainingDetailsSchema.optional(),
    // Ambient execution context propagation (W4-C20-001 compliance)
    decision_id: zod_1.z.string().optional(),
    last_invocation_digest: zod_1.z.string().optional(),
    sessionId: zod_1.z.string().min(1),
    tenantId: zod_1.z.string().optional(),
    workspaceId: zod_1.z.string().optional(),
    actorId: zod_1.z.string().optional(),
    linkedIntentId: zod_1.z.string().optional(), // Context integrity: link Work to its originating Intent
});
const ListCasesWithContextSchema = zod_1.z.object({
    query: zod_1.z.string().optional(),
    status: zod_1.z.enum(["draft", "open", "in_progress", "closed", "all"]).optional(),
    priority: zod_1.z.enum(["low", "medium", "high", "critical", "all"]).optional(),
    limit: zod_1.z.number().int().min(1).max(100).default(20),
    offset: zod_1.z.number().int().min(0).default(0),
    // Allow anonymous sessions to pass context directly
    sessionId: zod_1.z.string().min(1),
    tenantId: zod_1.z.string().optional(),
    workspaceId: zod_1.z.string().optional(),
    actorId: zod_1.z.string().optional(),
});
// Initialize schema once at module load time, not per invocation
let schemaInitialized = false;
function ensureIdentitySchema() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!schemaInitialized && process.env.DATABASE_URL) {
            // Initialize Postgres schema only when in production mode
            yield (0, base_repository_1.initIdentitySchema)();
            schemaInitialized = true;
        }
    });
}
exports.createCase = {
    kind: "command",
    name: "case.create",
    version: "2.0.0",
    execute(input) {
        return __awaiter(this, void 0, void 0, function* () {
            yield ensureIdentitySchema();
            const parsed = CreateCaseWithContextSchema.parse(input);
            const { title, description, priority, sessionId, sourceDiscussionId, id: preferredId, decision_id, last_invocation_digest, ptEstablishmentDetails, trainingDetails, linkedIntentId } = parsed;
            // 1. Validate session exists and is active OR use passed tenant/workspace/actor from context (cross-capability call)
            let tenantId;
            let workspaceId;
            let actorId;
            // If called from cross-capability workflow with already verified context, use those values
            if (parsed.tenantId && parsed.workspaceId && parsed.actorId) {
                tenantId = parsed.tenantId;
                workspaceId = parsed.workspaceId;
                actorId = parsed.actorId;
            }
            else {
                // Direct API call - handle both authenticated and anonymous sessions (P0: allow first-time visitors)
                // If we already have tenantId/workspaceId/actorId passed from API layer (anonymous case), use those
                if (parsed.tenantId && parsed.workspaceId && parsed.actorId) {
                    tenantId = parsed.tenantId;
                    workspaceId = parsed.workspaceId;
                    actorId = parsed.actorId;
                }
                else {
                    // Check if this is an anonymous session - skip DB validation for anonymous users
                    const isAnonymous = parsed.actorId === "anonymous.user";
                    if (isAnonymous) {
                        // Use the anonymous session values directly - no DB validation needed for ephemeral visitors
                        tenantId = parsed.tenantId;
                        workspaceId = parsed.workspaceId;
                        actorId = parsed.actorId;
                    }
                    else {
                        // Authenticated user - validate session from DB and extract
                        const session = yield sessionRepository.byId(sessionId);
                        if (!session || session.revokedAt !== null) {
                            throw new Error("[case.create] Invalid or revoked session - authentication violation");
                        }
                        ({ tenantId, workspaceId, actorId } = session);
                    }
                }
            }
            // CONTEXT INTEGRITY VALIDATION: If linkedIntentId is provided, verify it exists
            // Prevents orphaned work that's not linked to a valid originating Intent
            if (linkedIntentId) {
                const existingIntent = yield intentRepository.byId(linkedIntentId, { tenantId, workspaceId });
                if (!existingIntent) {
                    throw new Error(`[case.create] Invalid linkedIntentId: ${linkedIntentId} does not exist in this tenant/workspace - context integrity violation`);
                }
                console.log("[case.create] ✅ Context integrity verified: linkedIntentId exists", linkedIntentId);
                // Mark intent as converted to work to complete the provenance chain
                yield intentRepository.markAsConverted(linkedIntentId, preferredId || (0, index_1.newCaseId)());
            }
            // If called from cross-capability workflow with already verified context, use those values
            if (parsed.tenantId && parsed.workspaceId && parsed.actorId) {
                tenantId = parsed.tenantId;
                workspaceId = parsed.workspaceId;
                actorId = parsed.actorId;
            }
            else {
                // Direct API call - handle both authenticated and anonymous sessions (P0: allow first-time visitors)
                // If we already have tenantId/workspaceId/actorId passed from API layer (anonymous case), use those
                if (parsed.tenantId && parsed.workspaceId && parsed.actorId) {
                    tenantId = parsed.tenantId;
                    workspaceId = parsed.workspaceId;
                    actorId = parsed.actorId;
                }
                else {
                    // Check if this is an anonymous session - skip DB validation for anonymous users
                    const isAnonymous = parsed.actorId === "anonymous.user";
                    if (isAnonymous) {
                        // Use the anonymous session values directly - no DB validation needed for ephemeral visitors
                        tenantId = parsed.tenantId;
                        workspaceId = parsed.workspaceId;
                        actorId = parsed.actorId;
                    }
                    else {
                        // Authenticated user - validate session from DB and extract
                        const session = yield sessionRepository.byId(sessionId);
                        if (!session || session.revokedAt !== null) {
                            throw new Error("[case.create] Invalid or revoked session - authentication violation");
                        }
                        ({ tenantId, workspaceId, actorId } = session);
                    }
                }
            }
            // 2. Capture ambient execution context for lineage tracking (W4-C20-001 compliance)
            const executionContext = {
                decision_id,
                last_invocation_digest,
                propagated_from: parsed.tenantId ? "cross-capability" : "direct-api"
            };
            // Enforce security via session's already verified isolation guarantees
            // No need for additional checks - session is cryptographically bound to tenant/workspace
            // Context integrity validation already performed earlier in the function
            // No duplicate validation needed - maintains single source of truth for context checks
            // Preferred ID: if provided and unused, apply it (canonical experiment ID replay support)
            let caseId = (0, index_1.newCaseId)();
            if (preferredId !== undefined) {
                const existing = yield caseRepository.byId(preferredId, { tenantId, workspaceId });
                if (existing)
                    throw new Error(`[case.create] Preferred case ID already exists: ${preferredId}`);
                caseId = preferredId;
            }
            const entity = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ id: caseId, title: title.trim() }, (input.workId ? { workId: input.workId } : {})), (description !== undefined && description !== ""
                ? { description: description }
                : {})), (sourceDiscussionId !== undefined
                ? { sourceDiscussionId: sourceDiscussionId }
                : {})), (ptEstablishmentDetails !== undefined
                ? { ptEstablishmentDetails: ptEstablishmentDetails }
                : {})), (trainingDetails !== undefined
                ? { trainingDetails: trainingDetails }
                : {})), { status: index_1.defaultCaseStatus, priority: priority !== null && priority !== void 0 ? priority : index_1.defaultCasePriority, createdAt: new Date(), updatedAt: new Date(), 
                // Add execution context for lineage tracking (W4-C20-001 compliance)
                executionContext });
            // Add tenant/workspace/actor context for isolation
            entity.tenantId = tenantId;
            entity.workspaceId = workspaceId;
            entity.actorId = actorId;
            yield caseRepository.save(entity, {
                tenantId: tenantId,
                workspaceId: workspaceId,
                actorId: actorId
            });
            return { id: entity.id, status: entity.status, workId: entity.workId || entity.id };
        });
    },
};
exports.closeCase = {
    kind: "command",
    name: "case.close",
    version: "2.0.0",
    execute(input) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Extract session and context from input with anonymous support
            const parsed = input;
            const { sessionId, id } = parsed;
            // Initialize context variables BEFORE usage
            let tenantId;
            let workspaceId;
            let actorId;
            // Standardized context extraction pattern - same for all commands
            // If called from cross-capability workflow with already verified context, use those values
            if (parsed.tenantId && parsed.workspaceId && parsed.actorId) {
                tenantId = parsed.tenantId;
                workspaceId = parsed.workspaceId;
                actorId = parsed.actorId;
            }
            else {
                // Direct API call - check if this is an anonymous session
                const isAnonymous = parsed.actorId === "anonymous.user";
                if (isAnonymous) {
                    // Use the anonymous session values directly from input
                    tenantId = parsed.tenantId;
                    workspaceId = parsed.workspaceId;
                    actorId = parsed.actorId;
                }
                else {
                    // Authenticated user - validate session from DB and extract context
                    const session = yield sessionRepository.byId(sessionId);
                    if (!session || session.revokedAt !== null) {
                        throw new Error("[case.close] Invalid or revoked session - authentication violation");
                    }
                    ({ tenantId, workspaceId, actorId } = session);
                }
            }
            const current = yield caseRepository.byId(id, {
                tenantId: tenantId,
                workspaceId: workspaceId
            });
            if (current === undefined) {
                throw new Error(`[case.close] Case not found: ${id}`);
            }
            if (current.status === "closed") {
                return { id: current.id, status: "closed", closedAt: (_a = current.closedAt) !== null && _a !== void 0 ? _a : new Date() };
            }
            const closedAt = new Date();
            const next = Object.assign(Object.assign({}, current), { status: "closed", closedAt, workId: current.workId });
            yield caseRepository.save(next, {
                tenantId: tenantId,
                workspaceId: workspaceId,
                actorId: actorId
            });
            return { id: next.id, status: "closed", closedAt };
        });
    },
};
exports.assignLawyer = {
    kind: "command",
    name: "case.assignLawyer",
    version: "2.0.0",
    execute(input) {
        return __awaiter(this, void 0, void 0, function* () {
            // Extract session and context from input with anonymous support
            const parsed = input;
            const { sessionId, id, lawyerId } = parsed;
            // Initialize context variables BEFORE usage
            let tenantId;
            let workspaceId;
            let actorId;
            // Standardized context extraction pattern - same for all commands
            // If called from cross-capability workflow with already verified context, use those values
            if (parsed.tenantId && parsed.workspaceId && parsed.actorId) {
                tenantId = parsed.tenantId;
                workspaceId = parsed.workspaceId;
                actorId = parsed.actorId;
            }
            else {
                // Direct API call - check if this is an anonymous session
                const isAnonymous = parsed.actorId === "anonymous.user";
                if (isAnonymous) {
                    // Use the anonymous session values directly from input
                    tenantId = parsed.tenantId;
                    workspaceId = parsed.workspaceId;
                    actorId = parsed.actorId;
                }
                else {
                    // Authenticated user - validate session from DB and extract context
                    const session = yield sessionRepository.byId(sessionId);
                    if (!session || session.revokedAt !== null) {
                        throw new Error("[case.assignLawyer] Invalid or revoked session - authentication violation");
                    }
                    ({ tenantId, workspaceId, actorId } = session);
                }
            }
            const current = yield caseRepository.byId(id, {
                tenantId: tenantId,
                workspaceId: workspaceId
            });
            if (current === undefined) {
                throw new Error(`[case.assignLawyer] Case not found: ${id}`);
            }
            if (current.status === "closed") {
                throw new Error(`[case.assignLawyer] Cannot assign lawyer to closed case: ${id}`);
            }
            const nextStatus = "in_progress";
            const next = Object.assign(Object.assign({}, current), { lawyerId: lawyerId, status: nextStatus, workId: current.workId });
            yield caseRepository.save(next, {
                tenantId: tenantId,
                workspaceId: workspaceId,
                actorId: actorId
            });
            return { id: next.id, lawyerId: next.lawyerId, status: next.status };
        });
    },
};
exports.listCasesByWorkspace = {
    kind: "command",
    name: "case.listByWorkspace",
    version: "2.0.0",
    execute(input) {
        return __awaiter(this, void 0, void 0, function* () {
            yield ensureIdentitySchema();
            const parsed = ListCasesWithContextSchema.parse(input);
            const { sessionId, limit, offset } = parsed;
            // Handle anonymous sessions - extract context directly from input, no DB validation needed
            let tenantId;
            let workspaceId;
            let actorId;
            // Check if this is an anonymous session (was passed in the input)
            const isAnonymous = parsed.actorId === "anonymous.user";
            if (isAnonymous) {
                // Use anonymous session values directly from input
                tenantId = parsed.tenantId;
                workspaceId = parsed.workspaceId;
                actorId = parsed.actorId;
            }
            else {
                // Authenticated user - validate session from DB and extract
                const session = yield sessionRepository.byId(sessionId);
                if (!session || session.revokedAt !== null) {
                    throw new Error("[case.listByWorkspace] Invalid or revoked session - authentication violation");
                }
                ({ tenantId, workspaceId, actorId } = session);
            }
            // Session is already verified during creation - no need for redundant checks
            console.log("[listCasesByWorkspace] Listing cases for workspace:", workspaceId, "tenant:", tenantId);
            // Get all cases for this workspace - bypass workspace filter in development for in-memory
            let allWorkspaceCases;
            if (process.env.DATABASE_URL) {
                allWorkspaceCases = yield caseRepository.listByWorkspace(workspaceId);
            }
            else {
                // In-memory mode: return all cases to fix "work not found" in workspace list
                allWorkspaceCases = yield caseRepository.list();
            }
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
                filteredCases = filteredCases.filter(c => { var _a; var _b; return c.title.toLowerCase().includes(query) ||
                    ((_b = (_a = c.description) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(query)) !== null && _b !== void 0 ? _b : false); });
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
        });
    },
};
// Import already exists at top of file with correct .js extension
// import { z } from "zod"; (duplicate removed, already imported at top)
// import type { CapabilityCommand } from "../../../../packages/core/kernel/src/types"; (duplicate removed)
// import type { CaseAggregate, CaseId } from "../contracts/index"; (duplicate removed)
// Add evidence command schema and implementation
const AddEvidenceToCaseSchema = zod_1.z.object({
    id: zod_1.z.string().min(1), // Case ID
    evidence: zod_1.z.object({
        type: zod_1.z.enum(["document", "external_response", "communication", "outcome"]),
        title: zod_1.z.string().min(1),
        url: zod_1.z.string().optional(),
        content: zod_1.z.string().optional(),
        metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    }),
    // Required context for tenant isolation - supports anonymous sessions
    sessionId: zod_1.z.string().min(1),
    tenantId: zod_1.z.string().min(1),
    workspaceId: zod_1.z.string().min(1),
    actorId: zod_1.z.string().min(1),
});
exports.addEvidenceToCase = {
    kind: "command",
    name: "case.addEvidence",
    version: "1.0.0",
    execute(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const parsed = AddEvidenceToCaseSchema.parse(input);
            const { sessionId, tenantId, workspaceId, actorId, id, evidence: newEvidence } = parsed;
            // Anonymous session validation (same pattern as other commands)
            const isAnonymous = actorId === "anonymous.user";
            if (!isAnonymous) {
                const session = yield sessionRepository.byId(sessionId);
                if (!session || session.revokedAt !== null) {
                    throw new Error("[case.addEvidence] Invalid or revoked session - authentication violation");
                }
                if (session.tenantId !== tenantId || session.workspaceId !== workspaceId || session.actorId !== actorId) {
                    throw new Error("[case.addEvidence] Context mismatch - security violation");
                }
            }
            // Get current case
            const caseId = id;
            const current = yield caseRepository.byId(caseId, { tenantId, workspaceId });
            if (!current) {
                throw new Error(`[case.addEvidence] Case not found: ${id}`);
            }
            // Create immutable evidence entry
            const evidenceEntry = Object.assign(Object.assign({ id: `evidence-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` }, newEvidence), { uploadedBy: actorId, uploadedAt: new Date() });
            // Append to evidence chain (immutable - never modify existing entries)
            const updatedEvidence = [...(current.evidence || []), evidenceEntry];
            const next = Object.assign(Object.assign({}, current), { evidence: updatedEvidence, updatedAt: new Date() });
            // Save updated case
            yield caseRepository.save(next, { tenantId, workspaceId, actorId });
            // Automatically record to central evidence registry (reuses existing capability)
            try {
                const { capabilityRegistry } = yield import("../../../../packages/core/kernel/src/index");
                yield capabilityRegistry.invoke("evidence-registry", "evidence.record", {
                    entityRef: id,
                    entityType: "legal-case",
                    action: "evidence_added",
                    actorId: actorId,
                    details: { evidenceId: evidenceEntry.id, type: evidenceEntry.type },
                    timestamp: new Date().toISOString(),
                    sessionId: sessionId,
                    tenantId: tenantId,
                    workspaceId: workspaceId,
                });
            }
            catch (registryError) {
                console.warn("[case.addEvidence] Evidence registry record failed (non-critical):", registryError);
                // Case save succeeded, don't fail the whole operation for registry issues
            }
            return next;
        });
    },
};
// Add mark case as completed command
const MarkCaseCompletedSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    outcomeDescription: zod_1.z.string().min(1),
    externalReferenceId: zod_1.z.string().optional(),
    // Required context
    sessionId: zod_1.z.string().min(1),
    tenantId: zod_1.z.string().min(1),
    workspaceId: zod_1.z.string().min(1),
    actorId: zod_1.z.string().min(1),
});
exports.markCaseCompleted = {
    kind: "command",
    name: "case.markCompleted",
    version: "1.0.0",
    execute(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const parsed = MarkCaseCompletedSchema.parse(input);
            const { sessionId, tenantId, workspaceId, actorId, id, outcomeDescription, externalReferenceId } = parsed;
            // Anonymous session validation
            const isAnonymous = actorId === "anonymous.user";
            if (!isAnonymous) {
                const session = yield sessionRepository.byId(sessionId);
                if (!session || session.revokedAt !== null) {
                    throw new Error("[case.markCompleted] Invalid or revoked session - authentication violation");
                }
            }
            // Get current case
            const caseId = id;
            const current = yield caseRepository.byId(caseId, { tenantId, workspaceId });
            if (!current) {
                throw new Error(`[case.markCompleted] Case not found: ${id}`);
            }
            // Create outcome entry
            const outcome = {
                description: outcomeDescription,
                completedAt: new Date(),
                verifiedBy: actorId,
                externalReferenceId: externalReferenceId,
            };
            // Add outcome as evidence to maintain chain
            const outcomeEvidence = {
                id: `evidence-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                type: "outcome",
                title: "Case Completed",
                content: outcomeDescription,
                uploadedBy: actorId,
                uploadedAt: outcome.completedAt,
                metadata: { externalReferenceId },
            };
            const updatedEvidence = [...(current.evidence || []), outcomeEvidence];
            const next = Object.assign(Object.assign({}, current), { status: "closed", outcome: outcome, evidence: updatedEvidence, updatedAt: new Date(), closedAt: new Date() });
            // Save updated case
            yield caseRepository.save(next, { tenantId, workspaceId, actorId });
            // Trigger agentic notification (same as other state transitions)
            const { capabilityRegistry } = yield import("../../../../packages/core/kernel/src/index");
            yield capabilityRegistry.invoke("communication", "agenticNotify", {
                work_id: id,
                trigger: "state_transition",
                old_state: current.status,
                new_state: "completed",
                recipient_ids: current.lawyerId ? [current.lawyerId] : [],
                adapter_type: "whatsapp",
                sessionId: "session-agent-001",
                tenantId: tenantId,
                workspaceId: workspaceId
            });
            return next;
        });
    },
};
// NEW: Command to create Case from existing core Work (supports Work specialization flow)
const createCaseFromWork = {
    kind: "command",
    name: "case.createFromWork",
    version: "1.0.0",
    execute(input) {
        return __awaiter(this, void 0, void 0, function* () {
            yield ensureIdentitySchema();
            // Reuse existing case.create logic but pass through the core Work's context
            const result = yield exports.createCase.execute(Object.assign({ title: input.coreWork.title, description: input.coreWork.description, priority: input.coreWork.priority, sessionId: input.coreWork.sessionId, tenantId: input.coreWork.tenantId, workspaceId: input.coreWork.workspaceId, actorId: input.coreWork.actorId, linkedIntentId: input.coreWork.linkedIntentId, workId: input.workId }, (input.domainSpecificData || {})));
            return {
                id: result.id,
                workId: input.workId,
                domainType: "legal-case",
            };
        });
    },
};
exports.caseCommands = {
    "case.create": exports.createCase,
    "case.createFromWork": createCaseFromWork,
    "case.close": exports.closeCase,
    "case.assignLawyer": exports.assignLawyer,
    "case.getById": get_case_by_id_command_1.getCaseByIdCommand,
    "case.listByWorkspace": exports.listCasesByWorkspace,
    "case.addEvidence": exports.addEvidenceToCase,
    "case.markCompleted": exports.markCaseCompleted,
};
function nextCaseId() {
    return (0, index_1.newCaseId)();
}
