/**
 * Work Actions Feature — Transition Commands for Work Reality Surface
 * implements EOS FACE WF-001: Transition feature for /work/[id] route
 * MB-01 compliant: updates only canonical WorkAggregate via canonical repository
 */

import type { WorkIdentity, WorkState } from '@repo/presentation-entities';
// MB-01 compliant: use relative paths from src/work to root (src/work is 4 levels deep: packages/presentation/features/src/work)
// ../../../../../ goes up 4 levels to workspace root (packages/presentation/features/src/work → go up 4 times: packages/ → workspace root), then into capabilities/work-core
// HAPUS IMPOR SERVER-SIDE DARI CLIENT COMPONENT - hanya boleh import types saja!
import type { ActorId, WorkAggregate, WorkStatusEnum } from "../../../../../capabilities/work-core/contracts/work.contracts";
// Jangan import WorkRepositoryPostgres (server-side) ke client component!
// import { WorkRepositoryPostgres, getWorkRepositoryPostgres } from "../../../../../capabilities/work-core/implementation/repository/work-postgres.repository";

export type WorkTransitionCommand = 
  | 'review'
  | 'approve'
  | 'assign'
  | 'escalate'
  | 'complete'
  | 'block'
  | 'record_value';

export interface WorkTransitionRequest {
  readonly workId: string;
  readonly command: WorkTransitionCommand;
  readonly actorId: string;
  readonly note?: string;
  readonly economicValue?: EconomicValue;
}

export interface WorkTransitionResult {
  readonly success: boolean;
  readonly newState: WorkState;
  readonly activityId: string;
  readonly stateHistoryLength: number;
}

/**
 * executeTransition — RL2-001 compliant core work action logic
 * implements full state tracking with actor attribution and evidence
 * maps to EOS FACE: features/work-actions capability
 */
// RL3-001: Add economic value type for value recording
export interface EconomicValue {
  amount: number;
  currency: string;
  valueType: "cost_savings" | "revenue_generated" | "risk_mitigation" | "efficiency_gain";
  evidence?: string;
}

export async function executeTransition(
  work: WorkIdentity,
  currentState: WorkState,
  request: WorkTransitionRequest
): Promise<WorkTransitionResult> {
  // 3-LEVEL ARCHITECTURE COMPLIANT: Client-side component hanya boleh memanggil API, TIDAK BOLEH import server-side repository!
  // Semua transisi state harus melalui API endpoint /api/work/[id] yang server-side, bukan dari client component
  
  // Client-side logic: hanya POST request ke API endpoint - NO DIRECT DB ACCESS!
  const response = await fetch(`/api/work/${work.workId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      command: request.command,
      actorId: request.actorId,
      note: request.note,
      economicValue: request.economicValue
    })
  });

  if (!response.ok) {
    throw new Error(`Work transition failed: ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`[GATE-2 EXECUTION] Transition executed via API: ${request.command} for work ${request.workId} by actor ${request.actorId}`);

  return {
    success: true,
    newState: {
      ...currentState,
      currentState: result.newState || currentState.currentState,
      nextAction: result.nextAction || currentState.nextAction
    },
    activityId: `activity-${Date.now()}`,
    stateHistoryLength: result.stateHistoryLength || 0
  };
}