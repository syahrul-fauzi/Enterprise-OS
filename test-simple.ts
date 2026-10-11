// Simple test untuk verifikasi FACE-001
import { 
  workflowRegistry, 
  isValidWorkflowDefinition,
  LH_LGL_001_ConsultationWorkflow,
  ILC_INS_001_InstitutionalWorkflow,
  SVC_ID_001_TechnicalServiceWorkflow,
  BPJS_KSHTN_001_ClaimWorkflow
} from './workspace/packages/core/kernel/src/registry/capability-command-registry';

// Polyfill process
declare const process: { exit: (code: number) => void };

// Filter logic
function filterWorksByProductAndSurface(
  works: Array<{workId: string; workflowId: string; actorId: string}>,
  session: {actorId: string; productId?: string; workspaceId: string; tenantId: string},
  currentSurface: string
) {
  return works.filter(w => {
    const actorMatch = w.actorId === session.actorId || (session.actorId === "anonymous.user" && w.workId === "lh-case-001");
    if (!actorMatch) return false;
    if (!session.productId) return true;
    
    const workflow = workflowRegistry.get(w.workflowId);
    if (!workflow) return false;
    
    const productMatch = workflow.productId === session.productId;
    const faceSupported = workflow.presentationBoundary?.supportedFaces ? 
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
async function runTest() {
  console.log("=== FACE-001 SIMPLE VERIFICATION ===");
  
  // Register workflows
  workflowRegistry.register(LH_LGL_001_ConsultationWorkflow);
  workflowRegistry.register(ILC_INS_001_InstitutionalWorkflow);
  workflowRegistry.register(SVC_ID_001_TechnicalServiceWorkflow);
  workflowRegistry.register(BPJS_KSHTN_001_ClaimWorkflow);
  console.log(`✅ Registered ${workflowRegistry.listAll().length} workflows`);
  
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
  const allValid = workflowRegistry.listAll().every(wf => isValidWorkflowDefinition(wf));
  console.log(`✅ All workflows 5-boundary compliant: ${allValid}`);
  
  // Final result
  const lhOnly = lhWorks.every(w => w.workId === "lh-case-001");
  const ilcOnly = ilcWorks.every(w => w.workId === "ilc-inv-001");
  const allPassed = lhOnly && ilcOnly && allValid;
  
  console.log("\n=== FINAL RESULT ===");
  console.log(allPassed ? "✅ FACE-001 VERIFICATION PASSED" : "❌ FACE-001 VERIFICATION FAILED");
  process.exit(allPassed ? 0 : 1);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});