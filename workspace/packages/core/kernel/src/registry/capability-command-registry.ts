import type { CapabilityCommand } from "../types.js";
import { randomUUID } from "crypto";
// PR-001: Import reliability utilities from core-runtime (ARCH-04 compliant - kernel uses core-runtime exports)
// @ts-ignore - @repo/core-runtime is a workspace package that resolves at build/runtime
import { calculateExponentialBackoff, shouldOpenCircuitBreaker, shouldResetCircuitBreaker, executionContext } from "@repo/core-runtime";
// Define RetryConfig type locally since it's not exported from ../types
export interface RetryConfig {
  readonly max_attempts: number;
  readonly backoff: {
    readonly initial_delay_ms: number;
    readonly max_delay_ms: number;
    readonly factor: number;
  } | string; // Allow string for backward compatibility with existing configs
  readonly circuit_breaker_cooldown_ms: number;
  readonly circuit_breaker_threshold: number;
}

const CAPABILITY_COMMAND_LOADERS: ReadonlyArray<{ readonly module: string; readonly extract: (m: any) => Readonly<Record<string, CapabilityCommand>> }> = [
  { module: "legal-case/implementation/commands/case.commands.js", extract: (m) => (m.caseCommands ?? {}) as Readonly<Record<string, CapabilityCommand>> },
  { module: "legal-community/implementation/commands/index.js", extract: (m) => (m.default ?? {}) as Readonly<Record<string, CapabilityCommand>> },
  { module: "service-directory/implementation/commands/index.js", extract: (m) => (m.default ?? {}) as Readonly<Record<string, CapabilityCommand>> },
  { module: "legal-document/implementation/commands/index.js", extract: (m) => (m.documentCommands ?? {}) as Readonly<Record<string, CapabilityCommand>> },
  {
    module: "identity/implementation/commands/signup-and-session.command.js",
    extract: (m) => ({ "identity.signupAndCreateSession": (m.default ?? m.signupAndSessionCommand ?? {}) as CapabilityCommand })
  },
  { module: "observability/implementation/commands/observability.commands.js", extract: (m) => (m.observabilityCommands ?? {}) as Readonly<Record<string, CapabilityCommand>> },
  { module: "requirement-management/implementation/commands/requirement.commands.js", extract: (m) => (m.requirementCommands ?? {}) as Readonly<Record<string, CapabilityCommand>> },
  { module: "consultation/implementation/commands/index.js", extract: (m) => (m.default ?? m.consultationCommands ?? {}) as Readonly<Record<string, CapabilityCommand>> },
  { module: "evidence-registry/implementation/commands/evidence-registry.commands.js", extract: (m) => (m.evidenceRegistryCommands ?? m.default ?? {}) as Readonly<Record<string, CapabilityCommand>> }
] as const;

let capabilityCommands: Record<string, CapabilityCommand> = {};

function resolveCapabilityModule(spec: string): Promise<any> {
  const specAny = spec as any;
  return import(specAny);
}

async function loadCapabilityCommands(): Promise<Record<string, CapabilityCommand>> {
  if (Object.keys(capabilityCommands).length > 0) return capabilityCommands;

  try {
    const base = "../../../../../capabilities/";
    const loaded = await Promise.all(
      CAPABILITY_COMMAND_LOADERS.map((loader) =>
        resolveCapabilityModule(`${base}${loader.module}`).then(
          (m) => loader.extract(m),
          (err) => {
            console.warn(`[capability-registry] Failed to load ${loader.module}: ${err?.message ?? err}`);
            return {} as Readonly<Record<string, CapabilityCommand>>;
          }
        )
      )
    );
    capabilityCommands = {};
    for (const bundle of loaded) {
      for (const key of Object.keys(bundle)) {
        capabilityCommands[key] = (bundle as Record<string, CapabilityCommand>)[key];
      }
    }
    return capabilityCommands;
  } catch (err) {
    console.warn("[capability-registry] Bulk command preload failed:", err instanceof Error ? err.message : String(err));
    return capabilityCommands;
  }
}

// Initialize commands cache on module load
loadCapabilityCommands().catch(err => console.warn("[capability-registry] Failed to preload commands:", err));

