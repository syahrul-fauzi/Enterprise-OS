// FACE-001 API Verification Script
import { buildMyRealityModel } from './workspace/apps/web/app/(eos)/my-reality/getMyRealityModel';
import { workflowRegistry } from './workspace/packages/core/kernel/src/registry/capability-command-registry';

async function testAPILayer() {
  console.log('=== FACE-001 API LAYER VERIFICATION ===\n');
  
  // Test 1: LawyersHub context - should only see LH_LGL_001
  console.log('TEST 1: LawyersHub context (productId: "lawyershub")');
  const lawyersHubModel = await buildMyRealityModel({
    actorId: "test.user.001",
    workspaceId: "test-ws-001",
    tenantId: "test-tenant-001",
    productId: "lawyershub"
  });
  console.log(`Works returned: ${lawyersHubModel.userWorks.length}`);
  lawyersHubModel.userWorks.forEach(w => console.log(`  - ${w.workId} (workflow: ${w.workflowId})`));
  
  // Verify LH_LGL_001 is present, ILC_INV_001 is not
  const hasLH = lawyersHubModel.userWorks.some(w => w.workId === "lh-case-001");
  const hasILC = lawyersHubModel.userWorks.some(w => w.workId === "ilc-inv-001");
  console.log(`✓ LH_LGL_001 present: ${hasLH}`);
  console.log(`✓ ILC_INV_001 blocked: ${!hasILC}\n`);

  // Test 2: ILC context - should only see ILC_INV_001
  console.log('TEST 2: ILC context (productId: "ilc")');
  const ilcModel = await buildMyRealityModel({
    actorId: "test.user.001",
    workspaceId: "test-ws-001",
    tenantId: "test-tenant-001",
    productId: "ilc"
  });
  console.log(`Works returned: ${ilcModel.userWorks.length}`);
  ilcModel.userWorks.forEach(w => console.log(`  - ${w.workId} (workflow: ${w.workflowId})`));
  
  // Verify ILC_INV_001 is present, LH_LGL_001 is not
  const hasILC2 = ilcModel.userWorks.some(w => w.workId === "ilc-inv-001");
  const hasLH2 = ilcModel.userWorks.some(w => w.workId === "lh-case-001");
  console.log(`✓ ILC_INV_001 present: ${hasILC2}`);
  console.log(`✓ LH_LGL_001 blocked: ${!hasLH2}\n`);

  // Test 3: No product context - should see all works
  console.log('TEST 3: No product context (productId: undefined)');
  const noProductModel = await buildMyRealityModel({
    actorId: "test.user.001",
    workspaceId: "test-ws-001",
    tenantId: "test-tenant-001",
    productId: undefined
  });
  console.log(`Works returned: ${noProductModel.userWorks.length}`);
  noProductModel.userWorks.forEach(w => console.log(`  - ${w.workId} (workflow: ${w.workflowId})`));

  // Verify all workflows pass isValidWorkflowDefinition checks
  console.log('\n=== WORKFLOW VALIDATION CHECKS ===');
  const allWorkflows = Array.from(workflowRegistry.values());
  allWorkflows.forEach(wf => {
    const isValid = require('./workspace/packages/core/kernel/src/registry/capability-command-registry').isValidWorkflowDefinition(wf);
    console.log(`${wf.id} (${wf.productId}): ${isValid ? '✓ VALID' : '✗ INVALID'}`);
  });
}

testAPILayer().catch(console.error);