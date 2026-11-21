import { getNow } from "@repo/core-kernel/time/time.provider.js";
export interface WorkQueueIsolationSession {
  workQueueSessionId: string;
  workQueueDefinitionId: string;
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

export class WorkQueueIsolationContinuityService {
  private sessions: Map<string, WorkQueueIsolationSession> = new Map();

  createWorkQueueIsolationSession(workQueueDefinitionId: string, actor: string): WorkQueueIsolationSession {
    const workQueueSessionId = `wq-sess-${getNow().getTime()}-${Math.random().toString(36).substring(2, 10)}`;
    const session: WorkQueueIsolationSession = {
      workQueueSessionId,
      workQueueDefinitionId,
      status: 'active',
      isolationHash: `wq-hash-${workQueueDefinitionId}-${getNow().getTime()}`,
      createdAt: getNow().toISOString(),
      evidence: [
        {
          operation: 'createWorkQueueIsolationSession',
          timestamp: getNow().toISOString(),
          actor
        }
      ]
    };
    this.sessions.set(workQueueSessionId, session);
    return session;
  }

  suspendWorkQueueIsolationSession(workQueueSessionId: string, actor: string): WorkQueueIsolationSession | undefined {
    const session = this.sessions.get(workQueueSessionId);
    if (session) {
      session.status = 'suspended';
      session.evidence.push({
        operation: 'suspendWorkQueueIsolationSession',
        timestamp: getNow().toISOString(),
        actor
      });
      this.sessions.set(workQueueSessionId, session);
    }
    return session;
  }

  resumeWorkQueueIsolationSession(workQueueSessionId: string, actor: string): WorkQueueIsolationSession | undefined {
    const session = this.sessions.get(workQueueSessionId);
    if (session) {
      session.status = 'resumed';
      session.lastResumedAt = getNow().toISOString();
      session.evidence.push({
        operation: 'resumeWorkQueueIsolationSession',
        timestamp: getNow().toISOString(),
        actor
      });
      this.sessions.set(workQueueSessionId, session);
    }
    return session;
  }

  verifyWorkQueueIsolationContinuity(workQueueSessionId: string): { valid: boolean; session?: WorkQueueIsolationSession } {
    const session = this.sessions.get(workQueueSessionId);
    if (session) {
      return { valid: true, session };
    }
    return { valid: false };
  }
}