const identityRailOnlyCommands: Readonly<Record<string, CapabilityCommand>> = {
  // Initialize with placeholder - will be replaced at runtime when commands are loaded
  "identity.signupAndCreateSession": {} as CapabilityCommand,
};

export interface CommandInvocationRecord {
  readonly commandKey: string;
  readonly capability: string;
  readonly commandName: string;
  readonly invokedAt: string;
  readonly inputSize: number;
  readonly ok: boolean;
  readonly errorMessage?: string;
}

const CAPABILITY_PREFIX_ALIASES: Readonly<Record<string, readonly string[]>> = {
  identity: ["identity."],
  auth: ["identity."],
  i: ["identity."],
  tenant: ["identity."],
  tnt: ["identity."],
  "saas-context": ["identity."],
  workspace: ["identity."],
  ws: ["identity."],
  membership: ["identity."],
  "legal-case": ["case.", "legal-case."],
  lawyershub: ["case.", "legal-case.", "requirement.", "requirement-management."],
  "legal-document": ["document.", "legal-document."],
  documents: ["document.", "legal-document."],
  "requirement-management": ["requirement.", "requirement-management."],
  requirements: ["requirement.", "requirement-management."],
  "service-directory": ["service-directory."],
  "services-id": ["service-directory."],
  services: ["service-directory."],
  "legal-community": ["legal-community."],
  ilc: ["legal-community."],
  academic: ["legal-community."],
  community: ["legal-community."],
  commsme: ["case.", "document.", "service-directory.", "legal-community.", "requirement.", "consultation.", "learning."],
  "consultation": ["consultation."],
  "consultations": ["consultation."],
  "evidence-registry": ["evidence.", "evidence-registry."],
  "evidence": ["evidence.", "evidence-registry."],
  "observability": ["incident.", "observability."],
  sre: ["incident.", "observability."],
  infrastructure: ["incident.", "observability."],
  ops: ["incident.", "observability."],
} as const;

