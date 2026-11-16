import { ExecutionContext } from './execution-context.js';

export class InvocationEvidence {
  private static records: any[] = [];

  static async record(context: ExecutionContext, action: string, data: Record<string, any>) {
    const record = {
      workId: context.workId,
      actorId: context.actorId,
      action,
      data,
      timestamp: new Date().toISOString()
    };
    this.records.push(record);
    return record;
  }

  static async getByContext(context: ExecutionContext) {
    return this.records.filter(r => r.workId === context.workId);
  }
}