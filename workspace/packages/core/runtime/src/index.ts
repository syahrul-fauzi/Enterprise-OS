export type {
  MountedCapability,
  RuntimeMountResult,
  RuntimeLifecycle,
  HostEnvironment,
} from "./types";
export { Runtime } from "./runtime";
export { recordRuntimeInvocation, traceExecutionByDecision } from "./invocation-evidence";
export { executionContext } from "./execution-context";
export type { ExecutionContext } from "./execution-context";
export type { ResolvedWorkspace } from "@repo/composition";