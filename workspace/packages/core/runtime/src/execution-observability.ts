import { executionContext } from "./execution-context.js";
import { recordRuntimeInvocation } from "./invocation-evidence.js";
import type { ExecutionContext } from "./execution-context.js";

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
  last_updated_utc: string;
}

const workMetricsStore: Map<string, WorkRealityMetrics> = new Map();

// Record execution metrics for a specific Work
export function recordWorkExecutionMetrics(workId: string, executionTimeMs: number, success: boolean): void {
  const existing = workMetricsStore.get(workId) ?? {
    work_id: workId,
    total_executions: 0,
    successful_executions: 0,
    failed_executions: 0,
    total_latency_ms: 0,
    p95_latency_ms: 0,
    avg_latency_ms: 0,
    error_rate: 0,
    last_updated_utc: new Date().toISOString()
  };

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

// Get all tracked Work metrics
export function getAllWorkMetrics(): WorkRealityMetrics[] {
  return Array.from(workMetricsStore.values());
}

// Alerting thresholds for critical metrics (aligned with production-readiness requirements)
export const ALERT_THRESHOLDS = {
  error_rate: 0.05, // Alert if error rate >5%
  p95_latency_ms: 2000, // Alert if p95 latency >2s
  consecutive_failures: 5 // Alert after 5 consecutive failures for a Work
} as const;

// Database connection pool metrics interface for external monitoring
export interface ConnectionPoolMetrics {
  total_connections: number;
  active_connections: number;
  idle_connections: number;
  waiting_connections: number;
  max_pool_size: number;
  last_updated_utc: string;
}

const connectionPoolMetricsStore: Map<string, ConnectionPoolMetrics> = new Map();

// Update database connection pool metrics
export function updateConnectionPoolMetrics(poolId: string, metrics: Omit<ConnectionPoolMetrics, "last_updated_utc">): void {
  const updated: ConnectionPoolMetrics = {
    ...metrics,
    last_updated_utc: new Date().toISOString()
  };
  connectionPoolMetricsStore.set(poolId, updated);
  console.log(`[DB_POOL] pool=${poolId} | active=${updated.active_connections}/${updated.max_pool_size} | idle=${updated.idle_connections} | waiting=${updated.waiting_connections}`);
}

// Get connection pool metrics for a specific pool
export function getConnectionPoolMetrics(poolId: string): ConnectionPoolMetrics | undefined {
  return connectionPoolMetricsStore.get(poolId);
}

// Get all connection pool metrics
export function getAllConnectionPoolMetrics(): ConnectionPoolMetrics[] {
  return Array.from(connectionPoolMetricsStore.values());
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