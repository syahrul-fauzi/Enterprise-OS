export type {
  MountedCapability,
  RuntimeMountResult,
  RuntimeLifecycle,
  HostEnvironment,
} from "./types.js";
export { Runtime } from "./runtime.js";
export { recordRuntimeInvocation, traceExecutionByDecision } from "./invocation-evidence.js";
export type { RuntimeInvocationEvent } from "./invocation-evidence.js";
export { executionContext } from "./execution-context.js";
export { recordObservedExecution, getTraceForDecision, detectReentryAnomalies, verifyWorkIdCorrelation, calculateExponentialBackoff, shouldOpenCircuitBreaker, shouldResetCircuitBreaker } from "./execution-observability.js";
export type { ObservedExecution } from "./execution-observability.js";
export type { ExecutionContext } from "./execution-context.js";
export type { ResolvedWorkspace } from "@repo/composition";