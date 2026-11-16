export interface ReportingIsolationSession {
  sessionId: string;
  reportingId: string;
  tenantId: string;
  status: 'active' | 'suspended' | 'resumed';
  parameters: Record<string, any>;
  context: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export class ReportingIsolationContinuityService {
  private sessions: Map<string, ReportingIsolationSession> = new Map();

  createReportingIsolationSession(reportingId: string, tenantId: string, parameters: Record<string, any> = {}): ReportingIsolationSession {
    const session: ReportingIsolationSession = {
      sessionId: `reporting-session-${Date.now()}`,
      reportingId,
      tenantId,
      status: 'active',
      parameters,
      context: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.sessions.set(session.sessionId, session);
    console.log(`Reporting isolation session created: ${session.sessionId}`);
    return session;
  }

  suspendReportingIsolationSession(sessionId: string): ReportingIsolationSession | null {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'suspended';
      session.updatedAt = new Date().toISOString();
      this.sessions.set(sessionId, session);
      console.log(`Reporting isolation session suspended: ${sessionId}`);
      return session;
    }
    return null;
  }

  resumeReportingIsolationSession(sessionId: string): ReportingIsolationSession | null {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'resumed';
      session.updatedAt = new Date().toISOString();
      this.sessions.set(sessionId, session);
      console.log(`Reporting isolation session resumed: ${sessionId}`);
      return session;
    }
    return null;
  }

  verifyReportingIsolationContinuity(sessionId: string): { valid: boolean; session?: ReportingIsolationSession; issues?: string[] } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { valid: false, issues: [`Session ${sessionId} not found`] };
    }

    const issues: string[] = [];

    if (!session.sessionId) issues.push('Session ID is required');
    if (!session.reportingId) issues.push('Reporting ID is required');
    if (!session.tenantId) issues.push('Tenant ID is required');
    if (!session.status) issues.push('Session status is required');
    if (!session.createdAt) issues.push('Created timestamp is required');
    if (!session.updatedAt) issues.push('Updated timestamp is required');

    return {
      valid: issues.length === 0,
      session,
      issues: issues.length > 0 ? issues : undefined
    };
  }
}