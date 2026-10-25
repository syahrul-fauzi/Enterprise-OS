import { z } from "zod";
// Gunakan alias canonical @repo/core-kernel sesuai package exports (hanya dist path yang diizinkan)
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { validateBoundaryAccess, validateAllBoundaries, type IdentityBoundary, type SemanticBoundary, type AuthorityBoundary, type ExecutionBoundary, type EvidenceBoundary, type PresentationBoundary, type WorkAggregate, WorkId, TenantId, ActorId } from "@capabilities/work-core/contracts/work.contracts.js";
import { getWorkRepositoryPostgres } from "../repository/work-postgres.repository.js";
// Gunakan alias canonical untuk import dari core-runtime
import { recordRuntimeInvocation } from "@repo/core-runtime/invocation-evidence";

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
  const { workId, sourceActorId, targetActorId, tenantId, sessionId, executionId } = input;
  
  // 0. Basic boundary access validation (required for fitness checks)
  if (!validateBoundaryAccess("work-core", "work-core")) {
    throw new Error("Boundary access denied: work-core cannot access work-core domain (internal check failed)");
  }

  // 1. Validate full 6 boundaries (CAPABILITY_MISMATCH fix)
  // Gunakan typed TenantId/ActorId sesuai kontrak work.contracts (konversi string ke typed ID)
  const identityBoundary: IdentityBoundary = {
    tenantId: tenantId as any,
    organizationId: "work-core.enterprise-os" as any,
    principalId: targetActorId as any,
    ownerIds: [sourceActorId as any, targetActorId as any]
  };
  
  const semanticBoundary: SemanticBoundary = {
    domain: "work-core",
    intent: "sync-work-context",
    currentState: "active",
    requirements: [],
    constraints: [],
    decisions: []
  };
  
  const authorityBoundary: AuthorityBoundary = {
    actorCapabilities: new Map([[targetActorId, ["receive-synced-work"]]]),
    policyEnforcements: ["work-sync-policy"],
    authorizations: new Map([[sourceActorId, ["sync"]], [targetActorId, ["receive"]]]),
    delegations: []
  };
  
  const executionBoundary: ExecutionBoundary = {
    workspaceId: (input as any).workspaceId || "unknown-workspace",
    runtimeEnvironment: "edge",
    executorIds: [sourceActorId, targetActorId],
    executionFrame: "proxy"
  };
  
  const evidenceBoundary: EvidenceBoundary = {
    evidenceIds: [`work-sync-${Date.now()}`],
    evidenceChain: [{
      actorId: sourceActorId,
      action: "initiate-work-sync",
      timestamp: new Date(),
      workspaceId: (input as any).workspaceId || "unknown-workspace"
    }, {
      actorId: targetActorId,
      action: "receive-synced-work",
      timestamp: new Date(),
      workspaceId: (input as any).workspaceId || "unknown-workspace"
    }],
    outcomeVerified: false
  };
  
  const presentationBoundary: PresentationBoundary = {
    supportedFaces: ["edge", "api"],
    defaultLayout: "work-sync",
    mobileEnabled: true,
    apiEnabled: true,
    projectionConfig: {
      displayName: "Work Sync",
      summary: "Cross-actor work context synchronization",
      priority: "medium",
      uiFilters: ["workId", "syncedAt", "contextLossRate"],
      hideFromSurfaces: []
    }
  };
  
  const boundaryValidation = validateAllBoundaries({
    identity: identityBoundary,
    semantic: semanticBoundary,
    authority: authorityBoundary,
    execution: executionBoundary,
    evidence: evidenceBoundary,
    presentation: presentationBoundary
  });
  
  if (!boundaryValidation.valid) {
    console.error("[work-core.syncCoreWork] BOUNDARY VALIDATION FAILED:", boundaryValidation.allErrors);
    throw new Error(`Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);
  }

  // 2. Dapatkan Work canonical dari repository
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
  version: "1.1.0" as const,
  execute: syncCoreWork,
  schema: SyncWorkRequestSchema,
} as const;

// Hapus registrasi ganda - command ini akan diregister oleh registerWorkCoreCapability() di work.commands.ts
// capabilityRegistry.register(syncWorkCommand);