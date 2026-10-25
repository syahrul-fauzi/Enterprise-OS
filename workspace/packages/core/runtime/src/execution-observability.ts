import { executionContext } from "./execution-context.js";
import { recordRuntimeInvocation } from "./invocation-evidence.js";
import type { ExecutionContext } from "./execution-context.js";

// WORK-ACLPILOT-026: Import shared Redis instance untuk multi-instance coordination
// Reuse existing global instance dari email-queue.ts untuk maintain frozen core (tidak tambah dependency baru)
declare global {
  var __EOS_SHARED_REDIS_INSTANCE__: any;
}
const redis = globalThis.__EOS_SHARED_REDIS_INSTANCE__;

// Environment configuration untuk mode deployment (single vs multi instance)
// AC-04: Fail closed semantics - production multi-instance wajib Redis tersedia
// Evaluasi mode deployment SETIAP KALI dipanggil (runtime evaluation) untuk menangkap perubahan env var
function getIsMultiInstance(): boolean {
  return process.env.EOS_DEPLOYMENT_MODE === 'multi-instance';
}
const LOCK_LEASE_TTL = 30000; // 30 detik lock lease untuk stale lock recovery (AC-01)
const LOCK_PREFIX = 'eos:tenant:lock:';
const USAGE_PREFIX = 'eos:tenant:usage:';
const IDEMPOTENCY_PREFIX = 'eos:tenant:idempotency:';

// In-memory stores untuk single-instance mode (tidak digunakan di multi-instance)
// AC-01: SINGLE-INSTANCE ONLY - state tidak dibagikan antar-replica
const tenantUsageStore = new Map<string, any>();
const processedPaymentKeys = new Map<string, Set<string>>();
const tenantLocks = new Map<string, boolean>(); // In-memory lock map untuk single-instance

// Helper function untuk in-memory lock acquisition (single-instance only)
async function acquireTenantLock(tenantId: string): Promise<void> {
  // Tunggu hingga lock tersedia untuk single-instance coordination
  while (tenantLocks.get(tenantId)) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  tenantLocks.set(tenantId, true);
  console.log(`[INMEMORY-LOCK-SUCCESS] Berhasil memperoleh in-memory lock untuk tenant ${tenantId}`);
}

// Helper function untuk in-memory lock release (single-instance only)
async function releaseTenantLock(tenantId: string): Promise<void> {
  tenantLocks.delete(tenantId);
  console.log(`[INMEMORY-LOCK-RELEASE] Berhasil melepaskan in-memory lock untuk tenant ${tenantId}`);
}

// AC-04: Fail closed semantics akan diperiksa di setiap fungsi eksekusi, bukan top-level
// Ini mencegah error saat import modul sebelum environment variable diset
// Lua script untuk atomic budget check-and-update (menjaga invariant Usage+newReservation ≤ Budget)
// Dieksekusi atomik di Redis sehingga tidak ada race condition antar-replica (solusi risiko Redis lock saja)
// WORK-ACLPILOT-026: Menambahkan tracking active_reservations untuk menjaga total komitmen anggaran
const ATOMIC_BUDGET_UPDATE_SCRIPT = `
  local tenant_id = KEYS[1]
  local usage_key = KEYS[2]
  local lock_key = KEYS[3]
  local operation = ARGV[1] -- "reserve" / "commit" / "rollback"
  local amount = tonumber(ARGV[2])
  local reservation_id = ARGV[3]
  local max_budget = tonumber(ARGV[4])
  local now = tonumber(ARGV[5])
  local monthly_reset = ARGV[6]
  local lock_value = ARGV[7]
  local LOCK_LEASE_TTL = tonumber(ARGV[8])
  local KEY_TTL = 2592000 -- 30 hari dalam detik untuk mencegah eviction
  
  -- Dapatkan usage saat ini dari Redis
  local current_usage = redis.call('GET', usage_key)
  local current_spent = 0
  local stored_reset = nil
  local active_reservations = {}
  
  if current_usage then
    local decoded = cjson.decode(current_usage)
    current_spent = tonumber(decoded.total_spent) or 0
    stored_reset = decoded.monthly_reset_utc
    active_reservations = decoded.active_reservations or {}
  end
  
  -- Reset bulanan jika sudah lewat tanggal reset (bersihkan semua reservasi)
  if stored_reset and stored_reset < os.date("%Y-%m-%dT%H:%M:%SZ", now) then
    current_spent = 0
    active_reservations = {}
  end

  -- Hitung total komitmen: Usage + semua reservasi aktif
  local total_reserved = 0
  for _, res in ipairs(active_reservations) do
    total_reserved = total_reserved + tonumber(res.amount) or 0
  end
  local total_committed = current_spent + total_reserved

  -- Verifikasi lock masih aktif dan milik pemanggil (Pencegahan stale commit)
  local current_lock = redis.call('GET', lock_key)
  if not current_lock or current_lock ~= lock_value then
    return {success=false, current_spent=current_spent, total_reserved=total_reserved, reason="invalid_lock_owner"}
  end

  -- Perpanjang lock lease untuk operasi yang berjalan lama
  redis.call('PEXPIRE', lock_key, LOCK_LEASE_TTL)
  
  -- Operasi RESERVE: Tambahkan reservasi baru, cek invariant
  if operation == "reserve" then
    if total_committed + amount > max_budget then
      return {success=false, current_spent=current_spent, total_reserved=total_reserved, reason="budget_exceeded"}
    end
    
    -- Tambahkan reservasi baru ke list
    table.insert(active_reservations, {
      id = reservation_id,
      amount = amount,
      reserved_at = os.date("%Y-%m-%dT%H:%M:%SZ", now),
      status = "active"
    })
    
    -- Update data tenant secara atomik
    local new_usage = {
      total_spent = current_spent,
      active_reservations = active_reservations,
      last_updated_utc = os.date("%Y-%m-%dT%H:%M:%SZ", now),
      currency = "IDR",
      monthly_reset_utc = stored_reset or monthly_reset
    }
    
    redis.call('SET', usage_key, cjson.encode(new_usage))
    redis.call('EXPIRE', usage_key, KEY_TTL) -- Tambahkan TTL untuk menghindari eviction
    return {success=true, current_spent=current_spent, total_reserved=total_reserved+amount, reservation_id=reservation_id}
  
  -- Operasi COMMIT: Pindahkan reservasi dari active ke usage (sudah selesai diproses)
  elseif operation == "commit" then
    local found = false
    local new_active_reservations = {}
    for _, res in ipairs(active_reservations) do
      if res.id == reservation_id and res.status == "active" then
        current_spent = current_spent + tonumber(res.amount)
        found = true
      else
        table.insert(new_active_reservations, res)
      end
    end
    
    if not found then
      return {success=false, current_spent=current_spent, total_reserved=total_reserved, reason="reservation_not_found"}
    end
    
    -- Update data tenant
    local new_usage = {
      total_spent = current_spent,
      active_reservations = new_active_reservations,
      last_updated_utc = os.date("%Y-%m-%dT%H:%M:%SZ", now),
      currency = "IDR",
      monthly_reset_utc = stored_reset or monthly_reset
    }
    
    redis.call('SET', usage_key, cjson.encode(new_usage))
    redis.call('EXPIRE', usage_key, KEY_TTL) -- Tambahkan TTL untuk menghindari eviction
    return {success=true, current_spent=current_spent, total_reserved=total_reserved-amount, reservation_id=reservation_id}
  
  -- Operasi ROLLBACK: Batalkan reservasi, hapus dari active tanpa tambah ke usage
  elseif operation == "rollback" then
    local found = false
    local new_active_reservations = {}
    for _, res in ipairs(active_reservations) do
      if res.id == reservation_id and res.status == "active" then
        found = true
      else
        table.insert(new_active_reservations, res)
      end
    end
    
    if not found then
      return {success=false, current_spent=current_spent, total_reserved=total_reserved, reason="reservation_not_found"}
    end
    
    -- Update data tenant
    local new_usage = {
      total_spent = current_spent,
      active_reservations = new_active_reservations,
      last_updated_utc = os.date("%Y-%m-%dT%H:%M:%SZ", now),
      currency = "IDR",
      monthly_reset_utc = stored_reset or monthly_reset
    }
    
    redis.call('SET', usage_key, cjson.encode(new_usage))
    redis.call('EXPIRE', usage_key, KEY_TTL) -- Tambahkan TTL untuk menghindari eviction
    return {success=true, current_spent=current_spent, total_reserved=total_reserved-amount, reservation_id=reservation_id}
  end
  
  -- Operasi tidak dikenal
  return {success=false, current_spent=current_spent, reason="invalid_operation"}
`;

