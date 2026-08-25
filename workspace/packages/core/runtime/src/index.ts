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
// SERVER-ONLY MODULES (ExecutionStatusRepository + EmailQueueRepository) are intentionally
// NOT exported from this barrel. They have top-level side effects and depend on
// Node.js-only packages (ioredis → net/tls). Exporting them here forces every
// consumer of this barrel — including browser code — to pull in Node.js built-ins,
// which breaks Next.js client bundles with "Can't resolve 'net'" errors.
//
// Server-side consumers (API routes, scripts) MUST import these directly:
//   import { ExecutionStatusRepository } from "@repo/core-runtime/src/execution-status.js";
//   import { EmailQueueRepository } from "@repo/core-runtime/src/email-queue.js";
export type { ExecutionStatus } from "./execution-status.js";
export type { QueuedEmail } from "./email-queue.js";