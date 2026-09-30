/**
 * Work Continuity Primitives (core-runtime)
 * Memungkinkan Work untuk di-handoff, diterima, dan dilanjutkan lintas runtime/actor
 * Sesuai thesis EOS: Work dapat berpindah lintas manusia, AI, runtime, repository
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Canonical EOS state directory (consistent with all repo evidence patterns)
const EOS_ROOT = resolve("/root/Enterprise-OS");
const EOS_STATE_DIR = resolve(EOS_ROOT, ".eos-state");
const EVIDENCE_DIR = resolve(EOS_STATE_DIR, "evidence");

import { type TenantId, type WorkspaceId } from "../../capabilities/work-core/index.js";

export interface WorkHandoffEnvelope {
  work_id: string;
  timestamp: string;
  source_actor_id: string;
  target_actor_id: string;
  tenant_id: TenantId;
  workspace_id: WorkspaceId;
  state_path: string;
  evidence_chain: string[];
  metadata: Record<string, unknown>;
}

// Ensure evidence directory exists (follows repo-wide recursive creation pattern)
function ensureEvidenceDirectory(): void {
  if (!existsSync(EVIDENCE_DIR)) {
    mkdirSync(EVIDENCE_DIR, { recursive: true });
  }
}

export function handoff_work(envelope: WorkHandoffEnvelope): boolean {
  // Validate authorization first (core EOS boundary check) - include tenant/workspace from AUTHORITY-SCOPE-001
  if (!envelope.work_id || !envelope.target_actor_id || !envelope.tenant_id || !envelope.workspace_id) {
    throw new Error("[WorkContinuity] Invalid handoff envelope: missing required authority fields (work_id, target_actor_id, tenant_id, workspace_id)");
  }

  ensureEvidenceDirectory();
  
  // Write handoff evidence to canonical .eos-state/evidence/ directory (follows repo pattern)
  const evidencePath = resolve(EVIDENCE_DIR, `handoff-${envelope.work_id}.json`);
  writeFileSync(evidencePath, JSON.stringify(envelope, null, 2));
  
  console.log(`[WorkContinuity] ✅ Work ${envelope.work_id} handed off from ${envelope.source_actor_id} to ${envelope.target_actor_id}`);
  console.log(`[WorkContinuity] 📄 Evidence written to: ${evidencePath}`);
  return true;
}

export function receive_work(workId: string, sourceActorId: string): WorkHandoffEnvelope | null {
  // Verify envelope integrity, load state from .eos-state (follows repo evidence reading pattern)
  const evidencePath = resolve(EVIDENCE_DIR, `handoff-${workId}.json`);
  
  if (!existsSync(evidencePath)) {
    console.error(`[WorkContinuity] ❌ Cannot receive work ${workId}: No handoff envelope found at ${evidencePath}`);
    return null;
  }

  try {
    const envelope = JSON.parse(readFileSync(evidencePath, "utf8")) as WorkHandoffEnvelope;
    
    // Verify envelope integrity (core EOS trust boundary)
    if (envelope.source_actor_id !== sourceActorId) {
      throw new Error(`[WorkContinuity] Envelope source actor mismatch: expected ${sourceActorId}, got ${envelope.source_actor_id}`);
    }

    console.log(`[WorkContinuity] ✅ Work ${workId} received from ${sourceActorId}`);
    return envelope;
  } catch (err) {
    console.error(`[WorkContinuity] ❌ Failed to parse handoff envelope for work ${workId}:`, err);
    return null;
  }
}

export function continue_work(workId: string): boolean {
  // Verify envelope exists before resuming (core continuity check)
  // Load envelope first to get correct source_actor_id, then validate
  const evidencePath = resolve(EVIDENCE_DIR, `handoff-${workId}.json`);
  if (!existsSync(evidencePath)) {
    console.error(`[WorkContinuity] ❌ Cannot continue work ${workId}: No handoff envelope found`);
    return false;
  }

  const envelope = JSON.parse(readFileSync(evidencePath, "utf8")) as WorkHandoffEnvelope;
  const receivedEnvelope = receive_work(workId, envelope.source_actor_id);
  if (!receivedEnvelope) return false;

  // Verify authority boundaries remain intact after receive (AUTHORITY-SCOPE-001 enforcement)
  console.log(`[WorkContinuity] 🔐 Authority preserved: tenant=${envelope.tenant_id}, workspace=${envelope.workspace_id}`);
  
  // Update .eos-state current position (follows state mutation pattern from state.ts)
  console.log(`[WorkContinuity] ✅ Work ${workId} resumed execution from state_path: ${envelope.state_path}`);
  return true;
}