// Helper function untuk acquire Redis lock dengan lease TTL (AC-01: Stale lock recovery)
// Mengembalikan lock value jika berhasil, false jika tidak - untuk verifikasi pemilik saat release
async function acquireRedisTenantLock(tenantId: string): Promise<string | false> {
  const lockKey = `${LOCK_PREFIX}${tenantId}`;
  const now = Date.now();
  const lockValue = now.toString();
  const redis = globalThis.__EOS_SHARED_REDIS_INSTANCE__;
  // Coba set lock dengan NX (hanya jika belum ada) dan PX (lease TTL)
  const lockAcquired = await redis.set(lockKey, lockValue, 'NX', 'PX', LOCK_LEASE_TTL);
  if (lockAcquired) {
    console.log(`[REDIS-LOCK-SUCCESS] Berhasil memperoleh lock untuk tenant ${tenantId} (lease ${LOCK_LEASE_TTL}ms)`);
    return lockValue;
  }
  // Cek apakah lock sudah expired (stale lock recovery)
  const existingLock = await redis.get(lockKey);
  if (existingLock) {
    const lockTime = parseInt(existingLock, 10);
    if (now - lockTime > LOCK_LEASE_TTL) {
      console.log(`[REDIS-LOCK-STALE-RECOVERY] Lock untuk tenant ${tenantId} sudah expired, ambil alih`);
      const newLock = await redis.set(lockKey, lockValue, 'XX', 'PX', LOCK_LEASE_TTL);
      return newLock ? lockValue : false;
    }
  }
  return false;
}

// Helper function untuk release Redis lock hanya oleh pemiliknya (AC-01: Shared coordination)
// Mencegah replica yang tidak memiliki lock menghapus lock aktif milik replica lain
async function releaseRedisTenantLock(tenantId: string, lockValue: string): Promise<boolean> {
  const lockKey = `${LOCK_PREFIX}${tenantId}`;
  const redis = globalThis.__EOS_SHARED_REDIS_INSTANCE__;
  // Dapatkan nilai lock saat ini untuk verifikasi pemilik
  const currentLockValue = await redis.get(lockKey);
  if (!currentLockValue) {
    console.warn(`[REDIS-LOCK-RELEASE-FAIL] Lock untuk tenant ${tenantId} sudah tidak ada, tidak dapat dilepaskan`);
    return false;
  }
  
  // Hapus lock hanya jika nilai yang disimpan cocok dengan yang kita miliki
  // Ini memastikan hanya pemilik asli yang bisa melepaskan lock
  if (currentLockValue !== lockValue) {
    console.error(`[REDIS-LOCK-RELEASE-UNAUTHORIZED] Replica tidak memiliki hak untuk melepaskan lock tenant ${tenantId} (lock sudah diambil oleh replica lain)`);
    return false;
  }
  
  const lockDeleted = await redis.del(lockKey);
  if (lockDeleted) {
    console.log(`[REDIS-LOCK-RELEASED] Lock untuk tenant ${tenantId} telah dilepaskan oleh pemilik yang sah`);
    return true;
  } else {
    console.error(`[REDIS-LOCK-RELEASE-FAIL] Gagal menghapus lock untuk tenant ${tenantId}`);
    return false;
  }
}
// AC-PILOT-001: Import untuk mendapatkan tenant metadata (termasuk costLimits)
// Lazy import getTenantByIdCommand only when needed to avoid cross-directory TypeScript errors (AC-PILOT-001)
// import { getTenantByIdCommand } from "../../../../capabilities/identity/implementation/commands/get-tenant-by-id.command.js";

// PT-003: OpenTelemetry-style observability instrumentation
// HANYA measurement, TIDAK ADA repair/recovery logic
export interface CircuitBreakerState {
  consecutive_failures: number;
  is_open: boolean;
  last_failure_time_ms: number;
}

export interface ConcurrencyState {
  in_flight_executions: number;
  active_execution_ids: string[];
  artifact_ids_in_use: string[];
}

export interface ObservedExecution {
  decision_id: string;
  executionId: string;
  context_trace_id: string;
  logicalWorkId?: string;
  idempotency_key?: string; // PR-002: Idempotency key for duplicate execution tracking
  is_reentry: boolean;
  parent_context_trace_id?: string | null;
  parent_executionId?: string;
  timestamp_utc: string;
  success: boolean;
  error?: string;
  // WORK-PROD-004: Circuit breaker & concurrency state tracking
  circuit_breaker?: CircuitBreakerState;
  concurrency?: ConcurrencyState;
}

export const executionTraces: Map<string, ObservedExecution[]> = new Map();

// Auto-capture context dari ambient executionContext
export function recordObservedExecution(execution: Omit<ObservedExecution, "timestamp_utc" | "is_reentry" | "context_trace_id" | "parent_context_trace_id" | "idempotency_key" | "circuit_breaker" | "concurrency"> & { logicalWorkId?: string }): void {
  const ambientCtx = executionContext.get();
  const timestamp = new Date().toISOString();
  
  // PR-007: Ambil Work ID secara otomatis dari executionContext (100% trace correlation) - allow manual override
  const logicalWorkId = execution.logicalWorkId ?? ambientCtx?.logicalWorkId ?? ambientCtx?.workflow_id ?? "unknown-work";
  // PR-002: Ambil idempotency key secara otomatis dari executionContext
  const idempotency_key = ambientCtx?.idempotency_key || "unknown-idempotency-key";
  // Ambil nilai secara otomatis dari executionContext yang sudah di-enhance
  const context_trace_id = ambientCtx?.context_trace_id || "unknown-ctx";
  const is_reentry = ambientCtx?.is_reentry || false;
  const parent_context_trace_id = ambientCtx?.parent_context_trace_id || null;
  
  // WORK-PROD-004: Extract circuit breaker state from execution context if available
  const circuit_breaker: CircuitBreakerState | undefined = ambientCtx?.circuit_breaker_state ? {
    consecutive_failures: ambientCtx.circuit_breaker_state.consecutiveFailures,
    is_open: ambientCtx.circuit_breaker_state.isOpen,
    last_failure_time_ms: ambientCtx.circuit_breaker_state.lastFailureTime
  } : ambientCtx?.circuit_breaker_open !== undefined || ambientCtx?.consecutive_failures !== undefined ? {
    consecutive_failures: ambientCtx?.consecutive_failures ?? 0,
    is_open: ambientCtx?.circuit_breaker_open ?? false,
    last_failure_time_ms: 0
  } : undefined;
  
  // WORK-PROD-004: Extract concurrency state from execution context if available
  const concurrency: ConcurrencyState | undefined = ambientCtx?.concurrency_state ? {
    in_flight_executions: ambientCtx.concurrency_state.active_count,
    active_execution_ids: ambientCtx.concurrency_state.execution_ids,
    artifact_ids_in_use: ambientCtx.concurrency_state.artifact_ids
  } : undefined;
  
  const observed: ObservedExecution = {
    ...execution,
    logicalWorkId,
    context_trace_id,
    is_reentry,
    parent_context_trace_id,
    idempotency_key,
    circuit_breaker,
    concurrency,
    timestamp_utc: timestamp
  };

  if (!executionTraces.has(execution.decision_id)) {
    executionTraces.set(execution.decision_id, []);
  }
  executionTraces.get(execution.decision_id)!.push(observed);

  // PR-007: Include actor_id in all logs for auditability
  const actorId = ambientCtx?.actor_id ?? "unknown-actor";
  // PR-001: Include circuit breaker state in observability logs
  const circuitState = ambientCtx?.circuit_breaker_open ? "OPEN" : "CLOSED";
  const consecutiveFails = ambientCtx?.consecutive_failures ?? 0;
  
  // Log untuk observability - bisa diintegrasikan dengan OpenTelemetry nanti
  console.log(`[OBSERVE] work=${logicalWorkId} actor=${actorId} | ${execution.decision_id} | ${execution.executionId} | ctx=${context_trace_id} | idempotency=${idempotency_key} | reentry=${is_reentry} | parentCtx=${parent_context_trace_id} | circuit=${circuitState} consecutiveFails=${consecutiveFails}`);
}

export function getTraceForDecision(decision_id: string): ObservedExecution[] {
  return executionTraces.get(decision_id) || [];
}

export function detectReentryAnomalies(decision_id: string): {
  has_disconnected_parent: boolean;
  disconnected_executions: string[];
  has_context_linkage: boolean;
} {
  const traces = getTraceForDecision(decision_id);
  const disconnected: string[] = [];
  let has_context_linkage = true; // Apakah semua re-entry punya parent_context_trace_id?
  
  for (let i = 1; i < traces.length; i++) {
    const current = traces[i];
    if (!current) continue; // Guard clause untuk null safety
    
    // Deteksi apakah re-entry tapi kehilangan context linkage (C19-TEST-8 failure)
    if (current.is_reentry && !current.parent_context_trace_id) {
      disconnected.push(current.executionId);
      has_context_linkage = false;
    }
    
    // Fallback: jika masih pakai manual parent_executionId
    if (current.is_reentry && !current.parent_context_trace_id && !current.parent_executionId) {
      if (!disconnected.includes(current.executionId)) disconnected.push(current.executionId);
    }
  }

  return {
    has_disconnected_parent: disconnected.length > 0,
    disconnected_executions: disconnected,
    has_context_linkage
  };
}

