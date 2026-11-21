import { getNow } from "@repo/core-kernel/time/time.provider.js";
export interface NotificationIsolationSession {
  sessionId: string;
  tenantId: string;
  notificationContext: string;
  channelId: string;
  notificationType: string;
  createdAt: string;
  expiresAt?: string;
  status: 'active' | 'suspended' | 'revoked';
}

export class NotificationIsolationContinuityService {
  private sessions: Map<string, NotificationIsolationSession> = new Map();

  async createNotificationIsolationSession(
    tenantId: string,
    notificationContext: string,
    channelId: string,
    notificationType: string
  ): Promise<NotificationIsolationSession> {
    const session: NotificationIsolationSession = {
      sessionId: `notif-sess-${getNow().getTime()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      notificationContext,
      channelId,
      notificationType,
      createdAt: getNow().toISOString(),
      status: 'active'
    };
    this.sessions.set(session.sessionId, session);
    console.log(`[NotificationIsolationContinuity] Created session ${session.sessionId} for tenant ${tenantId}`);
    return session;
  }

  async suspendNotificationIsolationSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Notification session ${sessionId} not found`);
    }
    session.status = 'suspended';
    console.log(`[NotificationIsolationContinuity] Suspended session ${sessionId}`);
  }

  async resumeNotificationIsolationSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Notification session ${sessionId} not found`);
    }
    session.status = 'active';
    console.log(`[NotificationIsolationContinuity] Resumed session ${sessionId}`);
  }

  async verifyNotificationIsolationContinuity(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.log(`[NotificationIsolationContinuity] Verification failed: session ${sessionId} not found`);
      return false;
    }
    const isValid = session.status === 'active' && !!session.channelId && !!session.notificationType;
    console.log(`[NotificationIsolationContinuity] Verified session ${sessionId}: ${isValid}`);
    return isValid;
  }
}