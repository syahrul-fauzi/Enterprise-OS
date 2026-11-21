import { getNow } from "@repo/core-kernel/time/time.provider.js";
export interface IndexingIsolationSession {
  sessionId: string;
  tenantId: string;
  indexName: string;
  documentCount: number;
  batchSize: number;
  createdAt: string;
  expiresAt?: string;
  status: 'active' | 'suspended' | 'revoked';
}

export class IndexingIsolationContinuityService {
  private sessions: Map<string, IndexingIsolationSession> = new Map();

  async createIndexingIsolationSession(
    tenantId: string,
    indexName: string,
    batchSize: number
  ): Promise<IndexingIsolationSession> {
    const session: IndexingIsolationSession = {
      sessionId: `indexing-sess-${getNow().getTime()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      indexName,
      documentCount: 0,
      batchSize,
      createdAt: getNow().toISOString(),
      status: 'active'
    };
    this.sessions.set(session.sessionId, session);
    console.log(`[IndexingIsolationContinuity] Created session ${session.sessionId} for tenant ${tenantId}`);
    return session;
  }

  async suspendIndexingIsolationSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Indexing session ${sessionId} not found`);
    }
    session.status = 'suspended';
    console.log(`[IndexingIsolationContinuity] Suspended session ${sessionId}`);
  }

  async resumeIndexingIsolationSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Indexing session ${sessionId} not found`);
    }
    session.status = 'active';
    console.log(`[IndexingIsolationContinuity] Resumed session ${sessionId}`);
  }

  async verifyIndexingIsolationContinuity(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.log(`[IndexingIsolationContinuity] Verification failed: session ${sessionId} not found`);
      return false;
    }
    const isValid = session.status === 'active' && !!session.indexName && session.batchSize > 0;
    console.log(`[IndexingIsolationContinuity] Verified session ${sessionId}: ${isValid}`);
    return isValid;
  }
}