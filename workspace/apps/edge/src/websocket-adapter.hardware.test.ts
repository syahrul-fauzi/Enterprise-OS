import { describe, it, expect, vi } from 'vitest';
import { MockWebSocketClient } from './websocket-adapter.service';
import { createDeviceId } from '@capabilities/work-core';

// Perbaiki module cycle dengan import tunggal file test ini saja
describe('EDGE-DEVICE-001-P1: Resolusi Gap Local Safety Check Fisik', () => {
  it('P1-001: test_sensor_reads_actual_hardware_values', async () => {
    const client = new MockWebSocketClient('wss://localhost:8080');
    
    // Verifikasi hardware abstraction terpasang pada deviceId
    expect(client['deviceId'].hardware).toBeDefined();
    expect(typeof client['deviceId'].hardware?.readTemperature).toBe('function');
    expect(typeof client['deviceId'].hardware?.isEmergencyStopActive).toBe('function');
    
    // Baca nilai sensor nyata (simulasi driver ESP32S3)
    const temp = await client['deviceId'].hardware?.readTemperature();
    const energy = await client['deviceId'].hardware?.readEnergyConsumption();
    const emergencyStop = await client['deviceId'].hardware?.isEmergencyStopActive();
    
    // Verifikasi nilai sensor sesuai dengan yang diharapkan
    expect(temp).toBe(42.3); // Nilai simulasi dari readPhysicalSensorTemperature
    expect(energy).toBe(450);
    expect(emergencyStop).toBe(false);
    
    // Verifikasi maxTemperature dari spesifikasi hardware (line 153 websocket-adapter.service.ts)
    expect(client['deviceId'].hardware?.maxTemperature).toBe(85);
  });

  it('P1-002: test_safety_check_blocks_on_temperature_violation', async () => {
    const client = new MockWebSocketClient('wss://localhost:8080');
    
    // Mock suhu sensor melebihi maxTemperature (85°C)
    vi.spyOn(client['deviceId'].hardware!, 'readTemperature').mockResolvedValue(92.1);
    
    // Jalankan checkLocalSafety dengan input mock - tambahkan 'action' ke boundaryCheck sesuai kontrak checkAutonomyBoundary
    const safetyResult = await client.checkLocalSafety({
      actuatorId: 'actuator-001',
      currentJoules: 0,
      maxJoules: 1000,
      currentTemperature: 0,
      maxTemperature: 85,
      emergencyStopActive: false,
      boundaryCheck: { 
        action: "edge.audio.process", // Tambahkan action yang dibutuhkan checkAutonomyBoundary
        allowed: [], 
        prohibited: [],
        capability: "edge.audio.process", 
        workspaceId: "factory-workspace.002", 
        tenantId: "tenant.anonymous" 
      }
    }, "edge-device-001");
    
    // Verifikasi safety check mendeteksi pelanggaran suhu
    expect(safetyResult.ok).toBe(false);
    expect(safetyResult.safetyViolations).toContain('TEMPERATURE_OVERLOAD: Suhu aktuator 92.1°C melebihi batas maksimal 85°C');
    expect(safetyResult.canExecutePhysicalAction).toBe(false);
  });

  it('P1-003: test_safety_check_blocks_on_emergency_stop', async () => {
    const client = new MockWebSocketClient('wss://localhost:8080');
    
    // Mock emergency stop aktif (GPIO 34 HIGH pada ESP32S3)
    vi.spyOn(client['deviceId'].hardware!, 'isEmergencyStopActive').mockResolvedValue(true);
    
    const safetyResult = await client.checkLocalSafety({
      actuatorId: 'actuator-001',
      currentJoules: 0,
      maxJoules: 1000,
      currentTemperature: 42.3,
      maxTemperature: 85,
      emergencyStopActive: false,
      boundaryCheck: { 
        action: "edge.audio.process",
        allowed: [], 
        prohibited: [],
        capability: "edge.audio.process", 
        workspaceId: "factory-workspace.002", 
        tenantId: "tenant.anonymous" 
      }
    }, "edge-device-001");
    
    expect(safetyResult.ok).toBe(false);
    expect(safetyResult.safetyViolations).toContain('EMERGENCY_STOP_ACTIVE: Tombol darurat aktif, tindakan fisik tidak dapat dieksekusi');
  });

  it('P1-004: test_hardware_abstraction_reuses_sensor_read_capability', async () => {
    // Verifikasi capability "sensor.read" yang sudah ada di codebase dapat digunakan
    const client = new MockWebSocketClient('wss://localhost:8080');
    const consoleSpy = vi.spyOn(console, 'log');
    
    await client['deviceId'].hardware?.readTemperature();
    
    // Verifikasi log pembacaan sensor dari hardware (sesuai implementasi readPhysicalSensorTemperature)
    expect(consoleSpy).toHaveBeenCalledWith('[edge-001] Membaca suhu aktual dari DHT22 sensor (GPIO 21...');
  });

  // EDGE-B-001: Test end-to-end event-to-Work path untuk work-thermometer-001 (Gate B requirement)
  it('EDGE-B-001: test_process_temperature_event_end_to_end', async () => {
    const client = new MockWebSocketClient('wss://localhost:8080');
    const validEnvelope = {
      eventId: 'temp-event-001',
      deviceId: 'edge-device-001',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(), // Expired besok
      logicalWorkId: 'work-thermometer-001',
      tenantId: 'default-tenant',
      workspaceId: 'edge-demo',
      intent: {
        name: 'pantau_suhu_server',
        payload: { temperature: 42.3 }
      }
    };
    const sensorMetadata = {
      sessionId: 'session-001',
      sensorType: 'DHT22' as const,
      deviceInfo: { model: 'ESP32S3', firmware: '1.0.0' }
    };

    // Mock workRepository.byWorkId untuk mengembalikan Work yang valid
    const mockWork = {
      id: 'work-internal-001',
      workId: 'work-thermometer-001',
      tenantId: 'default-tenant',
      workspaceId: 'edge-demo',
      status: 'ACTIVE',
      version: 1,
      processedEventIds: []
    };
    vi.spyOn(client['getWorkRepository'](), 'byWorkId').mockResolvedValue(mockWork);
    vi.spyOn(client['getWorkRepository'](), 'atomicClaim').mockResolvedValue(true);
    vi.spyOn(client['getWorkRepository'](), 'update').mockResolvedValue({ ...mockWork, status: 'MONITORING' });

    // Jalankan processTemperatureReadingEvent
    const result = await client.processTemperatureReadingEvent(validEnvelope, sensorMetadata);

    // Verifikasi semua layer execution contract terpenuhi (eos-product-slice 9 layers)
    expect(result.success).toBe(true);
    expect(result.pipelineState).toBe('COMPLETED'); // Enum EventPipelineState.COMPLETED
    expect(result.workUpdate?.status).toBe('MONITORING'); // State transition ACTIVE→MONITORING berhasil

    // Verifikasi safeRecordEvidence dipanggil dengan parameter yang benar
    const safeRecordSpy = vi.spyOn(await import('@capabilities/work-core'), 'safeRecordEvidence');
    expect(safeRecordSpy).toHaveBeenLastCalledWith(expect.objectContaining({
      eventId: 'temp-event-001',
      logicalWorkId: 'work-thermometer-001',
      status: 'TEMPERATURE_READING_PROCESSED',
      capability: 'edge-device-001',
      command: 'temperature.process'
    }));
  });
});