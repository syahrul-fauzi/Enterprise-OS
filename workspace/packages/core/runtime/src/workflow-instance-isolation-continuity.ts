import { getNow } from "@repo/core-kernel/time/time.provider.js";
export interface WorkflowInstanceIsolationSession {
  workflowInstanceSessionId: string;
  workflowInstanceDefinitionId: string;
  status: 'active' | 'suspended' | 'resumed' | 'terminated';
  isolationHash: string;
  createdAt: string;
  lastResumedAt?: string;
  evidence: Array<{
    operation: string;
    timestamp: string;
    actor: string;
  }>;
}

export class WorkflowInstanceIsolationContinuityService {
  private sessions: Map<string, WorkflowInstanceIsolationSession> = new Map();

  createWorkflowInstanceIsolationSession(workflowInstanceDefinitionId: string, actor: string): WorkflowInstanceIsolationSession {
    const workflowInstanceSessionId = `wi-sess-${getNow().getTime()}-${Math.random().toString(36).substring(2, 10)}`;
    const session: WorkflowInstanceIsolationSession = {
      workflowInstanceSessionId,
      workflowInstanceDefinitionId,
      status: 'active',
      isolationHash: `wi-hash-${workflowInstanceDefinitionId}-${getNow().getTime()}`,
      createdAt: getNow().toISOString(),
      evidence: [
        {
          operation: 'createWorkflowInstanceIsolationSession',
          timestamp: getNow().toISOString(),
          actor
        }
      ]
    };
    this.sessions.set(workflowInstanceSessionId, session);
    return session;
  }

  suspendWorkflowInstanceIsolationSession(workflowInstanceSessionId: string, actor: string): WorkflowInstanceIsolationSession | undefined {
    const session = this.sessions.get(workflowInstanceSessionId);
    if (session) {
      session.status = 'suspended';
      session.evidence.push({
        operation: 'suspendWorkflowInstanceIsolationSession',
        timestamp: getNow().toISOString(),
        actor
      });
      this.sessions.set(workflowInstanceSessionId, session);
    }
    return session;
  }

  resumeWorkflowInstanceIsolationSession(workflowInstanceSessionId: string, actor: string): WorkflowInstanceIsolationSession | undefined {
    const session = this.sessions.get(workflowInstanceSessionId);
    if (session) {
      session.status = 'resumed';
      session.lastResumedAt = getNow().toISOString();
      session.evidence.push({
        operation: 'resumeWorkflowInstanceIsolationSession',
        timestamp: getNow().toISOString(),
        actor
      });
      this.sessions.set(workflowInstanceSessionId, session);
    }
    return session;
  }

  verifyWorkflowInstanceIsolationContinuity(workflowInstanceSessionId: string): { valid: boolean; session?: WorkflowInstanceIsolationSession } {
    const session = this.sessions.get(workflowInstanceSessionId);
    if (session) {
      return { valid: true, session };
    }
    return { valid: false };
  }
}