// @ts-nocheck
import { z } from "zod";
import type { DeviceId, WorkId } from "../../../work-core/contracts/work.contracts.js";

// Buat schema Zod secara lokal karena tidak diexport dari work-core.contracts (sesuai freeze EOS Core)
// Pattern: string() dengan validasi UUID/pola yang sesuai dengan DeviceId/WorkId yang dihasilkan newWorkId/newDeviceId
export const workIdSchema = z.string().regex(/^work-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, "workId harus mengikuti pola work-<UUID>");
export const deviceIdSchema = z.string().regex(/^device-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, "deviceId harus mengikuti pola device-<UUID>");

export const ConnectorDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  direction: z.enum(["export", "sync", "inbound-outbound", "bidirectional"]),
  target: z.string(),
  description: z.string(),
});

export type ConnectorDefinition = z.infer<typeof ConnectorDefinitionSchema>;

export const ConnectorSyncResultSchema = z.object({
  connectorId: z.string(),
  status: z.enum(["completed", "failed"]),
  exportedCount: z.number().int().min(0),
  payload: z.record(z.unknown()),
});

export type ConnectorSyncResult = z.infer<typeof ConnectorSyncResultSchema>;

// ExecutionEnvelope: Kontrak universal untuk semua event dari perangkat edge
// Mempertahankan Work continuity dan traceability untuk setiap eksekusi
// Zod schema untuk validasi runtime sesuai dengan koreksi blueprint produksi
export const ExecutionEnvelopeSchema = z.object({
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must follow semver format"),
  eventId: z.string().uuid("eventId must be a valid UUID untuk deduplikasi idempotensi"),
  logicalWorkId: workIdSchema,
  deviceId: deviceIdSchema,
  tenantId: z.string().optional(), // Ditambahkan untuk edge runtime sync
  workspaceId: z.string().optional(), // Ditambahkan untuk edge runtime context isolation
  sessionId: z.string().min(1, "sessionId tidak boleh kosong, harus berupa string yang valid"), // Wajib: memenuhi schema evidence-registry.record
  intent: z.object({
    type: z.string().min(1, "intent.type tidak boleh kosong, harus dipetakan ke capability yang terdaftar"),
    payload: z.unknown(),
  }),
  causationId: z.string().uuid().optional(),
  correlationId: z.string().uuid("correlationId harus valid UUID untuk end-to-end traceability"),
  issuedAt: z.string().datetime("issuedAt harus ISO 8601 timestamp yang valid"),
  expiresAt: z.string().datetime().optional(),
});

export type ExecutionEnvelope = z.infer<typeof ExecutionEnvelopeSchema>;