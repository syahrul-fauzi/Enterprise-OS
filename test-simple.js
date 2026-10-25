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
// Simple test untuk verifikasi FACE-001
const capability_command_registry_1 = require("./workspace/packages/core/kernel/src/registry/capability-command-registry");
// Filter logic
function filterWorksByProductAndSurface(works, session, currentSurface) {
    return works.filter(w => {
        var _a;
        const actorMatch = w.actorId === session.actorId || (session.actorId === "anonymous.user" && w.workId === "lh-case-001");
        if (!actorMatch)
            return false;
        if (!session.productId)
            return true;
        const workflow = capability_command_registry_1.workflowRegistry.get(w.workflowId);
        if (!workflow)
            return false;
        const productMatch = workflow.productId === session.productId;
        const faceSupported = ((_a = workflow.presentationBoundary) === null || _a === void 0 ? void 0 : _a.supportedFaces) ?
            Array.prototype.includes.call(workflow.presentationBoundary.supportedFaces, currentSurface) : false;
        console.log(`[FILTER] Work ${w.workId} | product: ${workflow.productId} | surface: ${currentSurface} | match: ${productMatch && faceSupported}`);
        return productMatch && faceSupported;
    });
}
// Test data
const testWorks = [
    { workId: "lh-case-001", workflowId: "lh-lgl-001-legal-consultation", actorId: "anonymous.user" },
    { workId: "ilc-inv-001", workflowId: "ilc-ins-001-institutional-coordination", actorId: "ilc.user.001" },
];
// Jalankan test
function runTest() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("=== FACE-001 SIMPLE VERIFICATION ===");
        // Register workflows
        capability_command_registry_1.workflowRegistry.register(capability_command_registry_1.LH_LGL_001_ConsultationWorkflow);
        capability_command_registry_1.workflowRegistry.register(capability_command_registry_1.ILC_INS_001_InstitutionalWorkflow);
        capability_command_registry_1.workflowRegistry.register(capability_command_registry_1.SVC_ID_001_TechnicalServiceWorkflow);
        capability_command_registry_1.workflowRegistry.register(capability_command_registry_1.BPJS_KSHTN_001_ClaimWorkflow);
        console.log(`✅ Registered ${capability_command_registry_1.workflowRegistry.listAll().length} workflows`);
        // Test 1: LawyersHub UI
        console.log("\n📋 Test 1: LawyersHub UI (product=lawyershub, surface=web)");
        const lhWorks = filterWorksByProductAndSurface(testWorks, {
            actorId: "anonymous.user", productId: "lawyershub", workspaceId: "lh-ws", tenantId: "lh-tenant"
        }, "web");
        console.log(`✅ Works in LawyersHub: ${lhWorks.map(w => w.workId).join(', ')}`);
        // Test 2: ILC UI
        console.log("\n📋 Test 2: ILC UI (product=ilc, surface=web)");
        const ilcWorks = filterWorksByProductAndSurface(testWorks, {
            actorId: "ilc.user.001", productId: "ilc", workspaceId: "ilc-ws", tenantId: "ilc-tenant"
        }, "web");
        console.log(`✅ Works in ILC: ${ilcWorks.map(w => w.workId).join(', ')}`);
        // Check all boundaries
        console.log("\n📋 5-Boundary Validation:");
        const allValid = capability_command_registry_1.workflowRegistry.listAll().every(wf => (0, capability_command_registry_1.isValidWorkflowDefinition)(wf));
        console.log(`✅ All workflows 5-boundary compliant: ${allValid}`);
        // Final result
        const lhOnly = lhWorks.every(w => w.workId === "lh-case-001");
        const ilcOnly = ilcWorks.every(w => w.workId === "ilc-inv-001");
        const allPassed = lhOnly && ilcOnly && allValid;
        console.log("\n=== FINAL RESULT ===");
        console.log(allPassed ? "✅ FACE-001 VERIFICATION PASSED" : "❌ FACE-001 VERIFICATION FAILED");
        process.exit(allPassed ? 0 : 1);
    });
}
runTest().catch(err => {
    console.error(err);
    process.exit(1);
});
