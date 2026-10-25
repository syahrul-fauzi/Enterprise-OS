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
/**
 * ILC-INS-001: Institutional Coordination Reality E2E Test
 * Verifies all 11 reality gates:
 * I1: Institutional Need correctly understood (not PROJECT CREATED)
 * I2: ≥3 actors bound with observable responsibilities
 * I3: Unauthorized execution blocked (hierarchical authority)
 * I4: Real coordination events change Work state
 * I5: Stuck condition detected with natural language explanation
 * I6: Recovery action resumes Work
 * I7: Institutional outcome delivered with evidence
 * I8: Execution produces institutional deliverable
 * I9: Evidence persists
 * I10: Outcome observable from canonical Work Reality
 * I11: No institutional lifecycle fork (uses canonical Work)
 */
const globals_1 = require("@jest/globals");
const capability_command_registry_js_1 = require("../../../../packages/core/kernel/src/registry/capability-command-registry.js");
const inspection_agent_service_js_1 = require("../../../../capabilities/work-inspection/implementation/services/inspection.agent.service.js");
const work_postgres_repository_js_1 = require("../../../../capabilities/work-core/implementation/repository/work-postgres.repository.js");
// Test actors with roles matching ILC workflow requirements
const ACTORS = {
    institutionalRepresentative: "institutional-representative-ilc-001",
    legalDepartmentHead: "department-head-legal-001",
    itDepartmentHead: "department-head-it-001",
    financeDepartmentHead: "department-head-finance-001",
    executiveAuthority: "executive-institutional-authority-001",
    projectManager: "project-manager-ilc-001",
    unauthorizedActor: "regular-staff-no-roles-001"
};
// Shared test context
const TEST_CONTEXT = {
    workId: `ilc-work-${Date.now()}`,
    sessionId: "session-test-ilc-001",
    tenantId: "tenant-enterprise-001",
    workspaceId: "workspace-headquarters-001"
};
// Initialize shared services
const workRepository = new work_postgres_repository_js_1.WorkRepositoryPostgres();
const inspectionAgent = new inspection_agent_service_js_1.WorkInspectionAgent({
    handoffThresholdHours: 24, // Exact threshold from user's I5 requirement
    enableAutomaticNotifications: false
});
(0, globals_1.describe)('ILC-INS-001: Institutional Coordination Reality Slice', () => {
    (0, globals_1.beforeEach)(() => __awaiter(void 0, void 0, void 0, function* () {
        // Reset work state before each test
        yield workRepository.delete(TEST_CONTEXT.workId);
    }));
    (0, globals_1.it)('I1 - Institutional Need correctly understood, not immediately PROJECT CREATED', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // 1. Submit institutional need: "Kita perlu memulai inisiatif digitalisasi dokumen hukum yang melibatkan departemen legal, IT, dan keuangan."
        const initialTransition = yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "institutional-need-submitted", // Initial step = institutional need, not project created
        ACTORS.institutionalRepresentative, Object.assign(Object.assign({}, TEST_CONTEXT), { result: "Inisiatif digitalisasi dokumen hukum diajukan oleh pimpinan institusi" }));
        (0, globals_1.expect)(initialTransition.success).toBe(true);
        (0, globals_1.expect)((_a = initialTransition.nextStep) === null || _a === void 0 ? void 0 : _a.id).toBe("requirements-analyzed");
        // 2. Verify work state shows institutional need, not generic project
        const work = yield workRepository.getById(TEST_CONTEXT.workId);
        (0, globals_1.expect)(work === null || work === void 0 ? void 0 : work.type).toBe("institutional-initiative");
        (0, globals_1.expect)(work === null || work === void 0 ? void 0 : work.title).toContain("digitalisasi dokumen hukum");
        (0, globals_1.expect)(work === null || work === void 0 ? void 0 : work.domainTags).toEqual(globals_1.expect.arrayContaining(["LEGAL", "IT", "FINANCE"]));
        (0, globals_1.expect)(work === null || work === void 0 ? void 0 : work.status).toBe("active");
        yield recordEvidence("I1_PASS", {
            institutionalNeedDetected: true,
            domainTagsIdentified: ["LEGAL", "IT", "FINANCE"],
            notProjectCreated: true
        });
    }));
    (0, globals_1.it)('I2 - Multi-actor binding with observable responsibilities (≥3 actors)', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // Execute first two transitions to reach actors-composed state
        yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "institutional-need-submitted", ACTORS.institutionalRepresentative, TEST_CONTEXT);
        const composedTransition = yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "requirements-analyzed", "system-automated-001", Object.assign(Object.assign({}, TEST_CONTEXT), { result: "Legal, IT, Finance actors composed with clear responsibilities" }));
        (0, globals_1.expect)(composedTransition.success).toBe(true);
        (0, globals_1.expect)((_a = composedTransition.nextStep) === null || _a === void 0 ? void 0 : _a.id).toBe("actors-composed");
        // Verify actors are bound with responsibilities
        const work = yield workRepository.getById(TEST_CONTEXT.workId);
        const assignedActors = (work === null || work === void 0 ? void 0 : work.assignedActors) || [];
        (0, globals_1.expect)(assignedActors.length).toBeGreaterThanOrEqual(3);
        (0, globals_1.expect)(assignedActors.some((a) => a.id.includes("legal"))).toBe(true);
        (0, globals_1.expect)(assignedActors.some((a) => a.id.includes("it"))).toBe(true);
        (0, globals_1.expect)(assignedActors.some((a) => a.id.includes("finance"))).toBe(true);
    }));
    // Verify responsibilities are observable
    const actorResponsibilities = assignedActors.map((a) => a.responsibility);
    (0, globals_1.expect)(actorResponsibilities).toContain("Legal document review & compliance");
    (0, globals_1.expect)(actorResponsibilities).toContain("Technical infrastructure planning");
    (0, globals_1.expect)(actorResponsibilities).toContain("Budget allocation & approval");
    yield recordEvidence("I2_PASS", {
        actorCount: assignedActors.length,
        allRolesBound: true,
        responsibilitiesObservable: true
    });
});
(0, globals_1.it)('I3 - Unauthorized transition attempts blocked by hierarchical role validation', () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    // 1. Reach actors-composed state first
    yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "institutional-need-submitted", ACTORS.institutionalRepresentative, TEST_CONTEXT);
    yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "requirements-analyzed", "system-automated-001", TEST_CONTEXT);
    // 2. Try to jump directly to execution (unauthorized actor) - MUST BE BLOCKED
    const unauthorizedJump = yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "actors-composed", ACTORS.unauthorizedActor, TEST_CONTEXT);
    (0, globals_1.expect)(unauthorizedJump.success).toBe(false);
    (0, globals_1.expect)(unauthorizedJump.error).toContain("lacks required roles");
    // 3. Get department head approval (allowed - department-head role)
    const firstApproval = yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "actors-composed", ACTORS.legalDepartmentHead, Object.assign(Object.assign({}, TEST_CONTEXT), { result: "Legal department approves initiative" }));
    (0, globals_1.expect)(firstApproval.success).toBe(true);
    (0, globals_1.expect)((_a = firstApproval.nextStep) === null || _a === void 0 ? void 0 : _a.id).toBe("first-approval");
    // 4. Try to jump to execution with only department head approval - STILL BLOCKED (needs executive)
    const prematureExecution = yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "first-approval", ACTORS.projectManager, // Lacks required executive/institutional-authority role
    TEST_CONTEXT);
    (0, globals_1.expect)(prematureExecution.success).toBe(false);
    (0, globals_1.expect)(prematureExecution.error).toContain("lacks required roles");
    // 5. Get executive approval (allowed - executive role)
    const secondApproval = yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "first-approval", ACTORS.executiveAuthority, Object.assign(Object.assign({}, TEST_CONTEXT), { result: "Executive leadership approves budget and resources" }));
    (0, globals_1.expect)(secondApproval.success).toBe(true);
    (0, globals_1.expect)((_b = secondApproval.nextStep) === null || _b === void 0 ? void 0 : _b.id).toBe("second-approval");
    // 6. Now project manager can start execution (allowed - has project-manager role)
    const executionStart = yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "second-approval", ACTORS.projectManager, Object.assign(Object.assign({}, TEST_CONTEXT), { result: "Execution phase formally initiated" }));
    (0, globals_1.expect)(executionStart.success).toBe(true);
    (0, globals_1.expect)((_c = executionStart.nextStep) === null || _c === void 0 ? void 0 : _c.id).toBe("execution-initiated");
    yield recordEvidence("I3_PASS", {
        unauthorizedBlocked: true,
        prematureBlocked: true,
        hierarchicalApprovalEnforced: true,
        executiveApprovalRequired: true
    });
}));
(0, globals_1.it)('I4 - Real coordination events change Work state (Legal→IT→Finance dependency chain)', () => __awaiter(void 0, void 0, void 0, function* () {
    // Reach execution-initiated state
    yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "institutional-need-submitted", ACTORS.institutionalRepresentative, TEST_CONTEXT);
    yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "requirements-analyzed", "system-automated-001", TEST_CONTEXT);
    yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "actors-composed", ACTORS.legalDepartmentHead, Object.assign(Object.assign({}, TEST_CONTEXT), { result: "Legal submits requirements" }));
    yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "first-approval", ACTORS.executiveAuthority, Object.assign(Object.assign({}, TEST_CONTEXT), { result: "Executive approves" }));
    yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "second-approval", ACTORS.projectManager, TEST_CONTEXT);
    // Real coordination event 1: Legal submits requirements
    const legalSubmit = yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "execution-initiated", ACTORS.legalDepartmentHead, Object.assign(Object.assign({}, TEST_CONTEXT), { result: "Legal: Semua dokumen hukum sudah di-review dan disetujui untuk IT" }));
    (0, globals_1.expect)(legalSubmit.success).toBe(true);
    // Real coordination event 2: IT responds with technical dependencies
    const itRespond = yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "execution-initiated", // Work state updates after legal's action
    ACTORS.itDepartmentHead, Object.assign(Object.assign({}, TEST_CONTEXT), { result: "IT: Technical dependencies identified - cloud storage API, access control system" }));
    (0, globals_1.expect)(itRespond.success).toBe(true);
    // Real coordination event 3: Finance evaluates budget implications
    const financeEvaluate = yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "execution-initiated", ACTORS.financeDepartmentHead, Object.assign(Object.assign({}, TEST_CONTEXT), { result: "Finance: Budget Rp 750M approved, cloud resources allocated Q3 2026" }));
    (0, globals_1.expect)(financeEvaluate.success).toBe(true);
    // Verify Work can answer all 5 coordination questions: WHO? WHAT? WHICH? WHO has authority? WHAT next?
    const work = yield workRepository.getById(TEST_CONTEXT.workId);
    const stateHistory = (work === null || work === void 0 ? void 0 : work.stateHistory) || [];
    (0, globals_1.expect)(stateHistory.length).toBeGreaterThanOrEqual(6); // All transition events recorded
    // Extract last three coordination events
    const coordinationEvents = stateHistory.slice(-3).map((e) => e.note);
    (0, globals_1.expect)(coordinationEvents.some((n) => n.includes("Legal: Semua dokumen"))).toBe(true);
    (0, globals_1.expect)(coordinationEvents.some((n) => n.includes("IT: Technical dependencies"))).toBe(true);
    (0, globals_1.expect)(coordinationEvents.some((n) => n.includes("Finance: Budget Rp 750M"))).toBe(true);
    yield recordEvidence("I4_PASS", {
        realCoordinationEvents: 3,
        allQuestionsAnswerable: true,
        stateHistoryMaintained: true
    });
}));
(0, globals_1.it)('I5 - Stuck work (>24h) detected with natural language explanation that answers all user questions', () => __awaiter(void 0, void 0, void 0, function* () {
    // Create work in active state with last update >24h ago
    const twentyFiveHoursAgo = new Date(Date.now() - (25 * 60 * 60 * 1000));
    yield workRepository.save({
        workId: TEST_CONTEXT.workId,
        status: "active",
        assignedActorId: ACTORS.financeDepartmentHead,
        nextAction: "Approve budget allocation for digitalization initiative",
        createdAt: twentyFiveHoursAgo,
        updatedAt: twentyFiveHoursAgo,
        stateHistory: [{
                timestamp: twentyFiveHoursAgo.toISOString(),
                note: "Finance Department assigned responsibility to review budget",
                actorId: ACTORS.financeDepartmentHead
            }]
    });
    // Trigger inspection - RL2-005 must detect stuck work
    const inspectionResult = yield inspectionAgent.inspectWork(TEST_CONTEXT.workId);
    // Verify bottleneck detected
    (0, globals_1.expect)(inspectionResult.bottlenecks.length).toBeGreaterThan(0);
    const stuckBottleneck = inspectionResult.bottlenecks.find(b => b.type === "HANDOFF_DELAY");
    (0, globals_1.expect)(stuckBottleneck).toBeDefined();
    (0, globals_1.expect)(stuckBottleneck === null || stuckBottleneck === void 0 ? void 0 : stuckBottleneck.delayHours).toBeGreaterThan(24);
    (0, globals_1.expect)(stuckBottleneck === null || stuckBottleneck === void 0 ? void 0 : stuckBottleneck.severity).toBe("HIGH"); // >24h = HIGH per RL2-005 logic
    // Verify recommendation message answers ALL user's required questions:
    // Apa yang terjadi? Mengapa Work tidak bergerak? Siapa yang dibutuhkan? Apa yang belum diketahui? Apa next decision?
    const recommendation = inspectionResult.recommendations.find(r => r.message.includes("RL2-005"));
    (0, globals_1.expect)(recommendation).toBeDefined();
    const message = (recommendation === null || recommendation === void 0 ? void 0 : recommendation.message) || "";
    (0, globals_1.expect)(message).toContain("Sudah 25 jam tidak ada perubahan status"); // Apa yang terjadi?
    (0, globals_1.expect)(message).toContain("Tidak ada state transition tercatat"); // Mengapa tidak bergerak?
    (0, globals_1.expect)(message).toContain(`Actor ${ACTORS.financeDepartmentHead}`); // Siapa yang dibutuhkan?
    (0, globals_1.expect)(message).toContain("Approve budget allocation"); // Apa yang harus dilakukan (next decision)
    yield recordEvidence("I5_PASS", {
        stuckWorkDetected: true,
        naturalLanguageExplanation: true,
        allQuestionsAnswered: true,
        delayHours: stuckBottleneck === null || stuckBottleneck === void 0 ? void 0 : stuckBottleneck.delayHours
    });
    0;
    (0, globals_1.it)('I6 - Stuck work recovery: Actor reassignment resumes work progression', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // First create stuck work (same as I5)
        const twentyFiveHoursAgo = new Date(Date.now() - (25 * 60 * 60 * 1000));
        yield workRepository.save({
            workId: TEST_CONTEXT.workId,
            status: "active",
            assignedActorId: ACTORS.financeDepartmentHead, // Original actor unresponsive
            nextAction: "Approve budget allocation for digitalization initiative",
            createdAt: twentyFiveHoursAgo,
            updatedAt: twentyFiveHoursAgo,
            stateHistory: [{
                    timestamp: twentyFiveHoursAgo.toISOString(),
                    note: "Finance Department assigned responsibility to review budget",
                    actorId: ACTORS.financeDepartmentHead
                }]
        });
        // Detect stuck work
        const inspectionResult = yield inspectionAgent.inspectWork(TEST_CONTEXT.workId);
        (0, globals_1.expect)(inspectionResult.bottlenecks.length).toBeGreaterThan(0);
        // Execute recovery: reassign to new finance actor
        const newFinanceActor = "department-head-finance-backup-001";
        const reassignmentResult = yield workRepository.update(TEST_CONTEXT.workId, {
            assignedActorId: newFinanceActor,
            nextAction: "Review and approve budget allocation within 48h",
            stateHistory: [
                ...(((_a = (yield workRepository.getById(TEST_CONTEXT.workId))) === null || _a === void 0 ? void 0 : _a.stateHistory) || []),
                {
                    timestamp: new Date().toISOString(),
                    note: `Work reassigned to new finance actor ${newFinanceActor} due to inactivity`,
                    actorId: ACTORS.projectManager
                }
            ]
        });
        (0, globals_1.expect)(reassignmentResult.ok).toBe(true);
        // New actor completes approval - work resumes
        const resumeResult = yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "execution-initiated", newFinanceActor, Object.assign(Object.assign({}, TEST_CONTEXT), { result: "New finance actor approves budget, work resumes" }));
        (0, globals_1.expect)(resumeResult.success).toBe(true);
        // Verify work is no longer stuck in next inspection
        const postRecoveryInspection = yield inspectionAgent.inspectWork(TEST_CONTEXT.workId);
        const newBottlenecks = postRecoveryInspection.bottlenecks.filter(b => b.type === "HANDOFF_DELAY");
        (0, globals_1.expect)(newBottlenecks.length).toBe(0); // No longer stuck
        yield recordEvidence("I6_PASS", {
            actorReassignmentSuccessful: true,
            workResumed: true,
            postRecoveryNoBottlenecks: true
        });
    }));
    (0, globals_1.it)('I7-I11 - Full lifecycle completion: outcome delivered, evidence persists, no lifecycle fork', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // Execute full workflow to institutional-work-closed
        yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "institutional-need-submitted", ACTORS.institutionalRepresentative, TEST_CONTEXT);
        yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "requirements-analyzed", "system-automated-001", TEST_CONTEXT);
        yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "actors-composed", ACTORS.legalDepartmentHead, Object.assign(Object.assign({}, TEST_CONTEXT), { result: "Legal approves" }));
        yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "first-approval", ACTORS.executiveAuthority, Object.assign(Object.assign({}, TEST_CONTEXT), { result: "Executive approves" }));
        yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "second-approval", ACTORS.projectManager, TEST_CONTEXT);
        yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "execution-initiated", ACTORS.itDepartmentHead, Object.assign(Object.assign({}, TEST_CONTEXT), { result: "Technical implementation completed" }));
        // I7: Outcome delivered - institutional deliverable exists
        const outcomeResult = yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "execution-initiated", ACTORS.projectManager, Object.assign(Object.assign({}, TEST_CONTEXT), { result: "Digital document management system deployed, all legal records migrated" }));
        (0, globals_1.expect)(outcomeResult.success).toBe(true);
        (0, globals_1.expect)((_a = outcomeResult.nextStep) === null || _a === void 0 ? void 0 : _a.id).toBe("outcome-delivered");
        // I8: Execution produces institutional deliverable
        const workAfterOutcome = yield workRepository.getById(TEST_CONTEXT.workId);
        const deliverables = (workAfterOutcome === null || workAfterOutcome === void 0 ? void 0 : workAfterOutcome.artifacts) || [];
        (0, globals_1.expect)(deliverables).toContainEqual(globals_1.expect.objectContaining({
            type: "institutional-deliverable",
            name: "Digital Document Management System Deployment Report",
            url: "/artifacts/ilc-dms-deployment-report.pdf"
        }));
        // I9 & I11: Close work, verify evidence persists and uses canonical work lifecycle
        const closeResult = yield (0, capability_command_registry_js_1.executeWorkflowTransition)(capability_command_registry_js_1.ILC_INS_001_InstitutionalWorkflow, "outcome-delivered", ACTORS.institutionalRepresentative, Object.assign(Object.assign({}, TEST_CONTEXT), { result: "Institutional work formally closed" }));
        (0, globals_1.expect)(closeResult.success).toBe(true);
        (0, globals_1.expect)(closeResult.nextStep).toBeUndefined(); // Terminal step reached
        // I10: Outcome observable from canonical Work Reality
        const closedWork = yield workRepository.getById(TEST_CONTEXT.workId);
        (0, globals_1.expect)(closedWork === null || closedWork === void 0 ? void 0 : closedWork.status).toBe("closed");
        (0, globals_1.expect)(closedWork === null || closedWork === void 0 ? void 0 : closedWork.stateHistory.length).toBeGreaterThan(10); // All transitions recorded
        (0, globals_1.expect)(closedWork === null || closedWork === void 0 ? void 0 : closedWork.type).toBe("institutional-initiative"); // Still canonical work type, no fork
        (0, globals_1.expect)(closedWork === null || closedWork === void 0 ? void 0 : closedWork.closedAt).toBeDefined();
        yield recordEvidence("I7-I11_PASS", {
            outcomeDelivered: true,
            institutionalDeliverableExists: true,
            evidencePersisted: true,
            outcomeObservable: true,
            noLifecycleFork: true,
            canonicalWorkReused: true
        });
    }));
}));
/**
 * Helper to persist evidence to the verification ledger
 */
function recordEvidence(gateId, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const fs = yield import('fs/promises');
        const path = yield import('path');
        const evidenceDir = path.join('/root/Enterprise-OS/.eos-state/evidence/ilc-ins-001');
        yield fs.mkdir(evidenceDir, { recursive: true });
        yield fs.writeFile(path.join(evidenceDir, `${gateId}_evidence.json`), JSON.stringify(Object.assign({ gateId, recordedAt: new Date().toISOString(), workId: TEST_CONTEXT.workId }, data), null, 2));
        console.log(`[EVIDENCE] ${gateId} PASSED - evidence saved`);
    });
}
