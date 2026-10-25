// Script sederhana untuk menguji session validation logic
import { 
  resetSessionRepository, 
  SessionRepositoryInMemory, 
  newSessionId,
  type SessionId, 
  type TenantId, 
  type WorkspaceId, 
  type ActorId, 
  type UserId,
  getSessionByIdCommand,
  sessionQueries
} from "@capabilities/work-core"; // Semua import dari @capabilities/work-core - GATE A COMPLIANCE

async function main() {
  console.log("=== Testing Session Validation ===");
  
  // Reset repository
  await resetSessionRepository();
  console.log("✅ Session repository direset");
  
  // Buat test session
  const deviceSessionId = newSessionId();
  const deviceSession = {
    id: SessionId(deviceSessionId),
    userId: UserId("esp32s3-audio-001"),
    actorId: ActorId("esp32s3-audio-001"),
    tenantId: TenantId("default"),
    workspaceId: WorkspaceId("edge-demo"),
    productId: "edge-device",
    actorLabel: `Edge Device: esp32s3-audio-001`,
    isAgent: true,
    issuedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 menit yang lalu
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 hari kedepan
    revokedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30),
  };
  
  await SessionRepositoryInMemory.create(deviceSession);
  console.log(`✅ Device session dibuat: ${deviceSessionId}`);
  
  // Test getSessionByIdCommand
  const sessionResult = await getSessionByIdCommand.execute({ sessionId: deviceSessionId });
  console.log("getSessionByIdCommand result:", JSON.stringify(sessionResult, null, 2));
  
  // Test sessionQueries.isValid
  const isRevoked = await sessionQueries.isRevoked(deviceSessionId);
  const isValid = await sessionQueries.isValid(deviceSessionId);
  console.log(`sessionQueries.isRevoked(${deviceSessionId}): ${isRevoked}`);
  console.log(`sessionQueries.isValid(${deviceSessionId}): ${isValid}`);
  
  // Test validateDeviceSession logic
  if (sessionResult && sessionResult.authenticated) {
    console.log("\n✅ Session authenticated successfully!");
    console.log(`actorId: ${sessionResult.session.actorId}`);
    console.log(`tenantId: ${sessionResult.session.tenantId}`);
    console.log(`workspaceId: ${sessionResult.session.workspaceId}`);
    
    // Cek apakah cocok dengan device yang diharapkan
    if (sessionResult.session.actorId === "esp32s3-audio-001" && 
        sessionResult.session.tenantId === "default" &&
        sessionResult.session.workspaceId === "edge-demo") {
      console.log("\n🎉 SEMUA VALIDASI LULUS! Device terautentikasi dengan benar.");
    } else {
      console.log("\n❌ Validasi gagal: mismatch data");
    }
  } else {
    console.log("\n❌ Session tidak terautentikasi!");
  }
}

main().catch(console.error);