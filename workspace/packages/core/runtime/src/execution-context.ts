export class ExecutionContext {
  workItemId: string;
  actorId: string;
  tenantId: string;
  timestamp: string;
  metadata: Record<string, any>;
  invocationEvidence: Array<Record<string, any>>;

  constructor(options: { workItemId: string; actorId: string; tenantId?: string; timestamp?: string; metadata?: Record<string, any> }) {
    this.workItemId = options.workItemId;
    this.actorId = options.actorId;
    this.tenantId = options.tenantId || 'default-tenant';
    this.timestamp = options.timestamp || new Date().toISOString();
    this.metadata = options.metadata || {};
    this.invocationEvidence = [];
  }
}