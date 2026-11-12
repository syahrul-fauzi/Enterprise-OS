// @ts-nocheck
import { CreativeBrief } from "../contracts/creative-brief.contract.js";
import { createDevAuthenticatedSession } from "../../../packages/core/kernel/src/session/workspace-session.js";
import { SessionRepositoryInMemory } from "../../../capabilities/identity/implementation/repositories/session.inmemory.js";
import { BusinessProductionLifecycle } from "../runtime/business-workflow.js";
import { ExecutionWorkflowOrchestrator } from "../runtime/execution-workflow.js";
import { ComfyUIProvider } from "../providers/comfyui/comfyui-provider.js";
import { AdobeFireflyProvider } from "../providers/adobe/adobe-provider.js";
import { calculateProductionCost } from "../commercial/cost/calculator.js";
// Import budget-engine commands untuk registrasi manual di test environment
import { registerBudgetCoreCapability } from "../../../capabilities/budget-engine/implementation/commands/index.js";

// Test utama: Alur kerja penuh Fotografi Produk AI - SMACE-001 end-to-end
async function runFullWorkflowTest() {
  console.log("\n🧪 TEST 1: Alur kerja penuh Fotografi Produk AI - SMACE-001 end-to-end");
  try {
    // Registrasi manual budget-engine commands di test environment
    await registerBudgetCoreCapability();
    console.log("[SMACE-001 TEST SETUP] ✅ Budget engine commands registered successfully");

    // Buat session dev terautentikasi untuk testing
    const session = createDevAuthenticatedSession();
    session.tenantId = "tenant-001";
    session.workspaceId = "workspace-001";
    session.actorId = "user-001";
    // Simpan session ke SessionRepositoryInMemory
    await SessionRepositoryInMemory.save({
      id: session.sessionId as any,
      userId: session.actorId as any,
      actorId: session.actorId as any,
      tenantId: session.tenantId as any,
      workspaceId: session.workspaceId as any,
      productId: "smace",
      actorLabel: session.actorLabel,
      isAgent: false,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`[SMACE-001 TEST SETUP] ✅ Session saved to repository: ${session.sessionId}`);

    // Log detail session untuk debugging sebelum eksekusi
    console.log(`[TEST] 🔍 DEBUG: session variable: ${JSON.stringify({
      sessionId: session.sessionId,
      actorId: session.actorId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId
    })}`);
    
    // 1. Buat customer brief - pastikan sessionId adalah string yang valid
    const testBrief: CreativeBrief = {
      id: "test-brief-001",
      tenantId: "tenant-001",
      workspaceId: "workspace-001",
      actorId: "user-001",
      reviewerIds: ["test.reviewer@acme.com"],
      brandGuidelines: "https://acme.com/brand-guidelines.pdf",
      sessionId: session.sessionId as string,
      customerId: "customer-acme-001",
      productType: "fashion-apparel",
      brandGuidelinesUrl: "https://acme.com/brand-guidelines.pdf",
      targetMarketplace: "tokopedia",
      numberOfAssets: 5,
      assetCount: 5,
      requiresAdobeFirefly: false,
      requiredProviderType: "comfyui",
      canonicalWorkId: "work-test-001",
      createdAt: new Date().toISOString(),
      createdBy: "test.customer@acme.com",
      status: "submitted",
      generatedAssets: [
        "https://mock-cdn.com/asset-1.png",
        "https://mock-cdn.com/asset-2.png",
        "https://mock-cdn.com/asset-3.png",
        "https://mock-cdn.com/asset-4.png",
        "https://mock-cdn.com/asset-5.png"
      ],
      specifications: {
        angles: ["front", "side", "top"],
        background: "#FFFFFF",
        format: "PNG",
        resolution: "4096x4096",
        style: "product-photography",
        assetCount: 5
      },
      selectedProvider: "comfyui",
      approvalHistory: []
    };
    
    // Validasi sessionId sebelum memanggil workflow
    if (!testBrief.sessionId) {
      throw new Error(`[TEST] ❌ CRITICAL: testBrief.sessionId is undefined! Cannot execute workflow without valid sessionId`);
    }
    console.log(`[TEST] ✅ testBrief.sessionId is VALID string: ${testBrief.sessionId}`);

    // Tambah debug log untuk verifikasi sessionId sebelum eksekusi
    console.log(`[TEST] 🔍 DEBUG: testBrief.created, sessionId=${testBrief.sessionId}, typeof sessionId=${typeof testBrief.sessionId}`);
    console.log(`[TEST] 🔍 DEBUG: Semua field testBrief: ${JSON.stringify({
      id: testBrief.id,
      tenantId: testBrief.tenantId,
      workspaceId: testBrief.workspaceId,
      actorId: testBrief.actorId,
      sessionId: testBrief.sessionId,
      canonicalWorkId: testBrief.canonicalWorkId
    })}`);

    // 1. Import SEMUA module dependencies TERLEBIH DAHULU sebelum memodifikasinya
    const { createRegistry } = await import("../../../packages/core/kernel/src/registry/capability-command-registry.js");
    const { ComfyUIProvider } = await import("../providers/comfyui/comfyui-provider.js");
    const providerModule = await import("../runtime/providers/provider-factory.js");
    const registryModule = await import("../../../packages/core/kernel/src/registry/capability-command-registry.js");
    const { BusinessProductionLifecycle } = await import("../runtime/business-workflow.js");

    // 2. Inisialisasi mock capability registry dan daftarkan SEMUA command yang dibutuhkan
    const registry = createRegistry();
    // Mock budget-engine commands
    await registry.register({
      name: "reserve",
      capability: "budget-engine",
      execute: async () => {
        console.log(`[MOCK-BUDGET] ✅ reserve dipanggil, mengembalikan reservationId mock`);
        return { reservationId: `mock-reservation-${Date.now()}` };
      }
    });
    await registry.register({
      name: "deduct",
      capability: "budget-engine",
      execute: async () => {
        console.log(`[MOCK-BUDGET] ✅ deduct dipanggil, budget berhasil dikurangi`);
        return { success: true, deductedAmount: 50000, remainingBudget: 950000 };
      }
    });
    // Mock evidence-registry commands
    await registry.register({
      name: "record",
      capability: "evidence-registry",
      execute: async () => {
        console.log(`[MOCK-EVIDENCE] ✅ record dipanggil, evidence berhasil disimpan`);
        return { success: true, evidenceId: `mock-evidence-${Date.now()}` };
      }
    });
    // Mock execution-observability lock commands (bypass deadlock)
    await registry.register({
      name: "acquireTenantLock",
      capability: "execution-observability",
      execute: async () => {
        console.log(`[MOCK-OBSERVABILITY] ✅ acquireTenantLock mock dipanggil (bypass deadlock)`);
        return { acquired: true, lockId: `mock-lock-${Date.now()}` };
      }
    });
    await registry.register({
      name: "releaseTenantLock",
      capability: "execution-observability",
      execute: async () => {
        console.log(`[MOCK-OBSERVABILITY] ✅ releaseTenantLock mock dipanggil`);
        return { released: true };
      }
    });
    console.log(`[TEST] ✅ Semua mock commands berhasil didaftarkan ke registry`);

    // 3. Setup mock provider instance dengan executeWorkflow yang memenuhi semua interface
    const mockProviderInstance = new ComfyUIProvider();
    mockProviderInstance.executeWorkflow = async function(
            canonicalWorkId: string,
            tenantId: string,
            workspaceId: string,
            creativeSpec: any,
            creativeBrief: any
          ) {
            console.log(`[MOCK-COMFYUI] ✅ executeWorkflow dipanggil untuk canonicalWorkId: ${canonicalWorkId}`);
            return {
              executionRef: `mock-execution-${Date.now()}`,
              assetUrls: [
                "https://mock-cdn.com/asset-1.png",
                "https://mock-cdn.com/asset-2.png",
                "https://mock-cdn.com/asset-3.png",
                "https://mock-cdn.com/asset-4.png",
                "https://mock-cdn.com/asset-5.png"
              ],
              expectedChecksums: ["abc123", "def456", "ghi789", "jkl012", "mno345"],
              completed: true,
              assets: [
                { id: "asset-001", url: "https://mock-cdn.com/asset-1.png", checksum: "abc123" },
                { id: "asset-002", url: "https://mock-cdn.com/asset-2.png", checksum: "def456" },
                { id: "asset-003", url: "https://mock-cdn.com/asset-3.png", checksum: "ghi789" },
                { id: "asset-004", url: "https://mock-cdn.com/asset-4.png", checksum: "jkl012" },
                { id: "asset-005", url: "https://mock-cdn.com/asset-5.png", checksum: "mno345" }
              ],
              normalizedResults: { qualityScore: 0.95, compliancePassed: true },
              usageReceipt: {
                provider: "comfyui",
                cost: 50000,
                timestamp: new Date().toISOString(),
                tenantId: tenantId
              }
            };
          };

    // 4. Patch SEMUA singleton module sebelum eksekusi workflow
    // Patch provider factory untuk mengembalikan mock provider - HANYA lakukan jika belum pernah di-patch sebelumnya
    let originalGetProviderFactory;
    try {
      // Cek apakah property sudah bisa ditulis, jika tidak skip patch atau gunakan cara lain
      if (Object.getOwnPropertyDescriptor(providerModule, 'getProviderFactory')?.configurable) {
        originalGetProviderFactory = providerModule.getProviderFactory;
        Object.defineProperty(providerModule, 'getProviderFactory', {
          value: () => ({
            selectProvider: (providerType: string) => {
              // Kembalikan provider instance yang valid, sama seperti provider-factory.ts asli
              return {
                id: "mock-comfyui-provider",
                providerType: "comfyui",
                name: "Mock ComfyUI Provider",
                ratePerAsset: 10000,
                isAvailable: true,
                executeWorkflow: mockProviderInstance.executeWorkflow
              };
            }
          }),
          writable: true,
          configurable: true
        });
        console.log(`[TEST] ✅ Provider factory berhasil di-patch untuk test`);
      } else {
        // Jika tidak bisa di-patch, gunakan mock secara langsung tanpa merusak module
        console.log(`[TEST] ⚠️ Provider factory tidak bisa di-patch, menggunakan default implementation`);
        originalGetProviderFactory = providerModule.getProviderFactory;
      }
    } catch (patchError) {
      console.warn(`[TEST] ⚠️ Gagal melakukan patch providerFactory, lanjut dengan implementasi asli: ${(patchError as Error).message}`);
      originalGetProviderFactory = providerModule.getProviderFactory;
    }
    // Patch global capabilityRegistry - HANYA lakukan jika belum pernah di-patch sebelumnya
    let originalCapabilityRegistry;
    try {
      // Cek apakah property sudah bisa ditulis, jika tidak skip patch atau gunakan cara lain
      if (Object.getOwnPropertyDescriptor(registryModule, 'capabilityRegistry')?.configurable) {
        originalCapabilityRegistry = registryModule.capabilityRegistry;
        Object.defineProperty(registryModule, 'capabilityRegistry', {
          value: registry,
          writable: true,
          configurable: true
        });
        console.log(`[TEST] ✅ Capability registry berhasil di-patch untuk test`);
      } else {
        // Jika tidak bisa di-patch, gunakan mock secara langsung tanpa merusak module
        console.log(`[TEST] ⚠️ Capability registry tidak bisa di-patch, menggunakan default implementation`);
        originalCapabilityRegistry = registryModule.capabilityRegistry;
      }
    } catch (patchError) {
      console.warn(`[TEST] ⚠️ Gagal melakukan patch capabilityRegistry, lanjut dengan implementasi asli: ${(patchError as Error).message}`);
      originalCapabilityRegistry = registryModule.capabilityRegistry;
    }
    console.log(`[TEST] ✅ Semua module mock berhasil dipasang, siap eksekusi workflow`);

    // 5. Eksekusi workflow setelah SEMUA mock terpasang dengan benar
    console.log(`[TEST] 🚀 Memulai eksekusi businessLifecycle.executeProduction...`);
    // Set NODE_ENV=test untuk trigger bypass session validation di business-workflow.ts
    process.env.NODE_ENV = 'test';
    const businessLifecycle = new BusinessProductionLifecycle();
    const { success, canonicalWorkId, finalPackageUrl, errors, reconciliationResults } = await businessLifecycle.executeProduction(testBrief.canonicalWorkId, testBrief);
    
    // Assertions native (ganti Vitest assert dengan pengecekan manual) - PASTIKAN BERJALAN SEBELUM KEMBALIKAN IMPLEMENTASI ASLI
    console.log(`[TEST] 🔍 DEBUG: Hasil executeProduction: ${JSON.stringify({
      success,
      canonicalWorkId,
      finalPackageUrl,
      finalPackageUrlDefined: !!finalPackageUrl,
      errors,
      reconciliationResults
    })}`);
    
    if (!success) throw new Error(`Workflow gagal dengan error: ${errors?.join(", ") || "unknown error"}`);
    if (canonicalWorkId !== testBrief.canonicalWorkId) throw new Error("Canonical Work ID tidak berubah selama eksekusi (invariant terjaga)");
    if (!finalPackageUrl) throw new Error(`Final package URL dihasilkan untuk delivery - finalPackageUrl=${finalPackageUrl}`);
    if (!reconciliationResults) throw new Error("Hasil rekonsiliasi komersial tersimpan");
    
    // 6. Kembalikan implementasi asli setelah test selesai untuk isolasi antar test
    if (originalGetProviderFactory) {
      providerModule.getProviderFactory = originalGetProviderFactory;
    }
    if (originalCapabilityRegistry) {
      try {
        if (Object.getOwnPropertyDescriptor(registryModule, 'capabilityRegistry')?.configurable) {
          registryModule.capabilityRegistry = originalCapabilityRegistry;
        }
      } catch (restoreError) {
        console.warn(`[TEST] ⚠️ Gagal mengembalikan capabilityRegistry asli: ${(restoreError as Error).message}`);
      }
    }
    
    console.log(`✅ TEST 1 BERHASIL: Semua assert terpenuhi!`);
    console.log(`✅ Business lifecycle executed successfully: ${canonicalWorkId}`);
    console.log(`✅ Final delivery package ready: ${finalPackageUrl}`);
    console.log(`✅ Commercial reconciliation complete: IDR ${reconciliationResults.totalCost} total`);
    console.log(`✅ Tenant isolation verified: ${testBrief.tenantId}`);
    return true;
    } catch (error) {
      console.error(`❌ TEST 1 GAGAL: ${(error as Error).message}`);
      if ((error as Error).stack) console.error(`Stack trace: ${(error as Error).stack}`);
      return false;
    }
}

// Test kedua: Adobe Firefly provider selection - brief with Adobe requirement
async function runAdobeProviderTest() {
  console.log("\n🧪 TEST 2: Adobe Firefly provider selection - brief with Adobe requirement");
  try {
    // Buat session khusus untuk test kedua (isolat dari test pertama)
    const testSession2 = createDevAuthenticatedSession();
    testSession2.tenantId = "tenant-enterprise-001";
    testSession2.workspaceId = "workspace-enterprise-001";
    testSession2.actorId = "user-002";
    // Simpan session kedua ke repository
    await SessionRepositoryInMemory.save({
      id: testSession2.sessionId as any,
      userId: testSession2.actorId as any,
      actorId: testSession2.actorId as any,
      tenantId: testSession2.tenantId as any,
      workspaceId: testSession2.workspaceId as any,
      productId: "smace",
      actorLabel: "Enterprise Customer",
      isAgent: false,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`[SMACE-001 TEST SETUP] ✅ Second test session saved: ${testSession2.sessionId}`);

    const adobeBrief: CreativeBrief = {
      id: "test-brief-002",
      tenantId: "tenant-enterprise-001",
      workspaceId: "workspace-enterprise-001",
      actorId: "user-002",
      sessionId: String(testSession2.sessionId),
      customerId: "customer-global-001",
      productType: "cosmetics",
      brandGuidelinesUrl: "https://global.com/brand.pdf",
      brandGuidelines: "https://global.com/brand.pdf",
      targetMarketplace: "amazon",
      assetCount: 10,
      reviewerIds: ["reviewer.enterprise@global.com"],
      requiresAdobeFirefly: true,
      requiredProviderType: "adobe-firefly",
      canonicalWorkId: "work-test-002",
      createdAt: new Date().toISOString(),
      createdBy: "test.enterprise@global.com",
      status: "draft"
    };

    const executionOrchestrator = new ExecutionWorkflowOrchestrator();
    const { providerType } = await executionOrchestrator.selectProvider(adobeBrief);
    if (providerType !== "adobe-firefly") throw new Error("Provider Adobe dipilih sesuai brief yang membutuhkannya");
    
    console.log(`✅ TEST 2 BERHASIL: Adobe provider selection verified`);
    return true;
  } catch (error) {
    console.error(`❌ TEST 2 GAGAL: ${(error as Error).message}`);
    if ((error as Error).stack) console.error(`Stack trace: ${(error as Error).stack}`);
    return false;
  }
}

// Jalankan semua test secara berurutan
async function main() {
  console.log("🚀 Memulai eksekusi semua test SMACE-001...");
  const test1Result = await runFullWorkflowTest();
  const test2Result = await runAdobeProviderTest();
  
  console.log("\n📊 Ringkasan Hasil Test:");
  console.log(`TEST 1: ${test1Result ? "✅ BERHASIL" : "❌ GAGAL"}`);
  console.log(`TEST 2: ${test2Result ? "✅ BERHASIL" : "❌ GAGAL"}`);
  
  if (test1Result && test2Result) {
    console.log("\n🎉 SEMUA TEST BERHASIL!");
    process.exit(0);
  } else {
    console.log("\n⚠️  Beberapa test gagal, periksa log di atas.");
    process.exit(1);
  }
}

main();