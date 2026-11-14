// @ts-nocheck
import { z } from "zod";
import type { CapabilityCommand } from "../../../../packages/core/kernel/src/types.js";
import { ExecutionEnvelopeSchema, type ExecutionEnvelope } from "../contracts/connector-ecosystem.contracts.js";
import { connectorEcosystemService } from "../services/connector-ecosystem.service.js";

// Skema input untuk transaction.ingest (sesuai dengan kebutuhan DIGIOP-PILOT-001)
// Tidak memodifikasi EOS Core - hanya menggunakan Zod yang sudah ada
const TransactionIngestSchema = z.object({
  paymentGateway: z.string().min(1, "paymentGateway tidak boleh kosong"),
  workId: z.string().uuid("workId harus merupakan UUID yang valid"),
  tenantId: z.string().min(1, "tenantId tidak boleh kosong"),
  workspaceId: z.string().min(1, "workspaceId tidak boleh kosong"),
  actorId: z.string().min(1, "actorId tidak boleh kosong"),
  correlationId: z.string().uuid("correlationId harus merupakan UUID yang valid"),
  metadata: z.object({
    businessName: z.string(),
    businessEmail: z.string(),
    websiteUrl: z.string()
  }).optional()
});

type TransactionIngestInput = z.infer<typeof TransactionIngestSchema>;
type TransactionIngestOutput = {
  success: boolean;
  connectorId?: string;
  integrationStatus?: string;
  error?: string;
};

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

// Perintah untuk mengintegrasikan payment gateway (DIGIOP-PILOT-001 acceptance criteria 3)
// Menggunakan pola yang sama dengan processEdgeEvent, tidak memodifikasi EOS Core
const transactionIngestCommand: CapabilityCommand<TransactionIngestInput, TransactionIngestOutput> = {
  kind: "command",
  capability: "connector-ecosystem",
  name: "transaction.ingest",
  async execute(input: TransactionIngestInput) {
    // Validasi input menggunakan skema yang sudah didefinisikan
    const validated = TransactionIngestSchema.safeParse(input);
    if (!validated.success) {
      throw new Error(`[connector-ecosystem.transaction.ingest] Invalid input: ${validated.error.message}`);
    }
    
    // Gunakan method yang sudah ada di ConnectorEcosystemService untuk inisialisasi koneksi payment gateway
    // Reuse adapter pattern yang sudah ada untuk Midtrans/Xendit/GoPay/ShopeePay
    return await connectorEcosystemService.initializePaymentGateway(input);
  }
};

// Daftar semua perintah connector-ecosystem untuk didaftarkan ke capabilityRegistry
export const connectorCommands = {
  processEdgeEvent: processEdgeEventCommand,
  syncWorkToEdge: syncWorkToEdgeCommand,
  transactionIngest: transactionIngestCommand
};