import { ExecutionContext } from './execution-context.js';
import { getNow } from "@repo/core-kernel/time/time.provider.js";

export interface RuntimeInvocation {
  capabilityId: string;
  operationId: string;
  sourceRef: string;
  success: boolean;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  tenantId?: string;
  timestamp?: string;
}

export class InvocationEvidence {
  static records: any[] = [];

  static async record(context: ExecutionContext, action: string, data: Record<string, any>) {
    const record = {
      workId: context.workId,
      actorId: context.actorId,
      action,
      data,
      timestamp: getNow().toISOString()
    };
    this.records.push(record);
    return record;
  }

  static async getByContext(context: ExecutionContext) {
    return this.records.filter(r => r.workId === context.workId);
  }
}

export function recordRuntimeInvocation(invocation: RuntimeInvocation): void {
  const record = {
    ...invocation,
    timestamp: invocation.timestamp || getNow().toISOString()
  };
  InvocationEvidence.records.push(record);
  console.log(`[InvocationEvidence] Recorded runtime invocation: ${invocation.operationId} for ${invocation.capabilityId}`);
}

export function traceExecutionByDecision(decisionId: string, data: Record<string, unknown>): void {
  console.log(`[TraceExecution] Decision ${decisionId}:`, data);
}

export function computeDigest(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}