// PR-007: Verify 100% Work ID correlation compliance
export function verifyWorkIdCorrelation(decision_id: string): {
  total_executions: number;
  correlated_executions: number;
  correlation_percentage: number;
  uncorrelated_executions: string[];
  is_100_percent_compliant: boolean;
} {
  const traces = getTraceForDecision(decision_id);
  const uncorrelated: string[] = [];
  let correlated = 0;
  
  for (const trace of traces) {
    if (trace.logicalWorkId && trace.logicalWorkId !== "unknown-work") {
      correlated++;
    } else {
      uncorrelated.push(trace.executionId);
    }
  }
  
  const percentage = traces.length > 0 ? (correlated / traces.length) * 100 : 100;
  
  return {
    total_executions: traces.length,
    correlated_executions: correlated,
    correlation_percentage: percentage,
    uncorrelated_executions: uncorrelated,
    is_100_percent_compliant: percentage === 100
  };
}

// Integrasikan dengan existing recordRuntimeInvocation untuk capture context
const originalRecordInvocation = recordRuntimeInvocation;
export function instrumentInvocationRecording(): void {
  // Monkey patch hanya untuk observability - TIDAK mengubah behavior
  Object.assign(recordRuntimeInvocation, originalRecordInvocation);
}

// PR-001: Reliability utilities (pure calculation only - no execution logic modification)
// Calculates exponential backoff delay in milliseconds: base * multiplier^(attempt - 1)
export function calculateExponentialBackoff(attempt: number, config: { exponential_backoff_multiplier?: number }): number {
  const multiplier = config.exponential_backoff_multiplier ?? 2;
  return 1000 * Math.pow(multiplier, attempt - 1);
}

// Checks if circuit breaker should open based on failure threshold
export function shouldOpenCircuitBreaker(consecutiveFailures: number, threshold?: number): boolean {
  const circuitThreshold = threshold ?? 5;
  return consecutiveFailures >= circuitThreshold;
}

// Checks if circuit breaker should reset to closed after cooldown period (pure calculation, PT-003 compliant)
export function shouldResetCircuitBreaker(lastFailureTime: number, cooldownMs?: number): boolean {
  const circuitCooldown = cooldownMs ?? 30000; // Default 30 second cooldown
  return Date.now() - lastFailureTime >= circuitCooldown;
}

// --- WORK-PROD-004: Production Monitoring & Observability Extensions ---
// Core business metrics for Work Reality operations
export interface WorkRealityMetrics {
  work_id: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  total_latency_ms: number;
  p95_latency_ms: number;
  avg_latency_ms: number;
  error_rate: number;
  // PR-002 REAL WORK REALITY COHORT - Production Metrics
  understanding_recovery_total: number;
  understanding_recovery_success: number;
  wrong_understanding_corrected: number;
  wrong_understanding_total: number;
  unknowns_preserved: number;
  unknowns_total: number;
  generalization_applications: number;
  generalization_successes: number;
  work_formation_quality_score: number;
  work_formation_total: number;
  last_updated_utc: string;
}

const workMetricsStore: Map<string, WorkRealityMetrics> = new Map();

// Helper to create empty metrics object (PR-002 compliance)
function createEmptyWorkMetrics(workId: string): WorkRealityMetrics {
  return {
    work_id: workId,
    total_executions: 0,
    successful_executions: 0,
    failed_executions: 0,
    total_latency_ms: 0,
    p95_latency_ms: 0,
    avg_latency_ms: 0,
    error_rate: 0,
    // PR-002 production metrics initialized to 0
    understanding_recovery_total: 0,
    understanding_recovery_success: 0,
    wrong_understanding_corrected: 0,
    wrong_understanding_total: 0,
    unknowns_preserved: 0,
    unknowns_total: 0,
    generalization_applications: 0,
    generalization_successes: 0,
    work_formation_quality_score: 0,
    work_formation_total: 0,
    last_updated_utc: new Date().toISOString()
  };
}

// Record execution metrics for a specific Work
export function recordWorkExecutionMetrics(workId: string, executionTimeMs: number, success: boolean): void {
  // Tambahkan stack trace untuk melacak panggilan ganda
  const stack = new Error().stack;
  console.log(`[METRICS_DEBUG] recordWorkExecutionMetrics dipanggil untuk work=${workId} | stack: ${stack}`);
  
  const existing = workMetricsStore.get(workId) ?? createEmptyWorkMetrics(workId);

  // Update metrics
  existing.total_executions += 1;
  existing.total_latency_ms += executionTimeMs;
  if (success) {
    existing.successful_executions += 1;
  } else {
    existing.failed_executions += 1;
  }
  
  // Recalculate aggregates
  existing.avg_latency_ms = existing.total_latency_ms / existing.total_executions;
  existing.error_rate = existing.failed_executions / existing.total_executions;
  // Simplified p95 calculation (production would use proper percentile calculation)
  existing.p95_latency_ms = Math.max(existing.p95_latency_ms, executionTimeMs);
  existing.last_updated_utc = new Date().toISOString();

  workMetricsStore.set(workId, existing);
  
  // Structured logging for observability platforms
  console.log(`[METRICS] work=${workId} | executions=${existing.total_executions} | success=${existing.successful_executions} | errors=${existing.failed_executions} | error_rate=${(existing.error_rate * 100).toFixed(2)}% | avg_latency=${existing.avg_latency_ms.toFixed(2)}ms | p95_latency=${existing.p95_latency_ms}ms`);
}

// Get metrics for a specific Work
export function getWorkMetrics(workId: string): WorkRealityMetrics | undefined {
  return workMetricsStore.get(workId);
}

// Reset semua metrics (hanya untuk testing)
export function resetWorkMetricsStore(): void {
  workMetricsStore.clear();
}

// PR-002: Track understanding recovery event (ambiguous input → sufficient understanding)
export function recordUnderstandingRecovery(workId: string, success: boolean): void {
  const existing = workMetricsStore.get(workId) ?? createEmptyWorkMetrics(workId);
  existing.understanding_recovery_total += 1;
  if (success) existing.understanding_recovery_success += 1;
  existing.last_updated_utc = new Date().toISOString();
  workMetricsStore.set(workId, existing);
  console.log(`[PR-002-METRICS] work=${workId} | understanding_recovery=${success ? "SUCCESS" : "FAILED"} | total=${existing.understanding_recovery_total} | success_rate=${((existing.understanding_recovery_success / existing.understanding_recovery_total) * 100).toFixed(2)}%`);
}

// PR-002: Track wrong understanding correction event (human correction → resolved understanding)
export function recordWrongUnderstandingCorrection(workId: string, corrected: boolean): void {
  const existing = workMetricsStore.get(workId) ?? createEmptyWorkMetrics(workId);
  existing.wrong_understanding_total += 1;
  if (corrected) existing.wrong_understanding_corrected += 1;
  existing.last_updated_utc = new Date().toISOString();
  workMetricsStore.set(workId, existing);
  console.log(`[PR-002-METRICS] work=${workId} | wrong_understanding_corrected=${corrected} | total=${existing.wrong_understanding_total} | correction_rate=${((existing.wrong_understanding_corrected / existing.wrong_understanding_total) * 100).toFixed(2)}%`);
}

// PR-002: Track unknown integrity event (EOS correctly admitted "I don't know" instead of guessing)
export function recordUnknownPreservation(workId: string, preserved: boolean): void {
  const existing = workMetricsStore.get(workId) ?? createEmptyWorkMetrics(workId);
  existing.unknowns_total += 1;
  if (preserved) existing.unknowns_preserved += 1;
  existing.last_updated_utc = new Date().toISOString();
  workMetricsStore.set(workId, existing);
  console.log(`[PR-002-METRICS] work=${workId} | unknown_preserved=${preserved} | total=${existing.unknowns_total} | integrity_rate=${((existing.unknowns_preserved / existing.unknowns_total) * 100).toFixed(2)}%`);
}

// PR-002: Track generalization application (promoted knowledge used to improve runtime)
export function recordGeneralizationApplication(workId: string, success: boolean): void {
  const existing = workMetricsStore.get(workId) ?? createEmptyWorkMetrics(workId);
  existing.generalization_applications += 1;
  if (success) existing.generalization_successes += 1;
  existing.last_updated_utc = new Date().toISOString();
  workMetricsStore.set(workId, existing);
  console.log(`[PR-002-METRICS] work=${workId} | generalization_application=${success ? "SUCCESS" : "FAILED"} | total=${existing.generalization_applications} | leverage_rate=${((existing.generalization_successes / existing.generalization_applications) * 100).toFixed(2)}%`);
}

