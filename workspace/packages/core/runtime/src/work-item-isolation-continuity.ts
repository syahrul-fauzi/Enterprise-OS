import { getNow } from "@repo/core-kernel/time/time.provider.js";
export interface WorkItemIsolationSession {
  workItemSessionId: string;
  workItemDefinitionId: string;
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

export class WorkItemIsolationContinuityService {
  private sessions: Map<string, WorkItemIsolationSession> = new Map();

  createWorkItemIsolationSession(workItemDefinitionId: string, actor: string): WorkItemIsolationSession {
    const workItemSessionId = `wi-sess-${getNow().getTime()}-${Math.random().toString(36).substring(2, 10)}`;
    const session: WorkItemIsolationSession = {
      workItemSessionId,
      workItemDefinitionId,
      status: 'active',
      isolationHash: `wi-hash-${workItemDefinitionId}-${getNow().getTime()}`,
      createdAt: getNow().toISOString(),
      evidence: [
        {
          operation: 'createWorkItemIsolationSession',
          timestamp: getNow().toISOString(),
          actor
        }
      ]
    };
    this.sessions.set(workItemSessionId, session);
    return session;
  }

  suspendWorkItemIsolationSession(workItemSessionId: string, actor: string): WorkItemIsolationSession | undefined {
    const session = this.sessions.get(workItemSessionId);
    if (session) {
      session.status = 'suspended';
      session.evidence.push({
        operation: 'suspendWorkItemIsolationSession',
        timestamp: getNow().toISOString(),
        actor
      });
      this.sessions.set(workItemSessionId, session);
    }
    return session;
  }

  resumeWorkItemIsolationSession(workItemSessionId: string, actor: string): WorkItemIsolationSession | undefined {
    const session = this.sessions.get(workItemSessionId);
    if (session) {
      session.status = 'resumed';
      session.lastResumedAt = getNow().toISOString();
      session.evidence.push({
        operation: 'resumeWorkItemIsolationSession',
        timestamp: getNow().toISOString(),
        actor
      });
      this.sessions.set(workItemSessionId, session);
    }
    return session;
  }

  verifyWorkItemIsolationContinuity(workItemSessionId: string): { valid: boolean; session?: WorkItemIsolationSession } {
    const session = this.sessions.get(workItemSessionId);
    if (session) {
      return { valid: true, session };
    }
    return { valid: false };
  }
}