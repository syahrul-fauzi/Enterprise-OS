import { getNow } from "@repo/core-kernel/time/time.provider.js";
export interface TraceIsolationSession {
  sessionId: string;
  traceId: string;
  actorId: string;
  tenantId: string;
  createdAt: string;
  suspendedAt?: string;
  resumedAt?: string;
  status: 'active' | 'suspended' | 'terminated';
}

export class TraceIsolationContinuityService {
  private sessions: Map<string, TraceIsolationSession> = new Map();

  createTraceIsolationSession(traceId: string, actorId: string, tenantId: string): TraceIsolationSession {
    const session: TraceIsolationSession = {
      sessionId: `trace-session-${getNow().getTime()}-${Math.random().toString(36).substr(2, 9)}`,
      traceId,
      actorId,
      tenantId,
      createdAt: getNow().toISOString(),
      status: 'active'
    };
    this.sessions.set(session.sessionId, session);
    console.log(`[TraceIsolationContinuity] Created session ${session.sessionId} for trace ${traceId}`);
    return session;
  }

  suspendTraceIsolationSession(sessionId: string): TraceIsolationSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'active') {
      session.status = 'suspended';
      session.suspendedAt = getNow().toISOString();
      this.sessions.set(sessionId, session);
      console.log(`[TraceIsolationContinuity] Suspended session ${sessionId}`);
    }
    return session;
  }

  resumeTraceIsolationSession(sessionId: string): TraceIsolationSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'suspended') {
      session.status = 'active';
      session.resumedAt = getNow().toISOString();
      this.sessions.set(sessionId, session);
      console.log(`[TraceIsolationContinuity] Resumed session ${sessionId}`);
    }
    return session;
  }

  verifyTraceIsolationContinuity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.log(`[TraceIsolationContinuity] Session ${sessionId} not found`);
      return false;
    }
    const hasValidTrace = !!session.traceId;
    const hasValidActor = !!session.actorId;
    const hasValidTenant = !!session.tenantId;
    const hasConsistentStatus = ['active', 'suspended', 'terminated'].includes(session.status);
    
    const isValid = hasValidTrace && hasValidActor && hasValidTenant && hasConsistentStatus;
    console.log(`[TraceIsolationContinuity] Verified session ${sessionId}: ${isValid}`);
    return isValid;
  }
}

export const traceIsolationContinuityService = new TraceIsolationContinuityService();