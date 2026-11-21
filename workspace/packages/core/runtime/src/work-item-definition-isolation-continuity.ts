import { getNow } from "@repo/core-kernel/time/time.provider.js";
export interface WorkItemDefinitionIsolationSession {
  workItemDefinitionSessionId: string;
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

export class WorkItemDefinitionIsolationContinuityService {
  private sessions: Map<string, WorkItemDefinitionIsolationSession> = new Map();

  createWorkItemDefinitionIsolationSession(workItemDefinitionId: string, actor: string): WorkItemDefinitionIsolationSession {
    const workItemDefinitionSessionId = `wid-sess-${getNow().getTime()}-${Math.random().toString(36).substring(2, 10)}`;
    const session: WorkItemDefinitionIsolationSession = {
      workItemDefinitionSessionId,
      workItemDefinitionId,
      status: 'active',
      isolationHash: `wid-hash-${workItemDefinitionId}-${getNow().getTime()}`,
      createdAt: getNow().toISOString(),
      evidence: [
        {
          operation: 'createWorkItemDefinitionIsolationSession',
          timestamp: getNow().toISOString(),
          actor
        }
      ]
    };
    this.sessions.set(workItemDefinitionSessionId, session);
    return session;
  }

  suspendWorkItemDefinitionIsolationSession(workItemDefinitionSessionId: string, actor: string): WorkItemDefinitionIsolationSession | undefined {
    const session = this.sessions.get(workItemDefinitionSessionId);
    if (session) {
      session.status = 'suspended';
      session.evidence.push({
        operation: 'suspendWorkItemDefinitionIsolationSession',
        timestamp: getNow().toISOString(),
        actor
      });
      this.sessions.set(workItemDefinitionSessionId, session);
    }
    return session;
  }

  resumeWorkItemDefinitionIsolationSession(workItemDefinitionSessionId: string, actor: string): WorkItemDefinitionIsolationSession | undefined {
    const session = this.sessions.get(workItemDefinitionSessionId);
    if (session) {
      session.status = 'resumed';
      session.lastResumedAt = getNow().toISOString();
      session.evidence.push({
        operation: 'resumeWorkItemDefinitionIsolationSession',
        timestamp: getNow().toISOString(),
        actor
      });
      this.sessions.set(workItemDefinitionSessionId, session);
    }
    return session;
  }

  verifyWorkItemDefinitionIsolationContinuity(workItemDefinitionSessionId: string): { valid: boolean; session?: WorkItemDefinitionIsolationSession } {
    const session = this.sessions.get(workItemDefinitionSessionId);
    if (session) {
      return { valid: true, session };
    }
    return { valid: false };
  }
}