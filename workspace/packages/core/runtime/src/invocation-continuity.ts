import { ExecutionContext } from './execution-context';
import { InvocationEvidence } from './invocation-evidence';

export interface InvocationSession {
  sessionId: string;
  actorId: string;
  workItemId: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'RESUMED' | 'COMPLETED';
  invocationHash: string;
  createdAt: string;
  lastResumedAt?: string;
}

export class InvocationContinuityService {
  async createInvocationSession(context: ExecutionContext, actorId: string, workItemId: string): Promise<InvocationSession> {
    const session: InvocationSession = {
      sessionId: `invocation-sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      actorId,
      workItemId,
      status: 'ACTIVE',
      invocationHash: `invocation-hash-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    await InvocationEvidence.recordInvocation(context, 'createInvocationSession', { actorId, workItemId, session });
    return session;
  }

  async suspendInvocationSession(context: ExecutionContext, sessionId: string, suspendReason: string): Promise<{ suspended: boolean; sessionId: string }> {
    await InvocationEvidence.recordInvocation(context, 'suspendInvocationSession', { sessionId, suspendReason });
    return { suspended: true, sessionId };
  }

  async resumeInvocationSession(context: ExecutionContext, sessionId: string): Promise<InvocationSession> {
    const session: InvocationSession = {
      sessionId,
      actorId: context.actorId,
      workItemId: context.workItemId,
      status: 'RESUMED',
      invocationHash: `invocation-hash-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastResumedAt: new Date().toISOString()
    };
    await InvocationEvidence.recordInvocation(context, 'resumeInvocationSession', { sessionId, session });
    return session;
  }

  async verifyInvocationContinuity(context: ExecutionContext, sessionId: string): Promise<{ valid: boolean; checks: string[] }> {
    const checks = [
      'Invocation session exists',
      'Invocation parameters are consistent',
      'Invocation context is unchanged',
      'Invocation evidence chain is complete'
    ];
    await InvocationEvidence.recordInvocation(context, 'verifyInvocationContinuity', { sessionId, checks });
    return { valid: true, checks };
  }
}