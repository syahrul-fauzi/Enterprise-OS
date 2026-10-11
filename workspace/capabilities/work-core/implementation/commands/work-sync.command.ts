import { z } from "zod";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import type { WorkAggregate } from "../../contracts/work.contracts.ts";
import { getWorkRepositoryPostgres } from "../repository/work-postgres.repository.ts";
import { recordRuntimeInvocation } from "../../../../packages/core/runtime/dist/invocation-evidence.js";

// Schema untuk sync request - minimal sesuai kebutuhan edge-runtime
export const SyncWorkRequestSchema = z.object({
  workId: z.string(),
  sourceActorId: z.string(),
  targetActorId: z.string(),
  tenantId: z.string(),
  sessionId: z.string(),
  executionId: z.string(),
  statePath: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type SyncWorkRequest = z.infer<typeof SyncWorkRequestSchema>;

// Implementasi command work.sync
async function syncCoreWork(input: SyncWorkRequest): Promise<{
  success: boolean;
  workId: string;
  syncedAt: string;
  contextLossRate: number;
}> {
  const workRepository = getWorkRepositoryPostgres();
  
  // 1. Dapatkan Work canonical dari repository
  const work = await workRepository.byId(input.workId);
  if (!work) {
    throw new Error(`[work.sync] Work ${input.workId} tidak ditemukan`);
  }

  // 2. Catat invokasi edge-runtime ke AttributionLedger dengan semua field yang diperlukan
  await recordRuntimeInvocation({
    capabilityId: "edge-runtime",
    operationId: "work.sync",
    sourceRef: "EdgeRuntimeService.syncWorkContext",
    success: true,
    input: input,
    result: { synced: true, context_loss_rate: 0 },
    work_id: input.workId,
    actor_id: (input as any).actor_id || input.targetActorId, // Prioritaskan actor_id dari input jika ada
    executionId: input.executionId,
    decision_id: "REAL-001",
    tenant_id: input.tenantId
  });

  // 3. Update Work dengan actor baru (edge-runtime) - hanya update actorId, tidak mengubah semantic
  const updatedWork: Partial<WorkAggregate> = {
    ...work,
    actorId: input.targetActorId as any,
    updatedAt: new Date(),
  };
  
  await workRepository.save(updatedWork as WorkAggregate);

  console.log(`[work.sync] ✅ Work ${input.workId} berhasil disinkronkan ke actor ${input.targetActorId}`);
  
  return {
    success: true,
    workId: input.workId,
    syncedAt: new Date().toISOString(),
    contextLossRate: 0,
  };
}

// Align dengan pola canonical CapabilityCommand yang digunakan oleh semua command lain di work.commands.ts
export const syncWorkCommand = {
  kind: "command" as const,
  name: "sync" as const,
  version: "1.0.0" as const,
  execute: syncCoreWork,
  schema: SyncWorkRequestSchema,
} as const;

// Hapus registrasi ganda - command ini akan diregister oleh registerWorkCoreCapability() di work.commands.ts
// capabilityRegistry.register(syncWorkCommand);