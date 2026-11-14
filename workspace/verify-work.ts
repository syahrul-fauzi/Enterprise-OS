#!/usr/bin/env node
async function verifyWork() {
  console.log("=== Memverifikasi Work yang baru dibuat ===");
  
  try {
    (globalThis as any)._forceMockPool = true;
    
    const workCommandsModule = await import("./capabilities/work-core/implementation/commands/work.commands.js");
    const { capabilityRegistry } = await import("./packages/core/kernel/src/registry/capability-command-registry.js");
    
    // Daftarkan command getWork
    capabilityRegistry.register({
      ...workCommandsModule.getWorkCommand,
      capability: "work-core"
    });
    console.log("✅ getWork command berhasil didaftarkan!");
    
    // Gunakan session yang sesuai: session-test-001 milik actor user-001, tenant tenant-001
    const logicalWorkId = "work-82c50148-20d0-4d22-b4f2-e7f9562607ce";
    
    console.log(`\nMencoba mengambil Work dengan ID: ${logicalWorkId}`);
    
    const result = await capabilityRegistry.invoke(
      "work-core",
      "get",
      { workId: logicalWorkId },
      {
        actor_id: "user-001", // Session milik user-001
        tenant_id: "tenant-001", // Session milik tenant-001
        session_id: "session-test-001",
        workspace_id: "workspace-001" // Session juga memiliki workspace workspace-001
      }
    );
    
    console.log("\n✅ Work berhasil diambil!");
    console.log("Work Details:", JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error("\n❌ Gagal memverifikasi Work:", error);
    throw error;
  }
}

verifyWork().catch(console.error);