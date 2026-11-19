import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";

export interface ExecutionContextOptions {
  workItemId?: string;
  actorId?: string;
  tenantId?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export class ExecutionContext {
  workItemId: string;
  actorId: string;
  tenantId: string;
  timestamp: string;
  metadata: Record<string, any>;
  invocationEvidence: Array<Record<string, any>>;

  constructor(options: ExecutionContextOptions = {}) {
    this.workItemId = options.workItemId || randomUUID();
    this.actorId = options.actorId || 'unknown-actor';
    this.tenantId = options.tenantId || 'default-tenant';
    this.timestamp = options.timestamp || new Date().toISOString();
    this.metadata = options.metadata || {};
    this.invocationEvidence = [];
  }

  get actor(): string {
    return this.actorId;
  }

  get workId(): string {
    return this.workItemId;
  }
}

interface ExecutionContextSingleton {
  asyncLocalStorage: AsyncLocalStorage<ExecutionContext> | null;
  ensureExecutionContext: () => void;
  run: <T>(contextData: { actor_id: string; tenant_id?: string; work_item_id?: string }, fn: () => Promise<T>) => Promise<T>;
  getCurrentContext: () => ExecutionContext | undefined;
}

const asyncLocalStorageInstance = new AsyncLocalStorage<ExecutionContext>();

export const executionContext: ExecutionContextSingleton = {
  asyncLocalStorage: asyncLocalStorageInstance,

  ensureExecutionContext() {
    // Already initialized above
  },

  async run<T>(contextData: { actor_id: string; tenant_id?: string; work_item_id?: string }, fn: () => Promise<T>): Promise<T> {
    const context = new ExecutionContext({
      actorId: contextData.actor_id,
      tenantId: contextData.tenant_id,
      workItemId: contextData.work_item_id,
    });
    return asyncLocalStorageInstance.run(context, fn);
  },

  getCurrentContext() {
    return asyncLocalStorageInstance.getStore();
  }
};