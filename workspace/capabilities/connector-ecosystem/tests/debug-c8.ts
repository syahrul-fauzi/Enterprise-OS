// Debug script untuk C8 tanpa test runner
import { syncEOSToWhatsApp } from '../implementation/services/connector-ecosystem.service.js';

async function main() {
  console.log("[DEBUG-C8] Memulai debug syncEOSToWhatsApp...");
  
  // Setup globals yang dibutuhkan
  const workRepository = await import("../../work-core/implementation/repository/work-postgres.repository.js");
  const testWork = await workRepository.save({
    id: "test-whatsapp-outbound-001",
    compositionId: "test-composition-001",
    sessionId: "test-session-001",
    title: "Test WhatsApp outbound message",
    description: "Test sync dari EOS ke WhatsApp",
    status: "active",
    mode: "domain",
    externalId: "628987654321_wamid12345",
    platformSource: "whatsapp",
    tenantId: "default-tenant",
    workspaceId: "test-workspace",
    actorId: "test-actor",
    createdBy: "test-user",
    updatedBy: "test-user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  console.log("[DEBUG-C8] testWork dibuat:", JSON.stringify(testWork, null, 2));
  
  // Mock sharedWorkRepository
  (global as any).sharedWorkRepository = {
    list: async () => [testWork]
  };
  
  // Mock invokeCapability
  let invoked = false;
  (global as any).invokeCapability = async () => {
    invoked = true;
    console.log("[DEBUG-C8] invokeCapability dipanggil!");
    return { success: true };
  };
  
  // Eksekusi syncEOSToWhatsApp
  console.log("[DEBUG-C8] Memanggil syncEOSToWhatsApp...");
  const result = await syncEOSToWhatsApp(testWork.id, "completed");
  console.log("[DEBUG-C8] Result dari syncEOSToWhatsApp:", JSON.stringify(result, null, 2));
  console.log("[DEBUG-C8] invokeCapability dipanggil?", invoked);
  
  if (result.success) {
    console.log("[DEBUG-C8] SEMUA BERHASIL!");
  } else {
    console.error("[DEBUG-C8] GAGAL:", result.error);
  }
}

main().catch(err => {
  console.error("[DEBUG-C8] FATAL ERROR:", err);
  console.error("[DEBUG-C8] Error stack:", err.stack);
  process.exit(1);
});