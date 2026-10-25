// Test utilities untuk EDGE-DEVICE-001
// GATE A COMPLIANCE: Import dari path yang SAMA persis dengan yang digunakan di websocket-adapter.service.ts
// Memastikan SessionRepositoryInMemory menggunakan INSTANCE STORE yang sama (global __EOS_IDENTITY_SESSION_STORE__)
import { 
  newSessionId, 
  SessionRepositoryInMemory,
  type SessionId, 
  type TenantId, 
  type WorkspaceId, 
  type ActorId, 
  type UserId
} from "@capabilities/work-core"; // Semua import dari @capabilities/work-core - GATE A COMPLIANCE

// Setup mock device session untuk test
async function setupTestDeviceSession(deviceId, tenantId, workspaceId) {
  const deviceSessionId = newSessionId();
  // Gunakan sessionId string yang sama untuk membuat SessionId object
  const sessionIdObj = SessionId(deviceSessionId);
  const deviceSession = {
    id: sessionIdObj,
    userId: UserId(deviceId),
    actorId: ActorId(deviceId),
    tenantId: TenantId(tenantId),
    workspaceId: WorkspaceId(workspaceId),
    productId: "edge-device",
    actorLabel: `Edge Device: ${deviceId}`,
    isAgent: true,
    issuedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 menit yang lalu
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 hari kedepan
    revokedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30),
  };
  await SessionRepositoryInMemory.create(deviceSession);
  
  // Verifikasi session berhasil dibuat dan TERSEDIA DI GLOBAL STORE
  // Akses global store untuk memastikan session tersimpan di instance yang SAMA
  const globalStore = (globalThis as any).__EOS_IDENTITY_SESSION_STORE__;
  const sessionInGlobalStore = globalStore?.get(String(sessionIdObj));
  console.log(`[TEST] ✅ Device session dibuat dan diverifikasi di GLOBAL STORE: ${deviceSessionId} untuk perangkat ${deviceId}, found_in_global=${!!sessionInGlobalStore}`);
  
  // Verifikasi juga melalui repository byId
  const verifySession = await SessionRepositoryInMemory.byId(sessionIdObj);
  console.log(`[TEST] ✅ Device session ditemukan melalui repository.byId: ${deviceSessionId}, found=${!!verifySession}`);
  
  return deviceSessionId;
}

// Helper untuk membuat mock ExecutionEnvelope yang valid
// Perbaiki: tambahkan parameter sessionId dari setupTestDeviceSession agar dikirim ke recordEvidence
function createMockEnvelope(eventId, sessionId, logicalWorkId = "work-edge-buffer-esp32s3-audio-001", expiresIn = 3600000) {
  return {
    schemaVersion: "1.0",
    eventId,
    sessionId, // Tambahkan sessionId untuk validasi Zod evidence-registry.record
    logicalWorkId, // Gunakan default work-edge-buffer-esp32s3-audio-001 yang sesuai dengan test yang perlu dibuat
    deviceId: "esp32s3-audio-001",
    tenantId: "default",
    workspaceId: "edge-demo",
    intent: { type: "audio-chunk", payload: { size: 1024 } },
    correlationId: `corr-${eventId}`,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiresIn).toISOString()
  };
}

// Helper untuk membuat mock audio metadata
function createMockAudioMetadata(sessionId = "session-test-001") {
  return {
    sessionId,
    isVadTrigger: true,
    opusEncoded: true
  };
}

module.exports = {
  setupTestDeviceSession,
  createMockEnvelope,
  createMockAudioMetadata
};