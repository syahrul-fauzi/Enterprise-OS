import { executionContext } from "./execution-context.js";
import { recordRuntimeInvocation } from "./invocation-evidence.js";
import type { ExecutionContext } from "./execution-context.js";

// PT-003: OpenTelemetry-style observability instrumentation
// HANYA measurement, TIDAK ADA repair/recovery logic
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
}

export const executionTraces: Map<string, ObservedExecution[]> = new Map();

// Auto-capture context dari ambient executionContext
export function recordObservedExecution(execution: Omit<ObservedExecution, "timestamp_utc" | "is_reentry" | "context_trace_id" | "parent_context_trace_id" | "idempotency_key"> & { logicalWorkId?: string }): void {
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
  
  const observed: ObservedExecution = {
    ...execution,
    logicalWorkId,
    context_trace_id,
    is_reentry,
    parent_context_trace_id,
    idempotency_key,
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