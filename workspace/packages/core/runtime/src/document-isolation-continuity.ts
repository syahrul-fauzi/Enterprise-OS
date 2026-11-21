import { getNow } from "@repo/core-kernel/time/time.provider.js";
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
    const documentSessionId = `doc-sess-${getNow().getTime()}-${Math.random().toString(36).substring(2, 10)}`;
    const session: DocumentIsolationSession = {
      documentSessionId,
      documentId,
      status: 'active',
      isolationHash: `doc-hash-${documentId}-${getNow().getTime()}`,
      createdAt: getNow().toISOString(),
      evidence: [
        {
          operation: 'createDocumentIsolationSession',
          timestamp: getNow().toISOString(),
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
        timestamp: getNow().toISOString(),
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
      session.lastResumedAt = getNow().toISOString();
      session.evidence.push({
        operation: 'resumeDocumentIsolationSession',
        timestamp: getNow().toISOString(),
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