// Simple verification script untuk memastikan finalPackageUrl selalu terdefinisi
// Jalankan dengan: node --import tsx workspace/products/smace/tests/simple-verify.ts

import { BusinessProductionLifecycle } from "../runtime/business-workflow.js";

// Test case 1: Simulasikan error sebelum STEP7
async function testErrorBeforeStep7() {
  console.log("🧪 TEST 1: Error sebelum STEP7 (apakah finalPackageUrl masih terdefinisi?)");
  
  const testBrief = {
    id: "test-brief-error-001",
    tenantId: "tenant-001",
    workspaceId: "workspace-001",
    actorId: "user-001",
    sessionId: "session-001",
    customerId: "customer-001",
    productType: "electronics",
    brandGuidelines: "https://brand.example.com/guidelines",
    assetCount: 5,
    reviewerIds: ["reviewer@example.com"],
    canonicalWorkId: "work-test-error-001",
    createdAt: new Date().toISOString(),
    createdBy: "test@example.com",
    status: "draft"
  };

  try {
    const lifecycle = new BusinessProductionLifecycle();
    // Paksa error di awal dengan passing brief yang tidak valid (hilangkan sessionId)
    const invalidBrief = {...testBrief, sessionId: undefined};
    const result = await lifecycle.executeProduction(invalidBrief.canonicalWorkId, invalidBrief as any);
    
    console.log("   HASIL:", {
      success: result.success,
      finalPackageUrl: result.finalPackageUrl,
      finalPackageUrlDefined: !!result.finalPackageUrl
    });
    
    if (result.finalPackageUrl) {
      console.log("   ✅ TEST 1 BERHASIL: finalPackageUrl terdefinisi meskipun error sebelum STEP7");
    } else {
      console.error("   ❌ TEST 1 GAGAL: finalPackageUrl undefined!");
      return false;
    }
    return true;
  } catch (error) {
    console.log("   ❌ TEST 1 GAGAL dengan uncaught error:", (error as Error).message);
    return false;
  }
}

// Test case 2: Workflow berjalan normal sampai selesai
async function testNormalExecution() {
  console.log("\n🧪 TEST 2: Workflow berjalan normal (apakah finalPackageUrl terisi dengan benar?)");
  
  const testBrief = {
    id: "test-brief-normal-001",
    tenantId: "tenant-001",
    workspaceId: "workspace-001",
    actorId: "user-001",
    sessionId: "session-001",
    customerId: "customer-001",
    productType: "electronics",
    brandGuidelines: "https://brand.example.com/guidelines",
    assetCount: 5,
    reviewerIds: ["reviewer@example.com"],
    canonicalWorkId: "work-test-normal-001",
    createdAt: new Date().toISOString(),
    createdBy: "test@example.com",
    status: "draft"
  };

  try {
    // Mock dependencies minimal
    global.fetch = async () => ({
      ok: true,
      json: async () => ({})
    }) as any;

    const lifecycle = new BusinessProductionLifecycle();
    // Kita tidak akan menunggu full execution, cuma cek class property initialization
    const classProperties = Object.getOwnPropertyNames(lifecycle);
    console.log("   Class properties:", classProperties);
    
    // Cek nilai awal finalPackageUrl
    const finalPackageUrlInitial = (lifecycle as any).finalPackageUrl;
    console.log("   Initial finalPackageUrl value:", finalPackageUrlInitial);
    console.log("   Initial finalPackageUrl type:", typeof finalPackageUrlInitial);
    
    if (finalPackageUrlInitial && typeof finalPackageUrlInitial === 'string') {
      console.log("   ✅ TEST 2 BERHASIL: finalPackageUrl selalu terdefinisi sejak constructor");
      return true;
    } else {
      console.error("   ❌ TEST 2 GAGAL: finalPackageUrl null/undefined sejak awal!");
      return false;
    }
  } catch (error) {
    console.error("   ❌ TEST 2 GAGAL dengan error:", (error as Error).message);
    console.error("   Stack:", (error as Error).stack);
    return false;
  }
}

// Jalankan semua test
async function main() {
  console.log("🚀 Memulai verifikasi sederhana finalPackageUrl\n");
  
  const test1Passed = await testErrorBeforeStep7();
  const test2Passed = await testNormalExecution();
  
  console.log("\n📊 RINGKASAN HASIL VERIFIKASI:");
  console.log("============================");
  console.log(`Test 1 (Error sebelum STEP7): ${test1Passed ? "✅ BERHASIL" : "❌ GAGAL"}`);
  console.log(`Test 2 (Initialization): ${test2Passed ? "✅ BERHASIL" : "❌ GAGAL"}`);
  
  const allPassed = test1Passed && test2Passed;
  console.log(`\nTOTAL: ${allPassed ? "SEMUA TEST BERHASIL 🎉" : "ADA TEST YANG GAGAL ❌"}`);
  
  process.exit(allPassed ? 0 : 1);
}

main();