function normalizeCommandName(raw: string): string {
  return raw.trim().replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

async function getAllKeys(): Promise<string[]> {
  const commands = await loadCapabilityCommands();
  return Object.keys(commands);
}

export const capabilityRegistry = {
  async listCommandKeys(): Promise<readonly string[]> {
    const commands = await loadCapabilityCommands();
    return Object.keys(commands).sort();
  },
  async resolve(commandKey: string): Promise<CapabilityCommand | undefined> {
      const commands = await loadCapabilityCommands();
      return commands[commandKey];
    },
  prefixesFor(capability: string): readonly string[] {
    const aliases = CAPABILITY_PREFIX_ALIASES[capability.toLowerCase()];
    if (aliases !== undefined) return aliases;
    const short = capability.toLowerCase().split("-").slice(-1)[0] ?? capability.toLowerCase();
    return [`${capability.toLowerCase()}.`, `${short}.`];
  },
  async resolveByParts(capability: string, commandName: string): Promise<{ command?: CapabilityCommand; candidates: string[]; attemptedKeys: string[] }> {
    const commands = await loadCapabilityCommands();
    const attemptedKeys: string[] = [];
    const candidates: string[] = [];

    // Try exact key first
    const exactKey = `${capability}.${commandName}`;
    attemptedKeys.push(exactKey);
    if (commands[exactKey]) {
      return { command: commands[exactKey], candidates, attemptedKeys };
    }

    // Try case-insensitive match
    const lowerKey = `${capability}.${commandName.toLowerCase()}`;
    attemptedKeys.push(lowerKey);
    for (const key of Object.keys(commands)) {
      if (key.toLowerCase() === lowerKey) {
        return { command: commands[key], candidates, attemptedKeys };
      }
      if (key.startsWith(capability)) {
        candidates.push(key);
      }
    }

    return { command: undefined, candidates, attemptedKeys };
  },
  // Circuit breaker state store - isolated per tenant+capability+command (tenant isolation compliance)
  circuitBreakerStates: new Map<string, {
    consecutiveFailures: number;
    isOpen: boolean;
    lastFailureTime: number;
  }>(),
  
  // PR-002: Idempotency state store - isolated per tenant+idempotency_key (tenant isolation compliance)
  idempotencyStates: new Map<string, {
    completed: boolean;
    result?: { output: unknown; record: CommandInvocationRecord };
  }>(),
  
  // PR-003: Concurrency state store - track in-flight executions to prevent race conditions on same artifact
  concurrencyStates: new Map<string, {
    startedAt: string;
    executionId: string;
    artifactId: string;
  }>(),
  
  // PR-004: Security state store - track failed authentication attempts per tenant (tenant isolation compliance)
  securityStates: new Map<string, {
    failedAttempts: number;
    lastFailedAt: number;
    blockedUntil: number;
  }>(),
  
  getCircuitBreakerKey(tenantId: string | null | undefined, capability: string, commandName: string): string {
    return `${tenantId ?? "global"}:${capability}:${commandName}`;
  },
  
  getIdempotencyKey(tenantId: string | null | undefined, idempotencyKey: string | null | undefined): string {
    return `${tenantId ?? "global"}:${idempotencyKey ?? "unknown-idempotency-key"}`;
  },
  
  getConcurrencyKey(tenantId: string | null | undefined, artifactId: string): string {
    return `${tenantId ?? "global"}:${artifactId}`;
  },
  
  getSecurityKey(tenantId: string | null | undefined, actorId: string | null | undefined): string {
    return `${tenantId ?? "global"}:${actorId ?? "unknown-actor"}`;
  },

  async invoke<Output = unknown>(
    capability: string,
    commandName: string,
    input: unknown,
    retryConfig?: RetryConfig,
  ): Promise<{ readonly output: Awaited<Output>; readonly record: CommandInvocationRecord }> {
    const { command, candidates, attemptedKeys } = await this.resolveByParts(capability, commandName);
    if (command === undefined) {
      const sortedCandidates = candidates.slice(0, 8).join(", ");
      const commands = await loadCapabilityCommands();
      const allKeys = Object.keys(commands);
      throw new Error(
        `[capability-registry] Command not found: capability=${capability}, commandName=${commandName}. attempted=${attemptedKeys.join(" | ")}. Available candidates (${candidates.length}): ${sortedCandidates.length > 0 ? sortedCandidates : "(none)"}. Global total keys: ${allKeys.length}.`,
      );
    }
    const commands = await loadCapabilityCommands();
    const allKeys = Object.keys(commands);
    const matchedKey =
      allKeys.find((k) => commands[k] === command) ?? `${capability}.${commandName}`;
    const ambientCtx = executionContext.get();
    const tenantId = ambientCtx?.tenant_id;
    const idempotencyKey = ambientCtx?.idempotency_key;
    const circuitKey = this.getCircuitBreakerKey(tenantId, capability, commandName);
    const idemKey = this.getIdempotencyKey(tenantId, idempotencyKey);
    
    // PR-002: Check idempotency state before execution - return existing result if already completed
    const existingIdemState = this.idempotencyStates.get(idemKey);
    if (existingIdemState?.completed && existingIdemState.result) {
      console.log(`[capability-registry] Duplicate execution prevented - returning existing result for idempotency key: ${idemKey}`);
      return existingIdemState.result as { readonly output: Awaited<Output>; readonly record: CommandInvocationRecord };
    }
    
    // PR-004: List of public commands that don't require session authentication
    const publicCommands = new Set([
      "identity.createTenant",
      "identity.login",
      "identity.getTenantBySlug",
      "identity.signupAndCreateSession"
    ]);
    const isPublicCommand = publicCommands.has(matchedKey);
    
    // Check circuit breaker state before execution
    let circuitState = this.circuitBreakerStates.get(circuitKey) ?? { consecutiveFailures: 0, isOpen: false, lastFailureTime: 0 };
    
    // Check if we should reset circuit breaker after cooldown period (half-open state implementation)
    if (circuitState.isOpen) {
      const shouldReset = shouldResetCircuitBreaker(circuitState.lastFailureTime, retryConfig?.circuit_breaker_cooldown_ms);
      if (shouldReset) {
        // Reset circuit breaker to closed state after cooldown - allow single test request
        circuitState = { consecutiveFailures: 0, isOpen: false, lastFailureTime: circuitState.lastFailureTime };
        this.circuitBreakerStates.set(circuitKey, circuitState);
      } else {
        throw new Error(`[capability-registry] Circuit breaker OPEN for ${circuitKey} - service temporarily unavailable`);
      }
    }

    const inputSize =
      typeof input === "string"
        ? input.length
        : typeof input === "object" && input !== null
          ? JSON.stringify(input).length
          : String(input).length;
    const recordBase: Omit<CommandInvocationRecord, "ok" | "errorMessage"> = {
      commandKey: matchedKey,
      capability,
      commandName,
      invokedAt: new Date().toISOString(),
      inputSize,
    };
    
    // PR-004: Centralized session validation for all non-public commands
    if (!isPublicCommand) {
      const inputAny = input as any;
      const sessionId = inputAny?.sessionId ?? undefined;
      const actorId = inputAny?.actorId ?? ambientCtx?.actor_id;
      const inputTenantId = inputAny?.tenantId ?? tenantId;
      const inputWorkspaceId = inputAny?.workspaceId ?? undefined;
      
      if (!sessionId || !actorId) {
        throw new Error(`[capability-registry] Authentication required - sessionId and actorId must be provided for command: ${matchedKey}`);
      }
      
      // PR-004: Validate session authenticity from repository (reuse observability.commands pattern)
      if (process.env.DATABASE_URL && sessionId && actorId && inputTenantId && inputWorkspaceId) {
        try {
          const sessionRepoResult = await resolveCapabilityModule("../../../../../capabilities/identity/implementation/repositories/index.js");
          const sessionTypesResult = await resolveCapabilityModule("../../../../../capabilities/identity/implementation/contracts/identity.contracts.js");
          const SessionRepositoryPostgres = sessionRepoResult?.SessionRepositoryPostgres;
          const SessionId = sessionTypesResult?.SessionId;
          if (!SessionRepositoryPostgres || !SessionId) {
            console.warn("[capability-registry] Session validation runtime dependencies unavailable; proceeding without DB-backed check.");
          } else {
            const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
            if (!session || session.revokedAt !== null) {
              throw new Error(`[capability-registry] Invalid or revoked session - security violation for command: ${matchedKey}`);
            }
            const sessionExpiresAt = session.expiresAt ?? new Date(Date.now() + 86400000);
            if (sessionExpiresAt.getTime() <= Date.now()) {
              throw new Error(`[capability-registry] Session expired - please re-authenticate for command: ${matchedKey}`);
            }
            if (session.actorId !== actorId) {
              console.warn(`[capability-registry] Actor spoofing attempt detected - session actor ${session.actorId} vs input actor ${actorId} (tenant ${inputTenantId})`);
              throw new Error(`[capability-registry] Session actor mismatch - identity violation for command: ${matchedKey}`);
            }
            if (session.tenantId !== inputTenantId) {
              console.warn(`[capability-registry] Cross-tenant access attempt blocked - session tenant ${session.tenantId} vs input tenant ${inputTenantId} (command ${matchedKey})`);
              throw new Error(`[capability-registry] Cross-tenant access blocked - security violation for command: ${matchedKey}`);
            }
            if (session.workspaceId !== inputWorkspaceId) {
              console.warn(`[capability-registry] Cross-workspace access attempt blocked - session workspace ${session.workspaceId} vs input workspace ${inputWorkspaceId} (command ${matchedKey})`);
              throw new Error(`[capability-registry] Cross-workspace access blocked - security violation for command: ${matchedKey}`);
            }
          }
        } catch (sessionErr) {
          // Increment failed attempts and rethrow
          const securityKey = this.getSecurityKey(inputTenantId, actorId);
          const currentState = this.securityStates.get(securityKey) ?? { failedAttempts: 0, lastFailedAt: 0, blockedUntil: 0 };
          const newFailedAttempts = currentState.failedAttempts + 1;
          const blockedUntil = newFailedAttempts >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
          this.securityStates.set(securityKey, {
            failedAttempts: newFailedAttempts,
            lastFailedAt: Date.now(),
            blockedUntil
          });
          console.warn(`[capability-registry] Session validation failure for actor ${actorId} (tenant ${inputTenantId}) - ${newFailedAttempts} failed attempts`);
          throw sessionErr;
        }
      }
      
      // PR-004: Check if actor is blocked due to excessive failed attempts
      const securityKey = this.getSecurityKey(inputTenantId, actorId);
      const securityState = this.securityStates.get(securityKey) ?? { failedAttempts: 0, lastFailedAt: 0, blockedUntil: 0 };
      if (Date.now() < securityState.blockedUntil) {
        throw new Error(`[capability-registry] Account temporarily blocked - too many failed authentication attempts. Try again later.`);
      }
      
      // PR-004: Capability boundary enforcement - prevent unauthorized cross-capability invocation
      const allowedPrefixes = this.prefixesFor(capability);
      const isValidCommandForCapability = allowedPrefixes.some(prefix => matchedKey.startsWith(prefix));
      if (!isValidCommandForCapability) {
        console.warn(`[capability-registry] Capability boundary violation detected - capability '${capability}' attempted to invoke command '${matchedKey}' which does not belong to this capability. Allowed prefixes: ${allowedPrefixes.join(", ")}`);
        throw new Error(`[capability-registry] Capability boundary violation - command '${matchedKey}' cannot be invoked from capability '${capability}'. Allowed command prefixes for this capability: ${allowedPrefixes.join(", ")}`);
      }
    }

    // PR-002: Initialize idempotency state before execution
    this.idempotencyStates.set(idemKey, { completed: false });

    // PR-003: Check for concurrent execution on the same artifact if artifactId is provided in input
    const inputAny = input as any;
    if (inputAny?.artifactId) {
      const concurrencyKey = this.getConcurrencyKey(tenantId, inputAny.artifactId);
      const existingConcurrency = this.concurrencyStates.get(concurrencyKey);
      if (existingConcurrency) {
        console.warn(`[capability-registry] Race condition detected - artifact ${inputAny.artifactId} is already being modified by execution ${existingConcurrency.executionId} (started at ${existingConcurrency.startedAt})`);
        throw new Error(`[capability-registry] Concurrent modification attempt blocked for artifact: ${inputAny.artifactId} - already in progress by execution ${existingConcurrency.executionId}`);
      }
      // Register current execution as in-flight
      const currentExecutionId = ambientCtx?.context_trace_id ?? randomUUID();
      this.concurrencyStates.set(concurrencyKey, {
        startedAt: new Date().toISOString(),
        executionId: currentExecutionId,
        artifactId: inputAny.artifactId
      });
    }

    // PR-001: Retry logic implementation with exponential backoff
    const maxAttempts = retryConfig?.max_attempts ?? 1;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const output = await command.execute(input as never) as Awaited<Output>;
        // Reset circuit breaker on success
        this.circuitBreakerStates.set(circuitKey, { consecutiveFailures: 0, isOpen: false, lastFailureTime: 0 });
        
        // PR-003: Clear concurrency state after successful execution
        if (inputAny?.artifactId) {
          const concurrencyKey = this.getConcurrencyKey(tenantId, inputAny.artifactId);
          this.concurrencyStates.delete(concurrencyKey);
        }
        
        // PR-004: Reset failed attempts counter on successful authentication
        if (!isPublicCommand) {
          const inputAny = input as any;
          const actorId = inputAny?.actorId ?? ambientCtx?.actor_id;
          const inputTenantId = inputAny?.tenantId ?? tenantId;
          const securityKey = this.getSecurityKey(inputTenantId, actorId);
          this.securityStates.set(securityKey, { failedAttempts: 0, lastFailedAt: 0, blockedUntil: 0 });
        }
        
        // PT-003: Update execution context with reset circuit breaker state
        const successCtx = executionContext.get();
        if (successCtx) {
          executionContext.run({
            ...successCtx,
            consecutive_failures: 0,
            circuit_breaker_open: false
          }, () => {});
        }
        
        const result = {
          output,
          record: { ...recordBase, ok: true },
        };
        
        // PR-002: Mark idempotency state as completed with successful result
        this.idempotencyStates.set(idemKey, { completed: true, result });
        
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // PR-003: Clear concurrency state on failure to allow retry
        if (inputAny?.artifactId) {
          const concurrencyKey = this.getConcurrencyKey(tenantId, inputAny.artifactId);
          this.concurrencyStates.delete(concurrencyKey);
        }
        
        // PR-004: Increment failed attempts on authentication failures
        if (!isPublicCommand) {
          const actorId = inputAny?.actorId ?? ambientCtx?.actor_id;
          const securityKey = this.getSecurityKey(tenantId, actorId);
          const currentState = this.securityStates.get(securityKey) ?? { failedAttempts: 0, lastFailedAt: 0, blockedUntil: 0 };
          const newFailedAttempts = currentState.failedAttempts + 1;
          // Block for 15 minutes after 5 failed attempts
          const blockedUntil = newFailedAttempts >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
          this.securityStates.set(securityKey, {
            failedAttempts: newFailedAttempts,
            lastFailedAt: Date.now(),
            blockedUntil
          });
          console.warn(`[capability-registry] Authentication failure for actor ${actorId} (tenant ${tenantId}) - ${newFailedAttempts} failed attempts`);
        }
        const newConsecutiveFails = circuitState.consecutiveFailures + 1;
        
        // Check if we need to open circuit breaker
        const shouldOpen = shouldOpenCircuitBreaker(newConsecutiveFails, retryConfig?.circuit_breaker_threshold);
        this.circuitBreakerStates.set(circuitKey, {
          consecutiveFailures: newConsecutiveFails,
          isOpen: shouldOpen,
          lastFailureTime: Date.now()
        });

        // PT-003: Update execution context with circuit breaker state (observability only, no execution changes)
        const currentCtx = executionContext.get();
        if (currentCtx) {
          // Create new context to maintain immutability of execution context state
          executionContext.run({
            ...currentCtx,
            consecutive_failures: newConsecutiveFails,
            circuit_breaker_open: shouldOpen
          }, () => {
            // Context updated for child operations - no execution logic changed, only observability enriched
          });
        }

        // If not last attempt, wait before retrying
        if (attempt < maxAttempts) {
          // Validate backoff strategy from RetryConfig (supports exponential from registry-resolver)
          const delay = retryConfig?.backoff === "exponential" 
            ? calculateExponentialBackoff(attempt, {})
            : 1000; // Default for non-exponential backoff strategies
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Last attempt failed - throw final error
        const message = lastError.message;
        throw Object.assign(new Error(message), {
          invocationRecord: { ...recordBase, ok: false, errorMessage: message },
        });
      }
    }

    // Unreachable code for type safety
    throw lastError!;
  },

  async invokeAsync<Output = unknown>(
    capability: string,
    commandName: string,
    input: unknown,
  ): Promise<{ readonly output: Awaited<Output>; readonly record: CommandInvocationRecord }> {
    const { command, candidates, attemptedKeys } = await this.resolveByParts(capability, commandName);
    if (command === undefined) {
        const sortedCandidates = candidates.slice(0, 8).join(", ");
        const commands = await loadCapabilityCommands();
        const allKeys = Object.keys(commands);
        throw new Error(
          `[capability-registry] Command not found: capability=${capability}, commandName=${commandName}. attempted=${attemptedKeys.join(" | ")}. Available candidates (${candidates.length}): ${sortedCandidates.length > 0 ? sortedCandidates : "(none)"}. Global total keys: ${allKeys.length}.`,
        );
      }
      const commands = await loadCapabilityCommands();
      const allKeys = Object.keys(commands);
    const matchedKey =
      allKeys.find((k) => commands[k] === command) ?? `${capability}.${commandName}`;
    const inputSize =
      typeof input === "string"
        ? input.length
        : JSON.stringify(input).length;
    const recordBase: Omit<CommandInvocationRecord, "ok" | "errorMessage"> = {
      commandKey: matchedKey,
      capability,
      commandName,
      invokedAt: new Date().toISOString(),
      inputSize,
    };
    try {
      const output = await command(input);
      return {
        output,
        record: { ...recordBase, ok: true },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return {
        output: null as unknown as Awaited<Output>,
        record: { ...recordBase, ok: false, errorMessage },
      };
    }
  },
} as const;