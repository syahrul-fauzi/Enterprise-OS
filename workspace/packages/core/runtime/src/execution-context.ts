import { AsyncLocalStorage } from "node:async_hooks";

export type ExecutionContext = {
  readonly decision_id?: string | null;
  readonly product_id?: string;
  readonly workflow_id?: string;
  readonly run_id?: string;
};

const asyncLocalStorage = new AsyncLocalStorage<ExecutionContext>();

export const executionContext = {
  run<R>(ctx: ExecutionContext, fn: () => R): R {
    return asyncLocalStorage.run(ctx, fn);
  },
  
  get(): ExecutionContext | undefined {
    return asyncLocalStorage.getStore();
  },
};