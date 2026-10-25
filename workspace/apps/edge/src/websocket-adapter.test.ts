// Test file untuk EDGE-DEVICE-001 W01: Device-to-Work vertical slice + Failure and Recovery
// Dijalankan dengan pnpm exec vitest run apps/edge/src/websocket-adapter.test.ts
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';
import assert from 'node:assert';
import type { ExecutionEnvelope } from '@capabilities/connector-ecosystem/implementation/contracts/connector-ecosystem.contracts';
import { getWorkRepositoryInMemory, resetWorkRepositoryInMemory } from '@capabilities/work-core/implementation/repository/work-inmemory.repository';
import { registerWorkCoreCapability } from '@capabilities/work-core/implementation/commands/work.commands';
import { 
  SessionRepositoryInMemory, 
  resetSessionRepository, 
  newSessionId,
  getSessionByIdCommand,
  registerIdentityCoreCapability
} from '@capabilities/work-core';
import { setupTestDeviceSession, createMockEnvelope, createMockAudioMetadata } from './test-utils';
import { WebSocketAdapter } from './websocket-adapter.service';
import { createDeviceId, createSessionId } from '@capabilities/work-core';
import { getEvidenceRepositoryPostgres } from '../../../capabilities/evidence-registry/implementation/repository/index.js';

