// Deklarasi tipe untuk EdgeRuntime (hanya untuk type checking)
declare const EdgeRuntime: unknown;

// Edge-compatible async local storage polyfill + Web Crypto API
const isEdgeRuntime = typeof EdgeRuntime !== 'undefined';

// Polyfill AsyncLocalStorage untuk Edge Runtime yang mendukung async function (stack-based store)
class EdgeAsyncLocalStorage<T> {
  // Expose storeStack untuk test verification (W06-A3 TEST-8 requirement) - hanya untuk polyfill Edge
  public storeStack: T[] = [];
  
  run<R>(store: T, fn: () => R | Promise<R>): R | Promise<R> {
    this.storeStack.push(store);
    try {
      const result = fn();
      if (result instanceof Promise) {
        // Untuk async function: tunggu promise selesai sebelum pop stack
        return result.finally(() => this.storeStack.pop());
      }
      // Untuk sync function: pop segera setelah return
      this.storeStack.pop();
      return result;
    } catch (error) {
      this.storeStack.pop();
      throw error;
    }
  }
  
  getStore(): T | undefined {
    return this.storeStack[this.storeStack.length - 1];
  }
  
  enterWith(store: T): void {
    this.storeStack.push(store);
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
    // SELALU GUNAKAN EDGE POLYFILL SAAT NODE_ENV=test UNTUK MEMUNGKINKAN AKSES storeStack DI TEST (TEST-8 REQUIREMENT)
    // HANYA SAAT TEST: override native AsyncLocalStorage agar polyfill terpakai dan _edgeAsyncLocalStorageInstance terinisiasi
    if (isEdgeRuntime || process.env.NODE_ENV === 'test') {
      asyncLocalStorage = new EdgeAsyncLocalStorage();
      // EXPOSE ke globalThis untuk test verification (W06-A3 TEST-8 requirement) - SELALU TERSET DI TEST
      (globalThis as any)._edgeAsyncLocalStorageInstance = asyncLocalStorage;
      console.log(`[executionContext.ensureExecutionContext] Menggunakan EDGE polyfill AsyncLocalStorage (TEST/EDGE RUNTIME) - exposed ke globalThis._edgeAsyncLocalStorageInstance`);
    } else {
      try {
        const { AsyncLocalStorage: NodeAsyncLocalStorage } = require("node:async_hooks");
        asyncLocalStorage = new NodeAsyncLocalStorage();
        console.log(`[executionContext.ensureExecutionContext] Menggunakan NATIVE AsyncLocalStorage (Node.js runtime PROD)`);
      } catch {
        asyncLocalStorage = new EdgeAsyncLocalStorage();
        (globalThis as any)._edgeAsyncLocalStorageInstance = asyncLocalStorage;
        console.log(`[executionContext.ensureExecutionContext] Menggunakan EDGE polyfill AsyncLocalStorage (Node.js fallback) - exposed ke globalThis._edgeAsyncLocalStorageInstance`);
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
  readonly workspace_id?: string | null; // W06-A2: Workspace context untuk audit & isolation
  readonly session_id?: string | null; // W06-A2: Session ID terverifikasi untuk trust boundary
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
  readonly permissions?: string[] | null; // W06-A2: Role-based permissions dari authenticated context untuk resource authorization
};

// Track active stores per decision_id+tenant_id untuk re-entry continuity
const activeContextStores = new Map<string, ExecutionContext>();

function getStoreKey(decision_id: string, tenant_id: string): string {
  return `${tenant_id}:${decision_id}`;
}

export const executionContext = {
  ensureExecutionContext, // Export untuk test agar bisa inisialisasi asyncLocalStorage sebelum test dimulai
  run<R>(ctx: ExecutionContext & { context_trace_id?: string; is_reentry?: boolean }, fn: () => R | Promise<R>): R | Promise<R> {
    // Inisialisasi context jika belum diinisialisasi
    ensureExecutionContext();
    console.log(`[executionContext.run] 🚀 Memulai execution context run dengan: actor_id=${ctx.actor_id}, tenant_id=${ctx.tenant_id}, session_id=${ctx.session_id}`);
    
    // W06-A3: Kontrol 1 - Context Injection Prevention - JIKA PRODUKSI, BLOKIR PROVIDED CONTEXT DARI TEST
    const isProduction = process.env.NODE_ENV === 'production';
    const isProvidedContext = (ctx as any).provided_by_test === true;
    if (isProduction && isProvidedContext) {
      console.error(`[executionContext.run] 🚨 FORBIDDEN: Context injection (providedExecutionContext) terdeteksi di production!`);
      throw new Error('[executionContext] FORBIDDEN: Context injection (providedExecutionContext) tidak diizinkan di lingkungan production. ' +
        'Hanya dapat digunakan di NODE_ENV=test sebagai test seam. Ini adalah pelanggaran kebijakan keamanan W06-A3.');
    }
    if (isProvidedContext) {
      console.log(`[executionContext.run] ℹ️ Test-only context provided (NODE_ENV=${process.env.NODE_ENV}, diizinkan sebagai test seam)`);
    }
    
    // Null check untuk storeStack (support Node.js AsyncLocalStorage yang tidak punya storeStack)
    const stackBefore = (asyncLocalStorage as any).storeStack?.length ?? 0;
    console.log(`[executionContext.run] 📊 Stack sebelum push: ${stackBefore}`);
    
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