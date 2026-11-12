import type { WorkspaceId } from "@capabilities/work-core/contracts/work.contracts";
import { getWorkRepositoryLazy } from "../commands/work.commands.js";

// Canonical safeRecordEvidence utility - shared across all vertical slices
// Ensures consistent evidence recording with MANDATORY workspaceId, sessionId, tenantId (EOS MASTER EVIDENCE REQUIREMENT)
import * as crypto from 'crypto';

const canonicalJson = <T>(value: T): string =>
  JSON.stringify(value, (_key, val) =>
    Array.isArray(val)
      ? val
      : val !== null && typeof val === "object"
        ? Object.fromEntries(
            Object.entries(val as Record<string, unknown>).sort(([a], [b]) =>
              a < b ? -1 : a > b ? 1 : 0,
            ),
          )
        : val,
  );

export async function safeRecordEvidence(payload: {
  workspace_id: WorkspaceId;
  capability: string;
  command: string;
  work_id: string;
  tenant_id: string;
  actor_id: string;
  timestamp: string;
  sessionId: string;
  decision_id?: string;
  executionId?: string;
  context_trace_id?: string;
  [key: string]: unknown;
}): Promise<{ readonly ok: boolean }> {
  // Step 1: Build canonical evidence payload ONCE before any storage path selection
  // This ensures primary and fallback use the EXACT same payload for checksum calculation
  const canonicalPayload = {
    entityRef: payload.work_id,
    entityType: "work",
    action: payload.command,
    actorId: payload.actor_id,
    tenantId: payload.tenant_id,
    workspaceId: payload.workspace_id,
    sessionId: payload.sessionId,
    timestamp: payload.timestamp,
    decision_id: payload.decision_id || "DO-DIGITALGROWTHOPS-001",
    executionId: payload.executionId || crypto.randomUUID(),
    context_trace_id: payload.context_trace_id || crypto.randomUUID(),
    details: { sourceCapability: payload.capability, ...payload }
  };

  // Step 2: Calculate canonical checksum ONCE from the canonical payload using deterministic serialization
  const payloadForChecksum = { ...canonicalPayload };
  const checksum = crypto.createHash('sha256')
    .update(canonicalJson(payloadForChecksum))
    .digest('hex');
  const evidenceWithChecksum = { ...canonicalPayload, meta_checksum: checksum };

  try {
    // Step 3: Attempt primary storage path (Evidence Registry)
    const loaded = await import("@repo/core-kernel/registry/capability-command-registry");
    const reg = (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
    if (typeof reg?.invoke === "function") {
      try {
        // Explicitly await and check the result of registry.invoke
        const registryResult = await reg.invoke("evidence-registry", "record", evidenceWithChecksum as never);
        // Only consider primary successful if the registry returns a success: true result
        if (registryResult && typeof registryResult === 'object' && (registryResult as { success?: boolean }).success === true) {
          console.log(`[safeRecordEvidence] ✅ Evidence recorded via registry with checksum: ${payload.command} for work ${payload.work_id}`);
          return { ok: true };
        } else {
          console.warn(`[safeRecordEvidence] Registry returned non-success result, activating fallback: ${JSON.stringify(registryResult)}`);
        }
      } catch (registryErr) {
        console.warn(`[safeRecordEvidence] Registry threw exception, activating fallback: ${(registryErr as Error).message}`);
      }
    }
  } catch (_e) {
    console.warn(`[safeRecordEvidence] Primary storage path unavailable, falling back to local repository: ${(_e as Error).message}`);
  }

  // Step 4: Fallback storage path (Work Repository) - uses the SAME canonical payload and checksum
  try {
    const workRepository = await getWorkRepositoryLazy();
    if (typeof workRepository.addEvidence === "function") {
      // Use the same canonical payload and checksum as primary path
      await workRepository.addEvidence(payload.work_id, evidenceWithChecksum);
      console.log(`[safeRecordEvidence] ✅ Evidence recorded locally with checksum: ${payload.command} for work ${payload.work_id}`);
      return { ok: true };
    } else {
      console.error(`[safeRecordEvidence] ❌ workRepository.addEvidence is not a function! workRepository keys: ${Object.keys(workRepository).join(', ')}`);
    }
  } catch (addErr) {
    console.error(`[safeRecordEvidence] Failed to add evidence to repository: ${addErr}`);
  }

  // If both storage paths fail, return ok: false according to durability contract
  console.error(`[safeRecordEvidence] CRITICAL: Failed to store evidence via both registry and local repository for work ${payload.work_id}`);
  return { ok: false };
}

// Reconciliation function to sync fallback evidence to registry after outage recovery
export async function reconcileFallbackEvidence(): Promise<{reconciled: number, failed: number}> {
  const workRepository = await getWorkRepositoryLazy();
  const loaded = await import("@repo/core-kernel/registry/capability-command-registry");
  const reg = (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
  
  let reconciled = 0;
  let failed = 0;

  // If registry is not available yet, return all as failed
  if (typeof reg?.invoke !== "function") {
    const allWorks = await workRepository.listAll();
    return {reconciled, failed: allWorks.length};
  }

  // Get all existing works from repository
  const allWorks = await workRepository.listAll();
  for (const work of allWorks) {
    const fallbackEvidence = await workRepository.getEvidence(work.workId);
    for (const entry of fallbackEvidence) {
      try {
        // Idempotency check: only reconcile if entry doesn't already have reconciledAt timestamp
        if (!entry.reconciledAt) {
          // Verify checksum integrity before reconciliation (A3-R08)
          const storedChecksum = entry.meta_checksum;
          if (storedChecksum) {
            const entryForVerification = { ...entry };
            delete entryForVerification.meta_checksum;
            const recalculatedChecksum = crypto.createHash('sha256')
              .update(canonicalJson(entryForVerification))
              .digest('hex');
            if (recalculatedChecksum !== storedChecksum) {
              console.error(`[reconcileFallbackEvidence] ❌ Checksum mismatch for evidence entry on work ${work.workId}, skipping reconciliation`);
              failed++;
              continue;
            }
          }

          // Add reconciledAt timestamp for tracking
          const reconciledEntry = {...entry, reconciledAt: new Date().toISOString()};
          
          // Explicitly check registry result for reconciliation
          const reconcileResult = await reg.invoke("evidence-registry", "record", reconciledEntry);
          if (reconcileResult && typeof reconcileResult === 'object' && (reconcileResult as { success?: boolean }).success === true) {
            // Only update local repository if registry confirms successful storage
            await workRepository.addEvidence(work.workId, reconciledEntry);
            reconciled++;
            console.log(`[reconcileFallbackEvidence] ✅ Successfully reconciled evidence for work ${work.workId}`);
          } else {
            console.warn(`[reconcileFallbackEvidence] Registry rejected reconciliation for work ${work.workId}: ${JSON.stringify(reconcileResult)}`);
            failed++;
          }
        }
      } catch (e) {
        console.error(`[reconcileFallbackEvidence] ❌ Failed to reconcile evidence for work ${work.workId}: ${(e as Error).message}`);
        failed++;
      }
    }
  }

  console.log(`[reconcileFallbackEvidence] 📊 Reconciliation complete: ${reconciled} succeeded, ${failed} failed`);
  return {reconciled, failed};
}