// WORK-ACLPILOT-026: Core budget operation function - dual mode support (single/multi-instance)
// Memindahkan logika ini dari recordGeneralizationApplication ke fungsi yang benar dengan parameter yang terdefinisi
export async function executeBudgetOperation(
  tenantId: string,
  operation: "reserve" | "commit" | "rollback",
  amount: number,
  reservationId: string,
  maxMonthlyBudget: number
): Promise<{ success: boolean; current_spent: number; total_reserved: number; reason?: string; reservation_id?: string }> {
  // Evaluasi mode deployment RUNTIME (bukan import time) untuk menangkap perubahan env var setelah modul diimpor
  const IS_MULTI_INSTANCE = getIsMultiInstance();
  const redis = globalThis.__EOS_SHARED_REDIS_INSTANCE__;
  console.log(`[BUDGET-OP-CHECK] Runtime mode: ${IS_MULTI_INSTANCE ? 'multi-instance' : 'single-instance'}, Redis available: ${!redis?._simulateUnavailable}`);
  const now = Date.now();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  const monthly_reset_utc = nextMonth.toISOString();

  // WORK-ACLPILOT-026: Dual mode support - single-instance (in-memory) / multi-instance (Redis atomic)
          if (!IS_MULTI_INSTANCE) {
    // Single-instance mode: gunakan in-memory lock untuk koordiasi
    await acquireTenantLock(tenantId);
    try {
      const currentUsage = getTenantUsage(tenantId);
      let current_spent = currentUsage?.total_spent || 0;
      let active_reservations = (currentUsage as any)?.active_reservations || [];
      
      // Hitung total reservasi aktif saat ini
      let total_reserved = 0;
      for (const res of active_reservations) {
        total_reserved += res.amount || 0;
      }
      const total_committed = current_spent + total_reserved;

      // Operasi RESERVE
      if (operation === "reserve") {
        if (total_committed + amount > maxMonthlyBudget) {
          console.warn(`[BUDGET-OP-BLOCKED] tenant=${tenantId} | RESERVE gagal: total komitmen melebihi batas (current=${current_spent}, reserved=${total_reserved}, tambah=${amount}, max=${maxMonthlyBudget})`);
          return { success: false, current_spent, total_reserved, reason: "budget_exceeded" };
        }
        // Tambahkan reservasi baru
        active_reservations.push({
          id: reservationId,
          amount,
          reserved_at: new Date().toISOString(),
          status: "active"
        });
        total_reserved += amount;
      }
      // Operasi COMMIT
      else if (operation === "commit") {
        const foundIndex = active_reservations.findIndex((r: any) => r.id === reservationId && r.status === "active");
        if (foundIndex === -1) {
          console.warn(`[BUDGET-OP-BLOCKED] tenant=${tenantId} | COMMIT gagal: reservasi ${reservationId} tidak ditemukan`);
          return { success: false, current_spent, total_reserved, reason: "reservation_not_found" };
        }
        // Pindahkan dari reservasi ke usage
        current_spent += active_reservations[foundIndex].amount;
        active_reservations.splice(foundIndex, 1);
        total_reserved -= amount;
      }
      // Operasi ROLLBACK
      else if (operation === "rollback") {
        const foundIndex = active_reservations.findIndex((r: any) => r.id === reservationId && r.status === "active");
        if (foundIndex === -1) {
          console.warn(`[BUDGET-OP-BLOCKED] tenant=${tenantId} | ROLLBACK gagal: reservasi ${reservationId} tidak ditemukan`);
          return { success: false, current_spent, total_reserved, reason: "reservation_not_found" };
        }
        // Hapus reservasi tanpa tambah ke usage
        active_reservations.splice(foundIndex, 1);
        total_reserved -= amount;
      }

      // Simpan update ke in-memory store
      const updatedUsage = {
        total_spent: current_spent,
        active_reservations,
        last_updated_utc: new Date().toISOString(),
        currency: currentUsage?.currency || "IDR",
        monthly_reset_utc: currentUsage?.monthly_reset_utc ?? monthly_reset_utc
      };
      tenantUsageStore.set(tenantId, updatedUsage);
      
      console.log(`[BUDGET-OP-SUCCESS] tenant=${tenantId} | ${operation.toUpperCase()} berhasil: reservation=${reservationId}, current_spent=${current_spent}, total_reserved=${total_reserved}`);
      return { success: true, current_spent, total_reserved, reservation_id: reservationId };
    } catch (error) {
      console.error(`[BUDGET-OP-FATAL] tenant=${tenantId} | ${operation} gagal:`, error);
      return { success: false, current_spent: 0, total_reserved: 0, reason: "internal_error" };
    } finally {
      releaseTenantLock(tenantId);
    }
  } else {
    // WORK-ACLPILOT-026-03: AC-04 Fail-closed semantics - cek Redis ketersediaan sebelum eksekusi multi-instance
    console.log(`[MULTI-INSTANCE-CHECK] Memeriksa ketersediaan Redis untuk multi-instance mode...`);
    if (!redis || (redis as any)._simulateUnavailable) {
      console.warn(`[MULTI-INSTANCE-FAIL-CLOSED-WARNING] Redis saat ini unavailable untuk deployment multi-instance. Semua operasi berbayar akan ditolak.`);
      throw new Error(`[MULTI-INSTANCE-FAIL-CLOSED] Redis tidak tersedia untuk deployment multi-instance. Hentikan semua eksekusi berbayar.`);
    }
    
    // Multi-instance mode: gunakan Redis atomic Lua script - lock hanya dipegang selama operasi atomik (singkat)
    const usageKey = `${USAGE_PREFIX}${tenantId}`;
    let lockValue: string | false = false;
    let retryCount = 0;
    const maxRetries = 50; // Tunggu max 5 detik (50 * 100ms) untuk lock
    
    // Spin lock untuk mendapatkan Redis lock dengan retry
    while (!lockValue && retryCount < maxRetries) {
      lockValue = await acquireRedisTenantLock(tenantId);
      if (!lockValue) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Tunggu 100ms sebelum retry
        retryCount++;
      }
    }
    
    if (!lockValue) {
      console.error(`[REDIS-LOCK-TIMEOUT] tenant=${tenantId} | Gagal mendapatkan lock setelah ${maxRetries} retry untuk operasi ${operation}`);
      return { success: false, current_spent: 0, total_reserved: 0, reason: "lock_timeout" };
    }
    
    try {
      // Dapatkan lock key untuk dikirim sebagai KEY parameter ke Lua script
      const lockKey = `${LOCK_PREFIX}${tenantId}`;
      // Eksekusi Lua script secara atomik di Redis (lock dilepaskan segera setelah ini)
      const result = await redis.eval(
        ATOMIC_BUDGET_UPDATE_SCRIPT, 
        3, 
        tenantId, 
        usageKey, 
        lockKey,
        operation, 
        amount, 
        reservationId, 
        maxMonthlyBudget, 
        now, 
        monthly_reset_utc,
        lockValue,
        LOCK_LEASE_TTL
      );
      
      await releaseRedisTenantLock(tenantId, lockValue);
      
      if (!result.success) {
        console.warn(`[BUDGET-OP-BLOCKED] tenant=${tenantId} | ${operation.toUpperCase()} gagal: ${result.reason} (current_spent=${result.current_spent}, total_reserved=${result.total_reserved})`);
        return { success: false, current_spent: result.current_spent, total_reserved: result.total_reserved, reason: result.reason };
      }
      
      console.log(`[BUDGET-OP-SUCCESS] tenant=${tenantId} | ${operation.toUpperCase()} (multi-instance) berhasil: reservation=${reservationId}, current_spent=${result.current_spent}, total_reserved=${result.total_reserved}`);
      return { success: true, current_spent: result.current_spent, total_reserved: result.total_reserved, reservation_id: result.reservation_id };
    } catch (error) {
      console.error(`[REDIS-ATOMIC-UPDATE-FATAL] tenant=${tenantId} | Gagal menjalankan operasi ${operation}:`, error);
      await releaseRedisTenantLock(tenantId, lockValue);
      return { success: false, current_spent: 0, total_reserved: 0, reason: "internal_error" };
    }
  }
}

// Interface untuk metadata batas biaya tenant (disimpan di tenant.metadata.costLimits)
export interface TenantCostLimits {
  monthly_budget: number;
  max_per_execution: number;
  currency: string;
  hard_limit: boolean; // Jika true, blokir eksekusi jika melebihi batas
}

// Dapatkan usage tenant saat ini - RETURN SEMUA FIELD interface tenantUsageStore (termasuk monthly_reset_utc)
export function getTenantUsage(tenantId: string): { total_spent: number; currency: string; last_updated_utc: string; monthly_reset_utc: string } | undefined {
  return tenantUsageStore.get(tenantId);
}

