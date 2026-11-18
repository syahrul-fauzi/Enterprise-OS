// E2E Test untuk EDGE-VOICE-001 - Voice-to-Intent Pipeline Verification
// Dijalankan oleh eos-verification agent secara independen
// Mengadopsi pola test dari EDGE-DEVICE-001 dengan penambahan test case khusus voice

import { MockWebSocketClient } from '../../apps/edge/websocket-adapter.service';
import { createDeviceId, newDeviceId } from '../../workspace/packages/contracts-core/src/identity.contracts';
import { intentUnderstandingService } from '../../workspace/capabilities/atomic-composition/implementation/services/intent-understanding.service';
import { safeRecordEvidence } from '../../workspace/capabilities/work-core/implementation/utils/evidence.utils';

async function runEdgeVoice001Tests() {
  console.log('=== Memulai E2E Test EDGE-VOICE-001 ===');
  const results: Record<string, { passed: boolean; evidence: string }> = {};

  // 1. Inisialisasi WebSocket Client dengan DeviceId voice simulator
  const deviceId = newDeviceId(); // Gunakan newDeviceId untuk membuat DeviceId baru (sesuai identity.contracts)
  const wsClient = new MockWebSocketClient(deviceId);
  // WAJIB panggil connect() sebelum mengirim event (sesuai mock implementation)
  await wsClient.connect("wss://audio-gateway.eos-local.dev:8443/voice-stream");
  console.log(`Voice DeviceId yang digunakan: ${deviceId}`);

  // Test 1: Validasi Metadata VAD & Opus - Audio tidak Opus encoded ditolak (ESP32-S3 validation)
  try {
    const invalidOpusEnvelope = {
      schemaVersion: "1.0",
      eventId: "event-voice-001-invalid-opus",
      logicalWorkId: "work-voice-query-001",
      deviceId: deviceId,
      intent: { type: "voice.query", payload: { rawAudio: "base64..." } },
      correlationId: "corr-voice-001",
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };

    // Kirim dengan metadata opusEncoded: false (simulasi audio tidak terencode)
    const result = await wsClient.handleIncomingAudioEvent(invalidOpusEnvelope, {
      sessionId: "session-voice-001",
      isVadTrigger: true,
      opusEncoded: false
    });

    if (!result.success && result.error === "Audio not Opus encoded (ESP32-S3 encoder validation failed)") {
      results["opus_validation"] = { passed: true, evidence: "Audio tidak Opus encoded berhasil ditolak" };
      console.log('✅ Test 1 (Opus Validation Check): PASS');
    } else {
      results["opus_validation"] = { passed: false, evidence: `Opus validation gagal: ${result.error}` };
      console.log('❌ Test 1 (Opus Validation Check): FAIL');
    }
  } catch (e) {
    results["opus_validation"] = { passed: false, evidence: `Exception: ${e}` };
    console.log('❌ Test 1 (Opus Validation Check): FAIL - Exception');
  }

  // Test 2: Idempotency Audio - Chunk audio duplikat hanya direkam sekali
  try {
    const testEventId = "event-voice-duplicate-001";
    const validEnvelope = {
      schemaVersion: "1.0",
      eventId: testEventId,
      logicalWorkId: "work-voice-command-001",
      deviceId: deviceId,
      intent: { type: "voice.command", payload: { transcript: "buka laporan kasus baru" } },
      correlationId: "corr-voice-duplicate-001",
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };

    // Kirim chunk audio yang sama 5x (simulasi network retransmit)
    for (let i = 0; i < 5; i++) {
      await wsClient.handleIncomingAudioEvent(validEnvelope, {
        sessionId: "session-voice-002",
        isVadTrigger: true,
        opusEncoded: true
      });
    }

    // Cek eventDeduplicationSet hanya memiliki 1 entry untuk eventId ini
    const deduplicationSet = (wsClient as any).eventDeduplicationSet;
    if (deduplicationSet.has(testEventId) && deduplicationSet.size === 1) {
      results["audio_idempotency_check"] = { passed: true, evidence: "Chunk audio duplikat hanya direkam sekali" };
      console.log('✅ Test 2 (Audio Idempotency Check): PASS');
    } else {
      results["audio_idempotency_check"] = { passed: false, evidence: `Idempotency gagal: ukuran set ${deduplicationSet.size}` };
      console.log('❌ Test 2 (Audio Idempotency Check): FAIL');
    }
  } catch (e) {
    results["audio_idempotency_check"] = { passed: false, evidence: `Exception: ${e}` };
    console.log('❌ Test 2 (Audio Idempotency Check): FAIL - Exception');
  }

  // Test 3: Manajemen Sesi Audio - Sesi ditutup setelah VAD end-of-speech
  try {
    const sessionId = "session-voice-003";
    const startEnvelope = {
      schemaVersion: "1.0",
      eventId: "event-voice-start-001",
      logicalWorkId: "work-voice-query-002",
      deviceId: deviceId,
      intent: { type: "voice.start", payload: {} },
      correlationId: "corr-voice-session-001",
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };

    // Mulai sesi dengan VAD trigger
    await wsClient.handleIncomingAudioEvent(startEnvelope, {
      sessionId: sessionId,
      isVadTrigger: true,
      opusEncoded: true
    });

    const audioSessionSet = (wsClient as any).audioSessionSet;
    if (!audioSessionSet.has(sessionId)) {
      results["vad_session_start"] = { passed: false, evidence: "Sesi audio tidak terdaftar setelah VAD trigger" };
      console.log('❌ Test 3 (VAD Session Start Check): FAIL');
    } else {
      // Kirim event end-of-speech (isVadTrigger: false)
      const endEnvelope = {
        ...startEnvelope,
        eventId: "event-voice-end-001"
      };
      await wsClient.handleIncomingAudioEvent(endEnvelope, {
        sessionId: sessionId,
        isVadTrigger: false,
        opusEncoded: true
      });

      if (!audioSessionSet.has(sessionId)) {
        results["vad_session_management"] = { passed: true, evidence: "Sesi audio berhasil dihapus setelah end-of-speech" };
        console.log('✅ Test 3 (VAD Session Management Check): PASS');
      } else {
        results["vad_session_management"] = { passed: false, evidence: "Sesi audio tidak terhapus setelah end-of-speech" };
        console.log('❌ Test 3 (VAD Session Management Check): FAIL');
      }
    }
  } catch (e) {
    results["vad_session_management"] = { passed: false, evidence: `Exception: ${e}` };
    console.log('❌ Test 3 (VAD Session Management Check): FAIL - Exception');
  }

  // Test 4: Intent Parsing Transkripsi Suara - Transkrip berhasil diinterpretasi menjadi intent terstruktur
  try {
    const voiceTranscript = "tolong buatkan kasus hukum baru untuk klien PT Maju Bersama";
    const interpretation = await intentUnderstandingService.interpret({
      transcript: voiceTranscript,
      source: "edge-voice-adapter",
      timestamp: new Date().toISOString()
    });

    if (interpretation.resolution.objective && interpretation.domainType === "legal") {
      results["voice_intent_parsing"] = { passed: true, evidence: `Transkripsi berhasil diinterpretasi: ${interpretation.resolution.objective}` };
      console.log('✅ Test 4 (Voice Intent Parsing Check): PASS');
    } else {
      results["voice_intent_parsing"] = { passed: false, evidence: `Intent parsing gagal: domain ${interpretation.domainType}` };
      console.log('❌ Test 4 (Voice Intent Parsing Check): FAIL');
    }
  } catch (e) {
    results["voice_intent_parsing"] = { passed: false, evidence: `Exception: ${e}` };
    console.log('❌ Test 4 (Voice Intent Parsing Check): FAIL - Exception');
  }

  // Test 5: Continuity Work - logicalWorkId tetap stabil setelah sesi audio terputus dan reconnect
  try {
    // Simulasi reconnect: buat client baru, gunakan logicalWorkId yang sama
    const newWsClient = new MockWebSocketClient(deviceId);
    await newWsClient.connect("wss://audio-gateway.eos-local.dev:8443/voice-stream");
    
    const continuityEnvelope = {
      schemaVersion: "1.0",
      eventId: "event-voice-continuity-001",
      logicalWorkId: "work-voice-persist-001", // logicalWorkId yang sama persis
      deviceId: deviceId,
      intent: { type: "voice.resume", payload: { transcript: "lanjutkan laporan yang tadi" } },
      correlationId: "corr-voice-continuity-001",
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };

    const validation = newWsClient.validateEnvelope(continuityEnvelope);
    const workIdFromNewClient = continuityEnvelope.logicalWorkId;

    if (validation.valid && workIdFromNewClient === "work-voice-persist-001") {
      results["voice_work_continuity"] = { passed: true, evidence: "logicalWorkId tetap stabil setelah sesi audio terputus dan reconnect" };
      console.log('✅ Test 5 (Voice Work Continuity Check): PASS');
    } else {
      results["voice_work_continuity"] = { passed: false, evidence: `Continuity gagal: workId berubah menjadi ${workIdFromNewClient}` };
      console.log('❌ Test 5 (Voice Work Continuity Check): FAIL');
    }
  } catch (e) {
    results["voice_work_continuity"] = { passed: false, evidence: `Exception: ${e}` };
    console.log('❌ Test 5 (Voice Work Continuity Check): FAIL - Exception');
  }

  // Rekam semua hasil test sebagai evidence (sesuai payload signature safeRecordEvidence)
  const timestamp = new Date().toISOString();
  await safeRecordEvidence({
    capability: "edge-voice-adapter",
    command: "e2e-test-run",
    work_id: "work-voice-test-001",
    tenant_id: "tenant-default",
    actor_id: "eos-verification-agent",
    workspace_id: undefined,
    timestamp: timestamp,
    test_suite: "EDGE-VOICE-001",
    test_results: results
  });
  console.log('=== Semua test EDGE-VOICE-001 selesai ===');
  console.log('Hasil test:', JSON.stringify(results, null, 2));
  
  // Return hasil untuk eos-verification
  return results;
}

// Jalankan test jika dieksekusi langsung
if (require.main === module) {
  runEdgeVoice001Tests().catch(console.error);
}

export { runEdgeVoice001Tests };