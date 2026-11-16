export interface WorkflowDefinitionIsolationSession {
  workflowDefinitionSessionId: string;
  workflowDefinitionId: string;
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

export class WorkflowDefinitionIsolationContinuityService {
  private sessions: Map<string, WorkflowDefinitionIsolationSession> = new Map();

  createWorkflowDefinitionIsolationSession(workflowDefinitionId: string, actor: string): WorkflowDefinitionIsolationSession {
    const workflowDefinitionSessionId = `wd-sess-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const session: WorkflowDefinitionIsolationSession = {
      workflowDefinitionSessionId,
      workflowDefinitionId,
      status: 'active',
      isolationHash: `wd-hash-${workflowDefinitionId}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      evidence: [
        {
          operation: 'createWorkflowDefinitionIsolationSession',
          timestamp: new Date().toISOString(),
          actor
        }
      ]
    };
    this.sessions.set(workflowDefinitionSessionId, session);
    return session;
  }

  suspendWorkflowDefinitionIsolationSession(workflowDefinitionSessionId: string, actor: string): WorkflowDefinitionIsolationSession | undefined {
    const session = this.sessions.get(workflowDefinitionSessionId);
    if (session) {
      session.status = 'suspended';
      session.evidence.push({
        operation: 'suspendWorkflowDefinitionIsolationSession',
        timestamp: new Date().toISOString(),
        actor
      });
      this.sessions.set(workflowDefinitionSessionId, session);
    }
    return session;
  }

  resumeWorkflowDefinitionIsolationSession(workflowDefinitionSessionId: string, actor: string): WorkflowDefinitionIsolationSession | undefined {
    const session = this.sessions.get(workflowDefinitionSessionId);
    if (session) {
      session.status = 'resumed';
      session.lastResumedAt = new Date().toISOString();
      session.evidence.push({
        operation: 'resumeWorkflowDefinitionIsolationSession',
        timestamp: new Date().toISOString(),
        actor
      });
      this.sessions.set(workflowDefinitionSessionId, session);
    }
    return session;
  }

  verifyWorkflowDefinitionIsolationContinuity(workflowDefinitionSessionId: string): { valid: boolean; session?: WorkflowDefinitionIsolationSession } {
    const session = this.sessions.get(workflowDefinitionSessionId);
    if (session) {
      return { valid: true, session };
    }
    return { valid: false };
  }
}