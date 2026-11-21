import { getNow } from "@repo/core-kernel/time/time.provider.js";
export interface ComplianceIsolationSession {
  sessionId: string;
  complianceDomain: string;
  tenantId: string;
  sessionParameters: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class ComplianceIsolationContinuityService {
  private sessions: Map<string, ComplianceIsolationSession> = new Map();

  createComplianceIsolationSession(sessionId: string, complianceDomain: string, tenantId: string, sessionParameters: Record<string, unknown>): ComplianceIsolationSession {
    const session: ComplianceIsolationSession = {
      sessionId,
      complianceDomain,
      tenantId,
      sessionParameters,
      createdAt: getNow().toISOString(),
      updatedAt: getNow().toISOString()
    };
    this.sessions.set(sessionId, session);
    this.logInvocation('createComplianceIsolationSession', { sessionId, complianceDomain, tenantId });
    return session;
  }

  suspendComplianceIsolationSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.updatedAt = getNow().toISOString();
      this.sessions.set(sessionId, session);
      this.logInvocation('suspendComplianceIsolationSession', { sessionId });
    }
  }

  resumeComplianceIsolationSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.updatedAt = getNow().toISOString();
      this.sessions.set(sessionId, session);
      this.logInvocation('resumeComplianceIsolationSession', { sessionId });
    }
  }

  verifyComplianceIsolationContinuity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    const isValid = !!session && session.sessionId === sessionId;
    this.logInvocation('verifyComplianceIsolationContinuity', { sessionId, isValid });
    return isValid;
  }

  private logInvocation(method: string, details: Record<string, unknown>): void {
    console.log(`ComplianceIsolationContinuityService.${method} invoked`, details);
  }
}