// Test file untuk EDGE-DEVICE-003 MQTT Adapter Failure and Recovery
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MockMQTTClient } from './mqtt-adapter.service';
import type { ExecutionEnvelope } from "../../workspace/capabilities/connector-ecosystem/implementation/contracts/connector-ecosystem.contracts";

const createMockEnvelope = (eventId: string, logicalWorkId: string = "work-test-001", expiresIn: number = 3600000): ExecutionEnvelope => ({
  schemaVersion: "1.0",
  eventId,
  logicalWorkId,
  deviceId: "esp32s3-sensor-001",
  intent: { type: "sensor-reading", payload: { temperature: 25.5, humidity: 60 } },
  correlationId: `corr-${eventId}`,
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + expiresIn).toISOString()
});

describe('EDGE-DEVICE-003: MQTT Adapter Failure and Recovery', () => {
  let client: MockMQTTClient;

  beforeEach(() => {
    client = new MockMQTTClient("esp32s3-sensor-001");
  });

  it('test_001: Event ditampung saat offline (offline buffering)', async () => {
    // Simulasikan koneksi terputus
    client.disconnect();
    const envelope = createMockEnvelope("event-test-001-offline");
    const result = await client.handleIncomingEvent(envelope);
    assert.strictEqual(result.success, false, "Event tidak diproses saat offline");
    assert.strictEqual(result.error, "Client offline, event buffered", "Event ditampung di buffer");
    assert.strictEqual(client.getOfflineBufferSize(), 1, "Buffer memiliki 1 event");
  });

  it('test_002: Event diproses setelah reconnect (buffer processing)', async () => {
    client.disconnect();
    const envelope1 = createMockEnvelope("event-test-002-reconnect-1");
    const envelope2 = createMockEnvelope("event-test-002-reconnect-2");
    
    await client.handleIncomingEvent(envelope1);
    await client.handleIncomingEvent(envelope2);
    assert.strictEqual(client.getOfflineBufferSize(), 2, "Buffer memiliki 2 event sebelum reconnect");
    
    await client.connect("mqtts://test.broker.com");
    assert.strictEqual(client.getOfflineBufferSize(), 0, "Buffer kosong setelah reconnect dan proses");
  });

  it('test_003: Event duplikat hanya diproses satu kali (idempotensi)', async () => {
    await client.connect("mqtts://test.broker.com");
    const envelope = createMockEnvelope("event-test-003-duplicate");
    const firstResult = await client.handleIncomingEvent(envelope);
    assert.strictEqual(firstResult.success, true, "Event pertama berhasil diproses");
    const secondResult = await client.handleIncomingEvent(envelope);
    assert.strictEqual(secondResult.success, true, "Event kedua tidak menyebabkan error");
    assert.strictEqual(secondResult.error, "Duplicate event skipped", "Event duplikat dilewati");
  });

  it('test_004: Buffer penuh menghapus event terbaru (backpressure handling)', async () => {
    client.disconnect();
    // Kirim 101 event untuk melebihi batas MAX_BUFFER_SIZE (100)
    for (let i = 0; i < 101; i++) {
      const envelope = createMockEnvelope(`event-test-004-full-${i}`);
      await client.handleIncomingEvent(envelope);
    }
    assert.strictEqual(client.getOfflineBufferSize(), 100, "Buffer tidak melebihi batas maksimum");
  });

  it('test_005: Event yang kedaluwarsa ditolak (expiry validation)', async () => {
    await client.connect("mqtts://test.broker.com");
    // Buat event yang sudah kedaluwarsa (-1 jam)
    const envelope = createMockEnvelope("event-test-005-expired", "work-test-001", -3600000);
    const result = await client.handleIncomingEvent(envelope);
    assert.strictEqual(result.success, false, "Event kedaluwarsa ditolak");
    assert.strictEqual(result.error, "Event has expired", "Error message sesuai untuk event kedaluwarsa");
  });

  it('test_006: Envelope tidak valid ditolak sebelum di-buffer (pre-buffer validation)', async () => {
    client.disconnect();
    // Buat envelope tanpa logicalWorkId (invalid)
    const invalidEnvelope = createMockEnvelope("event-test-006-invalid") as Partial<ExecutionEnvelope>;
    delete invalidEnvelope.logicalWorkId;
    const result = await client.handleIncomingEvent(invalidEnvelope as ExecutionEnvelope);
    assert.strictEqual(result.success, false, "Envelope invalid ditolak");
    assert.strictEqual(client.getOfflineBufferSize(), 0, "Envelope invalid tidak ditambahkan ke buffer");
  });

  it('EDGE-E-001: test_mqtt_business_evidence_traceability_001: Evidence MQTT tercatat dengan traceability Work dan actor yang benar (P1 FIX: Test hasil bisnis dan evidence)', async () => {
    await client.connect("mqtts://test.broker.com");
    const eventId = crypto.randomUUID();
    const deviceId = "raspberrypi-sensor-001";
    const testEnvelope = createMockEnvelope(eventId);
    testEnvelope.deviceId = deviceId;
    testEnvelope.logicalWorkId = "work-iot-sensor-001";
    testEnvelope.tenantId = "default";
    testEnvelope.workspaceId = "iot-demo";

    // Proses event MQTT
    const processResult = await client.handleIncomingEvent(testEnvelope);
    assert.strictEqual(processResult.success, true, "Event MQTT berhasil diproses");

    // Verifikasi Work terupdate dengan eventId
    const workRepository = getWorkRepositoryPostgres();
    const updatedWork = await workRepository.byWorkId("work-iot-sensor-001");
    const updatedWorkAny = updatedWork as any;
    assert.ok(updatedWorkAny.processedEventIds?.includes(eventId), "eventId MQTT tercatat di processedEventIds Work");

    // Verifikasi evidence durability dan traceability
    const evidenceRepository = getEvidenceRepositoryPostgres();
    const workEvidences = await evidenceRepository.findByWorkId("work-iot-sensor-001");
    assert.ok(workEvidences.length > 0, "Ada evidence MQTT yang dicatat");
    
    const lastEvidence = workEvidences[workEvidences.length - 1];
    const lastEvidenceAny = lastEvidence as any;
    assert.strictEqual(lastEvidenceAny.workId, "work-iot-sensor-001", "Evidence MQTT terikat ke logicalWorkId yang benar");
    assert.strictEqual(lastEvidenceAny.actorId, deviceId, "Evidence MQTT terikat ke deviceId yang benar");
    assert.strictEqual(lastEvidenceAny.eventId, eventId, "Evidence MQTT terikat ke eventId yang benar");
    assert.ok(lastEvidenceAny.checksum, "Evidence MQTT memiliki SHA-256 checksum (safeRecordEvidence durable)");

    // Verifikasi pipeline status sesuai aturan: tidak hanya diterima, tapi diproses
    assert.strictEqual(processResult.pipelineState, "EVENT_PROCESSED", "Status event MQTT EVENT_PROCESSED, bukan hanya diterima");
    
    console.log("[TEST] ✅ Traceability evidence MQTT berhasil: semua field sesuai acceptance criteria");
  });
});