// Deklarasi tipe untuk EdgeRuntime (hanya untuk type checking)
declare const EdgeRuntime: unknown;

// Edge-compatible async local storage polyfill + Web Crypto API
const isEdgeRuntime = typeof EdgeRuntime !== 'undefined';

// Polyfill AsyncLocalStorage untuk Edge Runtime (sederhana, cukup untuk use case kita)
class EdgeAsyncLocalStorage<T> {
  private store: T | undefined;
  run<R>(store: T, fn: () => R): R {
    this.store = store;
    return fn();
  }
  getStore(): T | undefined {
    return this.store;
  }
  enterWith(store: T): void {
    this.store = store;
  }
}

// Import tipe AsyncLocalStorage asli untuk Node.js
type NodeAsyncLocalStorage<T> = {
  new(): {
    run<R>(store: T, fn: () => R): R;
    getStore(): T | undefined;
    enterWith(store: T): void;
  };
};

// Inisialisasi lazy untuk menghindari top-level require Node.js modules yang terdeteksi Next.js
let asyncLocalStorage: any;
let randomUUID: () => string;

function ensureExecutionContext(): void {
  if (!asyncLocalStorage) {
    if (isEdgeRuntime) {
      asyncLocalStorage = new EdgeAsyncLocalStorage();
    } else {
      try {
        const { AsyncLocalStorage: NodeAsyncLocalStorage } = require("node:async_hooks");
        asyncLocalStorage = new NodeAsyncLocalStorage();
      } catch {
        asyncLocalStorage = new EdgeAsyncLocalStorage();
      }
    }
    randomUUID = () => {
      if (typeof globalThis.crypto?.randomUUID === "function") {
        return globalThis.crypto.randomUUID();
      }
      return Math.random().toString(36).substring(2) + Date.now().toString(36);
    };
  }
}

export type CircuitBreakerState = {
  readonly consecutiveFailures: number;
  readonly isOpen: boolean;
  readonly lastFailureTime: number;
};

export type ConcurrencyState = {
  readonly active_count: number;
  readonly execution_ids: string[];
  readonly artifact_ids: string[];
};

export type ExecutionContext = {
  readonly decision_id?: string | null;
  readonly product_id?: string;
  readonly workflow_id?: string; // Alias untuk logicalWorkId - Work ID formal
  readonly logicalWorkId?: string; // PR-007: Work ID formal untuk trace correlation
  readonly actor_id?: string | null; // PR-007: Actor identification for audit logs
  readonly run_id?: string;
  readonly last_invocation_digest?: string | null;
  readonly tenant_id?: string | null;
  readonly context_trace_id: string; // PT-003: OpenTelemetry-style context correlation
  readonly parent_context_trace_id?: string | null; // Untuk re-entry linkage
  readonly is_reentry: boolean; // Deteksi otomatis apakah ini re-entry ke work yang sama
  // PR-002: Idempotency key for duplicate execution prevention
  readonly idempotency_key?: string | null;
  // PR-001: Circuit breaker state (pure observation only - no execution changes)
  readonly consecutive_failures?: number;
  readonly circuit_breaker_open?: boolean;
  // WORK-PROD-004: Full circuit breaker & concurrency state for observability
  readonly circuit_breaker_state?: CircuitBreakerState;
  readonly concurrency_state?: ConcurrencyState;
};

// Track active stores per decision_id+tenant_id untuk re-entry continuity
const activeContextStores = new Map<string, ExecutionContext>();

function getStoreKey(decision_id: string, tenant_id: string): string {
  return `${tenant_id}:${decision_id}`;
}

export const executionContext = {
  run<R>(ctx: ExecutionContext & { context_trace_id?: string; is_reentry?: boolean }, fn: () => R): R {
    // Inisialisasi context jika belum diinisialisasi
    ensureExecutionContext();
    
    const currentStore = asyncLocalStorage?.getStore();
    
    // PR-007: Auto-set logicalWorkId from workflow_id jika tidak disediakan (backward compatibility)
    const resolved_logicalWorkId = ctx.logicalWorkId ?? ctx.workflow_id ?? undefined;
    
    // PR-002: Auto-generate idempotency key if not provided (reuse randomUUID import)
    const idempotency_key = ctx.idempotency_key ?? randomUUID();
    
    // Izinkan override manual (untuk testing failure scenarios seperti C19-TEST-8)
    let is_reentry = ctx.is_reentry ?? false;
    let parent_context_trace_id: string | null = ctx.parent_context_trace_id ?? null;
    let context_trace_id = ctx.context_trace_id || randomUUID();
    
    if (ctx.decision_id && ctx.tenant_id) {
      const key = getStoreKey(ctx.decision_id, ctx.tenant_id);
      const existingStore = activeContextStores.get(key);
      
      // Hanya auto-detect jika tidak ada override manual dari test - FIX: Only re-enter if we're inside an existing asyncLocalStorage stack (not just async parallel execution)
      const currentAmbientStore = asyncLocalStorage?.getStore();
      if (existingStore && existingStore.context_trace_id !== context_trace_id && !ctx.is_reentry && !ctx.parent_context_trace_id && currentAmbientStore) {
        // Ini adalah RE-ENTRY: work yang sama, execution context baru (only if we're inside an existing execution context stack)
        is_reentry = true;
        parent_context_trace_id = existingStore.context_trace_id;
        console.log(`[executionContext] Re-entry detected for ${ctx.decision_id} (tenant ${ctx.tenant_id})`);
      }
      
      // Update active store dengan konteks baru (tetap simpan yang terakhir untuk next re-entry)
      activeContextStores.set(key, {
        ...ctx,
        logicalWorkId: resolved_logicalWorkId,
        context_trace_id,
        is_reentry,
        parent_context_trace_id
      } as ExecutionContext);
    }
    
    // Jalankan dengan konteks yang sudah di-enhance untuk re-entry detection + PR-007 Work ID + PR-002 idempotency
    const enhancedCtx: ExecutionContext = {
      ...ctx,
      logicalWorkId: resolved_logicalWorkId,
      context_trace_id,
      is_reentry,
      parent_context_trace_id,
      idempotency_key
    };
    
    return asyncLocalStorage.run(enhancedCtx, fn);
  },
  
  get(): ExecutionContext | undefined {
    ensureExecutionContext();
    return asyncLocalStorage?.getStore?.();
  },

  setLastInvocationDigest(digest: string): void {
    ensureExecutionContext();
    const store = asyncLocalStorage?.getStore?.();
    if (store && store.last_invocation_digest !== digest) {
      // Buat konteks BARU untuk child executions - MENYELESAIKAN RACE CONDITION PADA SIBLING ASYNC STACKS
      // Perubahan ini hanya mempengaruhi child async stacks, bukan sibling yang berjalan paralel
      asyncLocalStorage.enterWith({
        ...store,
        last_invocation_digest: digest
      });
    }
  }
};