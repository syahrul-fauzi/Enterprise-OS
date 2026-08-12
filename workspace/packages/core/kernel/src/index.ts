export type {
  CapabilityDescriptor,
  CapabilityContracts,
  CapabilityCommand,
  CapabilityQuery,
  CapabilityRepository,
  CapabilityImplementation,
  WorkspaceAggregateBinding,
} from "./types";

export {
  CapabilityManifestSchema,
  CapabilityAggregateBindingSchema,
} from "./schemas";
export type {
  CapabilityManifest,
  CapabilityAggregateBindingManifest,
} from "./schemas";
export type {
  DigestCanonicalizer,
  DigestComputation,
  DigestEngineContract,
  DigestHashAlgorithm,
} from "./digest-engine";
export {
  createDigestEngine,
  DigestEngine,
} from "./digest-engine";

// Session exports (moved from apps/web/lib)
export type {
  WorkspaceSession,
  WorkspaceRequestTrace,
} from "./session/workspace-session";
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
} from "./session/workspace-session";

// Registry exports (moved from apps/web/lib)
export type {
  CommandInvocationRecord,
} from "./registry/capability-command-registry";
export {
  capabilityRegistry,
} from "./registry/capability-command-registry";