describe('EDGE-DEVICE-001: W01 Device-to-Work Vertical Slice', () => {
  let client: InstanceType<typeof WebSocketAdapter>;
  let workRepository: any;
  let validSessionId: string;

  beforeAll(async () => {
          // Set environment variable untuk test: nonaktifkan PostgreSQL, gunakan file-system repository saja
          process.env.POSTGRES_CONNECTION_STRING = undefined;
          process.env.DATABASE_URL = undefined;
          
          // IMPORT DULU SEMUA CAPABILITY REGISTRASI SEBELUM IMPORT capabilityRegistry
          // Ini memastikan semua registrasi dilakukan ke instance yang SAMA
                registerWorkCoreCapability(); // work-core sync registration
                await registerIdentityCoreCapability(); // identity-core async registration
                
                // Import dan register evidence-core secara eksplisit di test environment
          const { registerEvidenceCoreCapability } = await import('../../../capabilities/evidence-registry/implementation/commands/index.js');
          await registerEvidenceCoreCapability(); // evidence-core async registration
          
          // Sekarang import capabilityRegistry SETELAH semua registrasi selesai - GUNAKAN PATH YANG SAMA DENGAN IDENTITY/EVIDENCE-REGISTRY
          const { capabilityRegistry } = await import('../../../packages/core/kernel/src/registry/capability-command-registry');
          console.log(`[TEST] 🐛 capabilityRegistry keys:`, Object.keys(capabilityRegistry));
          console.log(`[TEST] 🐛 typeof capabilityRegistry.listCommandKeys:`, typeof capabilityRegistry.listCommandKeys);
          console.log(`[TEST] 🐛 capabilityRegistry.listCommandKeys.toString():`, capabilityRegistry.listCommandKeys.toString());
          
          // Tunggu SEMUA async registrasi selesai (final wait untuk memastikan semua command terdaftar)
          await new Promise(resolve => setTimeout(resolve, 200));
            
            // Verifikasi Gate A: cek apakah semua command terdaftar di capabilityRegistry
            // listCommandKeys() sekarang sinkron (fix instance ganda)
        const allRegisteredCommands = await capabilityRegistry.listCommandKeys();
        console.log(`[TEST] 📋 Type of allRegisteredCommands:`, typeof allRegisteredCommands, "Is array?", Array.isArray(allRegisteredCommands));
        console.log(`[TEST] 📋 allRegisteredCommands value:`, allRegisteredCommands);
        console.log(`[TEST] 📋 Daftar command terdaftar: ${allRegisteredCommands.join(', ')}`);
            
            // Verifikasi identity.getSessionById terdaftar (harus otomatis dari registerIdentityCoreCapability)
            const hasGetSessionById = allRegisteredCommands.includes('identity.getSessionById');
            console.log(`[TEST] ✅ identity.getSessionById terdaftar: ${hasGetSessionById}`);
            
            if (!hasGetSessionById) {
              throw new Error("[TEST] ❌ FATAL: getSessionByIdCommand tidak terdaftar - Gate A gagal! Identity-core registration failed.");
            }
            
            // Verifikasi evidence-registry.record terdaftar (harus otomatis dari evidence-core auto-registration)
            const hasEvidenceRecord = allRegisteredCommands.includes('evidence-registry.record');
            console.log(`[TEST] ✅ evidence-registry.record terdaftar: ${hasEvidenceRecord}`);
            
            // Jika belum terdaftar, throw error (harus otomatis terdaftar dari registerEvidenceCoreCapability)
            if (!hasEvidenceRecord) {
              throw new Error("[TEST] ❌ FATAL: recordEvidence command tidak terdaftar otomatis - Gate A gagal! registerEvidenceCoreCapability() harus memastikan command terdaftar sebelum test berjalan.");
            }
            
            console.log("[TEST] ✅ Semua capability terdaftar di capabilityRegistry - Gate A lulus!");
  });

  beforeEach(async () => {
          // Reset semua repository untuk test isolation - PAKAI resetWorkRepositoryInMemory() yang sudah diperbarui
          await resetWorkRepositoryInMemory();
          await resetSessionRepository();
          workRepository = getWorkRepositoryInMemory();
          
          // Buat device session yang valid SETELAH reset, dan tunggu hingga repository siap
          validSessionId = await setupTestDeviceSession(
            "esp32s3-audio-001", 
            "default", 
            "edge-demo"
          );
          // Tambahkan tunggu 50ms untuk memastikan session tersimpan dengan benar (hindari race condition)
          await new Promise(resolve => setTimeout(resolve, 50));
          // Verifikasi session masih ada sebelum lanjut - Gunakan string ID langsung (sesuai key di STORE Map)
          const sessionRepo = SessionRepositoryInMemory;
          const checkSession = await sessionRepo.byId(validSessionId as any);
          console.log(`[TEST] 🔍 Session setelah setup dan tunggu: ${validSessionId} exists=${!!checkSession}, revokedAt=${checkSession?.revokedAt}`);
    
    // Inisialisasi client sebagai WebSocketAdapter YANG SEBENARNYA (bukan mock) - agar logika offline buffer berjalan
    const testDeviceId = createDeviceId("esp32s3-audio-001", { /* mock hardware abstraction */ });
    client = new WebSocketAdapter(testDeviceId);
    await client.connect("wss://test.example.com/ws");
    console.log("[TEST] ✅ Test setup lengkap: WebSocketAdapter terinisialisasi dengan session ID " + validSessionId);
  });

  afterAll(async () => {
    if (client && typeof client.disconnect === 'function') {
      await client.disconnect();
    }
    await resetWorkRepositoryInMemory();
    await resetSessionRepository();
  });

  it('EDGE-B-001: test_gateb_001: Satu jalur event-to-Work end-to-end menggunakan test Work yang sudah ada', async () => {
    // 1. Verifikasi test Work sudah ada (tidak dibuat ulang oleh adapter)
    const existingWork = await workRepository.byWorkId("work-edge-demo-001");
    assert.ok(existingWork, "Test Work work-edge-demo-001 sudah ada");
    assert.strictEqual(existingWork.tenantId, "default", "Tenant test Work sesuai");
    assert.strictEqual(existingWork.workspaceId, "edge-demo", "Workspace test Work sesuai");
    console.log("[TEST] ✅ Test Work ditemukan: ", existingWork.id);

    // 2. Buat envelope valid - sesuai EdgeEventEnvelopeSchema (strict, no extra fields)
    const validEventId = crypto.randomUUID();
    const captureEnvelope = {
      eventId: validEventId,
      logicalWorkId: "work-edge-demo-001",
      deviceId: "esp32s3-audio-001",
      tenantId: "default",
      workspaceId: "edge-demo",
      sessionId: validSessionId, // FIX: Sertakan sessionId yang valid dari test setup
      intent: { type: "audio.capture.start", payload: {} },
      correlationId: "corr-" + validEventId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };
    
    const audioMetadata = createMockAudioMetadata(validSessionId);

    // 3. Proses event
    const result = await client.processIncomingAudioEvent(captureEnvelope, audioMetadata);
    assert.strictEqual(result.success, true, "Event berhasil diproses");

    // 4. Verifikasi atomicClaim dan state transition (FIXED: sesuai logika atomicClaim yang benar)
        const updatedWork = await workRepository.byWorkId("work-edge-demo-001");
        // Verifikasi state Work berubah menjadi 'executing' (transisi resmi work-core yang di-set atomicClaim)
        assert.strictEqual(updatedWork.status, 'executing', "Work status berubah menjadi executing setelah claim");
        // Verifikasi eventId tercatat di processedEventIds client (gunakan method public hasProcessedEvent untuk menghindari akses private property)
        assert.ok(client.hasProcessedEvent(validEventId), "EventId tercatat di processedEventIds (deduplikasi atomik)");
        // Verifikasi eventId juga tercatat di processedEventIds Work repository untuk verifikasi durability
        assert.ok(updatedWork.processedEventIds?.includes(validEventId), "EventId tercatat di Work repository processedEventIds");
        console.log("[TEST] ✅ State transition berhasil: Work status " + updatedWork.status + ", eventId " + validEventId + " tercatat");

    // 5. Verifikasi evidence tercatat di repository
    const evidence = await workRepository.getEvidence("work-edge-demo-001");
    const atomicClaimEvidence = evidence.find((e: any) => e.meta_eventId === validEventId);
    assert.ok(atomicClaimEvidence, "Evidence atomic claim dengan eventId yang benar tercatat");
    assert.strictEqual(atomicClaimEvidence.actorId, "esp32s3-audio-001", "Evidence mencatat actor yang benar (device ID)");
    console.log("[TEST] ✅ Evidence berhasil dicatat dengan metadata yang tepat");

    // 6. Test deduplikasi event yang SAMA (eventId sama) - IDENTEMPOTEN: berhasil tetapi tidak diproses ulang
    const duplicateResult = await client.processIncomingAudioEvent(captureEnvelope, audioMetadata);
    assert.strictEqual(duplicateResult.success, true, "Event duplikat (eventId sama) tetap return success (idempotent) tetapi di-skip pemrosesan ulang");
    // Verifikasi eventId sudah ada di processedEventIds (tidak ada duplikasi pemrosesan)
    const workAfterDuplicate = await workRepository.byWorkId("work-edge-demo-001");
    const eventCount = workAfterDuplicate.processedEventIds.filter(id => id === validEventId).length;
    assert.strictEqual(eventCount, 1, "EventId tidak diduplikasi di processedEventIds meskipun event dipanggil berulang");
    console.log("[TEST] ✅ Idempotency working: event dengan ID yang sama di-skip pemrosesan ulang, tidak menambah duplikasi di processedEventIds");
    
    // 7. Test event dengan ID BERBEDA dari device LAIN - HARUS DITERIMA (sesuai requirement user)
    // Daftarkan session baru untuk device kedua (sesuai P0: deviceId tidak boleh langsung dipercaya, harus dikaitkan dengan session terdaftar)
    const validSessionIdDevice2 = await setupTestDeviceSession("esp32s3-audio-002", "default", "edge-demo");
    const newEventId = crypto.randomUUID();
    const newCaptureEnvelope = {
      ...captureEnvelope,
      eventId: newEventId,
      deviceId: "esp32s3-audio-002",
      correlationId: "corr-" + newEventId,
      sessionId: validSessionIdDevice2 // SessionId yang VALID dan terdaftar untuk device 002
    };
    const audioMetadataDevice2 = createMockAudioMetadata(validSessionIdDevice2); // Metadata baru untuk session device 002
    const differentDeviceResult = await client.processIncomingAudioEvent(newCaptureEnvelope, audioMetadataDevice2);
    assert.strictEqual(differentDeviceResult.success, true, "Event dengan ID berbeda dari device berbeda diterima");
    // Verifikasi eventId baru juga tercatat
    const finalWork = await workRepository.byWorkId("work-edge-demo-001");
    assert.ok(finalWork.processedEventIds.includes(newEventId), "EventId baru dari device berbeda juga tercatat");
    console.log("[TEST] ✅ AtomicClaim logic sesuai requirement: hanya blok eventId yang sama, izinkan event berbeda dari device berbeda");
  });

  it('EDGE-C-002: test_offline_buffer_001: Persistence offline buffer setelah disconnect dan reconnect', async () => {
    // 1. Simulasikan koneksi terputus
    client.disconnect();
    assert.strictEqual(client.connected, false, "Koneksi terputus");
    console.log("[TEST] ✅ Koneksi WebSocket terputus untuk simulasi offline");

    // 2. Tambahkan 3 event ke offline buffer
    const eventIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const eventId = crypto.randomUUID();
      eventIds.push(eventId);
      const testEnvelope = {
        eventId,
        logicalWorkId: "work-edge-demo-001",
        deviceId: "esp32s3-audio-001",
        tenantId: "default",
        workspaceId: "edge-demo",
        sessionId: validSessionId, // FIX: Sertakan sessionId yang valid
        intent: { type: "audio.capture.start", payload: {} },
        correlationId: "corr-" + eventId,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };
      const audioMetadata = createMockAudioMetadata(validSessionId);
      // Saat offline, event akan ditambahkan ke buffer
      await client.processIncomingAudioEvent(testEnvelope, audioMetadata);
    }

    // 3. Verifikasi buffer berisi 3 event
    assert.strictEqual(client.getOfflineBufferSize(), 3, "Offline buffer berisi 3 event setelah koneksi terputus");
    console.log("[TEST] ✅ 3 event berhasil ditambahkan ke offline buffer, ukuran: " + client.getOfflineBufferSize());

    // 4. Simulasikan service restart (buat instance baru, yang akan memuat buffer dari storage)
    const testDeviceIdNew = createDeviceId("esp32s3-audio-001", { /* mock hardware abstraction */ });
    const newClient = new WebSocketAdapter(testDeviceIdNew);
    await newClient.connect("wss://test.example.com/ws"); // Connect akan memproses buffer

    // 5. Verifikasi buffer kosong setelah diproses (semua event berhasil diproses)
    assert.strictEqual(newClient.getOfflineBufferSize(), 0, "Offline buffer kosong setelah reconnect dan proses");
    console.log("[TEST] ✅ Semua event dari buffer berhasil diproses setelah reconnect");

    // 6. Verifikasi semua eventId tercatat di Work's processedEventIds
    const updatedWork = await workRepository.byWorkId("work-edge-demo-001");
    eventIds.forEach(eventId => {
      assert.ok(updatedWork.processedEventIds.includes(eventId), `EventId ${eventId} tercatat di Work setelah diproses dari buffer`);
    });
    console.log("[TEST] ✅ Semua event dari offline buffer berhasil tercatat di processedEventIds");
  });

  it('EDGE-C-002: test_offline_buffer_002: Kebijakan overflow ketika buffer mencapai kapasitas maksimum (100)', async () => {
    // Reset state Work sebelum test berjalan untuk menghindari duplicate_event error
    await workRepository.resetWork("work-edge-demo-001");
    
    // 1. Pastikan koneksi benar-benar terputus agar event masuk ke offline buffer
    await client.disconnect();
    // Tambahkan delay untuk memastikan state this.connected propagasi
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.strictEqual(client.connected, false, "Koneksi terputus untuk aktifkan offline mode");
    console.log("[TEST] ✅ Koneksi WebSocket terputus, offline mode aktif");

    // 4. Coba tambahkan event ke-101 (harus ditolak, buffer overflow)
    const overflowEventId = crypto.randomUUID();
    const overflowEnvelope = {
      eventId: overflowEventId,
      logicalWorkId: "work-edge-demo-001",
      deviceId: "esp32s3-audio-001",
      tenantId: "default",
      workspaceId: "edge-demo",
      sessionId: validSessionId, // FIX: Sertakan sessionId yang valid
      intent: { type: "audio.capture.start", payload: {} },
      correlationId: "corr-" + overflowEventId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };

    // 2. Isi buffer dengan 100 event (mencapai MAX_BUFFER_SIZE)
    const maxBufferSize = 100;
    for (let i = 0; i < maxBufferSize; i++) {
      const eventId = crypto.randomUUID();
      const testEnvelope = {
        eventId,
        logicalWorkId: "work-edge-demo-001",
        deviceId: "esp32s3-audio-001",
        tenantId: "default",
        workspaceId: "edge-demo",
        sessionId: validSessionId, // FIX: Sertakan sessionId yang valid
        intent: { type: "audio.capture.start", payload: {} },
        correlationId: "corr-" + eventId,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };
      const audioMetadata = createMockAudioMetadata(validSessionId);
      const addResult = await client.processIncomingAudioEvent(testEnvelope, audioMetadata);
      assert.strictEqual(addResult.success, true, `Event ${i+1}/${maxBufferSize} berhasil ditambahkan ke offline buffer`);
    }

    // 3. Verifikasi buffer penuh
    assert.strictEqual(client.getOfflineBufferSize(), 100, "Buffer mencapai kapasitas maksimum 100");
    console.log("[TEST] ✅ Buffer penuh dengan 100 event");

    const audioMetadata = createMockAudioMetadata(validSessionId);
    const overflowResult = await client.processIncomingAudioEvent(overflowEnvelope, audioMetadata);

    // 5. Verifikasi event ditolak
    assert.strictEqual(overflowResult.success, false, "Event ke-101 ditolak karena buffer overflow");
    assert.ok(overflowResult.error?.includes("buffer_overflow"), `Error message berisi 'buffer_overflow': ${overflowResult.error}`);
    assert.strictEqual(client.getOfflineBufferSize(), 100, "Ukuran buffer tetap 100 setelah overflow");
    console.log("[TEST] ✅ Event ke-101 berhasil ditolak (buffer overflow), ukuran buffer tetap 100");

    // 6. Verifikasi evidence buffer overflow tercatat
    const evidence = await workRepository.getEvidence("work-edge-demo-001");
    console.log("[TEST] 📋 Semua evidence untuk work-edge-demo-001 (terakhir 10):", JSON.stringify(evidence.slice(-10), null, 2));
    const overflowEvidence = evidence.find((e: any) => 
      (e.meta_eventId === overflowEventId || e.eventId === overflowEventId) && 
      (e.meta_status === "BUFFER_OVERFLOW_REJECTED" || e.status === "BUFFER_OVERFLOW_REJECTED")
    );
    assert.ok(overflowEvidence, `Evidence BUFFER_OVERFLOW_REJECTED tercatat untuk event overflow ${overflowEventId}. Semua evidence terakhir 10: ${JSON.stringify(evidence.slice(-10), null, 2)}`);
    console.log("[TEST] ✅ Evidence buffer overflow berhasil dicatat dengan status yang tepat");
  });

  it('EDGE-C-002: test_offline_buffer_003: Urutan FIFO dipelihara selama pemrosesan', async () => {
    // 1. Putuskan koneksi
    client.disconnect();
    const processingOrder: string[] = [];
    
    // 2. Tambahkan event dengan ID yang bisa dilacak urutannya (gunakan UUID valid)
    const eventSequence: string[] = [];
    for (let i = 0; i < 5; i++) {
      const eventId = crypto.randomUUID();
      eventSequence.push(eventId);
      const testEnvelope = {
        eventId,
        logicalWorkId: "work-edge-demo-001",
        deviceId: "esp32s3-audio-001",
        tenantId: "default",
        workspaceId: "edge-demo",
        sessionId: validSessionId, // FIX: Sertakan sessionId valid untuk lolos envelope validation
        intent: { type: "audio.capture.start", payload: {} },
        correlationId: "corr-" + eventId,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };
      const audioMetadata = createMockAudioMetadata(validSessionId);
      await client.processIncomingAudioEvent(testEnvelope, audioMetadata);
    }

    // 3. Reconnect untuk memproses buffer (proses FIFO)
    await client.connect("wss://test.example.com/ws");

    // 4. Verifikasi urutan pemrosesan sesuai urutan penambahan (FIFO)
    const updatedWork = await workRepository.byWorkId("work-edge-demo-001");
    const processedOrder = updatedWork.processedEventIds.filter((id: string) => eventSequence.includes(id));
    
    // Urutan harus sama dengan eventSequence (FIFO)
    assert.deepStrictEqual(processedOrder, eventSequence, "Event diproses dalam urutan FIFO");
    console.log("[TEST] ✅ Urutan FIFO terjaga: event diproses sesuai urutan penambahan ke buffer");
  });

  it('EDGE-C-002: test_concurrent_duplicate_events_001: Dua request bersamaan eventId sama hanya diproses satu kali (atomic deduplikasi)', async () => {
    await client.connect("wss://test.example.com/ws");
    const eventId = crypto.randomUUID();
    const testEnvelope = {
      eventId,
      logicalWorkId: "work-edge-demo-001",
      deviceId: "esp32s3-audio-001",
      tenantId: "default",
      workspaceId: "edge-demo",
      sessionId: validSessionId, // FIX: Sertakan sessionId valid dari test setup
      intent: { type: "audio.capture.start", payload: {} },
      correlationId: "corr-" + eventId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };
    const audioMetadata = createMockAudioMetadata(validSessionId);

    // Kirim dua request bersamaan dengan Promise.all untuk simulasi concurrency
    const [firstResult, secondResult] = await Promise.all([
      client.processIncomingAudioEvent(testEnvelope, audioMetadata),
      client.processIncomingAudioEvent(testEnvelope, audioMetadata)
    ]);

    // Hanya satu yang berhasil, yang lain ditolak sebagai duplikat
    assert.strictEqual(firstResult.success, true, "Request pertama berhasil diproses");
    assert.strictEqual(secondResult.success, false, "Request kedua ditolak sebagai duplikat");
    assert.ok(secondResult.error?.includes("duplicate_event"), `Error message sesuai untuk deduplikasi atomik, mengandung 'duplicate_event': ${secondResult.error}`);
    
    // Verifikasi eventId hanya tercatat satu kali di client's processedEventIds (gunakan method public)
    assert.ok(client.hasProcessedEvent(eventId), "EventId tercatat di client processedEventIds");
    // Verifikasi eventId juga hanya tercatat satu kali di Work repository untuk durability
    const updatedWork = await workRepository.byWorkId("work-edge-demo-001");
    const eventOccurrences = updatedWork.processedEventIds?.filter((id: string) => id === eventId).length || 0;
    assert.strictEqual(eventOccurrences, 1, "EventId hanya tercatat satu kali di Work repository (tidak ada duplikasi)");
    console.log("[TEST] ✅ Deduplikasi atomik berhasil: dua request bersamaan hanya diproses satu kali");
  });

  it('EDGE-C-002: test_replay_after_restart_001: Replay event yang sama setelah restart tidak menyebabkan duplikasi (durable idempotency)', async () => {
    // 1. Simulasikan restart client: buat instance baru dari WebSocketAdapter
    // Ini mengosongkan in-memory processedEventIds, hanya yang tersimpan di work-core yang tersisa
    const { WebSocketAdapter } = await import('./websocket-adapter.service');
    const newClient = new WebSocketAdapter();
    // Inisialisasi client baru dengan konfigurasi yang sama (work-core sebagai otoritas)
    await newClient.initialize();
    await newClient.connect("wss://test.example.com/ws");
    
    // 2. Kirim event sekali di client pertama
    const eventId = crypto.randomUUID();
    const testEnvelope = {
      eventId,
      logicalWorkId: "work-edge-demo-001",
      deviceId: "esp32s3-audio-001",
      tenantId: "default",
      workspaceId: "edge-demo",
      sessionId: validSessionId,
      intent: { type: "audio.capture.start", payload: {} },
      correlationId: "corr-" + eventId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };
    const audioMetadata = createMockAudioMetadata(validSessionId);

    const firstResult = await client.processIncomingAudioEvent(testEnvelope, audioMetadata);
    assert.strictEqual(firstResult.success, true, "Event pertama berhasil diproses di client pertama");
    
    // 3. Kirim event yang SAMA di client baru (simulasi replay setelah restart)
    const secondResult = await newClient.processIncomingAudioEvent(testEnvelope, audioMetadata);
    assert.strictEqual(secondResult.success, false, "Replay event ditolak oleh client baru (restart)");
    assert.ok(secondResult.error?.includes("duplicate_event"), `Error message sesuai, mengandung 'duplicate_event': ${secondResult.error}`);
    
    // 4. Verifikasi eventId hanya tercatat satu kali di Work repository (durable)
    const updatedWork = await workRepository.byWorkId("work-edge-demo-001");
    const eventOccurrences = updatedWork.processedEventIds?.filter((id: string) => id === eventId).length || 0;
    assert.strictEqual(eventOccurrences, 1, "EventId hanya tercatat satu kali setelah replay dan restart (durable)");
    
    console.log("[TEST] ✅ Durable idempotency berhasil: replay setelah restart tidak membuat duplikasi");
  });

  it('EDGE-C-002: test_evidence_storage_failure_rollback_001: Rollback claim jika safeRecordEvidence gagal (durable deduplikasi)', async () => {
    // Mock safeRecordEvidence untuk gagal secara terkontrol
    const originalSafeRecordEvidence = await import("@capabilities/work-core");
    const mockSafeRecordEvidence = vi.spyOn(originalSafeRecordEvidence, 'safeRecordEvidence').mockRejectedValueOnce(new Error("Storage failure: database unreachable"));

    const eventId = crypto.randomUUID();
    const testEnvelope = {
      eventId,
      logicalWorkId: "work-edge-demo-001",
      deviceId: "esp32s3-audio-001",
      tenantId: "default",
      workspaceId: "edge-demo",
      sessionId: validSessionId, // FIX: Sertakan sessionId valid dari test setup
      intent: { type: "audio.capture.start", payload: {} },
      correlationId: "corr-" + eventId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };
    const audioMetadata = createMockAudioMetadata(validSessionId);

    const result = await client.processIncomingAudioEvent(testEnvelope, audioMetadata);
    assert.strictEqual(result.success, false, "Event gagal diproses karena evidence storage error");
    assert.strictEqual(result.error, "Storage failure: database unreachable", "Error message diteruskan dengan benar");
    
    // Verifikasi atomicClaim di-release (Work status kembali ke state awal, bukan locked)
    const updatedWork = await workRepository.byWorkId("work-edge-demo-001");
    assert.notStrictEqual(updatedWork.status, 'executing', "Work tidak tetap dalam status executing setelah rollback");
    assert.ok(updatedWork.status === 'idle' || updatedWork.status === 'pending', "Work kembali ke state idle/pending setelah rollback claim");
    
    // Restore original implementation
    mockSafeRecordEvidence.mockRestore();
    console.log("[TEST] ✅ Rollback atomicClaim berhasil ketika safeRecordEvidence gagal");
  });

  it('EDGE-C-002: test_business_evidence_traceability_001: Evidence hasil transisi tercatat dengan traceability Work dan actor yang benar (P1 FIX: Test hasil bisnis dan evidence)', async () => {
    await client.connect("wss://test.example.com/ws");
    const eventId = crypto.randomUUID();
    const deviceId = "esp32s3-audio-001";
    const testEnvelope = {
      eventId,
      logicalWorkId: "work-edge-demo-001",
      deviceId: deviceId,
      tenantId: "default",
      workspaceId: "edge-demo",
      sessionId: validSessionId, // FIX: Gunakan sessionId valid dari test setup
      intent: { type: "audio.capture.start", payload: {} },
      correlationId: "corr-" + eventId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };
    const audioMetadata = createMockAudioMetadata(validSessionId);

    // Proses event
    const result = await client.processIncomingAudioEvent(testEnvelope, audioMetadata);
    assert.strictEqual(result.success, true, "Event berhasil diproses");

    // Ambil Work dari repository untuk verifikasi traceability evidence
    const updatedWork = await workRepository.byWorkId("work-edge-demo-001");
    const updatedWorkAny = updatedWork as any;
    
    // Verifikasi eventId tercatat di processedEventIds (dari atomicClaim)
    assert.ok(updatedWorkAny.processedEventIds?.includes(eventId), "eventId tercatat di processedEventIds Work");
    
    // Ambil evidence terakhir yang dicatat untuk Work ini (dari work repository lokal, test environment)
    const workEvidences = updatedWorkAny.evidence || [];
    assert.ok(workEvidences.length > 0, "Ada evidence yang dicatat untuk Work ini");
    
    const lastEvidence = workEvidences[workEvidences.length - 1];
    const lastEvidenceAny = lastEvidence as any;
    
    // Verifikasi traceability sesuai acceptance criteria Evidence:
    // - Hasil transisi dan bukti tersimpan serta dapat ditelusuri ke Work dan actor yang benar
    assert.strictEqual(lastEvidenceAny.work_id, "work-edge-demo-001", "Evidence terikat ke logicalWorkId yang benar");
    assert.strictEqual(lastEvidenceAny.actor_id, deviceId, "Evidence terikat ke actor (deviceId) yang benar");
    assert.strictEqual(lastEvidenceAny.eventId, eventId, "Evidence terikat ke eventId yang benar");
    assert.strictEqual(lastEvidenceAny.tenant_id, "default", "Evidence terikat ke tenant yang benar");
    assert.strictEqual(lastEvidenceAny.workspace_id, "edge-demo", "Evidence terikat ke workspace yang benar");
    assert.ok(lastEvidenceAny.timestamp, "Evidence memiliki timestamp yang valid");
    assert.ok(lastEvidenceAny.checksum, "Evidence memiliki SHA-256 checksum (durable dari safeRecordEvidence)");
    
    // Verifikasi status event di pipeline: EVENT_PROCESSED (bukan cuma diterima)
    assert.strictEqual(result.pipelineState, "EVENT_PROCESSED", "Event status diproses dengan benar (bukan hanya diterima)");
    
    console.log("[TEST] ✅ Traceability evidence berhasil: terikat ke Work, actor, event, tenant, dan workspace yang benar");
  });

  it('EDGE-C-002: test_expired_event_replay_001: Event yang sudah kedaluwarsa ditolak dan evidence dicatat (expired event handling)', async () => {
    await client.connect("wss://test.example.com/ws");
    const eventId = crypto.randomUUID();
    const testEnvelope = {
      eventId,
      logicalWorkId: "work-edge-demo-001",
      deviceId: "esp32s3-audio-001",
      tenantId: "default",
      workspaceId: "edge-demo",
      sessionId: validSessionId,
      intent: { type: "audio.capture.start", payload: {} },
      correlationId: "corr-" + eventId,
      issuedAt: new Date(Date.now() - 86400000).toISOString(), // Event dari 1 hari yang lalu
      expiresAt: new Date(Date.now() - 3600000).toISOString() // Sudah kedaluwarsa 1 jam yang lalu
    };
    const audioMetadata = createMockAudioMetadata(validSessionId);

    // Kirim event yang sudah kedaluwarsa
    const result = await client.processIncomingAudioEvent(testEnvelope, audioMetadata);
    
    // Verifikasi event ditolak
    assert.strictEqual(result.success, false, "Event yang kedaluwarsa ditolak oleh sistem");
    assert.ok(result.error?.includes("event_expired"), `Error message sesuai untuk expired event: ${result.error}`);
    assert.strictEqual(result.pipelineState, "EVENT_REJECTED", "Status pipeline EVENT_REJECTED untuk event expired");
    
    // Verifikasi evidence rejection tercatat
    const updatedWork = await workRepository.byWorkId("work-edge-demo-001");
    const workEvidences = (updatedWork as any).evidence || [];
    const rejectionEvidence = workEvidences.find((e: any) => e.eventId === eventId && e.meta_status === "EVENT_EXPIRED_REJECTED");
    assert.ok(rejectionEvidence, "Evidence rejection event expired tercatat di Work repository");
    assert.strictEqual(rejectionEvidence.metadata.reason, "event_has_expired", "Alasan penolakan tercatat dengan benar");
    
    console.log("[TEST] ✅ Expired event handling berhasil: event kedaluwarsa ditolak dan evidence tercatat");
  });

  it('EDGE-C-002: test_offline_buffer_overflow_replay_001: Event yang menyebabkan buffer overflow ditolak dan evidence tercatat (offline buffer handling)', async () => {
    await client.connect("wss://test.example.com/ws");
    // Isi buffer sampai penuh (MAX_BUFFER_SIZE = 100)
    const fullBufferEvents = [];
    for (let i = 0; i < 100; i++) {
      fullBufferEvents.push({
        envelope: {
          eventId: `event-buffer-fill-${i}`,
          logicalWorkId: "work-edge-demo-001",
          deviceId: "esp32s3-audio-001",
          tenantId: "default",
          workspaceId: "edge-demo",
          sessionId: validSessionId,
          intent: { type: "audio.capture.start", payload: {} },
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        },
        timestamp: Date.now()
      });
    }
    // Tambahkan 100 event ke buffer untuk mengisi penuh
    for (const event of fullBufferEvents) {
      await client.addToOfflineBuffer(event);
    }

    // Kirim event ke-101 yang akan menyebabkan overflow
    const overflowEventId = crypto.randomUUID();
    const overflowEnvelope = {
      eventId: overflowEventId,
      logicalWorkId: "work-edge-demo-001",
      deviceId: "esp32s3-audio-001",
      tenantId: "default",
      workspaceId: "edge-demo",
      sessionId: validSessionId,
      intent: { type: "audio.capture.start", payload: {} },
      correlationId: "corr-" + overflowEventId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };
    const audioMetadata = createMockAudioMetadata(validSessionId);

    // Kirim event yang menyebabkan overflow
    const result = await client.processIncomingAudioEvent(overflowEnvelope, audioMetadata);
    
    // Verifikasi event ditolak karena buffer penuh
    assert.strictEqual(result.success, false, "Event yang menyebabkan buffer overflow ditolak");
    assert.ok(result.error?.includes("buffer_overflow"), `Error message sesuai untuk buffer overflow: ${result.error}`);
    assert.strictEqual(result.pipelineState, "EVENT_REJECTED", "Status pipeline EVENT_REJECTED untuk overflow event");
    
    // Verifikasi evidence overflow tercatat di Work repository
    const updatedWork = await workRepository.byWorkId("work-edge-demo-001");
    const workEvidences = (updatedWork as any).evidence || [];
    const overflowEvidence = workEvidences.find((e: any) => e.eventId === overflowEventId && e.meta_status === "BUFFER_OVERFLOW_REJECTED");
    assert.ok(overflowEvidence, "Evidence buffer overflow tercatat di Work repository");
    assert.strictEqual(overflowEvidence.metadata.bufferSize, "100", "Buffer size sebelum overflow tercatat dengan benar");
    assert.strictEqual(overflowEvidence.metadata.maxBufferSize, "100", "Max buffer size tercatat dengan benar");
    
    console.log("[TEST] ✅ Offline buffer overflow handling berhasil: event ditolak dan evidence tercatat");
  });

  it('EDGE-C-002: test_overflow_event_replay_after_restart_001: Event overflow yang pernah ditolak tetap ditolak setelah restart (durable overflow rejection)', async () => {
    // 1. Jalankan test sebelumnya untuk membuat overflow event dan catat evidence
    await client.connect("wss://test.example.com/ws");
    // Isi buffer sampai penuh
    const fullBufferEvents = [];
    for (let i = 0; i < 100; i++) {
      fullBufferEvents.push({
        envelope: {
          eventId: `event-buffer-fill-restart-${i}`,
          logicalWorkId: "work-edge-demo-001",
          deviceId: "esp32s3-audio-001",
          tenantId: "default",
          workspaceId: "edge-demo",
          sessionId: validSessionId,
          intent: { type: "audio.capture.start", payload: {} },
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        },
        timestamp: Date.now()
      });
    }
    for (const event of fullBufferEvents) {
      await client.addToOfflineBuffer(event);
    }

    // Kirim overflow event pertama kali
    const overflowEventId = crypto.randomUUID();
    const overflowEnvelope = {
      eventId: overflowEventId,
      logicalWorkId: "work-edge-demo-001",
      deviceId: "esp32s3-audio-001",
      tenantId: "default",
      workspaceId: "edge-demo",
      sessionId: validSessionId,
      intent: { type: "audio.capture.start", payload: {} },
      correlationId: "corr-" + overflowEventId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };
    const audioMetadata = createMockAudioMetadata(validSessionId);

    const firstResult = await client.processIncomingAudioEvent(overflowEnvelope, audioMetadata);
    assert.strictEqual(firstResult.success, false, "Event pertama ditolak karena buffer overflow");

    // 2. Simulasikan restart: buat instance client baru
    const { WebSocketAdapter } = await import('./websocket-adapter.service');
    const newClient = new WebSocketAdapter();
    await newClient.initialize();
    await newClient.connect("wss://test.example.com/ws");

    // 3. Kirim event yang sama lagi setelah restart
    const secondResult = await newClient.processIncomingAudioEvent(overflowEnvelope, audioMetadata);
    
    // Verifikasi event tetap ditolak meskipun setelah restart (durable rejection dari work-core)
    assert.strictEqual(secondResult.success, false, "Event yang sama tetap ditolak setelah restart");
    assert.ok(secondResult.error?.includes("duplicate_event") || secondResult.error?.includes("buffer_overflow"), 
      `Error message sesuai: ${secondResult.error}`);

    // Verifikasi hanya ada satu evidence buffer overflow untuk event ini
    const updatedWork = await workRepository.byWorkId("work-edge-demo-001");
    const workEvidences = (updatedWork as any).evidence || [];
    const overflowEvidences = workEvidences.filter((e: any) => e.eventId === overflowEventId && e.meta_status === "BUFFER_OVERFLOW_REJECTED");
    assert.strictEqual(overflowEvidences.length, 1, "Hanya ada satu evidence buffer overflow untuk event yang sama (tidak ada duplikasi evidence)");

    console.log("[TEST] ✅ Durable overflow rejection berhasil: event tetap ditolak setelah restart");
  });
});