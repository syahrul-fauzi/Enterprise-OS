import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { recordRuntimeInvocation } from "../../../../packages/core/runtime/src/index.js";
import { SessionRepositoryPostgres } from "../../../identity/implementation/repositories/session.repository.js";
import { initIdentitySchema } from "../../../identity/implementation/repositories/base.repository.js";

const RecordEvidenceWithContextSchema = z.object({
  entityRef: z.string().min(1),
  entityType: z.string().min(1),
  action: z.string().min(1),
  actorId: z.string().min(1),
  details: z.record(z.string(), z.any()).optional(),
  timestamp: z.string().min(1),
  // Required context for tenant isolation - maintains foundation rails
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
});

type RecordEvidenceWithContextInput = z.infer<typeof RecordEvidenceWithContextSchema>;
type RecordEvidenceCommand = CapabilityCommand<RecordEvidenceWithContextInput, Promise<{ success: boolean; id: string }>>;

export const recordEvidence: RecordEvidenceCommand = {
  kind: "command",
  name: "evidence.record",
  version: "1.0.0",
  async execute(input) {
    await initIdentitySchema();
    
    const parsed = RecordEvidenceWithContextSchema.parse(input);
    const { sessionId, actorId, tenantId, workspaceId, entityRef, entityType, action, details, timestamp } = parsed;

    // 1. Validate session exists and is active (enforce authentication - foundation rail)
    const session = await SessionRepositoryPostgres.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[evidence.record] Invalid or revoked session - authentication violation");
    }

    // 2. Enforce actor match - session actor must match request actor (foundation rail)
    if (session.actorId !== actorId) {
      throw new Error("[evidence.record] Session actor mismatch - authentication violation");
    }

    // 3. Enforce tenant isolation - requested tenant must match session's tenant (foundation rail)
    if (session.tenantId !== tenantId) {
      throw new Error("[evidence.record] Cross-tenant access attempt blocked - security violation");
    }

    // 4. Enforce workspace isolation - requested workspace must match session's workspace (foundation rail)
    if (session.workspaceId !== workspaceId) {
      throw new Error("[evidence.record] Cross-workspace access attempt blocked - security violation");
    }

    // Use existing recordRuntimeInvocation from core-runtime (reuses foundation rail - no new code)
    recordRuntimeInvocation({
      capabilityId: "evidence-registry",
      operationId: "record-evidence",
      sourceRef: "EvidenceRegistryService.recordEvidence",
      success: true,
      input: { entityRef, entityType, action },
      result: {
        recorded: true,
        entityRef,
        entityType,
        action,
        timestamp,
        details: details ?? {}
      },
    });

    return { 
      success: true, 
      id: `evidence-${entityType}-${entityRef}-${Date.now()}` 
    };
  },
};

// Export commands object for registry registration
export const evidenceRegistryCommands = {
  "evidence.record": recordEvidence,
};