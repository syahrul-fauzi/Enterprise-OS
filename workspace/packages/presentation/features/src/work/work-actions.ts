/**
 * Work Actions Feature — Transition Commands for Work Reality Surface
 * implements EOS FACE WF-001: Transition feature for /work/[id] route
 */

import type { WorkIdentity, WorkState } from '@repo/presentation-entities';

export type WorkTransitionCommand = 
  | 'review'
  | 'approve'
  | 'assign'
  | 'escalate'
  | 'complete'
  | 'block';

export interface WorkTransitionRequest {
  readonly workId: string;
  readonly command: WorkTransitionCommand;
  readonly actorId: string;
  readonly note?: string;
}

export interface WorkTransitionResult {
  readonly success: boolean;
  readonly newState: WorkState;
  readonly activityId: string;
}

/**
 * executeTransition — core work action logic
 * maps to EOS FACE: features/work-actions capability
 */
export async function executeTransition(
  work: WorkIdentity,
  currentState: WorkState,
  request: WorkTransitionRequest
): Promise<WorkTransitionResult> {
  // State transition logic sesuai EOS FACE state machine
  const stateTransitions: Record<WorkTransitionCommand, string> = {
    review: 'in_review',
    approve: 'approved',
    assign: 'assigned',
    escalate: 'escalated',
    complete: 'completed',
    block: 'blocked'
  };

  const newStatus = stateTransitions[request.command];
  
  return {
    success: true,
    newState: {
      ...currentState,
      currentState: newStatus,
      nextAction: request.command === 'complete' ? 'None' : 'Review updates'
    },
    activityId: `activity-${Date.now()}`
  };
}