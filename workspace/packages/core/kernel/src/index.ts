export type {
  CapabilityDescriptor,
  CapabilityContracts,
  CapabilityCommand,
  CapabilityQuery,
  CapabilityRepository,
  CapabilityImplementation,
  WorkspaceAggregateBinding,
} from "./types.js";

export {
  CapabilityManifestSchema,
  CapabilityAggregateBindingSchema,
} from "./schemas.js";
export type {
  CapabilityManifest,
  CapabilityAggregateBindingManifest,
} from "./schemas.js";
export type {
  DigestCanonicalizer,
  DigestComputation,
  DigestEngineContract,
  DigestHashAlgorithm,
} from "./digest-engine.js";
export {
  createDigestEngine,
  DigestEngine,
} from "./digest-engine.js";

// Session exports (moved from apps/web/lib)
export type {
  WorkspaceSession,
  WorkspaceRequestTrace,
} from "./session/workspace-session.js";
export {
  WORKSPACE_SESSION_COOKIE,
  WorkspaceSessionSchema,
  ANONYMOUS_ACTOR_ID,
  createAnonymousWorkspaceSession,
  isAuthenticatedSession,
  encodeWorkspaceSession,
  decodeWorkspaceSession,
  readWorkspaceSessionFromCookieHeader,
  readWorkspaceSessionFromRequest,
  createWorkspaceRequestTrace,
  createWorkspaceContextHeaders,
} from "./session/workspace-session.js";

// Registry exports (moved from apps/web/lib)
export type {
  CommandInvocationRecord,
} from "./registry/capability-command-registry.js";
export {
  capabilityRegistry,
} from "./registry/capability-command-registry.js";

// Core runtime mediation layer (ARCH-04 compliant - capabilities access core-runtime ONLY via core-kernel)
export {
  recordRuntimeInvocation,
  traceExecutionByDecision,
} from "@repo/core-runtime";
export type {
  RuntimeInvocationEvent,
  ExecutionContext,
} from "@repo/core-runtime";