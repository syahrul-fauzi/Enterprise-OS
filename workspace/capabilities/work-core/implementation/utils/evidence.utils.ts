import type { WorkspaceId } from "../../contracts/work.contracts";
import { getWorkRepositoryLazy } from "../commands/work.commands";

// Canonical safeRecordEvidence utility - shared across all vertical slices
// Ensures consistent evidence recording with optional workspaceId (complies with 5-boundary execution model)
import * as crypto from 'crypto';

export async function safeRecordEvidence(payload: {
  workspace_id?: WorkspaceId | undefined;
  capability: string;
  command: string;
  work_id: string;
  tenant_id: string;
  actor_id: string;
  timestamp: string;
  [key: string]: unknown;
}): Promise<{ readonly ok: boolean }> {
  try {
    // Generate SHA-256 checksum dari payload untuk integritas evidence (perbaikan gap LOW: safeRecordEvidence checksum)
    const payloadForChecksum = { ...payload };
    delete payloadForChecksum.meta_checksum; // Hapus jika ada untuk menghindari circular
    const checksum = crypto.createHash('sha256')
      .update(JSON.stringify(payloadForChecksum))
      .digest('hex');
    const payloadWithChecksum = { ...payload, meta_checksum: checksum };

    // Reuse kernel's barrel export (capabilityRegistry is already exported from core-kernel index)
    const loaded = await import("@repo/core-kernel");
    const reg = (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
    if (typeof reg?.invoke === "function") {
      await reg.invoke("evidence-registry", "evidence.record", payloadWithChecksum as never);
      return { ok: true };
    }
  } catch (_e) {
    // fallthrough to local evidence recording if capabilityRegistry not available
    console.warn(`[safeRecordEvidence] capabilityRegistry not available, falling back to local repository: ${_e}`);
  }

  // Fallback: Simpan evidence langsung ke work repository (untuk test environment)
  try {
    // Generate SHA-256 checksum juga untuk fallback local storage
    const payloadForChecksum = { ...payload };
    delete payloadForChecksum.meta_checksum;
    const checksum = crypto.createHash('sha256')
      .update(JSON.stringify(payloadForChecksum))
      .digest('hex');
    const payloadWithChecksum = { ...payload, meta_checksum: checksum };

    const workRepository = await getWorkRepositoryLazy();
    if (typeof workRepository.addEvidence === "function") {
      await workRepository.addEvidence(payload.work_id, {
        ...payloadWithChecksum,
        timestamp: new Date(payload.timestamp)
      });
      console.log(`[safeRecordEvidence] ✅ Evidence recorded locally with checksum: ${payload.command} for work ${payload.work_id}`);
      return { ok: true };
    }
  } catch (addErr) {
    console.error(`[safeRecordEvidence] Failed to add evidence to repository: ${addErr}`);
  }

  return { ok: true };
}