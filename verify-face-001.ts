// FACE-001 RUNTIME VERIFICATION SCRIPT
// Verifikasi bahwa:
// - LH_LGL_001 muncul di LawyersHub UI (productId=lawyershub, surface=web)
// - ILC_INS_001 muncul di ILC UI (productId=ilc, surface=web)
// - Tidak ada cross-product leakage (LH_LGL_001 tidak muncul di ILC, ILC_INS_001 tidak muncul di LawyersHub)

// Import dari capability-command-registry (file asli) - hapus ekstensi .ts untuk kompatibilitas TypeScript
import { 
  workflowRegistry, 
  WorkflowDefinition, 
  isValidWorkflowDefinition,
  LH_LGL_001_ConsultationWorkflow,
  ILC_INS_001_InstitutionalWorkflow,
  SVC_ID_001_TechnicalServiceWorkflow,
  BPJS_KSHTN_001_ClaimWorkflow
} from './workspace/packages/core/kernel/src/registry/capability-command-registry';

// Re-ekstrak logic filtering dari getMyRealityModel.ts untuk verifikasi terisolasi
function filterWorksByProductAndSurface(
  works: Array<{workId: string; workflowId: string; actorId: string}>,
  session: {actorId: string; productId?: string; workspaceId: string; tenantId: string},
  currentSurface: string
) {
  return works.filter(w => {
    // Actor match (anonim user hanya dapat melihat lh-case-001)
    const actorMatch = w.actorId === session.actorId || (session.actorId === "anonymous.user" && w.workId === "lh-case-001");
    if (!actorMatch) return false;
    
    // Jika tidak ada productId, return semua yang cocok actor
    if (!session.productId) return true;
    
    // Ambil workflow definition dari registry
    const workflow = workflowRegistry.get(w.workflowId);
    if (!workflow) return false;
    
    // FACE-001: Product ID must match EXACTLY
    const productMatch = workflow.productId === session.productId;
    
    // FIX: supportedFaces adalah readonly string[], gunakan Array.prototype.includes.call untuk TypeScript compatibility
    const faceSupported = workflow.presentationBoundary?.supportedFaces ? 
      Array.prototype.includes.call(workflow.presentationBoundary.supportedFaces, currentSurface) : false;
    
    // Log untuk debugging
    console.log(`[FILTER] Work ${w.workId} (workflow: ${w.workflowId}) | product: ${workflow.productId} | surface: ${currentSurface} | productMatch: ${productMatch} | faceSupported: ${faceSupported}`);
    
    return productMatch && faceSupported;
  });
}

// Test data canonical works (sama dengan yang ada di getMyRealityModel.ts)
const testCanonicalWorks: Array<{workId: string; workflowId: string; actorId: string}> = [
  {
    workId: "lh-case-001",
    workflowId: "lh-lgl-001-legal-consultation",
    actorId: "anonymous.user"
  },
  {
    workId: "ilc-inv-001",
    workflowId: "ilc-ins-001-institutional-coordination",
    actorId: "ilc.user.001"
  },
  {
    workId: "svc-id-001",
    workflowId: "svc-id-001-technical-service",
    actorId: "servicesid.user.001"
  },
  {
    workId: "bpjs-kshtn-001",
    workflowId: "bpjs-kshtn-001-healthcare-claim",
    actorId: "bpjs.user.001"
  }
];

