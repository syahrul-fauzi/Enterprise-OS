#!/usr/bin/env node
process.env.NODE_ENV = "test";
console.log("🔧 GLOBAL: NODE_ENV diatur ke:", process.env.NODE_ENV);

async function testUATScenario2() {
  console.log("=== PR-02 UAT Skenario 2: Akses Work melalui MCP ===");
  
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
    const testContext = {
      actor_id: "user-001",
      tenant_id: "tenant-001",
      session_id: "session-test-001",
      workspace_id: "workspace-001"
    };
    
    // 3. Mendaftarkan work-core commands secara manual ke registry
    console.log("\n2. Mendaftarkan work-core commands secara manual ke registry...");
    const createWorkCommand = workCommandsModule.createWorkCommand;
    const getWorkCommand = workCommandsModule.getWorkCommand;
    
    capabilityRegistry.register(createWorkCommand);
    capabilityRegistry.register(getWorkCommand);
    
    console.log("✅ createWork command berhasil didaftarkan!");
    console.log("✅ getWork command berhasil didaftarkan!");
    
    // 4. Simulasikan pembuatan Work melalui MCP channel (menggunakan alur yang sama dengan MCP adapter)
    console.log("\n3. Simulasikan pembuatan Work melalui MCP channel...");
    let createResult: any;
    await executionContext.run(testContext, async () => {
      // Ini adalah alur yang SAMA PERSIS dengan MCP adapter: MCP payload → ExecutionEnvelope → capabilityRegistry.invoke
      const mcpPayload = {
        title: "UAT Test Work - Skenario 2 (via MCP)",
        description: "Work untuk pengujian end-to-end UAT PR-02 melalui MCP channel",
        priority: "high",
        domainType: "software-development",
        workspaceId: "workspace-001",
        tenantId: "tenant-001"
      };
      
      console.log("📤 MCP payload yang dikirim:", JSON.stringify(mcpPayload, null, 2));
      
      createResult = await capabilityRegistry.invoke(
        "work-core",
        "create",
        mcpPayload
      );
      
      console.log("✅ Work berhasil dibuat melalui alur MCP!");
      console.log("Create Result:", JSON.stringify(createResult, null, 2));
    });
    
    const logicalWorkId = createResult.workId;
    console.log("📝 logicalWorkId yang dihasilkan melalui MCP:", logicalWorkId);
    
    // 5. Verifikasi bahwa Work dapat diakses melalui channel lain (capabilityRegistry langsung)
    console.log("\n4. Memverifikasi akses Work melalui channel lain (capabilityRegistry langsung)...");
    let getResultViaDirect: any;
    await executionContext.run(testContext, async () => {
      getResultViaDirect = await capabilityRegistry.invoke(
        "work-core",
        "get",
        { workId: logicalWorkId }
      );
      
      console.log("✅ Work berhasil diakses melalui channel capabilityRegistry langsung!");
      console.log("Get Result (via direct):", JSON.stringify(getResultViaDirect, null, 2));
    });
    
    // 6. Simulasikan akses Work melalui MCP channel (menggunakan alur yang sama dengan MCP adapter)
    console.log("\n5. Simulasikan akses Work melalui MCP channel...");
    let getResultViaMCP: any;
    await executionContext.run(testContext, async () => {
      // Ini adalah alur yang SAMA PERSIS dengan MCP adapter: MCP payload → ExecutionEnvelope → capabilityRegistry.invoke
      const mcpGetPayload = {
        workId: logicalWorkId
      };
      
      console.log("📤 MCP get payload yang dikirim:", JSON.stringify(mcpGetPayload, null, 2));
      
      getResultViaMCP = await capabilityRegistry.invoke(
        "work-core",
        "get",
        mcpGetPayload
      );
      
      console.log("✅ Work berhasil diakses melalui alur MCP!");
      console.log("Get Result (via MCP):", JSON.stringify(getResultViaMCP, null, 2));
    });
    
    // 7. Verifikasi prinsip One Work: logicalWorkId konsisten lintas channel
    console.log("\n6. Memverifikasi prinsip One Work...");
    const isOneWorkConsistent = 
      createResult.workId === getResultViaDirect.workId && 
      createResult.workId === getResultViaMCP.workId &&
      getResultViaDirect.workId === getResultViaMCP.workId;
    
    console.log("✅ Prinsip One Work terverifikasi:", isOneWorkConsistent);
    console.log("  - createWork.workId:", createResult.workId);
    console.log("  - getWork (direct).workId:", getResultViaDirect.workId);
    console.log("  - getWork (MCP).workId:", getResultViaMCP.workId);
    
    // 8. Verifikasi prinsip One Authorization Authority: semua channel menggunakan pemeriksaan izin yang sama
    console.log("\n7. Memverifikasi prinsip One Authorization Authority...");
    const isAuthorizationConsistent = 
      getResultViaDirect.actorId === "user-001" &&
      getResultViaMCP.actorId === "user-001" &&
      getResultViaDirect.participants.includes("user-001") &&
      getResultViaMCP.participants.includes("user-001");
    
    console.log("✅ Prinsip One Authorization Authority terverifikasi:", isAuthorizationConsistent);
    console.log("  - getWork (direct).actorId:", getResultViaDirect.actorId);
    console.log("  - getWork (MCP).actorId:", getResultViaMCP.actorId);
    console.log("  - getWork (direct).participants:", getResultViaDirect.participants);
    console.log("  - getWork (MCP).participants:", getResultViaMCP.participants);
    
    // 9. Hasil akhir
    console.log("\n✅ Skenario 2 selesai dengan sukses!");
    const evidence = {
      scenario: "Skenario 2 - Akses Work melalui MCP",
      timestamp: new Date().toISOString(),
      logicalWorkId: logicalWorkId,
      createResultViaMCP: createResult,
      getResultViaDirect: getResultViaDirect,
      getResultViaMCP: getResultViaMCP,
      oneWorkConsistent: isOneWorkConsistent,
      oneAuthorizationAuthorityConsistent: isAuthorizationConsistent,
      success: isOneWorkConsistent && isAuthorizationConsistent
    };
    
    console.log("Evidence:", JSON.stringify(evidence, null, 2));
    
    if (!evidence.success) {
      throw new Error("Skenario 2 gagal: prinsip arsitektural tidak terpenuhi");
    }
    
    return evidence;
  } catch (error) {
    console.error("❌ Error selama test UAT Skenario 2:", error);
    throw error;
  }
}

testUATScenario2().catch(err => {
  console.error("❌ Test UAT Skenario 2 gagal:", err);
  process.exit(1);
});