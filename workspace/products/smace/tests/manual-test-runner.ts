// @ts-nocheck
// Manual test runner untuk ai-product-photography workflow (tanpa Vitest)
import { ExecutionWorkflowOrchestrator } from "../runtime/execution-workflow.js";

// Setup test brief yang sama dengan di ai-product-photography.test.ts
const testSession = {
  sessionId: "test-session-001",
  tenantId: "tenant-001",
  workspaceId: "workspace-001",
  actorId: "user-001"
};

const testBrief = {
  id: "test-brief-001",
  tenantId: "tenant-001",
  workspaceId: "workspace-001",
  actorId: "user-001",
  sessionId: testSession.sessionId,
  customerId: "customer-001",
  productType: "electronics",
  brandGuidelines: "https://brand.example.com/guidelines",
  brandGuidelinesUrl: "https://brand.example.com/guidelines",
  targetMarketplace: "tokopedia",
  assetCount: 5,
  reviewerIds: ["reviewer@example.com"],
  canonicalWorkId: "work-test-001",
  createdAt: new Date().toISOString(),
  createdBy: "test@example.com",
  status: "draft"
};

// Mock capability registry untuk menghindari dependency
const mockCapabilityRegistry = {
  invoke: async (capability: string, command: string, params: any) => {
    console.log(`[MOCK CAPABILITY REGISTRY] Invoked ${capability}.${command} with params:`, JSON.stringify(params, null, 2));
    return { success: true };
  }
};

// Patch getCapabilityRegistry untuk mengembalikan mock kita
// Import module business-workflow dulu untuk memuat dependency
import { BusinessProductionLifecycle } from "../runtime/business-workflow.ts.js";
// Kemudian patch getCapabilityRegistry yang ada di business-workflow
const businessWorkflowModule = await import("../runtime/business-workflow.ts");
// Modifikasi function getCapabilityRegistry di dalam business-workflow
const originalModule = await import("../runtime/business-workflow.ts");
// Buat patch pada module yang sudah dimuat
Object.defineProperty(originalModule, 'getCapabilityRegistry', {
  value: async () => mockCapabilityRegistry,
  writable: true
});

// Mock provider factory
import * as providerModule from "../runtime/providers/provider-factory.ts.js";
const mockProviderInstance = {
  executeWorkflow: async () => ({
    completed: true,
    assetIds: ["asset-001", "asset-002", "asset-003", "asset-004", "asset-005"],
    normalizedResults: { qualityScore: 0.95, compliancePassed: true },
    usageReceipt: {
      provider: "comfyui",
      cost: 50000,
      timestamp: new Date().toISOString(),
      tenantId: "tenant-001"
    }
  })
};

Object.defineProperty(providerModule, 'getProviderFactory', {
  value: () => ({
    selectProvider: () => ({
      id: "mock-comfyui-provider",
      providerType: "comfyui",
      name: "Mock ComfyUI Provider",
      ratePerAsset: 10000,
      isAvailable: true,
      instance: mockProviderInstance
    })
  }),
  writable: true
});

// Jalankan test manual
async function runManualTest() {
  console.log("🚀 Memulai manual test untuk AI Product Photography Workflow");
  console.log("========================================================");
  
  try {
    const businessLifecycle = new BusinessProductionLifecycle();
    const { success, canonicalWorkId, finalPackageUrl, errors, reconciliationResults } = 
      await businessLifecycle.executeProduction(testBrief.canonicalWorkId, testBrief);
    
    console.log("\n✅ HASIL TEST MANUAL:");
    console.log("========================================================");
    console.log(`Success: ${success}`);
    console.log(`Canonical Work ID: ${canonicalWorkId}`);
    console.log(`Final Package URL: ${finalPackageUrl}`);
    console.log(`Errors: ${errors?.length || 0} errors`);
    console.log(`Reconciliation Results: ${JSON.stringify(reconciliationResults, null, 2)}`);
    
    // Verifikasi finalPackageUrl terdefinisi
    if (finalPackageUrl) {
      console.log("\n🎉 VERIFIKASI BERHASIL: finalPackageUrl terdefinisi dengan benar!");
      console.log(`URL: ${finalPackageUrl}`);
      process.exit(0);
    } else {
      console.error("\n❌ VERIFIKASI GAGAL: finalPackageUrl undefined/null!");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ TEST GAGAL DENGAN ERROR:", (error as Error).message);
    console.error("Stack trace:", (error as Error).stack);
    process.exit(1);
  }
}

runManualTest();