export type {
  CapabilityDescriptor,
  CapabilityContracts,
  CapabilityCommand,
  CapabilityQuery,
  CapabilityRepository,
  CapabilityImplementation,
  WorkspaceAggregateBinding,
} from "./types";

// SHARED WORKFLOW DEFINITION PRIMITIVES - Earned abstractions from Wave B implementation
export type {
  WorkflowStep,
  WorkflowTransition,
  WorkflowDefinition,
} from "./registry/capability-command-registry";
export {
  isValidWorkflowDefinition,
  executeWorkflowTransition,
  capabilityRegistry,
} from "./registry/capability-command-registry";

export {
  CapabilityManifestSchema,
  CapabilityAggregateBindingSchema,
} from "./schemas";
export type {
  CapabilityManifest,
  CapabilityAggregateBindingManifest,
} from "./schemas";

// ============================================================================
// SERVER-ONLY BOUNDARY - DigestEngine module excluded from shared barrel
// ============================================================================
// createDigestEngine and the DigestEngine instance use node:crypto (createHash).
// Including these VALUE exports in the shared barrel forces every consumer —
// including browser-only client components (e.g. use-workspace-session.ts
// marked "use client") — to pull node:crypto into their bundle, which Next.js
// Webpack then fails to resolve with:
//   "UnhandledSchemeError: Reading from 'node:crypto' is not handled by plugins"
//
// Server-side consumers that NEED these primitives MUST import them directly:
//   import { createDigestEngine, DigestEngine } from "@repo/core-kernel/digest-engine.js";
// ============================================================================
export type {
  DigestCanonicalizer,
  DigestComputation,
  DigestEngineContract,
  DigestHashAlgorithm,
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

// ============================================================================
// SERVER-ONLY BOUNDARY - capabilityRegistry excluded from shared barrel
// ============================================================================
// capabilityRegistry transitively pulls in:
//   - @repo/core-runtime → execution-context → node:async_hooks (AsyncLocalStorage)
//   - node:crypto (createHash via runtime observability)
//   - node:path / node:url via registry utility helpers
//
// These are strictly server-side primitives; exporting them here causes the
// same client-bundle resolution crash as the digest-engine boundary above.
//
// Server-side consumers (API routes, capability impls, scripts) MUST import
// directly:
//   import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
// ============================================================================
export type {
  CommandInvocationRecord,
} from "./registry/capability-command-registry";

// Core runtime mediation layer (ARCH-04 compliant - capabilities access core-runtime ONLY via core-kernel)
//
// SERVER-ONLY BOUNDARY: recordRuntimeInvocation and traceExecutionByDecision are
// intentionally NOT exported from this shared barrel. Their backing module
// (@repo/core-runtime/src/invocation-evidence.js) imports from Node.js built-ins:
//   - node:fs (appendFileSync, mkdirSync, readFileSync)
//   - path (dirname)
//   - crypto (createHash)
//
// Re-exporting them here pulls the entire invocation-evidence module (and its
// Node.js deps) into every consumer of this barrel — including browser code.
// Next.js Webpack then fails with: "Can't resolve 'fs'", "Can't resolve 'path'", etc.
//
// Server-side modules (API routes, capabilities, scripts) that NEED these runtime
// primitives MUST import them directly from @repo/core-runtime — which is still
// ARCH-04 compliant: core-kernel remains the single mediation layer for the
// *contracts* (types), while *implementations* with Node-only deps stay server-only.
export type {
  RuntimeInvocationEvent,
  ExecutionContext,
} from "@repo/core-runtime";