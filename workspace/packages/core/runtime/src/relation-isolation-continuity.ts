import { getNow } from "@repo/core-kernel/time/time.provider.js";
export interface RelationIsolationSession {
  sessionId: string;
  relationId: string;
  tenantId: string;
  status: 'active' | 'suspended' | 'terminated';
  createdAt: string;
  updatedAt: string;
  invocationEvidence: Array<{
    operation: string;
    timestamp: string;
    actor: string;
    context: Record<string, any>;
  }>;
}

export class RelationIsolationContinuityService {
  private sessions: Map<string, RelationIsolationSession> = new Map();

  createRelationIsolationSession(relationId: string, tenantId: string, actor: string, context: Record<string, any> = {}): RelationIsolationSession {
    const session: RelationIsolationSession = {
      sessionId: `relation-session-${getNow().getTime()}-${Math.random().toString(36).substr(2, 9)}`,
      relationId,
      tenantId,
      status: 'active',
      createdAt: getNow().toISOString(),
      updatedAt: getNow().toISOString(),
      invocationEvidence: [
        {
          operation: 'create',
          timestamp: getNow().toISOString(),
          actor,
          context
        }
      ]
    };
    this.sessions.set(session.sessionId, session);
    return session;
  }

  suspendRelationIsolationSession(sessionId: string, actor: string, context: Record<string, any> = {}): RelationIsolationSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    session.status = 'suspended';
    session.updatedAt = getNow().toISOString();
    session.invocationEvidence.push({
      operation: 'suspend',
      timestamp: getNow().toISOString(),
      actor,
      context
    });
    return session;
  }

  resumeRelationIsolationSession(sessionId: string, actor: string, context: Record<string, any> = {}): RelationIsolationSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    session.status = 'active';
    session.updatedAt = getNow().toISOString();
    session.invocationEvidence.push({
      operation: 'resume',
      timestamp: getNow().toISOString(),
      actor,
      context
    });
    return session;
  }

  verifyRelationIsolationContinuity(sessionId: string): {
    valid: boolean;
    session: RelationIsolationSession | null;
    issues: string[];
  } {
    const session = this.sessions.get(sessionId);
    const issues: string[] = [];
    
    if (!session) {
      issues.push('Session not found');
      return { valid: false, session: null, issues };
    }
    
    if (!session.sessionId) issues.push('Missing sessionId');
    if (!session.relationId) issues.push('Missing relationId');
    if (!session.tenantId) issues.push('Missing tenantId');
    if (!session.status) issues.push('Missing status');
    if (!session.createdAt) issues.push('Missing createdAt');
    if (!session.updatedAt) issues.push('Missing updatedAt');
    if (!session.invocationEvidence || session.invocationEvidence.length === 0) issues.push('No invocation evidence');
    
    return {
      valid: issues.length === 0,
      session,
      issues
    };
  }
}