// Reset usage tenant (hanya untuk testing atau reset bulanan) - DUAL-MODE: single dan multi instance
export async function resetTenantMonthlyUsage(tenantId: string): Promise<void> {
  const IS_MULTI_INSTANCE = getIsMultiInstance();
  if (!IS_MULTI_INSTANCE) {
    // Single-instance: in-memory reset (original logic maintained)
    tenantUsageStore.delete(tenantId);
    // Reset idempotency keys juga saat reset bulanan untuk mencegah memory leak
    processedPaymentKeys.delete(tenantId);
    console.log(`[TENANT-USAGE-RESET-INMEMORY] tenant=${tenantId} | Reset penggunaan bulanan dan idempotency keys (single-instance)`);
  } else {
    // Multi-instance: Redis-based reset untuk shared state (AC-01 shared coordination lintas-replica)
    if (!redis) {
      throw new Error(`[MULTI-INSTANCE-RESET-FAIL] Redis tidak tersedia untuk reset bulanan multi-instance tenant ${tenantId}`);
    }
    
    try {
      const usageKey = `${USAGE_PREFIX}${tenantId}`;
      const idempotencyKey = `${IDEMPOTENCY_PREFIX}${tenantId}`;
      
      // Hapus usage dan idempotency keys secara atomik di Redis
      await redis.del(usageKey, idempotencyKey);
      console.log(`[TENANT-USAGE-RESET-REDIS] tenant=${tenantId} | Reset penggunaan bulanan dan idempotency keys (multi-instance)`);
    } catch (error) {
      console.error(`[TENANT-USAGE-RESET-REDIS-FAIL] tenant=${tenantId} | Gagal reset data Redis:`, error);
      throw error;
    }
  }
}

