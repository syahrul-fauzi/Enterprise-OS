import { getNow } from "@repo/core-kernel/time/time.provider.js";
export interface SearchIsolationSession {
  sessionId: string;
  tenantId: string;
  searchContext: string;
  indexId: string;
  queryFilter: string;
  createdAt: string;
  expiresAt?: string;
  status: 'active' | 'suspended' | 'revoked';
}

export class SearchIsolationContinuityService {
  private sessions: Map<string, SearchIsolationSession> = new Map();

  async createSearchIsolationSession(
    tenantId: string,
    searchContext: string,
    indexId: string,
    queryFilter: string
  ): Promise<SearchIsolationSession> {
    const session: SearchIsolationSession = {
      sessionId: `search-sess-${getNow().getTime()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      searchContext,
      indexId,
      queryFilter,
      createdAt: getNow().toISOString(),
      status: 'active'
    };
    this.sessions.set(session.sessionId, session);
    console.log(`[SearchIsolationContinuity] Created session ${session.sessionId} for tenant ${tenantId}`);
    return session;
  }

  async suspendSearchIsolationSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Search session ${sessionId} not found`);
    }
    session.status = 'suspended';
    console.log(`[SearchIsolationContinuity] Suspended session ${sessionId}`);
  }

  async resumeSearchIsolationSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Search session ${sessionId} not found`);
    }
    session.status = 'active';
    console.log(`[SearchIsolationContinuity] Resumed session ${sessionId}`);
  }

  async verifySearchIsolationContinuity(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.log(`[SearchIsolationContinuity] Verification failed: session ${sessionId} not found`);
      return false;
    }
    const isValid = session.status === 'active' && !!session.indexId && !!session.queryFilter;
    console.log(`[SearchIsolationContinuity] Verified session ${sessionId}: ${isValid}`);
    return isValid;
  }
}