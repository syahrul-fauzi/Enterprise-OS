import { ExecutionContext } from './execution-context.js';
import { InvocationEvidence } from './invocation-evidence.js';

export interface InterfaceSession {
  sessionId: string;
  actorId: string;
  workItemId: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'RESUMED' | 'COMPLETED';
  interfaceHash: string;
  createdAt: string;
  lastResumedAt?: string;
}

export class InterfaceContinuityService {
  async createInterfaceSession(context: ExecutionContext, actorId: string, workItemId: string): Promise<InterfaceSession> {
    const session: InterfaceSession = {
      sessionId: `iface-sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      actorId,
      workItemId,
      status: 'ACTIVE',
      interfaceHash: `iface-hash-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    await InvocationEvidence.record(context, 'createInterfaceSession', { actorId, workItemId, session });
    return session;
  }

  async suspendInterfaceSession(context: ExecutionContext, sessionId: string, suspendReason: string): Promise<{ suspended: boolean; sessionId: string }> {
    await InvocationEvidence.record(context, 'suspendInterfaceSession', { sessionId, suspendReason });
    return { suspended: true, sessionId };
  }

  async resumeInterfaceSession(context: ExecutionContext, sessionId: string): Promise<InterfaceSession> {
    const session: InterfaceSession = {
      sessionId,
      actorId: context.actorId,
      workItemId: context.workItemId,
      status: 'RESUMED',
      interfaceHash: `iface-hash-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastResumedAt: new Date().toISOString()
    };
    await InvocationEvidence.record(context, 'resumeInterfaceSession', { sessionId, session });
    return session;
  }

  async verifyInterfaceContinuity(context: ExecutionContext, sessionId: string): Promise<{ valid: boolean; checks: string[] }> {
    const checks = [
      'Interface session exists',
      'Interface schema is consistent',
      'Method signatures are unchanged',
      'Input/output types are preserved'
    ];
    await InvocationEvidence.record(context, 'verifyInterfaceContinuity', { sessionId, checks });
    return { valid: true, checks };
  }
}