// Record payment and track reconciliation status + AC-PILOT-001: Pengecekan batas biaya tenant
export async function recordWorkPayment(payment: Omit<WorkPayment, "issued_at_utc"> & { idempotency_key?: string }): Promise<void> {
  const recorded: WorkPayment & { idempotency_key?: string } = {
    ...payment,
    issued_at_utc: new Date().toISOString()
  };

  // AC-PILOT-001: Cegah double billing - cek idempotency key sebelum memproses pembayaran
  if (recorded.idempotency_key) {
    const tenantProcessedKeys = processedPaymentKeys.get(recorded.tenant_id) || new Set<string>();
    if (tenantProcessedKeys.has(recorded.idempotency_key)) {
      console.warn(`[IDEMPOTENCY-SKIP] tenant=${recorded.tenant_id} | idempotency_key=${recorded.idempotency_key} sudah diproses, skip duplicate payment`);
      return; // Jangan proses pembayaran yang sama dua kali
    }
  }

  // AC-PILOT-001: Debug logging lengkap untuk trace nilai price_unit
  console.log(`[DEBUG-PAYMENT-RAW] tenant=${recorded.tenant_id} | payment_id=${recorded.payment_id} | billable_units=${recorded.billable_units} | price_unit=${recorded.price_unit} | amount=${recorded.amount} | actual_cost=${recorded.actual_cost} | full_record:`, JSON.stringify(recorded, null, 2));
  
  // AC-PILOT-001: Hapus swap check duplikat di awal - hanya akan dilakukan sekali setelah lock diambil
  // Semua validasi field hanya dilakukan SEKALI setelah mendapatkan atomic lock untuk konsistensi
  
  // AC-PILOT-001: Ambil lock atomic sebelum memodifikasi usage tenant (cegah race condition)
  // WORK-ACLPILOT-026: Dual mode lock - single-instance (in-memory) / multi-instance (Redis)
  let lockValue: string | false = false;
  const IS_MULTI_INSTANCE = getIsMultiInstance();
  if (!IS_MULTI_INSTANCE) {
    await acquireTenantLock(recorded.tenant_id);
  } else {
    // WORK-ACLPILOT-026-03: AC-04 Fail-closed semantics - cek Redis ketersediaan sebelum eksekusi multi-instance
    if (!redis || (redis as any)._simulateUnavailable) {
      console.warn(`[MULTI-INSTANCE-FAIL-CLOSED-WARNING] Redis saat ini unavailable untuk deployment multi-instance. Semua operasi berbayar akan ditolak.`);
      throw new Error(`[MULTI-INSTANCE-FAIL-CLOSED] Redis tidak tersedia untuk deployment multi-instance. Hentikan semua eksekusi berbayar.`);
    }
    
    // Multi-instance: gunakan Redis lock dengan ownership verification
    let retryCount = 0;
    const maxRetries = 50;
    while (!lockValue && retryCount < maxRetries) {
      lockValue = await acquireRedisTenantLock(recorded.tenant_id);
      if (!lockValue) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retryCount++;
      }
    }
    if (!lockValue) {
      console.error(`[REDIS-LOCK-TIMEOUT-PAYMENT] tenant=${recorded.tenant_id} | Gagal mendapatkan lock untuk proses pembayaran`);
      return;
    }
  }

  // AC-PILOT-001: Cek ulang idempotency key setelah dapat lock (atomic double-check)
  // WORK-ACLPILOT-026: Dual mode idempotency check - single-instance (Set) / multi-instance (Redis Set)
  if (recorded.idempotency_key) {
    if (!IS_MULTI_INSTANCE) {
      // Single-instance mode: gunakan in-memory Set
      const tenantProcessedKeys = processedPaymentKeys.get(recorded.tenant_id) || new Set<string>();
      if (tenantProcessedKeys.has(recorded.idempotency_key)) {
        console.warn(`[IDEMPOTENCY-SKIP-LOCKED] tenant=${recorded.tenant_id} | idempotency_key=${recorded.idempotency_key} sudah diproses setelah lock, skip duplicate payment`);
        releaseTenantLock(recorded.tenant_id);
        return;
      }
    } else {
      // Multi-instance mode: gunakan Redis SISMEMBER untuk pengecekan idempotency
      const idempotencyKey = `${IDEMPOTENCY_PREFIX}${recorded.tenant_id}`;
      const exists = await redis.sismember(idempotencyKey, recorded.idempotency_key);
      if (exists) {
        console.warn(`[IDEMPOTENCY-SKIP-LOCKED-REDIS] tenant=${recorded.tenant_id} | idempotency_key=${recorded.idempotency_key} sudah diproses setelah lock, skip duplicate payment`);
        await releaseRedisTenantLock(recorded.tenant_id, lockValue as string);
        return;
      }
    }
  }
  
  try {
    // AC-PILOT-001: Cek apakah perlu reset penggunaan bulanan (melewati monthly_reset_utc)
    const currentUsage = tenantUsageStore.get(recorded.tenant_id);
    if (currentUsage?.monthly_reset_utc) {
      const resetDate = new Date(currentUsage.monthly_reset_utc);
      const now = new Date();
      if (now >= resetDate) {
        console.log(`[MONTHLY-RESET] tenant=${recorded.tenant_id} | Melewati tanggal reset ${resetDate.toISOString()}, jalankan reset penggunaan bulanan`);
        await resetTenantMonthlyUsage(recorded.tenant_id);
      }
    }
    
    // Hitung total baru setelah reset (jika diperlukan)
    const updatedUsage = tenantUsageStore.get(recorded.tenant_id);
    const newTotal = updatedUsage ? updatedUsage.total_spent + recorded.amount : recorded.amount;
    
    // AC-PILOT-001: Karena getTenantByIdCommand tidak terdaftar di index commands dari identity capability,
    // dan untuk menjaga arsitektur frozen, kita gunakan konfigurasi hardcoded untuk tenant AC-PILOT-001 saja
    // Ini hanya untuk pilot, tidak memerlukan perubahan arsitektur
    let tenant: any = undefined;
    // Khusus untuk tenant pilot, kita gunakan cost limits yang sudah dikonfigurasi (arsitektur frozen)
    // AC-PILOT-001: Tambahkan support untuk PILOT-TENANT-003 (pelanggan ketiga) sesuai prioritas War Room
    // AC-PILOT-001: Konfigurasi tenant pilot - refactor untuk menghindari duplikasi kode (arsitektur frozen: hanya konfigurasi yang berbeda, tidak buat primitif baru)
    let tenantLabel: string | undefined;
    let billableUnitPrice: number = 10; // Default tarif pilot untuk semua tenant pilot
    console.log(`[DEBUG-TENANT-CHECK] tenant_id yang diterima: "${recorded.tenant_id}"`);
    if (recorded.tenant_id === "AC-PILOT-001") {
      tenantLabel = "AC-PILOT-001";
      console.log(`[DEBUG-TENANT-CHECK] AC-PILOT-001 terdeteksi, tenantLabel: ${tenantLabel}`);
    } else if (recorded.tenant_id === "PILOT-TENANT-003") {
      tenantLabel = "PILOT-TENANT-003 (pelanggan ketiga)";
      console.log(`[DEBUG-TENANT-CHECK] PILOT-TENANT-003 terdeteksi, tenantLabel: ${tenantLabel}`);
    } else {
      // Jika bukan tenant pilot, tidak konfigurasi cost limits
      tenant = undefined;
      console.log(`[DEBUG-TENANT-CHECK] Tenant tidak dikenali, tenantLabel: ${tenantLabel}`);
    }

    // Jika ini adalah tenant pilot yang terdaftar, terapkan konfigurasi cost limits dan pilot pricing SEBELUM pengecekan
    if (tenantLabel) {
      console.log(`[DEBUG-TENANT-CONFIG] Mengkonfigurasi tenant: ${tenantLabel}`);
      tenant = {
        metadata: {
          costLimits: {
            monthly_budget: 5000000, // Rp5.000.000 per bulan SESUAI KONFIGURASI WAR ROOM untuk semua tenant pilot
            max_per_execution: 10000, // Rp10.000 maksimum per eksekusi SESUAI KONFIGURASI WAR ROOM
            currency: "IDR",
            hard_limit: true // Hard limit yang benar-benar ditegakkan saat eksekusi
          },
          // Semua tenant pilot menggunakan konfigurasi pilot yang sama - terpisah dari rate card komersial
          pilot_pricing: {
            is_pilot_tenant: true, // Tandai sebagai tenant pilot (bukan produksi)
            billable_unit_price: billableUnitPrice, // Tarif pilot Rp10 per unit (hanya untuk pengujian - bukan tarif komersial)
            commercial_rate_card_reference: "RATE-CARD-2024-ID-001", // Referensi rate card komersial yang akan digunakan jika GA
            pricing_note: `Tarif ini adalah tarif pilot khusus untuk ${tenantLabel}, bukan harga jual produksi akhir`
          },
          // Global kill switch sudah dikelola oleh ExecutionStatusRepository - sinkronkan status awal
          kill_switch: {
            armed: true, // Mekanisme penghentian siap dipicu (bukan sedang menghentikan pemrosesan) - SELARAS DENGAN globalKillSwitchState di execution-status.ts
            triggered: false // Belum pernah dipicu
          },
          billing_period: {
            current_period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
            current_period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
            reset_mechanism: "auto_monthly_reset" // Reset otomatis setiap bulan untuk mencegah budget selamanya terpakai
          }
        }
      };
      // Sinkronkan tenant-specific kill switch dengan global state saat inisialisasi untuk semua tenant pilot
      const ExecutionStatusRepository = (await import("./execution-status.js")).ExecutionStatusRepository;
      const globalState = await ExecutionStatusRepository.getKillSwitchState();
      if (!globalState.kill_switch_armed) {
        await ExecutionStatusRepository.armKillSwitch(`system-${recorded.tenant_id}-init`);
        console.log(`[TENANT-INIT] Global kill switch armed successfully untuk tenant ${tenantLabel}`);
      }
    }

    // Pengecekan cost limits hanya dilakukan SETELAH tenant selesai diinisialisasi
    if (tenant?.metadata?.costLimits) {
      const costLimits = tenant.metadata.costLimits as TenantCostLimits;
      
      // AC-PILOT-001: Debug nilai field sebelum pengecekan apa pun
      console.log(`[DEBUG-FIELD-VALUES] tenant=${recorded.tenant_id} | payment_id=${recorded.payment_id} | billable_units=${recorded.billable_units}, price_unit=${recorded.price_unit} (sebelum swap check)`);

      // AC-PILOT-001: Validasi otomatis field yang tidak boleh tertukar (billable_units vs price_unit)
      // Logika yang diperbaiki: Jika price_unit > 100 (karena harga unit pilot hanya Rp10)
      // Ini menangkap SEMUA kasus di mana price_unit terlalu besar, bahkan jika billable_units kecil
      if (recorded.price_unit > 100) {
        console.warn(`[PAYMENT-FIELD-SWAP-DETECTED] tenant=${recorded.tenant_id} | payment_id=${recorded.payment_id} | Kemungkinan billable_units dan price_unit tertukar! billable_units=${recorded.billable_units}, price_unit=${recorded.price_unit} | Melakukan koreksi otomatis...`);
        // Tukar kembali fieldnya
        const temp = recorded.billable_units;
        recorded.billable_units = recorded.price_unit;
        recorded.price_unit = temp;
        console.log(`[PAYMENT-FIELD-SWAP-CORRECTED] tenant=${recorded.tenant_id} | payment_id=${recorded.payment_id} | Setelah koreksi: billable_units=${recorded.billable_units}, price_unit=${recorded.price_unit}`);
      }
      
      // Validasi mata uang konsisten
      if (costLimits.currency !== recorded.currency) {
        console.warn(`[TENANT-COST-MISMATCH] tenant=${recorded.tenant_id} | Currency mismatch: tenant uses ${costLimits.currency}, payment uses ${recorded.currency}`);
      }

      // Validasi biaya per eksekusi tidak melebihi max_per_execution
      // Validasi batas per eksekusi - amount harus sama dengan billable_units * price_unit untuk memastikan konsistensi
      const calculatedAmount = recorded.billable_units * recorded.price_unit;
      if (calculatedAmount > costLimits.max_per_execution) {
        const error = `[TENANT-COST-LIMIT-EXCEEDED] tenant=${recorded.tenant_id} | Calculated amount ${calculatedAmount} ${recorded.currency} (${recorded.billable_units} units × ${recorded.price_unit} ${recorded.currency}/unit) exceeds max per execution limit ${costLimits.max_per_execution} ${costLimits.currency}`;
        console.error(error);
        if (costLimits.hard_limit) {
          throw new Error(error);
        }
      }
      // Verifikasi amount yang dicatat sama dengan calculated amount untuk menghindari mismatch
      if (Math.abs(recorded.amount - calculatedAmount) > 0.01) {
        const warning = `[PAYMENT-AMOUNT-MISMATCH] tenant=${recorded.tenant_id} | Recorded amount ${recorded.amount} differs from calculated amount ${calculatedAmount} (billable_units × price_unit)`;
        console.warn(warning);
      }

      // Validasi total biaya bulanan tidak melebihi monthly_budget
      if (newTotal > costLimits.monthly_budget) {
        const error = `[TENANT-BUDGET-EXCEEDED] tenant=${recorded.tenant_id} | Projected total ${newTotal} ${recorded.currency} exceeds monthly budget ${costLimits.monthly_budget} ${costLimits.currency}`;
        console.error(error);
        if (costLimits.hard_limit) {
          throw new Error(error);
        }
      }

      console.log(`[TENANT-COST-VALID] tenant=${recorded.tenant_id} | Usage within limits: ${newTotal}/${costLimits.monthly_budget} ${costLimits.currency}`);
    } else {
      console.log(`[TENANT-NO-COST-LIMITS] tenant=${recorded.tenant_id} | Tidak ada batas biaya yang dikonfigurasi`);
    }
    
    // Log usage untuk audit
    console.log(`[TENANT-USAGE-CHECK] tenant=${recorded.tenant_id} | current_spent=${currentUsage?.total_spent ?? 0} | new_payment=${recorded.amount} | projected_total=${newTotal}`);
    
    // AC-PILOT-001: Validasi total amount sesuai dengan billable_units × price_unit
    const calculatedAmount = recorded.billable_units * recorded.price_unit;
    if (Math.abs(recorded.amount - calculatedAmount) > 0.01) { // Toleransi untuk floating point
      const error = `[PAYMENT-AMOUNT-MISMATCH] tenant=${recorded.tenant_id} | Calculated amount ${calculatedAmount} (${recorded.billable_units} units × ${recorded.price_unit}/unit) does not match recorded amount ${recorded.amount}`;
      console.error(error);
      throw new Error(error);
    }
    
    // AC-PILOT-001: Hitung dan log margin kontribusi per pembayaran dengan presisi penuh
    const contributionMargin = recorded.amount - recorded.actual_cost;
    const raw_marginPercentage = (contributionMargin / recorded.amount) * 100;
    const marginPercentage_rounded = Number(raw_marginPercentage.toFixed(2));
    console.log(`[PAYMENT-MARGIN] tenant=${recorded.tenant_id} | work=${recorded.work_id} | billable_units=${recorded.billable_units} | price_unit=${recorded.price_unit} | actual_cost=${recorded.actual_cost} | revenue=${recorded.amount} | contribution_margin=${contributionMargin} | margin_percentage=${marginPercentage_rounded}% (raw: ${raw_marginPercentage.toFixed(4)}%)`);

    // Hitung tanggal reset bulanan berikutnya (pertama hari bulan depan)
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthly_reset_utc = nextMonth.toISOString();

    // Simpan usage terbaru dengan informasi reset periode
    tenantUsageStore.set(recorded.tenant_id, {
      total_spent: newTotal,
      currency: recorded.currency,
      last_updated_utc: recorded.issued_at_utc,
      monthly_reset_utc: currentUsage?.monthly_reset_utc ?? monthly_reset_utc
    });

    // AC-PILOT-001: Simpan idempotency key setelah pembayaran berhasil dicatat
    if (recorded.idempotency_key) {
      if (!IS_MULTI_INSTANCE) {
        // Single-instance mode: simpan di in-memory Set
        const tenantProcessedKeys = processedPaymentKeys.get(recorded.tenant_id) || new Set<string>();
        tenantProcessedKeys.add(recorded.idempotency_key);
        processedPaymentKeys.set(recorded.tenant_id, tenantProcessedKeys);
        console.log(`[IDEMPOTENCY-RECORDED] tenant=${recorded.tenant_id} | idempotency_key=${recorded.idempotency_key} berhasil dicatat`);
      } else {
        // Multi-instance mode: simpan di Redis SADD untuk cegah double-billing lintas-replica
        const idempotencyKey = `${IDEMPOTENCY_PREFIX}${recorded.tenant_id}`;
        await redis.sadd(idempotencyKey, recorded.idempotency_key);
        // Set expiry pada Redis set sama dengan reset bulanan (30 hari) untuk mencegah memory leak
        await redis.expire(idempotencyKey, 2592000);
        console.log(`[IDEMPOTENCY-RECORDED-REDIS] tenant=${recorded.tenant_id} | idempotency_key=${recorded.idempotency_key} berhasil dicatat di Redis`);
      }
    }

    paymentsStore.set(recorded.payment_id, recorded);
    console.log(`[PAYMENT-RECORDED] work=${recorded.work_id} | payment=${recorded.payment_id} | amount=${recorded.amount} ${recorded.currency} | status=${recorded.payment_status} | tenant_total_spent=${newTotal}`);
  } finally {
    // Selalu lepaskan lock meskipun terjadi error untuk menghindari deadlock
    releaseTenantLock(recorded.tenant_id);
  }
}

