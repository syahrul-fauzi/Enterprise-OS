// @ts-nocheck
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { recordRuntimeInvocation } from "./invocation-evidence.js";

interface WorkHandoffEnvelope {
  work_id: string;
  source_actor_id: string;
  target_actor_id: string;
  timestamp: string;
}

// In-memory store untuk envelope yang sedang di-handoff (hanya untuk unblocking, nanti pindah ke persistence)
const handoffStore = new Map<string, WorkHandoffEnvelope>();

/**
 * handoff_work - Memindahkan Work dari source_actor ke target_actor
 * Hanya menyimpan envelope, tidak membuat Work baru
 */
export async function handoff_work(envelope: WorkHandoffEnvelope): Promise<boolean> {
    console.log(`[core-runtime/work-continuity] 🔄 Handoff work ${envelope.work_id} dari ${envelope.source_actor_id} ke ${envelope.target_actor_id}`);
    
    // Validasi dasar: Work ID tidak boleh kosong
    if (!envelope.work_id || !envelope.source_actor_id || !envelope.target_actor_id) {
        console.error(`[core-runtime/work-continuity] ❌ Invalid handoff envelope: missing required fields`);
        return false;
    }
    
    // Simpan envelope untuk diambil oleh target_actor
    handoffStore.set(envelope.work_id, envelope);
    
    // Record evidence ke invocation-evidence (reuse existing primitive)
    try {
        await recordRuntimeInvocation({
            capabilityId: "work-continuity",
            operationId: "handoff",
            sourceRef: "core-runtime/work-continuity",
            success: true,
            input: envelope,
            result: { workId: envelope.work_id, sourceActorId: envelope.source_actor_id, targetActorId: envelope.target_actor_id },
            work_id: envelope.work_id
        });
    } catch (err) {
        // Jangan block handoff jika evidence recording gagal
        console.warn(`[core-runtime/work-continuity] ⚠️ Could not record invocation evidence: ${err}`);
    }
    
    return true;
}

/**
 * receive_work - Target actor menerima Work yang di-handoff
 * Mengambil envelope dari store, verifikasi keaslian
 */
export function receive_work(workId: string, sourceActorId: string): WorkHandoffEnvelope | null {
    console.log(`[core-runtime/work-continuity] 📥 Attempting to receive work ${workId} from ${sourceActorId}`);
    
    const envelope = handoffStore.get(workId);
    
    if (!envelope) {
        console.warn(`[core-runtime/work-continuity] ⚠️ No handoff envelope found for work ${workId}`);
        return null;
    }
    
    if (envelope.source_actor_id !== sourceActorId) {
        console.error(`[core-runtime/work-continuity] ❌ Source actor mismatch: expected ${envelope.source_actor_id}, got ${sourceActorId}`);
        return null;
    }
    
    console.log(`[core-runtime/work-continuity] ✅ Work ${workId} received successfully from ${sourceActorId}`);
    return envelope;
}

/**
 * list_handoffs - Daftar semua handoff yang tersedia
 */
export function list_handoffs(): WorkHandoffEnvelope[] {
    return Array.from(handoffStore.values());
}

/**
 * clear_handoff - Hapus handoff setelah diterima
 */
export function clear_handoff(workId: string): boolean {
    return handoffStore.delete(workId);
}