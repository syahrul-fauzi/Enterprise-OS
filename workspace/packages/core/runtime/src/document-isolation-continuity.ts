export interface DocumentIsolationSession {
  documentSessionId: string;
  documentId: string;
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

export class DocumentIsolationContinuityService {
  private sessions: Map<string, DocumentIsolationSession> = new Map();

  createDocumentIsolationSession(documentId: string, actor: string): DocumentIsolationSession {
    const documentSessionId = `doc-sess-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const session: DocumentIsolationSession = {
      documentSessionId,
      documentId,
      status: 'active',
      isolationHash: `doc-hash-${documentId}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      evidence: [
        {
          operation: 'createDocumentIsolationSession',
          timestamp: new Date().toISOString(),
          actor
        }
      ]
    };
    this.sessions.set(documentSessionId, session);
    return session;
  }

  suspendDocumentIsolationSession(documentSessionId: string, actor: string): DocumentIsolationSession | undefined {
    const session = this.sessions.get(documentSessionId);
    if (session) {
      session.status = 'suspended';
      session.evidence.push({
        operation: 'suspendDocumentIsolationSession',
        timestamp: new Date().toISOString(),
        actor
      });
      this.sessions.set(documentSessionId, session);
    }
    return session;
  }

  resumeDocumentIsolationSession(documentSessionId: string, actor: string): DocumentIsolationSession | undefined {
    const session = this.sessions.get(documentSessionId);
    if (session) {
      session.status = 'resumed';
      session.lastResumedAt = new Date().toISOString();
      session.evidence.push({
        operation: 'resumeDocumentIsolationSession',
        timestamp: new Date().toISOString(),
        actor
      });
      this.sessions.set(documentSessionId, session);
    }
    return session;
  }

  verifyDocumentIsolationContinuity(documentSessionId: string): { valid: boolean; session?: DocumentIsolationSession } {
    const session = this.sessions.get(documentSessionId);
    if (session) {
      return { valid: true, session };
    }
    return { valid: false };
  }
}