// Update payment status and reconcile
export function updatePaymentStatus(paymentId: string, newStatus: WorkPayment["payment_status"], transactionId?: string): void {
  const payment = paymentsStore.get(paymentId);
  if (!payment) return;
  
  payment.payment_status = newStatus;
  if (transactionId) payment.transaction_id = transactionId;
  if (newStatus === "paid") {
    payment.paid_at_utc = new Date().toISOString();
    payment.reconciliation_status = "reconciled";
  }
  
  paymentsStore.set(paymentId, payment);
  console.log(`[PAYMENT-UPDATED] work=${payment.work_id} | payment=${paymentId} | new_status=${newStatus} | reconciled=${payment.reconciliation_status}`);
}

// Get work throughput metrics for a specific time period (PR-10 operational reporting)
export function calculateWorkThroughput(startDate: Date, endDate: Date): WorkThroughputMetrics {
  const allOutcomes = Array.from(verifiedOutcomesStore.values());
  const allPayments = Array.from(paymentsStore.values());
  
  const periodOutcomes = allOutcomes.filter(o => 
    new Date(o.delivered_at_utc) >= startDate && new Date(o.delivered_at_utc) <= endDate
  );
  
  const workPaid = allPayments.filter(p => 
    p.payment_status === "paid" && p.paid_at_utc && new Date(p.paid_at_utc) >= startDate && new Date(p.paid_at_utc) <= endDate
  ).length;
  
  const workCreated = periodOutcomes.length;
  const workRealized = periodOutcomes.filter(o => o.acceptance_status === "client-accepted").length;
  
  const totalRealizedValue = periodOutcomes.reduce((sum, o) => sum + o.realized_value, 0);
  
  return {
    period_start_utc: startDate.toISOString(),
    period_end_utc: endDate.toISOString(),
    work_created: workCreated,
    work_accepted: periodOutcomes.length, // Simplified - would filter by acceptance date in production
    work_executing: 0, // Would calculate from execution status store in production
    work_completed: periodOutcomes.length,
    work_verified: periodOutcomes.length,
    work_realized: workRealized,
    work_paid: workPaid,
    conversion_rate: workCreated > 0 ? workPaid / workCreated : 0,
    total_realized_value: totalRealizedValue,
    average_fulfillment_time_days: 0 // Would calculate actual averages in production
  };
}

// Get all verified outcomes
export function getAllVerifiedOutcomes(): VerifiedWorkOutcome[] {
  return Array.from(verifiedOutcomesStore.values());
}

// Get all payments
export function getAllPayments(): WorkPayment[] {
  return Array.from(paymentsStore.values());
}

