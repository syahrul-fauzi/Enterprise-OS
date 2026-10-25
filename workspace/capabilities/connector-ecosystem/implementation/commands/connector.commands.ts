import { z } from "zod";
import type { CapabilityCommand } from "../../../../packages/core/kernel/src/types.js";
import { ExecutionEnvelopeSchema, type ExecutionEnvelope } from "../contracts/connector-ecosystem.contracts.js";
import { connectorEcosystemService } from "../services/connector-ecosystem.service.js";

// Perintah untuk memproses event masuk dari perangkat edge
// Mempertahankan Work continuity dan validasi ExecutionEnvelope universal
const processEdgeEventCommand: CapabilityCommand<ExecutionEnvelope, { success: boolean; workId?: string; error?: string }> = {
  kind: "command",
  capability: "connector-ecosystem",
  name: "processEdgeEvent",
  async execute(input: ExecutionEnvelope) {
    // Validasi ExecutionEnvelope menggunakan schema yang sudah ada (tidak perlu fungsi terpisah)
    const validated = ExecutionEnvelopeSchema.safeParse(input);
    if (!validated.success) {
      throw new Error(`[connector-ecosystem.processEdgeEvent] Invalid ExecutionEnvelope: ${validated.error.message}`);
    }
    // Gunakan method yang sudah ada di ConnectorEcosystemService untuk memproses event
    return await connectorEcosystemService.processIncomingEdgeEvent(input);
  }
};

// Perintah untuk mensinkronkan status Work ke perangkat edge
// Menerapkan bidirectional sync sesuai dengan koreksi blueprint MQTT QoS 1
const syncWorkToEdgeCommand: CapabilityCommand<
  { workId: string; deviceId: string; status: string; correlationId: string },
  { success: boolean; error?: string }
> = {
  kind: "command",
  capability: "connector-ecosystem",
  name: "syncWorkToEdge",
  async execute(input: { workId: string; deviceId: string; status: string; correlationId: string }) {
    // Gunakan method yang sudah ada di ConnectorEcosystemService untuk sinkronisasi
    return await connectorEcosystemService.syncWorkToEdgeDevice(input);
  }
};

// Daftar semua perintah connector-ecosystem untuk didaftarkan ke capabilityRegistry
export const connectorCommands = {
  processEdgeEvent: processEdgeEventCommand,
  syncWorkToEdge: syncWorkToEdgeCommand
};