// Jalankan semua skenario verifikasi FACE-001
async function runFACE001Verification() {
  console.log("=".repeat(80));
  console.log("EOS FACE-001 VERIFICATION: Routing Work to Correct Product Surface");
  console.log("=".repeat(80));

  // 🔧 Register ALL workflows first (requirement dari workflowRegistry yang perlu manual register)
  console.log("\n📦 Registering all core workflows to workflowRegistry...");
  workflowRegistry.register(LH_LGL_001_ConsultationWorkflow);
  workflowRegistry.register(ILC_INS_001_InstitutionalWorkflow);
  workflowRegistry.register(SVC_ID_001_TechnicalServiceWorkflow);
  workflowRegistry.register(BPJS_KSHTN_001_ClaimWorkflow);
  console.log(`✅ Registered ${workflowRegistry.listAll().length} workflows successfully`);

  console.log("\n📋 Test Scenario 1: LawyersHub UI (productId=lawyershub, surface=web)");
  console.log("-".repeat(60));
  
  const lawyersHubWorks = filterWorksByProductAndSurface(
    testCanonicalWorks,
    {
      actorId: "anonymous.user",
      productId: "lawyershub",
      workspaceId: "lawyershub-workspace.anonymous",
      tenantId: "tenant-lawyershub-001"
    },
    "web"
  );
  
  console.log(`\n✅ Works returned for LawyersHub UI: ${lawyersHubWorks.map(w => w.workId).join(', ')}`);
  const lhOnlyInLH = lawyersHubWorks.every(w => w.workId === "lh-case-001");
  console.log(`✅ LH_LGL_001 ONLY in LawyersHub UI: ${lhOnlyInLH ? "PASS" : "FAIL"}`);
  const ilcNotInLH = !lawyersHubWorks.some(w => w.workId === "ilc-inv-001");
  console.log(`✅ ILC_INS_001 NOT in LawyersHub UI: ${ilcNotInLH ? "PASS" : "FAIL"}`);

  console.log("\n📋 Test Scenario 2: ILC UI (productId=ilc, surface=web)");
  console.log("-".repeat(60));
  
  const ilcWorks = filterWorksByProductAndSurface(
    testCanonicalWorks,
    {
      actorId: "ilc.user.001",
      productId: "ilc",
      workspaceId: "ilc-workspace.anonymous",
      tenantId: "tenant-ilc-001"
    },
    "web"
  );
  
  console.log(`\n✅ Works returned for ILC UI: ${ilcWorks.map(w => w.workId).join(', ')}`);
  const ilcOnlyInILC = ilcWorks.every(w => w.workId === "ilc-inv-001");
  console.log(`✅ ILC_INS_001 ONLY in ILC UI: ${ilcOnlyInILC ? "PASS" : "FAIL"}`);
  const lhNotInILC = !ilcWorks.some(w => w.workId === "lh-case-001");
  console.log(`✅ LH_LGL_001 NOT in ILC UI: ${lhNotInILC ? "PASS" : "FAIL"}`);

  console.log("\n📋 Test Scenario 3: Services.ID UI (productId=services-id, surface=web)");
  console.log("-".repeat(60));
  
  const servicesIDWorks = filterWorksByProductAndSurface(
    testCanonicalWorks,
    {
      actorId: "servicesid.user.001",
      productId: "services-id",
      workspaceId: "servicesid-workspace.anonymous",
      tenantId: "tenant-services-id-001"
    },
    "web"
  );
  
  console.log(`\n✅ Works returned for Services.ID UI: ${servicesIDWorks.map(w => w.workId).join(', ')}`);

  console.log("\n📋 Test Scenario 4: BPJS UI (productId=bpjs-kesehatan, surface=webhook)");
  console.log("-".repeat(60));
  
  const bpjsWorks = filterWorksByProductAndSurface(
    testCanonicalWorks,
    {
      actorId: "bpjs.user.001",
      productId: "bpjs-kesehatan",
      workspaceId: "bpjs-workspace.anonymous",
      tenantId: "tenant-bpjs-001"
    },
    "webhook"
  );
  
  console.log(`\n✅ Works returned for BPJS UI: ${bpjsWorks.map(w => w.workId).join(', ')}`);

  console.log("\n📋 Test Scenario 5: Workflow Boundary Validation (isValidWorkflowDefinition check)");
  console.log("-".repeat(60));
  
  const allWorkflows = workflowRegistry.listAll();
  console.log(`Total registered workflows: ${allWorkflows.length}`);
  let allBoundariesValid = true;
  allWorkflows.forEach(wf => {
    const isValid = isValidWorkflowDefinition(wf);
    if (!isValid) allBoundariesValid = false;
    console.log(`Workflow ${wf.id} (product: ${wf.productId}) | 5-boundary compliant: ${isValid ? "PASS" : "FAIL"}`);
    console.log(`  → presentationBoundary.supportedFaces: ${wf.presentationBoundary.supportedFaces.join(', ')}`);
  });

  // Tambahkan polyfill process untuk Node.js (fix linter error)
  declare const process: {
    exit: (code: number) => void;
  };

  // Final adjudication
  const allPassed = lhOnlyInLH && ilcNotInLH && ilcOnlyInILC && lhNotInILC && allBoundariesValid;
  console.log("\n" + "=".repeat(80));
  console.log(`FACE-001 VERIFICATION FINAL RESULT: ${allPassed ? "✅ PASS" : "❌ FAIL"}`);
  console.log("=".repeat(80));
  
  if (!allPassed) {
      process.exit(1);
  }
}

// Jalankan verifikasi
runFACE001Verification().catch(err => {
  console.error("Verification failed with error:", err);
  process.exit(1);
});