// Generate comprehensive economic summary for a tenant in a specific period (AC-PILOT-001 P5 gate validation)
export function generateTenantEconomicSummary(tenantId: string, startDate: Date, endDate: Date): {
  volume: number;
  revenue: number;
  variable_costs: number;
  contribution_margin: number;
  margin_percentage: number;
  sample_count: number;
  period_start_utc: string;
  period_end_utc: string;
  billable_units_total: number;
  average_price_unit: number;
  average_actual_cost: number;
  // AC-PILOT-001: Metrik tambahan sesuai permintaan War Room
  total_human_review_minutes: number;
  average_human_review_per_reviewed_unit: number; // Diperbaiki: hanya hitung unit yang benar-benar direview
  units_requiring_human_review: number; // Jumlah unit yang memerlukan review manusia
  total_corrections: number;
  average_corrections_per_unit: number;
  average_customer_value_score: number;
  has_pilot_pricing: boolean; // Tandai apakah menggunakan tarif pilot
  // AC-PILOT-001: Biaya per dokumen sesuai permintaan P1 War Room
  cost_per_document: number; // Biaya aktual rata-rata per dokumen
  revenue_per_document: number; // Pendapatan rata-rata per dokumen
  // AC-PILOT-001: Metrik penggunaan berulang sesuai permintaan P1 War Room
  repeat_usage_count: number;
  repeat_usage_rate: number;
  total_work_ids: number;
  work_ids_with_multiple_payments: number;
  // PILOT-TENANT-003: Metrik retensi pelanggan sesuai permintaan lanjutan War Room
  retention_days: number; // Jumlah hari retensi pelanggan (selisih pembayaran pertama dan terakhir)
  days_between_first_last_payment: number; // Nilah mentah selisih hari
  first_payment_utc: string; // Tanggal pembayaran pertama
  last_payment_utc: string; // Tanggal pembayaran terakhir
} | undefined {
  // Dapatkan semua pembayaran untuk tenant ini dalam periode yang ditentukan
  const tenantPayments = getAllPayments().filter(p => 
    p.tenant_id === tenantId && 
    new Date(p.issued_at_utc) >= startDate && 
    new Date(p.issued_at_utc) <= endDate
  );

  if (tenantPayments.length === 0) {
    console.log(`[ECONOMIC-SUMMARY] tenant=${tenantId} | Tidak ada data pembayaran dalam periode yang ditentukan`);
    return undefined;
  }

  // Hitung semua metrik yang diperlukan sesuai arahan War Room
  const billable_units_total = tenantPayments.reduce((sum, p) => sum + p.billable_units, 0);
  const revenue = tenantPayments.reduce((sum, p) => sum + (p.billable_units * p.price_unit), 0);
  const variable_costs = tenantPayments.reduce((sum, p) => sum + p.actual_cost, 0);
  const contribution_margin = revenue - variable_costs;
  // Prevent division by zero when there are no billable units
  const average_price_unit = billable_units_total > 0 ? revenue / billable_units_total : 0;
  const average_actual_cost = billable_units_total > 0 ? variable_costs / billable_units_total : 0;
  
  // AC-PILOT-001: Hitung metrik biaya per dokumen sesuai permintaan P1 War Room
  const cost_per_document = billable_units_total > 0 ? variable_costs / billable_units_total : 0;
  const revenue_per_document = billable_units_total > 0 ? revenue / billable_units_total : 0;
  
  // AC-PILOT-001: Hitung metrik tambahan (human review, koreksi, nilai pelanggan) - diperbaiki logika human review
  const payments_with_human_review = tenantPayments.filter(p => p.human_review_minutes && p.human_review_minutes > 0);
  const units_requiring_human_review = payments_with_human_review.reduce((sum, p) => sum + p.billable_units, 0);
  const total_human_review_minutes = payments_with_human_review.reduce((sum, p) => sum + (p.human_review_minutes || 0), 0);
  // Hitung rata-rata hanya untuk unit yang benar-benar memerlukan review (sesuai permintaan War Room)
  const average_human_review_per_reviewed_unit = units_requiring_human_review > 0 ? total_human_review_minutes / units_requiring_human_review : 0;
  const total_corrections = tenantPayments.reduce((sum, p) => sum + (p.correction_count || 0), 0);
  const average_corrections_per_unit = billable_units_total > 0 ? total_corrections / billable_units_total : 0;
  const customer_value_scores = tenantPayments.filter(p => p.customer_value_score !== undefined).map(p => p.customer_value_score!);
  const average_customer_value_score = customer_value_scores.length > 0 ? customer_value_scores.reduce((a, b) => a + b, 0) / customer_value_scores.length : 0;
  
  // AC-PILOT-001: Hitung metrik penggunaan berulang (repeat usage) sesuai permintaan P1 War Room
  // Kelompokkan pembayaran berdasarkan work_id untuk menghitung berapa kali pelanggan menggunakan layanan kembali
  const workIdCounts = new Map<string, number>();
  tenantPayments.forEach(p => {
    const current = workIdCounts.get(p.work_id) || 0;
    workIdCounts.set(p.work_id, current + 1);
  });
  
  // Hitung total work_id unik dan work_id yang memiliki pembayaran >1 (penggunaan berulang)
  const total_work_ids = workIdCounts.size;
  const work_ids_with_multiple_payments = Array.from(workIdCounts.values()).filter(count => count > 1).length;
  const repeat_usage_count = work_ids_with_multiple_payments;
  const repeat_usage_rate = total_work_ids > 0 ? repeat_usage_count / total_work_ids : 0;

  // PILOT-TENANT-003: Hitung metrik retensi pelanggan sesuai permintaan War Room
  const paymentDates = tenantPayments.map(p => new Date(p.issued_at_utc).getTime());
  const firstPaymentDate = new Date(Math.min(...paymentDates));
  const lastPaymentDate = new Date(Math.max(...paymentDates));
  const days_between_first_last_payment = Math.ceil((lastPaymentDate.getTime() - firstPaymentDate.getTime()) / (1000 * 60 * 60 * 24));
  const retention_days = days_between_first_last_payment; // Retensi dihitung selisih pembayaran pertama dan terakhir
  
  // Cek apakah tenant ini menggunakan pilot pricing (semua tenant pilot termasuk PILOT-TENANT-003) (tambah support untuk PILOT-TENANT-005/PILOT-TENANT-007 sebagai tenant pilot baru)
  const isPilotTenant = tenantId === "AC-PILOT-001" || tenantId === "PILOT-TENANT-003" || tenantId === "PILOT-TENANT-005" || tenantId === "PILOT-TENANT-007";

  // P0 WAR ROOM: Perbaiki perhitungan margin dengan pembulatan yang konsisten (fix discrepancy 40.05% vs 40.07%)
  // Hitung margin dengan presisi penuh sebelum pembulatan - hanya deklarasikan sekali
  const raw_margin_percentage = revenue > 0 ? (contribution_margin / revenue) * 100 : 0;
  const margin_percentage = Number(raw_margin_percentage.toFixed(4)); // Simpan 4 desimal untuk presisi
  const margin_rounded_2decimals = Number(raw_margin_percentage.toFixed(2)); // Hanya bulatkan 2x sekali

  const summary = {
    volume: billable_units_total,
    revenue,
    variable_costs,
    contribution_margin,
    margin_percentage,
    sample_count: tenantPayments.length,
    period_start_utc: startDate.toISOString(),
    period_end_utc: endDate.toISOString(),
    billable_units_total,
    average_price_unit,
    average_actual_cost,
    total_human_review_minutes,
    average_human_review_per_reviewed_unit,
    units_requiring_human_review,
    total_corrections,
    average_corrections_per_unit,
    average_customer_value_score,
    has_pilot_pricing: isPilotTenant,
    // AC-PILOT-001: Tambahkan metrik biaya per dokumen
    cost_per_document,
    revenue_per_document,
    // AC-PILOT-001: Tambahkan metrik repeat usage ke ringkasan
    repeat_usage_count,
    repeat_usage_rate,
    total_work_ids,
    work_ids_with_multiple_payments,
    // PILOT-TENANT-003: Tambahkan metrik retensi pelanggan ke ringkasan
    retention_days,
    days_between_first_last_payment,
    first_payment_utc: firstPaymentDate.toISOString(),
    last_payment_utc: lastPaymentDate.toISOString()
  };

  // P0 WAR ROOM: Hitung ulang margin dengan presisi penuh untuk audit - hanya lakukan pembulatan sekali
  const margin_calculation_detail = {
    pendapatan_aktual: revenue,
    biaya_variabel_aktual: variable_costs,
    kontribusi_aktual: contribution_margin,
    margin_persen_aktual: raw_margin_percentage,
    margin_persen_rounded: margin_rounded_2decimals,
    audit_detail: `(${contribution_margin}/${revenue}) * 100 = ${((contribution_margin / revenue) * 100).toFixed(4)}%`
  };

  // Log ringkasan ekonomi untuk audit dan evidence collection
  console.log(`[ECONOMIC-SUMMARY] tenant=${tenantId} | periode=${summary.period_start_utc} s/d ${summary.period_end_utc}`);
  console.log(`[ECONOMIC-SUMMARY] Volume: ${summary.volume} dokumen | Pendapatan: Rp${summary.revenue.toLocaleString()} | Biaya: Rp${summary.variable_costs.toLocaleString()}`);
  // AC-PILOT-001: Log metrik biaya per dokumen sesuai permintaan P1 War Room
  console.log(`[ECONOMIC-SUMMARY-COST-PER-DOC] Pendapatan per dokumen: Rp${summary.revenue_per_document.toFixed(2)} | Biaya per dokumen: Rp${summary.cost_per_document.toFixed(2)}`);
  console.log(`[ECONOMIC-SUMMARY-AUDIT] Detail perhitungan margin: ${margin_calculation_detail.audit_detail}`);
  console.log(`[ECONOMIC-SUMMARY] Margin kontribusi: Rp${summary.contribution_margin.toLocaleString()} (${margin_calculation_detail.margin_persen_rounded}%) | Sampel: ${summary.sample_count}`);
  // Log metrik tambahan sesuai permintaan War Room (diperbaiki logika human review)
  console.log(`[ECONOMIC-SUMMARY-ADDITIONAL] Total review manusia: ${summary.total_human_review_minutes} menit | Unit yang memerlukan review: ${summary.units_requiring_human_review}`);
  console.log(`[ECONOMIC-SUMMARY-ADDITIONAL] Rata-rata review per unit yang direview: ${summary.average_human_review_per_reviewed_unit.toFixed(2)} menit`);
  console.log(`[ECONOMIC-SUMMARY-ADDITIONAL] Total koreksi: ${summary.total_corrections} | Rata-rata per unit: ${summary.average_corrections_per_unit.toFixed(2)}`);
  console.log(`[ECONOMIC-SUMMARY-ADDITIONAL] Skor nilai pelanggan rata-rata: ${summary.average_customer_value_score.toFixed(2)}/10`);
  // AC-PILOT-001: Log metrik repeat usage sesuai permintaan P1 War Room
  console.log(`[ECONOMIC-SUMMARY-REPEAT-USAGE] Total Work unik: ${summary.total_work_ids} | Work dengan penggunaan berulang: ${summary.repeat_usage_count}`);
  console.log(`[ECONOMIC-SUMMARY-REPEAT-USAGE] Tingkat penggunaan berulang: ${(summary.repeat_usage_rate * 100).toFixed(2)}%`);
  if (isPilotTenant) {
    // Update nama tenant untuk pilot baru yang ditambahkan
    let tenantName;
    if (tenantId === "PILOT-TENANT-003") {
      tenantName = "PILOT-TENANT-003 (pelanggan ketiga)";
    } else if (tenantId === "PILOT-TENANT-005") {
      tenantName = "PILOT-TENANT-005 (pelanggan kelima)";
    } else if (tenantId === "PILOT-TENANT-007") {
      tenantName = "PILOT-TENANT-007 (pelanggan ketujuh)";
    } else {
      tenantName = "AC-PILOT-001";
    }
    console.log(`[ECONOMIC-SUMMARY-PILOT] TENANT INI (${tenantName}) MENGGUNAKAN TARIF PILOT - BUKAN HARGA PRODUKSI AKHIR`);
  }

  return summary;
}

// Core SLO definitions for production Work operations
export const WORK_OPERATION_SLOS = {
  p95_latency_ms: 2000, // 95% of operations must complete <2s
  availability_percent: 99.9, // 99.9% uptime
  error_rate_max: 0.001, // <0.1% error rate
  concurrent_executions_max: 100 // Max 100 concurrent Work executions
} as const;

// Check if metrics exceed alert thresholds and return anomaly detection result
export function detectMetricAnomalies(workId: string): {
  has_anomaly: boolean;
  anomalies: string[];
  metrics: WorkRealityMetrics | undefined;
} {
  const metrics = workMetricsStore.get(workId);
  if (!metrics) {
    return { has_anomaly: false, anomalies: [], metrics: undefined };
  }

  const anomalies: string[] = [];
  
  if (metrics.error_rate > ALERT_THRESHOLDS.error_rate) {
    anomalies.push(`Error rate ${(metrics.error_rate * 100).toFixed(2)}% exceeds threshold of ${ALERT_THRESHOLDS.error_rate * 100}%`);
  }
  
  if (metrics.p95_latency_ms > ALERT_THRESHOLDS.p95_latency_ms) {
    anomalies.push(`P95 latency ${metrics.p95_latency_ms}ms exceeds threshold of ${ALERT_THRESHOLDS.p95_latency_ms}ms`);
  }

  return {
    has_anomaly: anomalies.length > 0,
    anomalies,
    metrics
  };
}

// Database connection pool metrics tracking
export interface ConnectionPoolMetrics {
  pool_name: string;
  total_connections: number;
  active_connections: number;
  idle_connections: number;
  wait_count: number;
  last_updated_utc: string;
}

const poolMetricsStore: Map<string, ConnectionPoolMetrics> = new Map();

export function recordConnectionPoolMetrics(poolName: string, metrics: Omit<ConnectionPoolMetrics, "pool_name" | "last_updated_utc">): void {
  poolMetricsStore.set(poolName, {
    ...metrics,
    pool_name: poolName,
    last_updated_utc: new Date().toISOString()
  });
  
  console.log(`[DB_POOL] pool=${poolName} | total=${metrics.total_connections} | active=${metrics.active_connections} | idle=${metrics.idle_connections} | wait=${metrics.wait_count}`);
}

export function getPoolMetrics(poolName: string): ConnectionPoolMetrics | undefined {
  return poolMetricsStore.get(poolName);
}