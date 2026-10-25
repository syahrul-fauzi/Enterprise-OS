const fs = require('fs');
const path = require('path');

const filePath = '/root/Enterprise-OS/workspace/apps/edge/src/websocket-adapter.service.ts';
const content = fs.readFileSync(filePath, 'utf8');

// Buat perubahan yang diperlukan
const oldSignature = 'public async processIncomingAudioEvent(envelope: ExecutionEnvelope, audioMetadata: { sessionId: string; isVadTrigger: boolean; opusEncoded: boolean }): Promise<{ success: boolean; error?: string }> {';
const newSignature = 'public async processIncomingAudioEvent(envelope: ExecutionEnvelope, audioMetadata: { sessionId: string; isVadTrigger: boolean; opusEncoded: boolean; deviceInfo?: Esp32s3DeviceInfo }): Promise<{ success: boolean; error?: string; capabilitiesValid?: boolean; capabilityErrors?: string[] }> {';

const oldComment3 = '    // 3. Tambahkan event ke set deduplikasi';
const newComment3 = `    // 3. Validasi kemampuan perangkat ESP32-S3 sebelum memproses (EDGE-001-002 Tahap 1 requirement)
    let capabilitiesValidation = { valid: true, errors: [] as string[] };
    if (audioMetadata.deviceInfo) {
      capabilitiesValidation = MockWebSocketClient.validateEsp32s3Capabilities(audioMetadata.deviceInfo);
      
      // Catat evidence jika validasi gagal
      if (!capabilitiesValidation.valid) {
        console.error(\`[WebSocket Adapter] Validasi kemampuan perangkat gagal: \${capabilitiesValidation.errors.join(", ")}\`);
        await safeRecordEvidence({
          eventId: envelope.eventId,
          logicalWorkId: envelope.logicalWorkId,
          deviceId: this.deviceId,
          status: "DEVICE_CAPABILITY_INVALID",
          timestamp: new Date().toISOString(),
          metadata: { 
            capabilityErrors: capabilitiesValidation.errors,
            deviceInfo: audioMetadata.deviceInfo
          }
        });
        return { 
          success: false, 
          error: "Device capability validation failed", 
          capabilitiesValid: false, 
          capabilityErrors: capabilitiesValidation.errors 
        };
      }
    }

    // 4. Tambahkan event ke set deduplikasi`;

const oldComment4 = '    // 4. Proses intent audio ke work yang sah (reuse capability registry dan intent understanding)';
const newComment4 = '    // 5. Proses intent audio ke work yang sah (reuse capability registry dan intent understanding)';

// Terapkan perubahan
let updatedContent = content.replace(oldSignature, newSignature);
updatedContent = updatedContent.replace(oldComment3, newComment3);
updatedContent = updatedContent.replace(oldComment4, newComment4);

// Simpan file yang diperbarui
fs.writeFileSync(filePath, updatedContent);
console.log('✅ Perubahan berhasil diterapkan pada websocket-adapter.service.ts');
console.log('📝 Perubahan yang dibuat:');
console.log('   1. Menambahkan parameter deviceInfo?: Esp32s3DeviceInfo ke processIncomingAudioEvent');
console.log('   2. Menambahkan return types capabilitiesValid dan capabilityErrors');
console.log('   3. Menambahkan validasi ESP32-S3 capabilities sebelum pemrosesan event');
console.log('   4. Menyertakan evidence recording untuk validasi yang gagal');