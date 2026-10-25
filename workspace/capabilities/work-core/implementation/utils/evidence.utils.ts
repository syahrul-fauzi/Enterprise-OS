import type { WorkspaceId } from "@capabilities/work-core/contracts/work.contracts";
import { getWorkRepositoryLazy } from "../commands/work.commands.js";

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
  sessionId: string; // Wajib untuk memenuhi schema evidence-registry.record
  [key: string]: unknown;
}): Promise<{ readonly ok: boolean }> {
  try {
    // Map payload work-core ke schema evidence-registry yang sesuai (fix input schema mismatch)
    // Sesuai dengan saveEvidence interface di evidence-postgres.repository.ts
    const mappedPayload: any = {
      workId: payload.work_id,
      actorId: payload.actor_id,
      tenantId: payload.tenant_id,
      workspaceId: payload.workspace_id,
      recordType: "work.event",
      metadata: { sourceCapability: payload.capability, command: payload.command, ...payload },
      version: 1,
      name: `evidence-${payload.command}-${Date.now()}`,
      kind: "record",
      scope: "work.execution",
      path: `/evidence/${payload.work_id}/${Date.now()}`,
      meta_checksum: "" // Initialize untuk TypeScript compatibility
    };

    // Generate SHA-256 checksum dari payload untuk integritas evidence (perbaikan gap LOW: safeRecordEvidence checksum)
    const payloadForChecksum = { ...mappedPayload };
    delete payloadForChecksum.meta_checksum; // Hapus jika ada untuk menghindari circular
    const checksum = crypto.createHash('sha256')
      .update(JSON.stringify(payloadForChecksum))
      .digest('hex');
    mappedPayload.meta_checksum = checksum;

    // Reuse kernel's barrel export (capabilityRegistry is already exported from core-kernel index)
    // Gunakan alias canonical @repo/core-kernel sesuai package exports (hanya dist path yang diizinkan)
    const loaded = await import("@repo/core-kernel/registry/capability-command-registry");
    const reg = (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
    if (typeof reg?.invoke === "function") {
      // Perbaikan command key: gunakan "evidence-registry", "record" sesuai dengan key yang terdaftar "evidence-registry.record"
      await reg.invoke("evidence-registry", "record", mappedPayload as never);
      console.log(`[safeRecordEvidence] ✅ Evidence recorded via registry with checksum: ${payload.command} for work ${payload.work_id}`);
      return { ok: true };
    }
  } catch (_e) {
    // fallthrough to local evidence recording if capabilityRegistry not available
    console.warn(`[safeRecordEvidence] capabilityRegistry not available, falling back to local repository: ${(_e as Error).message}`);
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
      // JANGAN override timestamp: method addEvidence sudah menambahkan timestamp sendiri
      await workRepository.addEvidence(payload.work_id, payloadWithChecksum);
      console.log(`[safeRecordEvidence] ✅ Evidence recorded locally with checksum: ${payload.command} for work ${payload.work_id}`);
      return { ok: true };
    } else {
      console.error(`[safeRecordEvidence] ❌ workRepository.addEvidence is not a function! workRepository keys: ${Object.keys(workRepository).join(', ')}`);
    }
  } catch (addErr) {
    console.error(`[safeRecordEvidence] Failed to add evidence to repository: ${addErr}`);
  }

  // Jika kedua mekanisme penyimpanan gagal, return ok: false sesuai kontrak durability (koreksi gap P0: evidence non-durability)
  console.error(`[safeRecordEvidence] CRITICAL: Failed to store evidence via both registry and local repository for work ${payload.work_id}`);
  return { ok: false };
}