#!/usr/bin/env node
process.env.NODE_ENV = "test";
console.log("🔧 GLOBAL: NODE_ENV diatur ke:", process.env.NODE_ENV);

async function testUATScenario1() {
  console.log("=== PR-02 UAT Skenario 1: Buat Work melalui Capability Registry ===");
  
  try {
    // 0. Paksa penggunaan MockPool untuk test environment
    (globalThis as any)._forceMockPool = true;
    
    // 1. Dynamic import modules
    console.log("\n0. Mengimport modul-modul yang diperlukan...");
    const workCommandsModule = await import("./capabilities/work-core/implementation/commands/work.commands.js");
    const { capabilityRegistry } = await import("./packages/core/kernel/src/registry/capability-command-registry.js");
    const { executionContext } = await import("./packages/core/runtime/src/execution-context.js");
    const { getWorkRepositoryLazy } = await import("./capabilities/work-core/implementation/commands/work.commands.js");
    
    // 2. Inisialisasi execution context
    console.log("\n1. Inisialisasi execution context...");
    const executionContextValue = {
      actor_id: "user-001",
      tenant_id: "tenant-001",
      session_id: "session-test-001",
      workspace_id: "workspace-001"
    };
    
    // 3. Daftarkan command secara manual satu per satu
    console.log("\n2. Mendaftarkan work-core commands secara manual ke registry...");
    capabilityRegistry.register({
      ...workCommandsModule.createWorkCommand,
      capability: "work-core"
    });
    console.log("✅ createWork command berhasil didaftarkan!");
    capabilityRegistry.register({
      ...workCommandsModule.getWorkCommand,
      capability: "work-core"
    });
    console.log("✅ getWork command berhasil didaftarkan!");
    
    // 4. Cek command yang tersedia di registry
    console.log("\nCommand yang tersedia di registry:", Object.keys(capabilityRegistry.capabilityCommands));
    
    // 5. Buat Work melalui work-core capability
    console.log("\n3. Membuat Work melalui capabilityRegistry.invoke('work-core', 'create', ...)");
    const createInput = {
      title: "UAT Test Work - Skenario 1",
      description: "Work untuk pengujian end-to-end UAT PR-02",
      priority: "high",
      domainType: "software-development",
      workspaceId: "workspace-001",
      tenantId: "tenant-001"
    };
    
    const createResult = await executionContext.run(executionContextValue, async () => {
      return await capabilityRegistry.invoke(
        "work-core",
        "create",
        createInput,
        executionContextValue
      );
    });
    
    console.log("\n✅ Work berhasil dibuat!");
    console.log("Create Result:", JSON.stringify(createResult, null, 2));
    
    // 6. Catat logicalWorkId
    const logicalWorkId = createResult.id || createResult.logicalWorkId;
    console.log("\n📝 logicalWorkId yang dihasilkan:", logicalWorkId);
    
    // 7. DEBUG: Periksa apa yang sebenarnya ada di mock repository
    console.log("\n4. DEBUG: Memeriksa isi mock repository...");
    const workRepository = await getWorkRepositoryLazy();
    const allWorks = await workRepository.list();
    console.log("Jumlah work di repository:", allWorks.length);
    for (const work of allWorks) {
      console.log(`Work di repository: id=${work.id}, workId=${work.workId}, tenantId=${work.tenantId}`);
    }
    
    // 8. Verifikasi Work yang baru dibuat
    console.log("\n5. Memverifikasi Work melalui capabilityRegistry.invoke('work-core', 'get', ...)");
    const getInput = {
      workId: logicalWorkId
    };
    
    const getResult = await executionContext.run(executionContextValue, async () => {
      return await capabilityRegistry.invoke(
        "work-core",
        "get",
        getInput,
        executionContextValue
      );
    });
    
    console.log("\n✅ Work berhasil diverifikasi!");
    console.log("Get Result:", JSON.stringify(getResult, null, 2));
    
    // 9. Simpan bukti ke file
    const evidence = {
      scenario: "Skenario 1 - Buat Work melalui API",
      timestamp: new Date().toISOString(),
      logicalWorkId: logicalWorkId,
      createResult: createResult,
      getResult: getResult,
      success: true
    };
    
    console.log("\n✅ Skenario 1 selesai dengan sukses!");
    console.log("Evidence:", JSON.stringify(evidence, null, 2));
    
    return evidence;
  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  }
}

testUATScenario1().catch(console.error);